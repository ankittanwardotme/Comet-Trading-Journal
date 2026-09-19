import { useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  IconDotsVertical, IconFilePlus, IconFolderPlus, IconPencil, IconStarFilled, IconStar, IconCopy,
  IconFolderSymlink, IconTrash, IconChevronLeft, IconFolder,
} from "@tabler/icons-react";
import { getPortalTarget } from "../../../lib/portal.js";

// A single "⋮" trigger consolidating every per-row action (matching the
// reference pattern: one menu, everything listed under it, destructive
// actions colored) instead of a row of separate hover icons. Folders get
// New note / New subfolder / Rename / Delete; notes get Move to folder /
// Delete. The same popover switches between a "main" list, a "move to
// folder" sub-list, and an inline delete confirmation, rather than
// spawning separate floating menus for each.
export function RowMenu({ mode, folders, currentFolderId, onNewNote, onNewFolder, onRename, onDelete, onMove, onDuplicate, starred, onToggleStar, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("main"); // "main" | "move" | "confirmDelete"
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  const openMenu = (e) => {
    e.stopPropagation();
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.right - 192 });
    setView("main");
    setOpen(true);
    if (onOpenChange) onOpenChange(true);
  };
  const close = () => {
    setOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  const pathFor = (id) => {
    const parts = [];
    let cur = folders.find((f) => f.id === id);
    while (cur) { parts.unshift(cur.name); cur = folders.find((f) => f.id === cur.parentId); }
    return parts.join(" / ");
  };
  // When moving a folder, it — and everything already inside it — can't be
  // a valid destination: dropping a folder into its own subfolder would
  // create a cycle with no way back up to it.
  const excludedFolderIds = useMemo(() => {
    if (mode !== "folder") return new Set();
    const ids = new Set([currentFolderId]);
    let grew = true;
    while (grew) {
      grew = false;
      folders.forEach((f) => { if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
    }
    return ids;
  }, [mode, currentFolderId, folders]);
  const moveOptions = [
    { id: "", label: "Uncategorized" },
    ...folders.filter((f) => !excludedFolderIds.has(f.id)).map((f) => ({ id: f.id, label: pathFor(f.id) })),
  ].filter((o) => o.id !== currentFolderId);
  const moveLabel = mode === "folder" ? "Move folder to…" : "Move file to…";

  return (
    <>
      <button ref={btnRef} type="button" onClick={openMenu} className="opacity-60 hover:opacity-100 active:scale-95 px-0.5">
        <IconDotsVertical size={13} />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={close} />
          <div
            className="tj-app fixed z-[61] w-56 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
            style={{ top: coords.top, left: Math.max(8, coords.left) }}
            onClick={(e) => e.stopPropagation()}
          >
            {view === "main" && (
              <>
                {mode === "folder" && (
                  <>
                    <button onClick={() => { close(); onNewNote(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconFilePlus size={15} className="flex-shrink-0" /> New note</button>
                    <button onClick={() => { close(); onNewFolder(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconFolderPlus size={15} className="flex-shrink-0" /> New subfolder</button>
                    <button onClick={() => { close(); onRename(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconPencil size={14} className="flex-shrink-0" /> Rename</button>
                  </>
                )}
                {mode === "note" && (
                  <>
                    <button onClick={() => { close(); onToggleStar(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5">
                      {starred ? <IconStarFilled size={14} className="flex-shrink-0 text-amber-400" /> : <IconStar size={14} className="flex-shrink-0" />} {starred ? "Unstar" : "Star"}
                    </button>
                    <button onClick={() => { close(); onDuplicate(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconCopy size={14} className="flex-shrink-0" /> Duplicate</button>
                  </>
                )}
                <button onClick={() => setView("move")} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconFolderSymlink size={15} className="flex-shrink-0" /> {moveLabel}</button>
                <div className="my-1.5 border-t border-zinc-800" />
                <button onClick={() => setView("confirmDelete")} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-rose-400 flex items-center gap-2.5"><IconTrash size={15} className="flex-shrink-0" /> Delete</button>
              </>
            )}
            {view === "move" && (
              <>
                <button onClick={() => setView("main")} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-400 flex items-center gap-1.5 mb-1"><IconChevronLeft size={14} className="flex-shrink-0" /> Back</button>
                {moveOptions.map((o) => (
                  <button
                    key={o.id || "none"}
                    onClick={() => { close(); onMove(o.id); }}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover flex items-center gap-2 ${currentFolderId === o.id ? "tj-primary-text font-semibold" : "text-zinc-300"}`}
                  >
                    <IconFolder size={14} className="flex-shrink-0" /> <span className="truncate">{o.label}</span>
                  </button>
                ))}
              </>
            )}
            {view === "confirmDelete" && (
              <div className="p-2">
                <p className="text-xs text-zinc-300 px-1 pb-3 leading-relaxed">
                  {mode === "folder" ? "Delete this folder? Notes inside will be unfiled, not deleted." : "Delete this note?"}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { close(); onDelete(); }} className="flex-1 text-sm font-semibold bg-rose-500 hover:bg-rose-400 text-rose-950 rounded-lg py-2">Delete</button>
                  <button onClick={() => setView("main")} className="flex-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}
