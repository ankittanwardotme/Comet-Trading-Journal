import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { getPortalTarget } from "../../lib/portal.js";
import { FONT_MONO } from "../../lib/format.js";
import { MONTH_ABBR, pad2, monthLabel } from "../../lib/dateUtils.js";
import { CALENDAR_EST_HEIGHT } from "./CalendarPicker.jsx";

export function MonthPicker({ value, onChange, placeholder = "Select month" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const [viewYear, setViewYear] = useState(() => (value ? parseInt(value.slice(0, 4), 10) : new Date().getFullYear()));

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const width = Math.max(rect.width, 240);
      if (spaceBelow < CALENDAR_EST_HEIGHT && spaceAbove > spaceBelow) {
        setCoords({ top: Math.max(8, rect.top - 6 - CALENDAR_EST_HEIGHT), left: rect.left, width, openUpward: true });
      } else {
        setCoords({ top: rect.bottom + 6, left: rect.left, width, openUpward: false });
      }
    }
  };
  const openPicker = () => {
    setViewYear(value ? parseInt(value.slice(0, 4), 10) : new Date().getFullYear());
    updatePosition();
    setOpen(true);
  };
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
        <span className={value ? "text-zinc-100" : "text-zinc-600"}>{value ? monthLabel(value) : placeholder}</span>
        <IconCalendar size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-3 tj-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <button type="button" onClick={() => setViewYear((y) => y - 1)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <IconChevronLeft size={15} />
              </button>
              <p className="text-xs font-semibold text-zinc-200" style={FONT_MONO}>{viewYear}</p>
              <button type="button" onClick={() => setViewYear((y) => y + 1)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <IconChevronRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_ABBR.map((m, i) => {
                const key = `${viewYear}-${pad2(i + 1)}`;
                const isSelected = value === key;
                return (
                  <button
                    key={i} type="button"
                    onClick={() => { onChange(key); setOpen(false); }}
                    className={`text-xs py-2.5 rounded-lg transition-colors ${isSelected ? "tj-primary-bg font-bold" : "text-zinc-200 hover:bg-zinc-800"}`}
                    style={FONT_MONO}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
