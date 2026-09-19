import { MONTH_NAMES, localISODate } from "../../../lib/dateUtils.js";

// ---------- YEAR VIEW ----------
export function YearCalendarView({ dayMap, viewYear, onPickMonth }) {
  const today = new Date();
  const todayIso = localISODate(Date.now());
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {MONTH_NAMES.map((name, mi) => {
        const daysInMonth = new Date(viewYear, mi + 1, 0).getDate();
        const firstDow = new Date(viewYear, mi, 1).getDay();
        const isCurrentMonth = viewYear === today.getFullYear() && mi === today.getMonth();
        let count = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const iso = `${viewYear}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const info = dayMap[iso];
          if (info) count += info.reminders.length + info.expiries.length + (info.holiday ? 1 : 0);
        }
        return (
          <button key={name} onClick={() => onPickMonth(mi)} className={`rounded-2xl border p-3 text-left transition-colors hover:border-zinc-600 ${isCurrentMonth ? "border-amber-400/60 bg-amber-400/[0.04]" : "border-zinc-800 bg-zinc-900/40"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${isCurrentMonth ? "text-amber-400" : "text-zinc-200"}`}>{name}</p>
              {count > 0 && <span className="text-[10px] text-zinc-500">{count} {count === 1 ? "reminder" : "reminders"}</span>}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDow }).map((_, i) => <div key={"p" + i} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const iso = `${viewYear}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const info = dayMap[iso];
                const hasStuff = info && (info.reminders.length > 0 || info.expiries.length > 0 || info.holiday);
                const isToday = iso === todayIso;
                return <div key={d} className={`aspect-square rounded-sm ${isToday ? "bg-amber-400" : hasStuff ? "bg-zinc-500" : "bg-zinc-800/60"}`} />;
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
