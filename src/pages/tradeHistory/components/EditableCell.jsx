import { FONT_MONO } from "../../../lib/format.js";
import { CalendarPicker } from "../../../components/shared/CalendarPicker.jsx";

export function EditableCell({ value, onChange, type = "text", numeric = false, className = "", placeholder = "", max, min, holidays, businessDaysOnly, disabled = false }) {
  if (type === "date") {
    return <CalendarPicker value={value} onChange={onChange} holidays={holidays} businessDaysOnly={businessDaysOnly} minDate={min} maxDate={max} placeholder={placeholder || "Select date"} compact disabled={disabled} />;
  }
  return (
    <input
      type={type} value={value} placeholder={placeholder} max={max} min={min} disabled={disabled}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/[^0-9.\-]/g, "") : e.target.value)}
      className={`bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 w-full disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={FONT_MONO}
    />
  );
}
