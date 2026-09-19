import { useState } from "react";
import { IconChevronLeft } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";
import { playErrorBeep } from "../../lib/audio.js";
import { localISODate } from "../../lib/dateUtils.js";
import { parseReminderTime, currentTimeString } from "../../lib/reminderTime.js";
import { CalendarPicker } from "../../components/shared/CalendarPicker.jsx";
import { TimeWheelField } from "./components/TimeWheelField.jsx";

export function RescheduleReminderPage({ reminder, onBack, onSave }) {
  const [date, setDate] = useState(reminder.date);
  const [time, setTime] = useState(reminder.time || currentTimeString());
  const [notes, setNotes] = useState(reminder.notes || "");
  const [errors, setErrors] = useState({});
  const todayIso = localISODate(Date.now());

  const handleSave = () => {
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
    onSave(reminder.id, { date, time, notes: notes.trim() });
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-5">
        <div>
          <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>Reschedule Reminder</p>
          <p className="text-sm text-zinc-400 mt-1">{reminder.title}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Date</label>
            <CalendarPicker value={date} onChange={(v) => { setDate(v); setErrors((p) => ({ ...p, date: null, time: null })); }} placeholder="Select date" minDate={todayIso} error={!!errors.date} />
            {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Time</label>
            <TimeWheelField value={time} onChange={(v) => { setTime(v); if (errors.time) setErrors((p) => ({ ...p, time: null })); }} error={!!errors.time} />
            {errors.time && <p className="text-xs text-rose-500 mt-1">{errors.time}</p>}
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Note</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any details you want to remember..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg py-2.5 font-semibold transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg hover:scale-[1.01] active:scale-95 transition-transform">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
