import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";

// A themed replacement for native <select> — browsers render <select>
// dropdowns with OS-native styling that can look jarringly out of place
// against a custom dark UI, so this renders the same portal/anchor pattern
// used elsewhere (DropdownFilterButton, ReminderSearchablePicker).
export function ImpactSegmentedControl({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-zinc-950 border border-zinc-800 rounded-full p-0.5 flex-shrink-0">
      {Object.entries(REMINDER_SEVERITY).map(([key, sv]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
            value === key ? `${sv.bg} ${sv.text}` : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          {sv.label}
        </button>
      ))}
    </div>
  );
}
