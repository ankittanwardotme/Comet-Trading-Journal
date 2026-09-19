import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { getPortalTarget } from "../../lib/portal.js";
import { FONT_MONO } from "../../lib/format.js";
import { isWeekendISO, localISODate, isoToDMY, MONTH_NAMES, MONTH_ABBR, pad2 } from "../../lib/dateUtils.js";

export function buildCalendarWeeks(year, monthIdx) {
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const startDow = new Date(year, monthIdx, 1).getDay(); // 0=Sun..6=Sat
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const weeks = [];
  let week = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    week.push(dayNum < 1 || dayNum > daysInMonth ? null : dayNum);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  return weeks;
}

export const CALENDAR_DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// businessDaysOnly=true: weekends + holiday-calendar dates render red and
// are inert — clicking them neither selects nor closes the calendar, per
// spec. businessDaysOnly=false (used for export/filter ranges, which can
// legitimately span any day up to today): every day up to maxDate behaves
// normally, no red styling.
export const CALENDAR_EST_HEIGHT = 370;

export function CalendarPicker({ value, onChange, holidays, businessDaysOnly = false, highlightNonBusinessDays = false, minDate, maxDate, placeholder = "Select date", compact = false, error = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [subView, setSubView] = useState("days"); // "days" | "months" — click the header to jump years fast
  const btnRef = useRef(null);
  const holidaySet = useMemo(() => new Set((holidays || []).map((h) => h.date)), [holidays]);

  const parseViewFromValue = () => {
    if (value) { const [y, m] = value.split("-").map(Number); return { year: y, month: m - 1 }; }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  };
  const [view, setView] = useState(parseViewFromValue);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const width = Math.max(rect.width, 280);
      // Flip to open upward when there isn't room below but there is
      // above — otherwise the popup can render mostly off-screen with no
      // way to scroll it into view, since it's viewport-fixed, not
      // page-fixed. When flipping, clamp the top so the popup can never
      // itself clip off the top of the viewport (a hard boundary nothing
      // can render above), regardless of how close the button is to it.
      if (spaceBelow < CALENDAR_EST_HEIGHT && spaceAbove > spaceBelow) {
        setCoords({ top: Math.max(8, rect.top - 6 - CALENDAR_EST_HEIGHT), left: rect.left, width, openUpward: true });
      } else {
        setCoords({ top: rect.bottom + 6, left: rect.left, width, openUpward: false });
      }
    }
  };
  const openCalendar = () => {
    setView(parseViewFromValue());
    setSubView("days");
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

  const isNonBusinessDay = (iso) => isWeekendISO(iso) || holidaySet.has(iso);
  const isSelectable = (iso) => {
    if (minDate && iso < minDate) return false;
    if (maxDate && iso > maxDate) return false;
    if (businessDaysOnly && isNonBusinessDay(iso)) return false;
    return true;
  };

  const handleDayClick = (iso) => {
    if (!isSelectable(iso)) return; // invalid — no selection, no close
    onChange(iso);
    setOpen(false);
  };

  const weeks = buildCalendarWeeks(view.year, view.month);
  const todayIso = localISODate(Date.now());
  const goPrevMonth = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNextMonth = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  const showRedHeader = businessDaysOnly || highlightNonBusinessDays;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        className={`w-full flex items-center justify-between gap-1.5 bg-zinc-950 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 ${error ? "border-rose-500" : "border-zinc-800"} ${compact ? "px-2 py-1.5" : "px-3 py-2"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        style={FONT_MONO}
      >
        <span className={`whitespace-nowrap ${value ? "text-zinc-100" : "text-zinc-600"}`}>{value ? isoToDMY(value) : placeholder}</span>
        <IconCalendar size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-3 tj-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {subView === "days" ? (
              <>
                <div className="flex items-center justify-between mb-3 px-1">
                  <button type="button" onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronLeft size={15} />
                  </button>
                  <button type="button" onClick={() => setSubView("months")} className="text-xs font-semibold text-zinc-200 hover:text-amber-400 transition-colors px-2 py-0.5 rounded" style={FONT_MONO}>
                    {MONTH_NAMES[view.month]} {view.year}
                  </button>
                  <button type="button" onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronRight size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {CALENDAR_DOW_LABELS.map((d, i) => (
                    <div key={i} className={`text-center text-[10px] font-semibold ${showRedHeader && (i === 0 || i === 6) ? "text-rose-600" : "text-zinc-500"}`} style={FONT_MONO}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weeks.flat().map((dayNum, i) => {
                    if (dayNum === null) return <div key={i} />;
                    const iso = `${view.year}-${pad2(view.month + 1)}-${pad2(dayNum)}`;
                    const selectable = isSelectable(iso);
                    const showRed = showRedHeader && isNonBusinessDay(iso);
                    const isSelected = value === iso;
                    const isToday = todayIso === iso;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDayClick(iso)}
                        disabled={!selectable}
                        className={`aspect-square rounded-lg text-xs flex items-center justify-center transition-colors ${
                          isSelected ? "tj-primary-bg font-bold" :
                          !selectable ? `cursor-not-allowed ${showRed ? "text-rose-600/70" : "text-zinc-700"}` :
                          `${showRed ? "text-rose-600" : "text-zinc-200"} hover:bg-zinc-800 ${isToday ? "ring-1 ring-inset ring-zinc-600" : ""}`
                        }`}
                        style={FONT_MONO}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 px-1">
                  <button type="button" onClick={() => setView((v) => ({ ...v, year: v.year - 1 }))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronLeft size={15} />
                  </button>
                  <p className="text-xs font-semibold text-zinc-200" style={FONT_MONO}>{view.year}</p>
                  <button type="button" onClick={() => setView((v) => ({ ...v, year: v.year + 1 }))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronRight size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_ABBR.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setView((v) => ({ ...v, month: i })); setSubView("days"); }}
                      className={`text-xs py-2.5 rounded-lg transition-colors ${view.month === i && subView === "months" ? "tj-primary-bg font-bold" : "text-zinc-200 hover:bg-zinc-800"}`}
                      style={FONT_MONO}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
              <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-colors">
                Clear
              </button>
              <button type="button" onClick={() => setOpen(false)} className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
