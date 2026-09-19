import { useState, useEffect, useMemo } from "react";
import { dbTable, currentUserId, deleteNoteStorageFiles } from "../lib/supabaseClient.js";
import { deleteWithUndo } from "../lib/notifications.js";
import { noteRowToJs, noteJsToRow, folderRowToJs, folderJsToRow } from "../lib/rowMappers.js";
import { freshNoteId, freshFolderId, buildNotePDF } from "../lib/exportEngine.js";
import { fmtDateDMY } from "../lib/dateUtils.js";
import { slugify } from "../lib/checklistLogic.js";

// My Learnings: notes, resources, templates (all rows in the same `notes`
// table, distinguished by isResource/isTemplate flags) plus folders — CRUD,
// star/duplicate, and the notesByTradeId lookup PnlTab uses to show a
// "N linked notes" badge per trade. pnlEntries is read-only here, passed in
// just for the trade-link label shown on a note/PDF export.
export function useNotesData({ pnlEntries }) {
  const [learningNotes, setLearningNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteFolders, setNoteFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [pendingOpenNoteId, setPendingOpenNoteId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await dbTable.selectAll("notes", "updated_at");
        if (!cancelled) setLearningNotes(rows.map(noteRowToJs));
      } catch (err) { if (!cancelled) setLearningNotes([]); }
      finally { if (!cancelled) setNotesLoading(false); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("note_folders", "created_at");
        if (!cancelled) setNoteFolders(rows.map(folderRowToJs));
      } catch (err) { if (!cancelled) setNoteFolders([]); }
      finally { if (!cancelled) setFoldersLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const noteTemplates = useMemo(() => learningNotes.filter((n) => n.isTemplate), [learningNotes]);
  const notesByTradeId = useMemo(() => {
    const map = {};
    learningNotes.forEach((n) => {
      if (!n.linkedTradeId) return;
      (map[n.linkedTradeId] = map[n.linkedTradeId] || []).push(n);
    });
    return map;
  }, [learningNotes]);

  // --- My Learnings: notes + resources + folders CRUD ---
  // addNote/updateNote intentionally do NOT toast on every call — the main
  // note pane autosaves on every edit (see NoteMainPane), and a toast per
  // keystroke-debounce would be noise. Call sites that represent a single
  // explicit user action (the Resource dialog's Save button, moving a
  // note to a folder) toast for themselves after awaiting these.
  const addNote = async (payload) => {
    const sortOrder = Date.now() / 1000;
    const note = { id: freshNoteId(), folderId: null, ...payload, sortOrder };
    await dbTable.insert("notes", noteJsToRow(note, currentUserId));
    const full = { ...note, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    setLearningNotes((prev) => [full, ...prev]);
    return full;
  };
  const updateNote = async (id, payload) => {
    const existing = learningNotes.find((n) => n.id === id);
    const updated = { ...existing, ...payload, id };
    await dbTable.upsert("notes", noteJsToRow(updated, currentUserId));
    setLearningNotes((prev) => prev.map((n) => (n.id === id ? { ...updated, updatedAt: new Date().toISOString() } : n)));
  };
  // Removes a note from local state immediately without showing any
  // notification of its own — the actual DB delete + storage cleanup is
  // returned as performDelete for the caller to schedule, and restoreLocal
  // to undo it. Used directly by bulkDelete, which needs to combine many
  // notes into a single "N notes deleted" undo toast rather than firing
  // one per note; deleteNote below is the single-item public wrapper.
  const removeNoteOptimistic = (id) => {
    const note = learningNotes.find((n) => n.id === id);
    setLearningNotes((prev) => prev.filter((n) => n.id !== id));
    return {
      note,
      performDelete: async () => {
        try {
          await dbTable.deleteById("notes", id);
          if (note) deleteNoteStorageFiles(note.content);
        } catch (err) { /* best effort */ }
      },
      restoreLocal: () => { if (note) setLearningNotes((prev) => [...prev, note]); },
    };
  };
  const deleteNote = async (id, message) => {
    const { note, performDelete, restoreLocal } = removeNoteOptimistic(id);
    deleteWithUndo({
      message: message || `"${note ? (note.title || "Untitled") : "Untitled"}" deleted.`,
      performDelete,
      restoreLocal,
    });
    return true;
  };
  // Combines several notes' worth of removeNoteOptimistic into exactly one
  // undo toast — used for bulk selection, where showing one toast per note
  // deleted would be noisy and where a single "undo" should restore all of
  // them together, not just the last one.
  const bulkDeleteNotes = (ids) => {
    const entries = ids.map((id) => removeNoteOptimistic(id)).filter((e) => e.note);
    if (entries.length === 0) return;
    const message = entries.length === 1
      ? `"${entries[0].note.title || "Untitled"}" deleted.`
      : `${entries.length} notes deleted.`;
    deleteWithUndo({
      message,
      performDelete: async () => { await Promise.all(entries.map((e) => e.performDelete())); },
      restoreLocal: () => { entries.forEach((e) => e.restoreLocal()); },
    });
  };

  const moveNoteToFolder = async (noteId, folderId) => {
    try {
      await updateNote(noteId, { folderId: folderId || null });
    } catch (err) { /* best effort */ }
  };
  // A folder's full descendant set (its subfolders, their subfolders, etc.)
  // — used to keep a folder from being moved into itself or into one of its
  // own children, which would otherwise create an unreachable cycle.
  const folderDescendantIds = (folderId) => {
    const ids = new Set();
    let grew = true;
    while (grew) {
      grew = false;
      noteFolders.forEach((f) => { if (f.parentId && (f.parentId === folderId || ids.has(f.parentId)) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
    }
    return ids;
  };
  const moveFolderToFolder = async (folderId, newParentId, newSortOrder) => {
    if (newParentId === folderId || folderDescendantIds(folderId).has(newParentId)) {
      return;
    }
    const existing = noteFolders.find((f) => f.id === folderId);
    if (!existing) return;
    const updated = { ...existing, parentId: newParentId || null, sortOrder: typeof newSortOrder === "number" ? newSortOrder : existing.sortOrder };
    setNoteFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
    try {
      await dbTable.upsert("note_folders", folderJsToRow(updated, currentUserId));
    } catch (err) {
      setNoteFolders((prev) => prev.map((f) => (f.id === folderId ? existing : f)));
    }
  };
  const duplicateNote = async (note) => {
    try {
      const copy = {
        title: note.title ? `${note.title} (copy)` : "",
        content: note.content || "",
        tags: note.tags || [],
        folderId: note.folderId || null,
        isResource: note.isResource || false,
        resourceUrl: note.resourceUrl || "",
        linkedTradeId: note.linkedTradeId || "",
        linkedUnderlying: note.linkedUnderlying || "",
        linkedStrategy: note.linkedStrategy || "",
        starred: note.starred || false,
      };
      const created = await addNote(copy);
      return created;
    } catch (err) {
      return null;
    }
  };
  const toggleNoteStarred = async (note) => {
    try {
      await updateNote(note.id, { starred: !note.starred });
    } catch (err) { /* best effort */ }
  };
  const noteLinkedTradeLabel = (note) => {
    if (!note.linkedTradeId) return null;
    const e = pnlEntries.find((x) => x.id === note.linkedTradeId);
    return e ? `${e.underlying || "—"} — ${e.strategyLabel || "Trade"} · ${fmtDateDMY(e.entryDate)}` : null;
  };
  const downloadNoteAsPdf = async (note) => {
    try {
      const doc = await buildNotePDF(note, noteLinkedTradeLabel(note));
      doc.save(`${slugify(note.title || "note")}.pdf`);
    } catch (err) { /* best effort */ }
  };

  // --- My Learnings: folders CRUD ---
  // Folders can be created (optionally nested) and renamed and deleted from
  // the UI. Reparenting an existing folder into a different parent isn't
  // exposed in this pass — only create-time nesting is — to keep the tree
  const addFolder = async (parentId = null) => {
    const folder = { id: freshFolderId(), name: "New Folder", parentId: parentId || null, sortOrder: Date.now() / 1000 };
    try {
      await dbTable.insert("note_folders", folderJsToRow(folder, currentUserId));
      const full = { ...folder, createdAt: new Date().toISOString() };
      setNoteFolders((prev) => [...prev, full]);
      return full;
    } catch (err) {
      return null;
    }
  };
  const renameFolder = async (id, name) => {
    const trimmed = (name || "").trim() || "Untitled Folder";
    const existing = noteFolders.find((f) => f.id === id);
    if (!existing) return;
    setNoteFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
    try {
      await dbTable.upsert("note_folders", folderJsToRow({ ...existing, name: trimmed }, currentUserId));
    } catch (err) { /* best effort */ }
  };
  const deleteFolder = async (id) => {
    const folder = noteFolders.find((f) => f.id === id);
    // Mirror the DB's own cascade locally: deleting a folder deletes its
    // subfolders too (a subfolder is meaningless without its parent),
    // but every note that was inside any of them is unfiled, never deleted.
    const toRemove = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      noteFolders.forEach((f) => { if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f.id)) { toRemove.add(f.id); grew = true; } });
    }
    const removedFolders = noteFolders.filter((f) => toRemove.has(f.id));
    const unfiledNotes = learningNotes.filter((n) => toRemove.has(n.folderId)).map((n) => ({ id: n.id, folderId: n.folderId }));

    setNoteFolders((prev) => prev.filter((f) => !toRemove.has(f.id)));
    setLearningNotes((prev) => prev.map((n) => (toRemove.has(n.folderId) ? { ...n, folderId: null } : n)));

    deleteWithUndo({
      message: `"${folder ? (folder.name || "Untitled Folder") : "Folder"}" deleted.`,
      performDelete: async () => {
        try { await Promise.all(removedFolders.map((f) => dbTable.deleteById("note_folders", f.id))); } catch (err) { /* best effort */ }
      },
      restoreLocal: () => {
        setNoteFolders((prev) => [...prev, ...removedFolders]);
        setLearningNotes((prev) => prev.map((n) => {
          const match = unfiledNotes.find((u) => u.id === n.id);
          return match ? { ...n, folderId: match.folderId } : n;
        }));
      },
    });
  };

  return {
    learningNotes, setLearningNotes, notesLoading, noteFolders, setNoteFolders, foldersLoading, noteTemplates, notesByTradeId,
    pendingOpenNoteId, setPendingOpenNoteId,
    addNote, updateNote, deleteNote, bulkDeleteNotes, moveNoteToFolder, duplicateNote, toggleNoteStarred,
    downloadNoteAsPdf, addFolder, renameFolder, deleteFolder, moveFolderToFolder,
  };
}
