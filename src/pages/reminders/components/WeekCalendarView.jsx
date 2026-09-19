import { useState, useEffect, useMemo, useRef } from "react";
import { IconClock, IconFlag, IconPlus } from "@tabler/icons-react";
import { FONT_MONO, fmtHour12 } from "../../../lib/format.js";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";
import { reminderTimeToHour24, reminderTimeDisplay } from "../../../lib/reminderTime.js";
import { localISODate, isoToMonDDYYYY } from "../../../lib/dateUtils.js";
import { ReminderRowDisplay } from "./ReminderRowDisplay.jsx";
import { CalendarLegend } from "./CalendarLegend.jsx";

// ---------- WEEK VIEW — week strip on top, active day's hours below ----------
export function WeekCalendarView({ dayMap, weekStartIso, onOpenTrade, onCreateAt, onEdit }) {
  const todayIso = localISODate(Date.now());
  const [activeDay, setActiveDay] = useState(todayIso);
  const hourlyRef = useRef(null);

  const weekDays = useMemo(() => {
    const [y, m, d] = weekStartIso.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(start); dt.setDate(start.getDate() + i);
      return { iso: localISODate(dt.getTime()), dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()], day: dt.getDate() };
    });
  }, [weekStartIso]);

  useEffect(() => {
    if (!weekDays.some((d) => d.iso === activeDay)) {
      setActiveDay(weekDays.some((d) => d.iso === todayIso) ? todayIso : weekDays[0].iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays]);

  const nowHour = new Date().getHours();
  const isActiveToday = activeDay === todayIso;

  useEffect(() => {
    if (!hourlyRef.current) return;
    const targetHour = isActiveToday ? nowHour : 9;
    const row = hourlyRef.current.querySelector(`[data-hour="${targetHour}"]`);
    if (row) row.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay]);

  const activeInfo = dayMap[activeDay] || { reminders: [], expiries: [], holiday: null };
  const untimed = activeInfo.reminders.filter((r) => !r.time);
  const timed = activeInfo.reminders.filter((r) => r.time);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex justify-end mb-3"><CalendarLegend /></div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(({ iso, dow, day }) => {
            const info = dayMap[iso] || { reminders: [], expiries: [], holiday: null };
            const isToday = iso === todayIso;
            const isActive = iso === activeDay;
            const extraMarkerCount = (info.expiries.length > 0 ? 1 : 0) + (info.holiday ? 1 : 0);
            const dotLimit = extraMarkerCount > 0 ? 2 : 3;
            return (
              <button
                key={iso} onClick={() => setActiveDay(iso)}
                className={`rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition-colors ${isActive ? "tj-primary-bg" : isToday ? "border border-amber-400" : "bg-zinc-900/60 hover:bg-zinc-800"}`}
              >
                <span className={`text-[10px] uppercase ${isActive ? "opacity-90" : "text-zinc-500"}`}>{dow}</span>
                <span className={`text-lg font-bold ${isActive ? "" : isToday ? "text-amber-400" : "text-zinc-100"}`}>{day}</span>
                <div className="flex items-center gap-0.5 h-3">
                  {info.reminders.slice(0, dotLimit).map((r, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? "#fff" : REMINDER_SEVERITY[r.severity].dot }} />)}
                  {info.expiries.length > 0 && <IconClock size={10} style={{ color: isActive ? "#fff" : "#38bdf8" }} />}
                  {info.holiday && <IconFlag size={10} style={{ color: isActive ? "#fff" : "#fbbf24" }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-100">{isoToMonDDYYYY(activeDay)}</p>
          <button onClick={() => onCreateAt(activeDay, null)} className="flex items-center gap-1 text-xs tj-primary-bg font-semibold rounded-lg px-2.5 py-1.5">
            <IconPlus size={12} /> Add
          </button>
        </div>
        {activeInfo.holiday && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 mb-3">
            <IconFlag size={14} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm text-zinc-100">{activeInfo.holiday.name}</span>
          </div>
        )}
        {activeInfo.expiries.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {activeInfo.expiries.map((e) => (
              <button key={e.id} onClick={() => onOpenTrade && onOpenTrade(e.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-sky-400/10 border border-sky-400/30 hover:bg-sky-400/20 transition-colors text-left">
                <IconClock size={12} className="text-sky-400 flex-shrink-0" />
                <span className="text-xs text-zinc-200 truncate flex-1">{e.underlying} {e.strategyLabel}</span>
                {!e.exitDate && <span className="text-[9px] text-sky-400 uppercase flex-shrink-0" style={FONT_MONO}>Open</span>}
              </button>
            ))}
          </div>
        )}
        {untimed.length > 0 && (
          <div className="mb-3 pb-3 border-b border-zinc-800 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">No time set</p>
            {untimed.map((r) => <ReminderRowDisplay key={r.id} r={r} onEdit={onEdit} />)}
          </div>
        )}
        <div ref={hourlyRef} className="relative" style={{ maxHeight: 420, overflowY: "auto" }}>
          {hours.map((h) => {
            const remindersThisHour = timed.filter((r) => reminderTimeToHour24(r.time) === h);
            const isCurrentHour = isActiveToday && h === nowHour;
            return (
              <div
                key={h} data-hour={h}
                onClick={() => onCreateAt(activeDay, `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`)}
                className={`flex items-start gap-3 group cursor-pointer rounded-lg transition-colors ${isCurrentHour ? "bg-amber-400/[0.08]" : "hover:bg-zinc-900/60"}`}
                style={{ minHeight: 40 }}
              >
                <span className={`text-[10px] w-12 text-right pt-1.5 flex-shrink-0 ${isCurrentHour ? "text-amber-400 font-semibold" : "text-zinc-600"}`}>{fmtHour12(h)}</span>
                <div className="flex-1 border-t border-zinc-800/60 pt-1">
                  {remindersThisHour.map((r) => {
                    const s = REMINDER_SEVERITY[r.severity];
                    return <div key={r.id} className={`text-xs px-2.5 py-1.5 rounded-lg ${s.bg} ${s.text} inline-block mb-1 mr-1`}>{r.time && <span className="opacity-70">{reminderTimeDisplay(r.time)} </span>}{r.title}</div>;
                  })}
                  {remindersThisHour.length === 0 && (
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-600 flex items-center gap-1 transition-opacity">
                      <IconPlus size={9} /> Add at {fmtHour12(h)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
