import { FONT_MONO } from "../../../lib/format.js";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";

export function ReminderPill({ severity, label }) {
  const s = REMINDER_SEVERITY[severity];
  return <span className={`text-[10px] uppercase tracking-wide font-semibold ${s.text} ${s.bg} px-1.5 py-0.5 rounded flex-shrink-0`} style={FONT_MONO}>{label}</span>;
}
