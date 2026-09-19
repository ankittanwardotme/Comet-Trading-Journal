import { useState } from "react";
import { IconChevronLeft } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";
import { playErrorBeep } from "../../lib/audio.js";
import { localISODate } from "../../lib/dateUtils.js";
import { parseReminderTime, currentTimeString } from "../../lib/reminderTime.js";
import { REMINDER_SEVERITY } from "../../lib/remindersData.js";
import { CalendarPicker } from "../../components/shared/CalendarPicker.jsx";
import { ThemedSelect } from "../../components/shared/ThemedSelect.jsx";
import { TimeWheelField } from "./components/TimeWheelField.jsx";
import { ReminderSearchablePicker } from "./components/ReminderSearchablePicker.jsx";

export function AddReminderPage({ onBack, onSave, effectiveGroups, reminderSeverityFor, prefill }) {
  const [category, setCategory] = useState("event");
  const eventGroups = effectiveGroups.filter((g) => g.group !== "Trade");
  const tradeGroups = effectiveGroups.filter((g) => g.group === "Trade");
  const groups = category === "event" ? eventGroups : tradeGroups;
  const [picked, setPicked] = useState(() => (groups[0] ? groups[0].items[0] : null));
  const [otherType, setOtherType] = useState("market");
  const [otherTitle, setOtherTitle] = useState("");
  const [otherSeverity, setOtherSeverity] = useState("blue");
  const [date, setDate] = useState(() => (prefill && prefill.date) || localISODate(Date.now()));
  const [time, setTime] = useState(() => (prefill && prefill.time) || currentTimeString());
  const [leadDays, setLeadDays] = useState(0);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const isOther = category === "other";
  const totalCount = eventGroups.reduce((s, g) => s + g.items.length, 0) + tradeGroups.reduce((s, g) => s + g.items.length, 0);
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
    if (isOther && !otherTitle.trim()) nextErrors.title = "Title can't be empty.";
    if (!isOther && !picked) nextErrors.picked = "Pick a type from the list.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      playErrorBeep();
      return;
    }
    setErrors({});
    if (isOther) {
      onSave({ title: otherTitle.trim(), category: "other", subcategory: otherType, severity: otherSeverity, date, time, leadDays, notes: notes.trim() });
    } else {
      onSave({ title: picked[0], category, subcategory: picked[0], severity: reminderSeverityFor(picked[0]), date, time, leadDays, notes: notes.trim() });
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-5">
        <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>Add Reminder</p>

        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {[["event", "Market Event"], ["trade", "Trade"], ["other", "Other"]].map(([id, label]) => (
              <button
                key={id} onClick={() => { setCategory(id); const gs = id === "event" ? eventGroups : id === "trade" ? tradeGroups : []; if (gs[0]) setPicked(gs[0].items[0]); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${category === id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isOther ? (
          <>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {[["market", "Market"], ["trade", "Trade"], ["news", "News"], ["personal", "Personal"]].map(([id, label]) => (
                  <button
                    key={id} onClick={() => setOtherType(id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${otherType === id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Title</label>
              <input
                value={otherTitle} onChange={(e) => { setOtherTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: null })); }}
                placeholder="e.g. Broker maintenance window"
                className={`w-full bg-zinc-950 border rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 ${errors.title ? "border-rose-500" : "border-zinc-800"}`}
              />
              {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">{category === "event" ? "Market Event" : "Trade"} type</label>
            <ReminderSearchablePicker groups={groups} value={picked} onSelect={(v) => { setPicked(v); if (errors.picked) setErrors((p) => ({ ...p, picked: null })); }} totalCount={totalCount} />
            {errors.picked && <p className="text-xs text-rose-500 mt-1">{errors.picked}</p>}
          </div>
        )}

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
          <label className="text-xs text-zinc-500 mb-1.5 block">Impact</label>
          {isOther ? (
            <div className="flex gap-1.5">
              {Object.entries(REMINDER_SEVERITY).map(([key, s]) => (
                <button key={key} onClick={() => setOtherSeverity(key)} className={`flex-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${otherSeverity === key ? `${s.border} ${s.bg} ${s.text} font-semibold` : "border-zinc-800 text-zinc-500"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          ) : picked ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${REMINDER_SEVERITY[reminderSeverityFor(picked[0])].border} ${REMINDER_SEVERITY[reminderSeverityFor(picked[0])].bg}`}>
              <span className={`text-xs font-semibold ${REMINDER_SEVERITY[reminderSeverityFor(picked[0])].text}`}>{REMINDER_SEVERITY[reminderSeverityFor(picked[0])].label}</span>
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No types available in this category.</p>
          )}
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Remind me in advance</label>
          <ThemedSelect
            value={leadDays}
            options={[
              { value: 0, label: "On the day" },
              { value: 1, label: "1 day before" },
              { value: 3, label: "3 days before" },
              { value: 7, label: "7 days before" },
            ]}
            onChange={(v) => setLeadDays(v)}
          />
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

        <button onClick={handleSave} className="w-full tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg hover:scale-[1.01] active:scale-95 transition-transform">
          Save Reminder
        </button>
      </div>
    </div>
  );
}
