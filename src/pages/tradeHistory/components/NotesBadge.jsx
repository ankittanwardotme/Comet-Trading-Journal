import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconFileText } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { getPortalTarget } from "../../../lib/portal.js";
import { lockPageScroll, unlockPageScroll } from "../../../lib/scrollLock.js";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";

// Small pill showing how many My Learnings notes link to this trade. Only
// renders when there's at least one — stays invisible otherwise so it adds
// no clutter to trades nobody has written about. Portaled to escape the
// table cell's own truncate/overflow styling, same reasoning as
// DropdownFilterButton above.
export function NotesBadge({ notes, onOpenNote }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 264 - 8) });
    }
  };
  const toggle = () => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      unlockPageScroll();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  if (!notes || notes.length === 0) return null;

  return (
    <>
      <Tooltip text={`${notes.length} linked note${notes.length === 1 ? "" : "s"}`}>
        <button ref={btnRef} onClick={toggle} className="text-zinc-500 hover:tj-primary-text">
          <IconFileText size={14} />
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] w-64 rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 flex flex-col tj-popover"
            style={{ top: coords.top, left: coords.left }}
          >
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 px-2 pt-1 pb-1.5" style={FONT_MONO}>
              {notes.length} linked note{notes.length === 1 ? "" : "s"}
            </p>
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => { setOpen(false); if (onOpenNote) onOpenNote(n.id); }}
                className="w-full text-left text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg px-2 py-2 truncate transition-colors"
              >
                {n.title || "Untitled"}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}
