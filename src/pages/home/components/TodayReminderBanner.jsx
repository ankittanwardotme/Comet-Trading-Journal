import { useState } from "react";
import { IconClock, IconX } from "@tabler/icons-react";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";
import { reminderCombinedEpoch, reminderDayLabel, reminderTimeDisplay } from "../../../lib/reminderTime.js";
import { localISODate, isoToWordDate } from "../../../lib/dateUtils.js";

export function TodayReminderBanner({ dueReminders }) {
  const todayKey = localISODate(Date.now());
  // Keyed by reminder ID -> the scheduled-moment key it was dismissed for.
  // Editing a reminder to a new time changes its key, so a dismissed,
  // elapsed reminder that gets moved to a future time today naturally
  // reappears — no special-casing needed beyond just comparing keys.
  const [dismissedFor, setDismissedFor] = useState(() => {
    try {
      const raw = localStorage.getItem("tj-reminders-banner-dismissed");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.day === todayKey && parsed.map && typeof parsed.map === "object") return parsed.map;
      return {};
    } catch { return {}; }
  });
  const momentKey = (r) => (r.time ? String(reminderCombinedEpoch(r)) : `${r.date}-noTime`);
  const now = Date.now();
  // Elapsed (time already passed today) reminders never show, regardless
  // of dismissal state — unless editing has moved them to a future moment.
  const notElapsed = dueReminders.filter((r) => !r.time || reminderCombinedEpoch(r) >= now);
  const visibleReminders = notElapsed.filter((r) => dismissedFor[r.id] !== momentKey(r));
  if (visibleReminders.length === 0) return null;
  const dismiss = () => {
    const next = { ...dismissedFor };
    notElapsed.forEach((r) => { next[r.id] = momentKey(r); });
    setDismissedFor(next);
    try { localStorage.setItem("tj-reminders-banner-dismissed", JSON.stringify({ day: todayKey, map: next })); } catch {}
  };
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <IconClock size={16} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm text-zinc-100 font-semibold">{visibleReminders.length} reminder{visibleReminders.length === 1 ? "" : "s"} need attention</p>
        {visibleReminders.map((r) => {
          const s = REMINDER_SEVERITY[r.severity];
          const dayLabel = r.daysUntil <= 1 ? reminderDayLabel(r.daysUntil, r.date).toLowerCase() : isoToWordDate(r.date);
          return (
            <p key={r.id} className="text-xs text-zinc-400">
              <span className={`font-semibold ${s.text}`}>{r.title}</span> — {dayLabel}{r.time ? `, ${reminderTimeDisplay(r.time)}` : ""}
            </p>
          );
        })}
      </div>
      <button onClick={dismiss} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0" title="Dismiss for today"><IconX size={14} /></button>
    </div>
  );
}
