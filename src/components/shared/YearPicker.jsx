import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconCalendar } from "@tabler/icons-react";
import { getPortalTarget } from "../../lib/portal.js";
import { FONT_MONO } from "../../lib/format.js";

export function YearPicker({ value, onChange, years, placeholder = "Select year" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const width = Math.max(rect.width, 160);
      if (spaceBelow < 260 && spaceAbove > spaceBelow) {
        setCoords({ top: Math.max(8, rect.top - 6 - 260), left: rect.left, width, openUpward: true });
      } else {
        setCoords({ top: rect.bottom + 6, left: rect.left, width, openUpward: false });
      }
    }
  };
  const openPicker = () => { updatePosition(); setOpen(true); };
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
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={() => (open ? setOpen(false) : openPicker())}
        className="w-full flex items-center justify-between gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
        style={FONT_MONO}
      >
        <span className={value ? "text-zinc-100" : "text-zinc-600"}>{value || placeholder}</span>
        <IconCalendar size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] max-h-60 overflow-y-auto rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-2 tj-popover space-y-1"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {years.map((y) => (
              <button
                key={y} type="button"
                onClick={() => { onChange(y); setOpen(false); }}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${value === y ? "tj-primary-bg font-bold" : "text-zinc-200 hover:bg-zinc-800"}`}
                style={FONT_MONO}
              >
                {y}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
