import { useState, useEffect } from "react";
import { IconClock, IconFlag, IconPlus, IconChevronRight } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";
import { localISODate, isoToMonDDYYYY } from "../../../lib/dateUtils.js";
import { ReminderRowDisplay } from "./ReminderRowDisplay.jsx";
import { CalendarLegend } from "./CalendarLegend.jsx";

// ---------- MONTH VIEW ----------
export function MonthCalendarView({ dayMap, viewYear, viewMonth, onOpenTrade, onCreateAt, onEdit }) {
  const [selectedDate, setSelectedDate] = useState(localISODate(Date.now()));
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = localISODate(Date.now());
  const cellIso = (day) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  useEffect(() => {
    // Keep the selected day sensible when navigating months — snap to the
    // 1st of the newly-viewed month unless today happens to be in it.
    const inThisMonth = selectedDate.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`);
    if (!inThisMonth) setSelectedDate(todayIso.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`) ? todayIso : cellIso(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  const selectedInfo = dayMap[selectedDate] || { reminders: [], expiries: [], holiday: null };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex justify-end mb-3"><CalendarLegend /></div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-zinc-600 mb-1" style={FONT_MONO}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDow }).map((_, i) => <div key={"pad" + i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const iso = cellIso(day);
            const info = dayMap[iso] || { reminders: [], expiries: [], holiday: null };
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDate;
            const extraMarkerCount = (info.expiries.length > 0 ? 1 : 0) + (info.holiday ? 1 : 0);
            const dotLimit = extraMarkerCount > 0 ? 2 : 3;
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(iso)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition-colors ${
                  isSelected ? "tj-primary-bg font-bold" : isToday ? "border border-amber-400 text-zinc-100" : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {day}
                {(info.reminders.length > 0 || extraMarkerCount > 0) && (
                  <div className="flex items-center gap-1">
                    {info.reminders.slice(0, dotLimit).map((r, i) => (
                      <span key={i} className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: REMINDER_SEVERITY[r.severity].dot, boxShadow: isSelected ? "0 0 0 1.5px var(--tj-primary-contrast)" : "none" }} />
                    ))}
                    {info.expiries.length > 0 && <IconClock size={12} className="flex-shrink-0" style={{ color: isSelected ? "var(--tj-primary-contrast)" : "#38bdf8" }} />}
                    {info.holiday && <IconFlag size={12} className="flex-shrink-0" style={{ color: isSelected ? "var(--tj-primary-contrast)" : "#fbbf24" }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100">{isoToMonDDYYYY(selectedDate)}</p>
          <button onClick={() => onCreateAt(selectedDate, null)} className="flex items-center gap-1 text-xs tj-primary-bg font-semibold rounded-lg px-2.5 py-1.5">
            <IconPlus size={12} /> Add
          </button>
        </div>
        {selectedInfo.holiday && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30">
            <IconFlag size={14} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm text-zinc-100">{selectedInfo.holiday.name}</span>
          </div>
        )}
        {selectedInfo.expiries.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1.5" style={FONT_MONO}>Position Expiries</p>
            <div className="space-y-1.5">
              {selectedInfo.expiries.map((e) => (
                <button key={e.id} onClick={() => onOpenTrade && onOpenTrade(e.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-sky-400/10 border border-sky-400/30 hover:bg-sky-400/20 transition-colors text-left">
                  <IconClock size={12} className="text-sky-400 flex-shrink-0" />
                  <span className="text-xs text-zinc-200 truncate flex-1">{e.underlying} {e.strategyLabel}</span>
                  {!e.exitDate && <span className="text-[9px] text-sky-400 uppercase flex-shrink-0" style={FONT_MONO}>Open</span>}
                  <IconChevronRight size={12} className="text-sky-400/60 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
        {selectedInfo.reminders.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1.5" style={FONT_MONO}>Reminders</p>
            <div className="space-y-1.5">{selectedInfo.reminders.map((r) => <ReminderRowDisplay key={r.id} r={r} onEdit={onEdit} />)}</div>
          </div>
        )}
        {!selectedInfo.holiday && selectedInfo.expiries.length === 0 && selectedInfo.reminders.length === 0 && (
          <p className="text-xs text-zinc-600 py-4 text-center">Nothing on this day. Click Add to create one.</p>
        )}
      </div>
    </div>
  );
}
