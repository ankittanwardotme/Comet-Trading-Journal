import { IconClock, IconFlag } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-zinc-400" style={FONT_MONO}>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: REMINDER_SEVERITY.red.dot }} /> Major</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: REMINDER_SEVERITY.yellow.dot }} /> Mid</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: REMINDER_SEVERITY.blue.dot }} /> Minor</span>
      <span className="flex items-center gap-1.5"><IconClock size={12} /> Expiry</span>
      <span className="flex items-center gap-1.5"><IconFlag size={12} /> Holiday</span>
    </div>
  );
}
