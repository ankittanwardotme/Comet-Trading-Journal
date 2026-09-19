import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getPortalTarget } from "../../lib/portal.js";
import { lockPageScroll, unlockPageScroll } from "../../lib/scrollLock.js";
import { MoodEmoji } from "./MoodEmoji.jsx";

// "Label: Value ▾" filter button whose menu opens as a fixed-position
// portal overlay — used for the Trade Log mood filters. Collapsed by default
// (just the current selection shows) rather than a full row of chips, and
// highlights when a real filter is active.
const DROPDOWN_MENU_EST_WIDTH = 210;

export function DropdownFilterButton({ label, displayValue, options, onSelect, active, disabled }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - DROPDOWN_MENU_EST_WIDTH - 8);
      setCoords({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
  };
  const openMenu = () => { if (disabled) return; updatePosition(); setOpen(true); };

  // Once the menu has actually rendered, check whether it runs past the
  // bottom of the viewport — if so, scroll the page just enough to bring
  // the whole thing into view before scroll gets locked below. Without
  // this, a menu opened near the bottom of the page would have its lower
  // portion (and its own internal scrollbar) stranded off-screen with no
  // way to reach it once the page itself can no longer scroll.
  React.useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const overflow = menuRect.bottom - window.innerHeight;
    if (overflow > 0) {
      window.scrollBy(0, overflow + 40);
      updatePosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={active && !disabled ? { borderColor: "var(--tj-primary)", backgroundColor: "color-mix(in srgb, var(--tj-primary) 12%, transparent)" } : undefined}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500"
          : active ? "tj-primary-text font-semibold"
          : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
        }`}
      >
        <span className={active ? "" : "text-zinc-500"}>{label}:</span> {displayValue}
        <span className={`text-[10px] ${active ? "" : "text-zinc-500"}`}>▾</span>
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 max-h-72 overflow-y-auto tj-popover"
            style={{ top: coords.top, left: coords.left, width: DROPDOWN_MENU_EST_WIDTH }}
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onSelect(opt.id); setOpen(false); }}
                className={`tj-app w-full text-left flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg transition-colors ${
                  opt.selected ? "tj-primary-bg font-semibold" : "text-zinc-300"
                }`}
              >
                {opt.emoji && <MoodEmoji id={opt.id} size={15} />} {opt.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}
