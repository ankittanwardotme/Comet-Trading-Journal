import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconFileText, IconChevronDown, IconChevronRight, IconFolder, IconPlus, IconX, IconLayoutGrid, IconPencil,
  IconCheck, IconTrash, IconBooks, IconExternalLink, IconTag, IconCrosshair, IconChevronsUp, IconChevronsDown,
  IconFolderPlus, IconFilePlus, IconSearch, IconChevronLeft, IconFolderSymlink, IconCopy, IconBulb,
} from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";
import { notify } from "../../lib/notifications.js";
import { fmtDateDMY } from "../../lib/dateUtils.js";
import { blockNoteSnippet } from "../../lib/noteBlocks.js";
import { getPortalTarget } from "../../lib/portal.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { CompactFilterButton } from "../../components/shared/CompactFilterButton.jsx";
import { LearningsRail } from "./components/LearningsRail.jsx";
import { RowMenu } from "./components/RowMenu.jsx";
import { TemplateFullScreenEditor } from "./components/TemplateFullScreenEditor.jsx";
import { ResourceEditorDialog } from "./components/ResourceEditorDialog.jsx";
import { NoteMainPane } from "./components/NoteMainPane.jsx";

export function MyLearningsTab({
  notes, notesLoading, folders, onAdd, onUpdate, onDelete, onBulkDeleteNotes, onMoveNote,
  onAddFolder, onRenameFolder, onDeleteFolder, onMoveFolder, onDuplicateNote, onToggleStar,
  pnlEntries, onDownloadPdf, navHeight, pendingOpenNoteId, onPendingOpenNoteApplied,
}) {
  const [railView, setRailView] = useState("notes"); // "notes" | "search" | "tags" | "resources"
  const [selectedNoteId, setSelectedNoteId] = useState(() => {
    try { return localStorage.getItem("tj-active-tab") || null; } catch { return null; }
  });
  const [openTabIds, setOpenTabIds] = useState(() => {
    try {
      const raw = localStorage.getItem("tj-open-tabs");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("tj-open-tabs", JSON.stringify(openTabIds)); } catch {}
  }, [openTabIds]);
  useEffect(() => {
    try {
      if (selectedNoteId) localStorage.setItem("tj-active-tab", selectedNoteId);
      else localStorage.removeItem("tj-active-tab");
    } catch {}
  }, [selectedNoteId]);
  // Once notes have actually loaded, drop any restored tab IDs that no
  // longer correspond to a real note (e.g. deleted from another session
  // while these tabs were saved).
  useEffect(() => {
    if (notesLoading) return;
    setOpenTabIds((prev) => {
      const stillValid = prev.filter((id) => notes.some((n) => n.id === id));
      return stillValid.length === prev.length ? prev : stillValid;
    });
    setSelectedNoteId((prev) => (prev && !notes.some((n) => n.id === prev) ? null : prev));
  }, [notesLoading, notes]);
  const [tabListOpen, setTabListOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("tj-sidebar-collapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("tj-sidebar-collapsed", sidebarCollapsed ? "1" : "0"); } catch {}
  }, [sidebarCollapsed]);

  // --- Tab drag-to-reorder (long-press initiated, same pattern as the sidebar) ---
  const [tabDragState, setTabDragState] = useState(null); // { id } while a tab is actively being dragged
  const [tabDropIndex, setTabDropIndex] = useState(null); // index it would land at if dropped now
  const tabDragStateRef = useRef(null);
  const tabDropIndexRef = useRef(null);
  const tabDragStartPosRef = useRef(null);
  const tabLongPressTimerRef = useRef(null);
  const tabJustDraggedRef = useRef(false);

  const updateTabDropIndexFromPoint = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    const tabEl = el ? el.closest("[data-tab-id]") : null;
    if (!tabEl) return;
    const hoveredId = tabEl.getAttribute("data-tab-id");
    const hoveredIdx = openTabIds.indexOf(hoveredId);
    if (hoveredIdx === -1) return;
    const rect = tabEl.getBoundingClientRect();
    const isLeftHalf = clientX - rect.left < rect.width / 2;
    const targetIdx = isLeftHalf ? hoveredIdx : hoveredIdx + 1;
    if (tabDropIndexRef.current !== targetIdx) {
      tabDropIndexRef.current = targetIdx;
      setTabDropIndex(targetIdx);
    }
  };

  const finalizeTabDrop = () => {
    const dragging = tabDragStateRef.current;
    const dropIdx = tabDropIndexRef.current;
    if (dragging && dropIdx !== null) {
      setOpenTabIds((prev) => {
        const fromIdx = prev.indexOf(dragging.id);
        if (fromIdx === -1) return prev;
        const withoutDragged = prev.filter((id) => id !== dragging.id);
        // Adjust the target index to account for the removal shifting
        // everything after the dragged tab's original position left by one.
        let insertAt = dropIdx;
        if (fromIdx < dropIdx) insertAt -= 1;
        insertAt = Math.max(0, Math.min(withoutDragged.length, insertAt));
        const next = [...withoutDragged];
        next.splice(insertAt, 0, dragging.id);
        return next;
      });
    }
    tabDragStateRef.current = null;
    tabDropIndexRef.current = null;
    setTabDragState(null);
    setTabDropIndex(null);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (tabDragStartPosRef.current && !tabDragStateRef.current) {
        const dx = e.clientX - tabDragStartPosRef.current.x;
        const dy = e.clientY - tabDragStartPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_MOVE_CANCEL_PX) {
          clearTimeout(tabLongPressTimerRef.current);
          tabDragStartPosRef.current = null;
        }
        return;
      }
      if (!tabDragStateRef.current) return;
      updateTabDropIndexFromPoint(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      clearTimeout(tabLongPressTimerRef.current);
      tabDragStartPosRef.current = null;
      if (tabDragStateRef.current) {
        tabJustDraggedRef.current = true;
        finalizeTabDrop();
        setTimeout(() => { tabJustDraggedRef.current = false; }, 0);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [openTabIds]);

  const handleTabMouseDown = (e, tid) => {
    if (e.button !== 0) return;
    tabDragStartPosRef.current = { x: e.clientX, y: e.clientY };
    clearTimeout(tabLongPressTimerRef.current);
    tabLongPressTimerRef.current = setTimeout(() => {
      tabDragStateRef.current = { id: tid };
      setTabDragState({ id: tid });
    }, DRAG_LONG_PRESS_MS);
  };

  const tabListBtnRef = useRef(null);

  // --- Sidebar multi-select (notes + folders) ---
  const [selectedItems, setSelectedItems] = useState(new Set()); // Set of "note:id" / "folder:id"
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const moveMenuBtnRef = useRef(null);
  const lastClickedItemRef = useRef(null);
  const clearSelection = () => setSelectedItems(new Set());


  const toggleItemSelection = (type, id) => {
    const key = `${type}:${id}`;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    lastClickedItemRef.current = { type, id };
  };

  const [autoFocusNoteId, setAutoFocusNoteId] = useState(null);
  const [expanded, setExpanded] = useState(new Set()); // folder ids expanded in the tree
  const [revealFlashId, setRevealFlashId] = useState(null);
  const collapseAllFolders = () => setExpanded(new Set());
  const expandAllFolders = () => setExpanded(new Set(folders.map((f) => f.id)));
  const allFoldersExpanded = folders.length > 0 && folders.every((f) => expanded.has(f.id));
  const toggleAllFolders = () => { if (allFoldersExpanded) collapseAllFolders(); else expandAllFolders(); };
  const revealCurrentNote = (targetId) => {
    const noteId = targetId || selectedNoteId;
    if (!noteId) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setSelectedNoteId(noteId);
    setRailView("notes");
    // Walk up the folder-parent chain from the note's own folder to the
    // root, collecting every ancestor so the whole path unfolds at once.
    const ancestorIds = [];
    let curFolderId = note.folderId;
    while (curFolderId) {
      ancestorIds.push(curFolderId);
      const f = folders.find((x) => x.id === curFolderId);
      curFolderId = f ? f.parentId : null;
    }
    if (ancestorIds.length > 0) {
      setExpanded((prev) => new Set([...prev, ...ancestorIds]));
    }
    // Give the expand animation time to settle (250ms transition) before
    // scrolling, so the row's final position is used, not a mid-transition one.
    setTimeout(() => {
      const el = document.querySelector(`[data-drag-type="note"][data-drag-id="${note.id}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRevealFlashId(note.id);
        setTimeout(() => setRevealFlashId(null), 1100);
      }
    }, ancestorIds.length > 0 ? 300 : 0);
  };
  useEffect(() => {
    if (!pendingOpenNoteId) return;
    revealCurrentNote(pendingOpenNoteId);
    if (onPendingOpenNoteApplied) onPendingOpenNoteApplied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpenNoteId]);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [noteFilterUnderlying, setNoteFilterUnderlying] = useState(null);
  const [noteFilterStrategy, setNoteFilterStrategy] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [resourceEditorFor, setResourceEditorFor] = useState(null);
  const [pendingDeleteResourceId, setPendingDeleteResourceId] = useState(null);
  const [templateEditorFor, setTemplateEditorFor] = useState(null);
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState(null);

  const learningNotes = useMemo(() => notes.filter((n) => !n.isResource && !n.isTemplate), [notes]);

  // --- Drag-to-reorder (long-press initiated) ---
  const DRAG_LONG_PRESS_MS = 350;
  const DRAG_MOVE_CANCEL_PX = 6;
  const HOVER_EXPAND_MS = 550;
  const LEAVE_ALL_ROWS_DEBOUNCE_MS = 150;
  const [dragState, setDragState] = useState(null); // { type, id } once a drag is actually active
  const [dropIndicator, setDropIndicator] = useState(null);
  // dropIndicator: { kind: "line", parentId, beforeId, y, x, width }
  //             or { kind: "into", folderId, folderName, y, x, width }
  const dragStateRef = useRef(null);
  const dropIndicatorRef = useRef(null);
  const dragStartPosRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const hoverExpandTimerRef = useRef(null);
  const leaveAllRowsTimerRef = useRef(null);
  const lastHoverFolderIdRef = useRef(null);
  const autoExpandedRef = useRef(new Set());
  const justDraggedRef = useRef(false); // suppresses the click that mouseup would otherwise fire

  const isDescendantFolder = (candidateId, ancestorId) => {
    let cur = folders.find((f) => f.id === candidateId);
    while (cur && cur.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = folders.find((f) => f.id === cur.parentId);
    }
    return false;
  };

  const collapseAutoExpanded = (exceptFolderId) => {
    autoExpandedRef.current.forEach((fid) => {
      if (fid === exceptFolderId || (exceptFolderId && isDescendantFolder(exceptFolderId, fid))) return;
      setExpanded((prev) => { if (!prev.has(fid)) return prev; const next = new Set(prev); next.delete(fid); return next; });
      autoExpandedRef.current.delete(fid);
    });
  };

  const updateDropIndicatorFromPoint = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    const rowEl = el ? el.closest("[data-drag-type]") : null;
    if (!rowEl) {
      // Left every row's own box — but this also fires transiently when the
      // pointer passes through the small margin gap between two stacked
      // rows during fast movement, which isn't a genuine "left the tree"
      // event. Debounce briefly; a real exit will still collapse shortly
      // after, but a momentary gap between rows won't.
      clearTimeout(hoverExpandTimerRef.current);
      dropIndicatorRef.current = null;
      setDropIndicator(null);
      clearTimeout(leaveAllRowsTimerRef.current);
      leaveAllRowsTimerRef.current = setTimeout(() => {
        collapseAutoExpanded(null);
        lastHoverFolderIdRef.current = null;
      }, LEAVE_ALL_ROWS_DEBOUNCE_MS);
      return;
    }
    clearTimeout(leaveAllRowsTimerRef.current);
    const rowType = rowEl.getAttribute("data-drag-type");
    const rowId = rowEl.getAttribute("data-drag-id");
    const rowParentId = rowEl.getAttribute("data-drag-parent") || null;
    const dragging = dragStateRef.current;
    if (!dragging) return;
    // Never allow dropping a folder into itself or one of its own descendants.
    if (dragging.type === "folder") {
      if (rowId === dragging.id) { return; }
      if (rowType === "folder" && isDescendantFolder(rowId, dragging.id)) { return; }
    }

    const rect = rowEl.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const fraction = relativeY / rect.height;
    const isFolder = rowType === "folder";

    // Folders: top 25% = insert before, bottom 25% = insert after,
    // middle 50% = move into this folder. Notes: simple top/bottom half.
    let zone;
    if (isFolder) {
      zone = fraction < 0.25 ? "before" : fraction > 0.75 ? "after" : "into";
    } else {
      zone = fraction < 0.5 ? "before" : "after";
    }

    // Walks up from a row's own folder context (itself, if it's a folder,
    // then its ancestors) checking whether any of them is currently
    // auto-expanded — i.e. whether this row is still somewhere "inside
    // the family" of a folder we opened for this drag. Traversing deeper
    // into a subfolder should never collapse its own ancestors.
    const isWithinAutoExpandedFamily = () => {
      let cur = isFolder ? rowId : rowParentId;
      while (cur) {
        if (autoExpandedRef.current.has(cur)) return true;
        const f = folders.find((x) => x.id === cur);
        cur = f ? f.parentId : null;
      }
      return false;
    };

    if (isFolder && zone === "into") {
      if (lastHoverFolderIdRef.current !== rowId) {
        collapseAutoExpanded(rowId);
        lastHoverFolderIdRef.current = rowId;
        clearTimeout(hoverExpandTimerRef.current);
        if (!expanded.has(rowId)) {
          hoverExpandTimerRef.current = setTimeout(() => {
            setExpanded((prev) => new Set(prev).add(rowId));
            autoExpandedRef.current.add(rowId);
          }, HOVER_EXPAND_MS);
        }
      }
      const folderObj = folders.find((f) => f.id === rowId);
      const next = { kind: "into", folderId: rowId, folderName: folderObj ? folderObj.name : "", y: rect.top, x: rect.left, width: rect.width };
      dropIndicatorRef.current = next;
      setDropIndicator(next);
      return;
    }

    // Reorder-line zones. Only collapse the auto-expanded chain if this
    // row is genuinely outside it — hovering a line zone that's still
    // within an already-open subfolder (e.g. its top/bottom edge) must
    // not close the ancestor that made it visible in the first place.
    if (lastHoverFolderIdRef.current && !isWithinAutoExpandedFamily()) {
      collapseAutoExpanded(null);
      lastHoverFolderIdRef.current = null;
      clearTimeout(hoverExpandTimerRef.current);
    }
    const beforeId = zone === "before" ? rowId : null;
    const afterId = zone === "after" ? rowId : null;
    const lineY = zone === "before" ? rect.top : rect.bottom;
    const next = { kind: "line", parentId: rowParentId, beforeId, afterId, y: lineY, x: rect.left, width: rect.width };
    dropIndicatorRef.current = next;
    setDropIndicator(next);
  };

  const finalizeDrop = async () => {
    const dragging = dragStateRef.current;
    const indicator = dropIndicatorRef.current;
    let committedFolderId = null;
    if (dragging && indicator) {
      if (indicator.kind === "into") {
        committedFolderId = indicator.folderId;
        if (dragging.type === "note") {
          const siblingNotes = learningNotes.filter((n) => n.folderId === indicator.folderId && n.id !== dragging.id).sort(sortByOrder);
          const topOrder = siblingNotes.length > 0 ? (siblingNotes[0].sortOrder ?? Date.now() / 1000) + 1000 : Date.now() / 1000;
          await onUpdate(dragging.id, { folderId: indicator.folderId, sortOrder: topOrder });
        } else {
          const siblingFolders = folders.filter((f) => f.parentId === indicator.folderId && f.id !== dragging.id).sort(sortByOrder);
          const topOrder = siblingFolders.length > 0 ? (siblingFolders[0].sortOrder ?? Date.now() / 1000) + 1000 : Date.now() / 1000;
          await onMoveFolder(dragging.id, indicator.folderId, topOrder);
        }
      } else if (indicator.kind === "line") {
        const siblings = dragging.type === "note"
          ? learningNotes.filter((n) => n.folderId === (indicator.parentId || null) && n.id !== dragging.id).sort(sortByOrder)
          : folders.filter((f) => f.parentId === (indicator.parentId || null) && f.id !== dragging.id).sort(sortByOrder);
        const refIdx = siblings.findIndex((s) => s.id === (indicator.beforeId || indicator.afterId));
        let newOrder;
        if (indicator.beforeId) {
          const ref = siblings[refIdx];
          const prevItem = siblings[refIdx - 1];
          newOrder = prevItem ? ((ref.sortOrder ?? 0) + (prevItem.sortOrder ?? 0)) / 2 : (ref.sortOrder ?? 0) + 1000;
        } else {
          const ref = siblings[refIdx];
          const nextItem = siblings[refIdx + 1];
          newOrder = nextItem ? ((ref.sortOrder ?? 0) + (nextItem.sortOrder ?? 0)) / 2 : (ref.sortOrder ?? 0) - 1000;
        }
        committedFolderId = indicator.parentId || null;
        if (dragging.type === "note") {
          const currentNote = learningNotes.find((n) => n.id === dragging.id);
          const parentChanged = currentNote && currentNote.folderId !== (indicator.parentId || null);
          await onUpdate(dragging.id, parentChanged ? { folderId: indicator.parentId || null, sortOrder: newOrder } : { sortOrder: newOrder });
        } else {
          await onMoveFolder(dragging.id, indicator.parentId || null, newOrder);
        }
      }
    }
    collapseAutoExpanded(committedFolderId);
    autoExpandedRef.current = new Set();
    dragStateRef.current = null;
    dropIndicatorRef.current = null;
    lastHoverFolderIdRef.current = null;
    clearTimeout(hoverExpandTimerRef.current);
    clearTimeout(leaveAllRowsTimerRef.current);
    setDragState(null);
    setDropIndicator(null);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (dragStartPosRef.current && !dragStateRef.current) {
        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_MOVE_CANCEL_PX) {
          clearTimeout(longPressTimerRef.current);
          dragStartPosRef.current = null;
        }
        return;
      }
      if (!dragStateRef.current) return;
      updateDropIndicatorFromPoint(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      clearTimeout(longPressTimerRef.current);
      dragStartPosRef.current = null;
      if (dragStateRef.current) {
        justDraggedRef.current = true;
        finalizeDrop();
        setTimeout(() => { justDraggedRef.current = false; }, 0);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [folders, learningNotes, expanded]);

  const handleRowMouseDown = (e, type, id) => {
    if (e.button !== 0) return;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      dragStateRef.current = { type, id };
      setDragState({ type, id });
    }, DRAG_LONG_PRESS_MS);
  };
  const resources = useMemo(() => notes.filter((n) => n.isResource), [notes]);
  const templates = useMemo(() => notes.filter((n) => n.isTemplate), [notes]);
  const selectedNote = learningNotes.find((n) => n.id === selectedNoteId) || null;

  const allTags = useMemo(() => {
    const s = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [notes]);

  const recentTags = useMemo(() => {
    const sorted = [...notes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    const seen = new Set();
    const ordered = [];
    sorted.forEach((n) => (n.tags || []).forEach((t) => { if (!seen.has(t)) { seen.add(t); ordered.push(t); } }));
    return ordered.slice(0, 8);
  }, [notes]);

  const folderPathFor = (folderId) => {
    if (!folderId) return "";
    const parts = [];
    let cur = folders.find((f) => f.id === folderId);
    while (cur) { parts.unshift(cur.name); cur = folders.find((f) => f.id === cur.parentId); }
    return parts.join(" / ");
  };

  const toggleExpand = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const [recentlyViewedIds, setRecentlyViewedIds] = useState(() => {
    try {
      const raw = localStorage.getItem("tj-recently-viewed");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const recordNoteView = (id) => {
    setRecentlyViewedIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 15);
      try { localStorage.setItem("tj-recently-viewed", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const selectNote = (id, autoFocus = false) => {
    setSelectedNoteId(id);
    setAutoFocusNoteId(autoFocus ? id : null);
    if (id) {
      setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      recordNoteView(id);
    }
  };
  const closeTab = (id) => {
    setOpenTabIds((prev) => {
      const idx = prev.indexOf(id);
      const next = prev.filter((tid) => tid !== id);
      if (selectedNoteId === id) {
        // Prefer the tab that takes the closed one's place, falling back to
        // the one before it, falling back to nothing — matching how most
        // tabbed interfaces pick the next active tab.
        const newActive = next[idx] ?? next[idx - 1] ?? null;
        setSelectedNoteId(newActive);
        setAutoFocusNoteId(null);
      }
      return next;
    });
  };

  const handleCreateNote = async (folderId) => {
    const created = await onAdd({ title: "", content: "", tags: [], isResource: false, folderId: folderId || null });
    if (folderId) setExpanded((prev) => new Set(prev).add(folderId));
    selectNote(created.id, true);
  };

  const handleCreateFolder = async (parentId) => {
    const created = await onAddFolder(parentId || null);
    if (!created) return;
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    setRenamingFolderId(created.id);
    setRenameDraft(created.name);
  };

  const commitRename = async (id) => {
    await onRenameFolder(id, renameDraft);
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = async (id) => {
    // Notes inside the deleted folder (or any of its subfolders) are
    // unfiled server-side, never deleted — if the currently-open note was
    // one of them it just stays open, now showing as Uncategorized.
    await onDeleteFolder(id);
  };

  // --- Bulk actions on the sidebar multi-selection ---
  const folderDescendantsAndSelf = (folderId) => {
    const ids = new Set([folderId]);
    let grew = true;
    while (grew) {
      grew = false;
      folders.forEach((f) => { if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
    }
    return ids;
  };
  const selectedItemsList = Array.from(selectedItems).map((key) => {
    const [type, id] = key.split(":");
    return { type, id };
  });
  const selectionHasOnlyNotes = selectedItemsList.length > 0 && selectedItemsList.every((i) => i.type === "note");
  const bulkMoveExcludedIds = () => {
    const excluded = new Set();
    selectedItemsList.forEach(({ type, id }) => {
      if (type === "folder") folderDescendantsAndSelf(id).forEach((fid) => excluded.add(fid));
    });
    return excluded;
  };
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const bulkDelete = async () => {
    const noteIds = [];
    for (const { type, id } of selectedItemsList) {
      if (type === "note") {
        noteIds.push(id);
        closeTab(id);
      } else {
        await handleDeleteFolder(id);
      }
    }
    if (noteIds.length > 0) onBulkDeleteNotes(noteIds);
    clearSelection();
    setBulkDeleteConfirmOpen(false);
  };
  const bulkDuplicate = async () => {
    const duplicatedTitles = [];
    for (const { type, id } of selectedItemsList) {
      if (type !== "note") continue;
      const note = learningNotes.find((n) => n.id === id);
      if (note) {
        const created = await onDuplicateNote(note);
        if (created) duplicatedTitles.push(note.title || "Untitled");
      }
    }
    clearSelection();
    if (duplicatedTitles.length === 1) {
      notify(`"${duplicatedTitles[0]}" duplicated.`);
    } else if (duplicatedTitles.length > 1) {
      notify(`${duplicatedTitles.length} notes duplicated.`);
    }
  };
  const bulkMove = async (targetFolderId) => {
    let movedNoteCount = 0;
    for (const { type, id } of selectedItemsList) {
      if (type === "note") { await onMoveNote(id, targetFolderId); movedNoteCount++; }
      else await onMoveFolder(id, targetFolderId);
    }
    clearSelection();
    setMoveMenuOpen(false);
    if (movedNoteCount === 1) {
      notify("1 note moved.");
    } else if (movedNoteCount > 1) {
      notify(`${movedNoteCount} notes moved.`);
    }
  };
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    if (dragState || tabDragState) {
      const styleEl = document.createElement("style");
      styleEl.textContent = "* { cursor: grabbing !important; }";
      document.head.appendChild(styleEl);
      return () => { document.head.removeChild(styleEl); };
    }
  }, [dragState, tabDragState]);

  // --- Notes tree ---
  const renderNoteLeaf = (n, depth) => {
    const menuOpenHere = openMenuRowId === n.id;
    const isSelected = selectedNoteId === n.id;
    const key = `note:${n.id}`;
    const isMultiSelected = selectedItems.has(key);
    const isBeingDragged = dragState && dragState.type === "note" && dragState.id === n.id;
    return (
      <div
        key={n.id}
        data-drag-type="note"
        data-drag-id={n.id}
        data-drag-parent={n.folderId || ""}
        className={`group flex items-center gap-1.5 pr-1.5 py-1.5 cursor-pointer text-xs w-full mb-1 select-none ${isSelected ? "tj-primary-bg font-semibold" : "tj-row-hover tj-note-text"} ${revealFlashId === n.id ? "tj-reveal-flash" : ""}`}
        style={{
          paddingLeft: 8 + depth * 16,
          backgroundColor: !isSelected && menuOpenHere ? "rgba(128,128,128,0.15)" : undefined,
          borderRadius: "var(--tj-radius-sm)",
          boxShadow: isMultiSelected ? "inset 0 0 0 1.5px var(--tj-primary)" : undefined,
          opacity: isBeingDragged ? 0.4 : 1,
        }}
        onMouseDown={(e) => handleRowMouseDown(e, "note", n.id)}
        onClick={(e) => { if (justDraggedRef.current) return; onRowClick(e, "note", n.id, () => selectNote(n.id)); }}
      >
        <IconFileText size={12} className="flex-shrink-0 opacity-70" />
        <span className="truncate flex-1">{n.title || "Untitled"}</span>
        <span className={`${menuOpenHere ? "flex" : "hidden group-hover:flex"} items-center flex-shrink-0`} onClick={(e) => e.stopPropagation()}>
          <RowMenu
            mode="note"
            folders={folders}
            currentFolderId={n.folderId || ""}
            starred={n.starred}
            onMove={(fid) => onMoveNote(n.id, fid)}
            onDuplicate={async () => { const created = await onDuplicateNote(n); if (created) notify(`"${n.title || "Untitled"}" duplicated.`); }}
            onToggleStar={() => onToggleStar(n)}
            onDelete={async () => {
              const title = n.title || "Untitled";
              await onDelete(n.id, `"${title}" deleted.`);
              closeTab(n.id);
            }}
            onOpenChange={(isOpen) => setOpenMenuRowId(isOpen ? n.id : null)}
          />
        </span>
      </div>
    );
  };

  const renderFolder = (folder, depth) => {
    const isExpanded = expanded.has(folder.id);
    const menuOpenHere = openMenuRowId === `folder:${folder.id}`;
    const childFolders = folders.filter((f) => f.parentId === folder.id).sort(sortByOrder);
    const childNotes = learningNotes.filter((n) => n.folderId === folder.id).sort(sortByOrder);
    const key = `folder:${folder.id}`;
    const isMultiSelected = selectedItems.has(key);
    const isBeingDragged = dragState && dragState.type === "folder" && dragState.id === folder.id;
    const isDropTarget = dropIndicator && dropIndicator.kind === "into" && dropIndicator.folderId === folder.id;
    return (
      <div key={folder.id}>
        <div
          data-drag-type="folder"
          data-drag-id={folder.id}
          data-drag-parent={folder.parentId || ""}
          className="group flex items-center gap-1 pr-1.5 py-1.5 tj-row-hover cursor-pointer text-xs tj-folder-text w-full mb-1 select-none"
          style={{
            paddingLeft: 4 + depth * 16,
            backgroundColor: menuOpenHere ? "rgba(128,128,128,0.15)" : undefined,
            borderRadius: "var(--tj-radius-sm)",
            boxShadow: isMultiSelected ? "inset 0 0 0 1.5px var(--tj-primary)" : isDropTarget ? "inset 0 0 0 1.5px var(--tj-primary)" : undefined,
            opacity: isBeingDragged ? 0.4 : 1,
          }}
          onMouseDown={(e) => handleRowMouseDown(e, "folder", folder.id)}
          onClick={(e) => { if (justDraggedRef.current) return; onRowClick(e, "folder", folder.id, () => toggleExpand(folder.id)); }}
        >
          {isExpanded ? <IconChevronDown size={12} className="flex-shrink-0 text-zinc-500" /> : <IconChevronRight size={12} className="flex-shrink-0 text-zinc-500" />}
          <IconFolder size={12} className="flex-shrink-0 opacity-80" />
          {renamingFolderId === folder.id ? (
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(folder.id); if (e.key === "Escape") setRenamingFolderId(null); }}
              onBlur={() => commitRename(folder.id)}
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          ) : (
            <span className="truncate flex-1 font-semibold">{folder.name}</span>
          )}
          <span className={`${menuOpenHere ? "flex" : "hidden group-hover:flex"} items-center flex-shrink-0`} onClick={(e) => e.stopPropagation()}>
            <RowMenu
              mode="folder"
              folders={folders}
              currentFolderId={folder.id}
              onNewNote={() => handleCreateNote(folder.id)}
              onNewFolder={() => handleCreateFolder(folder.id)}
              onRename={() => { setRenamingFolderId(folder.id); setRenameDraft(folder.name); }}
              onMove={(fid) => onMoveFolder(folder.id, fid)}
              onDelete={() => handleDeleteFolder(folder.id)}
              onOpenChange={(isOpen) => setOpenMenuRowId(isOpen ? `folder:${folder.id}` : null)}
            />
          </span>
        </div>
        <div
          className="w-full relative"
          style={{
            maxHeight: isExpanded ? 4000 : 0,
            opacity: isExpanded ? 1 : 0,
            overflow: isExpanded ? "visible" : "hidden",
            transition: "max-height 0.25s ease, opacity 0.2s ease",
            isolation: "isolate",
          }}
        >
          {isExpanded && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: 4 + depth * 16 + 5.5, width: 1, backgroundColor: "var(--tj-border, rgba(255,255,255,0.15))", zIndex: -1 }}
            />
          )}
          {childFolders.map((f) => renderFolder(f, depth + 1))}
          {childNotes.map((n) => renderNoteLeaf(n, depth + 1))}
        </div>
      </div>
    );
  };

  // Default order is newest-first (sortOrder is seeded from creation time
  // and never touched again except by an explicit drag-reorder), so this
  // one comparator drives every list in the tree.
  const sortByOrder = (a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
  const rootFolders = folders.filter((f) => !f.parentId).sort(sortByOrder);
  const rootNotes = learningNotes.filter((n) => !n.folderId).sort(sortByOrder);

  // Flattens the currently-visible tree (respecting expand/collapse state)
  // in the exact order it renders, so shift-click can select a contiguous
  // range the way the user actually sees it.
  const flattenVisibleTree = () => {
    const result = [];
    const visitFolder = (folder) => {
      result.push({ type: "folder", id: folder.id });
      if (expanded.has(folder.id)) {
        const childFolders = folders.filter((f) => f.parentId === folder.id).sort(sortByOrder);
        const childNotes = learningNotes.filter((n) => n.folderId === folder.id).sort(sortByOrder);
        childFolders.forEach(visitFolder);
        childNotes.forEach((n) => result.push({ type: "note", id: n.id }));
      }
    };
    rootFolders.forEach(visitFolder);
    rootNotes.forEach((n) => result.push({ type: "note", id: n.id }));
    return result;
  };

  // Combined click handler for both note and folder rows: plain click
  // clears any active selection and performs the row's normal action
  // (open note / toggle folder); ctrl/cmd-click toggles just that row in
  // or out of the selection; shift-click selects the contiguous range
  // from the last-clicked row to this one.
  const onRowClick = (e, type, id, normalAction) => {
    if (e.shiftKey && lastClickedItemRef.current) {
      e.preventDefault();
      const flat = flattenVisibleTree();
      const startIdx = flat.findIndex((r) => r.type === lastClickedItemRef.current.type && r.id === lastClickedItemRef.current.id);
      const endIdx = flat.findIndex((r) => r.type === type && r.id === id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const range = flat.slice(from, to + 1).map((r) => `${r.type}:${r.id}`);
        setSelectedItems((prev) => new Set([...prev, ...range]));
      }
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      toggleItemSelection(type, id);
      return;
    }
    if (selectedItems.size > 0) clearSelection();
    lastClickedItemRef.current = { type, id };
    normalAction();
  };

  // --- Search / Tags flat lists ---
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return learningNotes.filter((n) => {
      if (q) {
        const hay = `${n.title} ${n.content} ${(n.tags || []).join(" ")} ${n.linkedUnderlying || ""} ${n.linkedStrategy || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (noteFilterUnderlying && n.linkedUnderlying !== noteFilterUnderlying) return false;
      if (noteFilterStrategy && n.linkedStrategy !== noteFilterStrategy) return false;
      return true;
    }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [searchQuery, learningNotes, noteFilterUnderlying, noteFilterStrategy]);

  const noteFiltersActive = !!(noteFilterUnderlying || noteFilterStrategy);
  const noteSearchActive = !!searchQuery.trim() || noteFiltersActive;

  const noteUnderlyingOptions = useMemo(() => {
    return Array.from(new Set(learningNotes.map((n) => n.linkedUnderlying).filter(Boolean))).sort();
  }, [learningNotes]);
  const noteStrategyOptions = useMemo(() => {
    return Array.from(new Set(learningNotes.map((n) => n.linkedStrategy).filter(Boolean))).sort();
  }, [learningNotes]);
  const clearNoteFilters = () => {
    setNoteFilterUnderlying(null); setNoteFilterStrategy(null);
  };

  const recentlyViewedNotes = useMemo(() => {
    return recentlyViewedIds.map((id) => learningNotes.find((n) => n.id === id)).filter(Boolean);
  }, [recentlyViewedIds, learningNotes]);

  const tagCounts = useMemo(() => {
    const counts = {};
    learningNotes.forEach((n) => (n.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }, [learningNotes]);

  const tagResults = useMemo(() => {
    if (!activeTag) return [];
    return learningNotes.filter((n) => (n.tags || []).includes(activeTag)).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [activeTag, learningNotes]);

  const starredResults = useMemo(() => {
    return learningNotes.filter((n) => n.starred).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [learningNotes]);

  const renderFlatNoteRow = (n) => {
    const isActive = selectedNoteId === n.id;
    return (
      <div
        key={n.id}
        onClick={() => selectNote(n.id)}
        className={`w-full text-left px-2.5 py-2 text-xs cursor-pointer ${isActive ? "tj-primary-bg font-semibold" : "tj-row-hover tj-note-text"}`}
        style={{ borderRadius: "var(--tj-radius-sm)" }}
      >
        <p className="truncate font-semibold">{n.title || "Untitled"}</p>
        {n.content && (
          <p
            className="truncate text-[11px] mt-0.5"
            style={isActive ? { color: "var(--tj-primary-contrast)", opacity: 0.75 } : { color: "var(--tj-text4, #71717a)", opacity: 0.85 }}
          >
            {blockNoteSnippet(n.content, 10)}
          </p>
        )}
      </div>
    );
  };

  // --- Resources ---
  const handleDeleteResource = async (id) => {
    const r = resources.find((x) => x.id === id);
    await onDelete(id, `"${r ? (r.title || "Untitled") : "Untitled"}" deleted.`);
    setPendingDeleteResourceId(null);
  };
  const handleDeleteTemplate = async (id) => {
    const t = templates.find((x) => x.id === id);
    await onDelete(id, `"${t ? (t.title || "Untitled") : "Untitled"}" deleted.`);
    setPendingDeleteTemplateId(null);
  };
  const handleUseTemplate = async (template) => {
    const created = await onAdd({ title: "", content: template.content || "", tags: [], isResource: false, folderId: null });
    setRailView("notes");
    selectNote(created.id, true);
  };
  const handleCreateTemplate = async () => {
    const created = await onAdd({ title: "", content: "", tags: [], isResource: false, isTemplate: true, folderId: null });
    setTemplateEditorFor(created);
    setRailView("templateEditor");
  };

  return (
    <div className="flex tj-learnings-scope" style={{ height: `calc(100vh - ${navHeight}px)`, minHeight: 560 }}>
      <style>{`
        /* A hover-only background for tree/dropdown rows. Plain Tailwind
           "hover:bg-zinc-800" classes don't work here — this app has a
           global theme rule ([class*="bg-zinc-800"]) that matches the raw
           class *string*, not real :hover state, so a "hover:bg-zinc-800"
           class gets painted permanently regardless of whether the mouse
           is actually over it. This class sidesteps that entirely. */
        .tj-row-hover:hover { background-color: rgba(128,128,128,0.10); }
      `}</style>
      <LearningsRail view={railView} onChange={setRailView} />

      {railView === "templates" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2" style={FONT_DISPLAY}><IconLayoutGrid size={15} /> Templates</p>
            <button onClick={handleCreateTemplate} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
              <IconPlus size={13} /> New
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-xs text-zinc-500">No templates yet. Save a note's structure here to reuse it quickly next time.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 min-w-0">
                      <IconLayoutGrid size={13} className="flex-shrink-0 text-zinc-500" />
                      <span className="truncate">{t.title || "Untitled"}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Tooltip text="Edit"><button onClick={() => { setTemplateEditorFor(t); setRailView("templateEditor"); }} className="text-zinc-500 hover:tj-primary-text"><IconPencil size={13} /></button></Tooltip>
                      {pendingDeleteTemplateId === t.id ? (
                        <span className="flex items-center gap-1">
                          <Tooltip text="Confirm delete"><button onClick={() => handleDeleteTemplate(t.id)} className="text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={11} strokeWidth={3} /></button></Tooltip>
                          <Tooltip text="Cancel"><button onClick={() => setPendingDeleteTemplateId(null)} className="text-zinc-500 hover:text-zinc-300"><IconX size={13} /></button></Tooltip>
                        </span>
                      ) : (
                        <Tooltip text="Delete"><button onClick={() => setPendingDeleteTemplateId(t.id)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={13} /></button></Tooltip>
                      )}
                    </div>
                  </div>
                  {blockNoteSnippet(t.content) && <p className="text-xs text-zinc-400 leading-relaxed">{blockNoteSnippet(t.content)}</p>}
                  <div className="flex-1" />
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/70">
                    <button onClick={() => handleUseTemplate(t)} className="flex items-center gap-1 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
                      <IconPlus size={11} /> Use Template
                    </button>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0" style={FONT_MONO}>{t.updatedAt ? fmtDateDMY(t.updatedAt) : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : railView === "templateEditor" && templateEditorFor ? (
        <TemplateFullScreenEditor
          template={templateEditorFor}
          onUpdate={onUpdate}
          onDelete={handleDeleteTemplate}
          onBack={() => { setRailView("templates"); setTemplateEditorFor(null); }}
        />
      ) : railView === "resources" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2" style={FONT_DISPLAY}><IconBooks size={15} /> Resources</p>
            <button onClick={() => setResourceEditorFor({})} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
              <IconPlus size={13} /> New
            </button>
          </div>
          {resources.length === 0 ? (
            <p className="text-xs text-zinc-500">No saved resources yet. Add a link you check often.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.map((r) => (
                <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 min-w-0">
                      <IconBooks size={13} className="flex-shrink-0 text-zinc-500" />
                      <span className="truncate">{r.title || "Untitled"}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.resourceUrl && (
                        <Tooltip text="Open link">
                          <a href={r.resourceUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:tj-primary-text"><IconExternalLink size={13} /></a>
                        </Tooltip>
                      )}
                      <Tooltip text="Edit"><button onClick={() => setResourceEditorFor(r)} className="text-zinc-500 hover:tj-primary-text"><IconPencil size={13} /></button></Tooltip>
                      {pendingDeleteResourceId === r.id ? (
                        <span className="flex items-center gap-1">
                          <Tooltip text="Confirm delete"><button onClick={() => handleDeleteResource(r.id)} className="text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={11} strokeWidth={3} /></button></Tooltip>
                          <Tooltip text="Cancel"><button onClick={() => setPendingDeleteResourceId(null)} className="text-zinc-500 hover:text-zinc-300"><IconX size={13} /></button></Tooltip>
                        </span>
                      ) : (
                        <Tooltip text="Delete"><button onClick={() => setPendingDeleteResourceId(r.id)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={13} /></button></Tooltip>
                      )}
                    </div>
                  </div>
                  {r.content && <p className="text-xs text-zinc-400 leading-relaxed">{r.content}</p>}
                  {r.resourceUrl && <p className="text-[11px] text-zinc-600 truncate" style={FONT_MONO}>{r.resourceUrl}</p>}
                  <div className="flex-1" />
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/70">
                    <div className="flex flex-wrap gap-1">
                      {(r.tags || []).map((t) => (
                        <span key={t} className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><IconTag size={8} /> {t}</span>
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0" style={FONT_MONO}>{r.updatedAt ? fmtDateDMY(r.updatedAt) : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {resourceEditorFor !== null && (
            <ResourceEditorDialog
              initial={resourceEditorFor.id ? resourceEditorFor : null}
              allTags={allTags}
              recentTags={recentTags}
              onSave={async (payload) => {
                if (resourceEditorFor.id) { await onUpdate(resourceEditorFor.id, payload); }
                else { await onAdd(payload); }
              }}
              onClose={() => setResourceEditorFor(null)}
            />
          )}
        </div>
      ) : (
        <>
          <div
            className="flex-shrink-0 relative"
            style={{ width: sidebarCollapsed ? 0 : 288, transition: "width 0.25s ease" }}
          >
          <div className="h-full overflow-hidden" style={{ width: "100%" }}>
          <div className="w-72 h-full border-r border-zinc-800 flex flex-col overflow-hidden">
            {railView === "notes" && (
              <>
                <div className="flex-shrink-0 flex items-center justify-between px-3 border-b border-zinc-800/70" style={{ height: 49, backgroundColor: "var(--tj-panel)" }}>
                  {selectedItems.size > 0 ? (
                    <>
                      <p className="text-xs font-semibold tj-primary-text">{selectedItems.size} selected</p>
                      <div className="flex items-center gap-1">
                        <Tooltip text="Move to…">
                          <button ref={moveMenuBtnRef} onClick={() => setMoveMenuOpen((v) => !v)} className="text-zinc-400 hover:tj-primary-text p-1">
                            <IconFolderSymlink size={15} />
                          </button>
                        </Tooltip>
                        {selectionHasOnlyNotes && (
                          <Tooltip text="Duplicate">
                            <button onClick={bulkDuplicate} className="text-zinc-400 hover:tj-primary-text p-1"><IconCopy size={15} /></button>
                          </Tooltip>
                        )}
                        <Tooltip text="Delete">
                          <button onClick={() => setBulkDeleteConfirmOpen(true)} className="text-rose-400 hover:text-rose-300 p-1"><IconTrash size={15} /></button>
                        </Tooltip>
                        <Tooltip text="Clear selection">
                          <button onClick={clearSelection} className="text-zinc-500 hover:text-zinc-300 p-1"><IconX size={15} /></button>
                        </Tooltip>
                      </div>
                      {moveMenuOpen && createPortal(
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setMoveMenuOpen(false)} />
                          <div
                            className="tj-app fixed z-[61] w-56 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
                            style={(() => {
                              const r = moveMenuBtnRef.current ? moveMenuBtnRef.current.getBoundingClientRect() : { bottom: 0, left: 0 };
                              return { top: r.bottom + 4, left: r.left };
                            })()}
                          >
                            <button onClick={() => bulkMove(null)} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2">
                              <IconFolder size={14} className="flex-shrink-0" /> Uncategorized
                            </button>
                            {folders.filter((f) => !bulkMoveExcludedIds().has(f.id)).map((f) => (
                              <button key={f.id} onClick={() => bulkMove(f.id)} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2">
                                <IconFolder size={14} className="flex-shrink-0" /> <span className="truncate">{f.name}</span>
                              </button>
                            ))}
                          </div>
                        </>,
                        getPortalTarget()
                      )}
                      {bulkDeleteConfirmOpen && createPortal(
                        <>
                          <div className="fixed inset-0 z-[9998] bg-black/60" onClick={() => setBulkDeleteConfirmOpen(false)} />
                          <div className="tj-app fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-5 tj-popover">
                            <p className="text-sm text-zinc-200 mb-1 font-semibold">Delete {selectedItems.size} item{selectedItems.size === 1 ? "" : "s"}?</p>
                            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Notes inside any selected folders will be unfiled, not deleted.</p>
                            <div className="flex gap-2">
                              <button onClick={bulkDelete} className="flex-1 text-sm font-semibold bg-rose-500 hover:bg-rose-400 text-rose-950 rounded-lg py-2">Delete</button>
                              <button onClick={() => setBulkDeleteConfirmOpen(false)} className="flex-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2">Cancel</button>
                            </div>
                          </div>
                        </>,
                        getPortalTarget()
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">My Learnings</p>
                      <div className="flex items-center gap-2">
                        <Tooltip text="Locate current file"><button onClick={revealCurrentNote} disabled={!selectedNoteId} className={`text-zinc-500 hover:tj-primary-text ${!selectedNoteId ? "opacity-30 cursor-not-allowed" : ""}`}><IconCrosshair size={14} /></button></Tooltip>
                        <Tooltip text={allFoldersExpanded ? "Collapse all" : "Expand all"}>
                          <button onClick={toggleAllFolders} className="text-zinc-500 hover:tj-primary-text">
                            {allFoldersExpanded ? <IconChevronsUp size={14} /> : <IconChevronsDown size={14} />}
                          </button>
                        </Tooltip>
                        <Tooltip text="New folder"><button onClick={() => handleCreateFolder(null)} className="text-zinc-500 hover:tj-primary-text"><IconFolderPlus size={14} /></button></Tooltip>
                        <Tooltip text="New note"><button onClick={() => handleCreateNote(null)} className="text-zinc-500 hover:tj-primary-text"><IconFilePlus size={14} /></button></Tooltip>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto py-2 pl-2 pr-2 no-scrollbar">
                  {notesLoading ? (
                    <p className="text-xs text-zinc-500 px-3">Loading...</p>
                  ) : rootFolders.length === 0 && rootNotes.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-3">No notes yet. Use the icons above to start one.</p>
                  ) : (
                    <>
                      {rootFolders.map((f) => renderFolder(f, 0))}
                      {rootNotes.map((n) => renderNoteLeaf(n, 0))}
                    </>
                  )}
                </div>
              </>
            )}

            {railView === "search" && (
              <>
                <div className="flex-shrink-0 p-3 border-b border-zinc-800/70 space-y-2">
                  <div className="relative">
                    <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notes..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                      >
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {noteUnderlyingOptions.length > 0 && (
                      <CompactFilterButton
                        label="Underlying" active={!!noteFilterUnderlying}
                        displayValue={noteFilterUnderlying || "Any"}
                        options={[{ id: "any", label: "Any", selected: !noteFilterUnderlying }, ...noteUnderlyingOptions.map((u) => ({ id: u, label: u, selected: noteFilterUnderlying === u }))]}
                        onSelect={(id) => setNoteFilterUnderlying(id === "any" ? null : id)}
                      />
                    )}
                    {noteStrategyOptions.length > 0 && (
                      <CompactFilterButton
                        label="Strategy" active={!!noteFilterStrategy}
                        displayValue={noteFilterStrategy || "Any"}
                        options={[{ id: "any", label: "Any", selected: !noteFilterStrategy }, ...noteStrategyOptions.map((s) => ({ id: s, label: s, selected: noteFilterStrategy === s }))]}
                        onSelect={(id) => setNoteFilterStrategy(id === "any" ? null : id)}
                      />
                    )}
                    {noteFiltersActive && (
                      <button onClick={clearNoteFilters} className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 flex items-center gap-1">
                        <IconX size={10} /> Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {!noteSearchActive ? (
                    recentlyViewedNotes.length === 0 ? (
                      <p className="text-xs text-zinc-500 px-1.5">Start typing to search titles, tags, and content — or use the filters above.</p>
                    ) : (
                      <>
                        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide px-1.5 pt-1 pb-1.5">Recently viewed</p>
                        {recentlyViewedNotes.map(renderFlatNoteRow)}
                      </>
                    )
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-1.5">No notes match your search.</p>
                  ) : searchResults.map(renderFlatNoteRow)}
                </div>
              </>
            )}

            {railView === "tags" && (
              <>
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-zinc-800/70">
                  {activeTag && (
                    <button onClick={() => setActiveTag(null)} className="text-zinc-500 hover:text-zinc-300"><IconChevronLeft size={14} /></button>
                  )}
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{activeTag ? `#${activeTag}` : "Tags"}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {!activeTag ? (
                    Object.keys(tagCounts).length === 0 ? (
                      <p className="text-xs text-zinc-500 px-1.5">No tags yet.</p>
                    ) : Object.entries(tagCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([t, count]) => (
                      <button key={t} onClick={() => setActiveTag(t)} className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-zinc-300 tj-row-hover">
                        <span className="flex items-center gap-1.5"><IconTag size={11} /> {t}</span>
                        <span className="text-zinc-600">{count}</span>
                      </button>
                    ))
                  ) : (
                    tagResults.length === 0 ? (
                      <p className="text-xs text-zinc-500 px-1.5">No notes with this tag.</p>
                    ) : tagResults.map(renderFlatNoteRow)
                  )}
                </div>
              </>
            )}
            {railView === "starred" && (
              <>
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-zinc-800/70">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Starred</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {starredResults.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-1.5">No starred notes yet — star a note to pin it here.</p>
                  ) : starredResults.map(renderFlatNoteRow)}
                </div>
              </>
            )}
          </div>
          </div>
          <div className="absolute z-10" style={{ top: "50%", right: -12, transform: "translateY(-50%)" }}>
            <Tooltip text={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="w-6 h-6 rounded-full flex items-center justify-center tj-primary-bg shadow-lg hover:scale-110 active:scale-95 transition-transform"
              >
                {sidebarCollapsed ? <IconChevronRight size={13} /> : <IconChevronLeft size={13} />}
              </button>
            </Tooltip>
          </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {openTabIds.length > 0 && (
              <div className="flex-shrink-0 flex items-stretch border-b border-zinc-800/70" style={{ height: 49, backgroundColor: "var(--tj-panel)" }}>
                <div className="flex items-stretch overflow-x-auto flex-1 min-w-0 relative" style={{ scrollbarWidth: "none" }}>
                  {openTabIds.map((tid, idx) => {
                    const tabNote = learningNotes.find((n) => n.id === tid);
                    if (!tabNote) return null;
                    const isActive = tid === selectedNoteId;
                    const isBeingDragged = tabDragState && tabDragState.id === tid;
                    return (
                      <div
                        key={tid}
                        data-tab-id={tid}
                        onMouseDown={(e) => handleTabMouseDown(e, tid)}
                        onClick={() => { if (tabJustDraggedRef.current) return; selectNote(tid); }}
                        className={`group flex items-center gap-1.5 px-3 py-3 text-xs cursor-pointer border-b-2 select-none ${idx > 0 ? "border-l border-l-zinc-800/70" : ""} ${isActive ? "tj-primary-text font-semibold" : "border-b-transparent text-zinc-500 hover:text-zinc-300"}`}
                        style={{
                          borderBottomColor: isActive ? "var(--tj-primary)" : undefined,
                          backgroundColor: isActive ? "var(--tj-panel2)" : undefined,
                          flex: "0 1 240px",
                          minWidth: 0,
                          opacity: isBeingDragged ? 0.4 : 1,
                        }}
                      >
                        <span className="truncate flex-1">{tabNote.title || "Untitled"}</span>
                        <button onClick={(e) => { e.stopPropagation(); closeTab(tid); }} className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-100">
                          <IconX size={12} />
                        </button>
                      </div>
                    );
                  })}
                  {tabDragState && tabDropIndex !== null && (() => {
                    const container = document.querySelector(`[data-tab-id="${tabDragState.id}"]`)?.parentElement;
                    if (!container) return null;
                    const tabEls = Array.from(container.querySelectorAll("[data-tab-id]"));
                    const targetEl = tabEls[tabDropIndex];
                    const containerRect = container.getBoundingClientRect();
                    const left = targetEl
                      ? targetEl.getBoundingClientRect().left - containerRect.left + container.scrollLeft
                      : (tabEls[tabEls.length - 1]?.getBoundingClientRect().right - containerRect.left + container.scrollLeft) || 0;
                    return (
                      <div
                        className="absolute top-0 pointer-events-none"
                        style={{ left: left - 1, width: 2, height: 49, backgroundColor: "var(--tj-primary)", borderRadius: 2, zIndex: 10 }}
                      />
                    );
                  })()}
                </div>
                <button
                  onClick={() => handleCreateNote(null)}
                  className="flex-shrink-0 px-2.5 flex items-center justify-center text-zinc-500 hover:text-zinc-200 border-l border-zinc-800/70"
                  title="New note"
                >
                  <IconPlus size={14} />
                </button>
                <button
                  ref={tabListBtnRef}
                  onClick={() => setTabListOpen((v) => !v)}
                  className="flex-shrink-0 px-2.5 flex items-center justify-center text-zinc-500 hover:text-zinc-200 border-l border-zinc-800/70"
                  title="Open tabs"
                >
                  <IconChevronDown size={14} />
                </button>
                {tabListOpen && createPortal(
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setTabListOpen(false)} />
                    <div
                      className="tj-app fixed z-[61] w-64 max-h-96 overflow-y-auto rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
                      style={(() => {
                        const r = tabListBtnRef.current ? tabListBtnRef.current.getBoundingClientRect() : { bottom: 0, right: 0 };
                        return { top: r.bottom + 4, left: Math.max(8, r.right - 256) };
                      })()}
                    >
                      <button
                        onClick={() => { setOpenTabIds([]); setSelectedNoteId(null); setTabListOpen(false); }}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-rose-400 flex items-center gap-2.5"
                      >
                        <IconX size={14} className="flex-shrink-0" /> Close all
                      </button>
                      <div className="my-1.5 border-t border-zinc-800" />
                      {openTabIds.map((tid) => {
                        const tabNote = learningNotes.find((n) => n.id === tid);
                        if (!tabNote) return null;
                        const isActive = tid === selectedNoteId;
                        return (
                          <div
                            key={tid}
                            onClick={() => { selectNote(tid); setTabListOpen(false); }}
                            className={`group w-full text-left text-sm px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2.5 ${isActive ? "tj-primary-bg font-semibold" : "tj-row-hover text-zinc-300"}`}
                          >
                            <IconFileText size={13} className="flex-shrink-0 opacity-70" />
                            <span className="truncate flex-1">{tabNote.title || "Untitled"}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); closeTab(tid); }}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:text-zinc-100"
                            >
                              <IconX size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>,
                  getPortalTarget()
                )}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
            {selectedNote ? (
              <NoteMainPane
                key={selectedNote.id}
                note={selectedNote}
                folderPath={folderPathFor(selectedNote.folderId)}
                allTags={allTags}
                recentTags={recentTags}
                pnlEntries={pnlEntries}
                onUpdate={onUpdate}
                onDelete={async (id, message) => { const ok = await onDelete(id, message); closeTab(id); return ok; }}
                onDownloadPdf={onDownloadPdf}
                autoFocusTitle={autoFocusNoteId === selectedNote.id}
                templates={templates}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <IconBulb size={28} className="text-zinc-700" />
                <p className="text-sm text-zinc-500">Select a note, or start a new one.</p>
                <button onClick={() => handleCreateNote(null)} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
                  <IconFilePlus size={13} /> New Note
                </button>
              </div>
            )}
          </div>
          </div>
        </>
      )}
      {dropIndicator && createPortal(
        dropIndicator.kind === "line" ? (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{ top: dropIndicator.y - 1, left: dropIndicator.x, width: dropIndicator.width, height: 2, backgroundColor: "var(--tj-primary)", borderRadius: 2 }}
          />
        ) : (
          <div
            className="fixed z-[9999] pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tj-solid-bg border"
            style={{ top: dropIndicator.y + 4, left: dropIndicator.x + 12, borderColor: "var(--tj-primary)", color: "var(--tj-primary)" }}
          >
            <IconFolderSymlink size={13} /> Move to “{dropIndicator.folderName}”
          </div>
        ),
        getPortalTarget()
      )}
    </div>
  );
}
