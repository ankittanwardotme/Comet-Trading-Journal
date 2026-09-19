import { IconChevronLeft } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";

export function ReminderWindowSettingsPage({ onBack, windowDays, onChangeWindow }) {
  const options = [
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 30, label: "1 Month" },
    { value: 60, label: "2 Months" },
    { value: 90, label: "3 Months" },
  ];
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-3">
        <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>Edit Reminder Window</p>
        <p className="text-xs text-zinc-500 mb-3">How far back and ahead "My Reminders" shows past and upcoming reminders. Older or farther-out reminders remain visible on the Calendar.</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o.value} onClick={() => onChangeWindow(o.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${windowDays === o.value ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
