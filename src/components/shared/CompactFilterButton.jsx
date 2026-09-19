import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getPortalTarget } from "../../lib/portal.js";
import { MoodEmoji } from "./MoodEmoji.jsx";

// Same behavior as DropdownFilterButton, sized down for narrow contexts
// (the 288px sidebar) where four of these need to sit in a row without
// wrapping awkwardly.
export function CompactFilterButton({ label, displayValue, options, onSelect, active, disabled }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const MENU_WIDTH = 180;

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
      setCoords({ top: rect.bottom + 4, left: Math.max(8, left) });
    }
  };
  const openMenu = () => { if (disabled) return; updatePosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
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
        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500"
          : active ? "tj-primary-text font-semibold"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
        }`}
      >
        <span className={active ? "" : "text-zinc-500"}>{label}:</span> {displayValue}
        <span className={`text-[9px] ${active ? "" : "text-zinc-500"}`}>▾</span>
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 max-h-72 overflow-y-auto tj-popover"
            style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
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
                {opt.emoji && <MoodEmoji id={opt.id} size={14} />} {opt.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}
