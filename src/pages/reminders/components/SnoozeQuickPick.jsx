import { useState } from "react";
import { playErrorBeep } from "../../../lib/audio.js";
import { localISODate } from "../../../lib/dateUtils.js";
import { parseReminderTime, currentTimeString } from "../../../lib/reminderTime.js";
import { CalendarPicker } from "../../../components/shared/CalendarPicker.jsx";
import { TimeWheelField } from "./TimeWheelField.jsx";

// Shared quick-pick used both per-item and for "Snooze all" — presets add
// time from right now (the standard snooze semantic), or for a single item
// hand off to the full date/time reschedule view.
export function SnoozeQuickPick({ onPick, onSaveDateTime, onCancel, initialDate, initialTime }) {
  const [customizing, setCustomizing] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime || currentTimeString());
  const [errors, setErrors] = useState({});
  const todayIso = localISODate(Date.now());

  if (customizing) {
    const handleSaveClick = () => {
      const nextErrors = {};
      if (date < todayIso) {
        nextErrors.date = "That date has already passed — pick today or later.";
      } else if (date === todayIso && time) {
        const [h12, m, ap] = parseReminderTime(time);
        let h24 = h12 % 12;
        if (ap === "PM") h24 += 12;
        const scheduledMoment = new Date();
        scheduledMoment.setHours(h24, m, 0, 0);
        if (scheduledMoment.getTime() < Date.now()) nextErrors.time = "That time has already passed today.";
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        playErrorBeep();
        return;
      }
      onSaveDateTime(date, time);
    };
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 mt-2 space-y-2">
        <p className="text-xs text-zinc-500">New date &amp; time</p>
        <div>
          <CalendarPicker value={date} onChange={(v) => { setDate(v); setErrors((p) => ({ ...p, date: null, time: null })); }} placeholder="Select date" minDate={todayIso} error={!!errors.date} />
          {errors.date && <p className="text-[11px] text-rose-500 mt-1">{errors.date}</p>}
        </div>
        <div>
          <TimeWheelField value={time} onChange={(v) => { setTime(v); if (errors.time) setErrors((p) => ({ ...p, time: null })); }} error={!!errors.time} />
          {errors.time && <p className="text-[11px] text-rose-500 mt-1">{errors.time}</p>}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setCustomizing(false)} className="flex-1 text-xs text-zinc-400 py-1.5">Back</button>
          <button onClick={handleSaveClick} className="flex-1 text-xs tj-primary-bg font-semibold rounded-lg py-1.5">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 mt-2 space-y-2">
      <p className="text-xs text-zinc-500">Snooze for</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onPick(15)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">15 min</button>
        <button onClick={() => onPick(30)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">30 min</button>
        <button onClick={() => onPick(60)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">1 hour</button>
        <button onClick={() => setCustomizing(true)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">Choose date &amp; time</button>
      </div>
      <button onClick={onCancel} className="w-full text-xs text-zinc-500 py-1">Cancel</button>
    </div>
  );
}
