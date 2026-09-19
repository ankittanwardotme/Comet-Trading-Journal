import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";
import { getPortalTarget } from "../../../lib/portal.js";
import { lockPageScroll, unlockPageScroll } from "../../../lib/scrollLock.js";

// Search-as-you-type picker for the reminder subcategory taxonomy — a
// plain dropdown doesn't hold up once there are 100+ options, so this
// filters by group as you type and shows a severity dot per option.
export function ReminderSearchablePicker({ groups, value, onSelect, totalCount }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const q = query.trim().toLowerCase();
  const filtered = groups.map((g) => ({ ...g, items: g.items.filter(([name]) => name.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 300);
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      const desiredHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom - 14;
      const spaceAbove = rect.top - 14;
      // Prefer opening below, as long as there's reasonably enough room;
      // otherwise flip upward if that side genuinely has more space to
      // offer — matching how native pickers avoid running off-screen.
      const openUpward = spaceBelow < Math.min(desiredHeight, 160) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(desiredHeight, openUpward ? spaceAbove : spaceBelow));
      const top = openUpward ? rect.top - 6 - maxHeight : rect.bottom + 6;
      setCoords({ top, left: Math.max(8, left), width, maxHeight });
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

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button" onClick={toggle}
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 text-left"
      >
        <span className="flex items-center gap-2 truncate">
          {value && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: REMINDER_SEVERITY[value[1]].dot }} />}
          <span className="truncate">{value ? value[0] : "Select a type…"}</span>
        </span>
        <IconChevronDown size={13} className="flex-shrink-0 text-zinc-500" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl flex flex-col tj-popover reminder-picker-scroll"
            style={{ width: coords.width, maxHeight: coords.maxHeight, top: coords.top, left: coords.left }}
          >
            <div className="p-2 border-b border-zinc-800 flex-shrink-0">
              <input
                autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${totalCount} types…`}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="overflow-y-auto p-1.5 reminder-picker-scroll">
              {filtered.length === 0 && <p className="text-xs text-zinc-600 p-3 text-center">No matches.</p>}
              {filtered.map((g) => (
                <div key={g.group} className="mb-2">
                  <p className="text-[9px] uppercase tracking-wide text-zinc-600 px-2 py-1" style={FONT_MONO}>{g.group}</p>
                  {g.items.map(([name, sev]) => (
                    <button
                      key={name} type="button"
                      onClick={() => { onSelect([name, sev]); setOpen(false); setQuery(""); }}
                      className="w-full flex items-center gap-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: REMINDER_SEVERITY[sev].dot }} />
                      <span className="truncate">{name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
