import { useState, useMemo } from "react";
import { MONTH_ABBR, MONTH_NAMES, localISODate } from "../../../lib/dateUtils.js";
import { CalendarNavHeader } from "./CalendarNavHeader.jsx";
import { CalendarViewSwitcher } from "./CalendarViewSwitcher.jsx";
import { WeekCalendarView } from "./WeekCalendarView.jsx";
import { MonthCalendarView } from "./MonthCalendarView.jsx";
import { YearCalendarView } from "./YearCalendarView.jsx";

// Builds a lookup of every day in the given month that has something on
// it — reminders (by severity), position expiries (from pnlEntries, both
// open and closed — this is "for future and past reminders... with my
// position expiries"), and holidays. One pass over each source per month
// render rather than per-cell, since the sources are usually much smaller
// than 42 cells.
function buildReminderDayMap(remindersWithDays, pnlEntries, holidays) {
  const map = {};
  const ensure = (iso) => (map[iso] = map[iso] || { reminders: [], expiries: [], holiday: null });
  remindersWithDays.forEach((r) => { if (r.date) ensure(r.date).reminders.push(r); });
  (pnlEntries || []).forEach((e) => { if (e.expiryDate) ensure(e.expiryDate).expiries.push(e); });
  (holidays || []).forEach((h) => { if (h.date) ensure(h.date).holiday = h; });
  return map;
}

export function RemindersCalendar({ remindersWithDays, pnlEntries, holidays, onOpenTrade, onCreateAt, onEdit }) {
  const today = new Date();
  const [view, setView] = useState("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [weekStartIso, setWeekStartIso] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return localISODate(d.getTime());
  });
  const [direction, setDirection] = useState("forward");

  const dayMap = useMemo(() => buildReminderDayMap(remindersWithDays, pnlEntries, holidays), [remindersWithDays, pnlEntries, holidays]);

  const shiftWeek = (deltaWeeks) => {
    setDirection(deltaWeeks > 0 ? "forward" : "backward");
    const [y, m, d] = weekStartIso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaWeeks * 7);
    setWeekStartIso(localISODate(dt.getTime()));
  };
  const shiftMonth = (delta) => {
    setDirection(delta > 0 ? "forward" : "backward");
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
  };
  const shiftYear = (delta) => { setDirection(delta > 0 ? "forward" : "backward"); setViewYear((y) => y + delta); };

  const goToday = () => {
    // Slide in from whichever side matches how we're actually moving back
    // to the present — if the current view is ahead of today, returning
    // is a backward motion; if it's behind, returning is forward.
    const nowMs = today.getTime();
    let viewingAheadOfToday;
    if (view === "week") viewingAheadOfToday = new Date(weekStartIso).getTime() > nowMs;
    else if (view === "month") viewingAheadOfToday = viewYear * 12 + viewMonth > today.getFullYear() * 12 + today.getMonth();
    else viewingAheadOfToday = viewYear > today.getFullYear();
    setDirection(viewingAheadOfToday ? "backward" : "forward");
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth());
    const d = new Date(today); d.setDate(d.getDate() - d.getDay());
    setWeekStartIso(localISODate(d.getTime()));
  };

  const weekEndLabel = useMemo(() => {
    const [y, m, d] = weekStartIso.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return sameMonth
      ? `${MONTH_ABBR[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`
      : `${MONTH_ABBR[start.getMonth()]} ${start.getDate()} - ${MONTH_ABBR[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }, [weekStartIso]);

  const labels = { week: weekEndLabel, month: `${MONTH_NAMES[viewMonth]} ${viewYear}`, year: String(viewYear) };
  const navHandlers = {
    week: { onPrev: () => shiftWeek(-1), onNext: () => shiftWeek(1) },
    month: { onPrev: () => shiftMonth(-1), onNext: () => shiftMonth(1) },
    year: { onPrev: () => shiftYear(-1), onNext: () => shiftYear(1) },
  };
  const todayWeekStartIso = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return localISODate(d.getTime());
  }, []);
  const isCurrent = {
    week: weekStartIso === todayWeekStartIso,
    month: viewYear === today.getFullYear() && viewMonth === today.getMonth(),
    year: viewYear === today.getFullYear(),
  };
  const backLabels = { week: "Return to This Week", month: "Return to This Month", year: "Return to This Year" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <CalendarNavHeader
          label={labels[view]} onPrev={navHandlers[view].onPrev} onNext={navHandlers[view].onNext}
          isCurrent={isCurrent[view]} backLabel={backLabels[view]} onBack={goToday} direction={direction}
        />
        <CalendarViewSwitcher view={view} setView={setView} />
      </div>
      <div key={`${view}-${labels[view]}`} className={direction === "backward" ? "tj-calendar-fade-back" : "tj-calendar-fade"}>
        {view === "week" && <WeekCalendarView dayMap={dayMap} weekStartIso={weekStartIso} onOpenTrade={onOpenTrade} onCreateAt={onCreateAt} onEdit={onEdit} />}
        {view === "month" && <MonthCalendarView dayMap={dayMap} viewYear={viewYear} viewMonth={viewMonth} onOpenTrade={onOpenTrade} onCreateAt={onCreateAt} onEdit={onEdit} />}
        {view === "year" && <YearCalendarView dayMap={dayMap} viewYear={viewYear} onPickMonth={(mi) => { setDirection("forward"); setViewMonth(mi); setView("month"); }} />}
      </div>
    </div>
  );
}
