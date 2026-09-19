import { IconX } from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";
import { MOOD_OPTIONS } from "../../lib/moodOptions.js";
import { MoodEmoji } from "../../components/shared/MoodEmoji.jsx";
import { CalendarPicker } from "../../components/shared/CalendarPicker.jsx";
import { localISODate, monthKeyOf, monthLabel } from "../../lib/dateUtils.js";

export function AddTradeDialog({
  closing, moodStepTs, selectedMood, onSelectMood, onSaveMood, onSkipMood,
  date, onDateChange, holidays, affectsCapital, onAffectsCapitalChange, onConfirm, onClose,
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 ${closing ? "tj-backdrop-out" : "tj-fade"}`}
      onClick={moodStepTs ? undefined : onClose}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 ${closing ? "tj-dialog-out" : "tj-popover"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {moodStepTs ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Trade Added</p>
              <button onClick={onSkipMood} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>How are you feeling right now?</p>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMood((prev) => (prev === m.id ? null : m.id))}
                    className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border transition-colors ${
                      selectedMood === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <MoodEmoji id={m.id} size={16} /> {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onSaveMood} disabled={!selectedMood} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                Save
              </button>
              <button onClick={onSkipMood} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                Skip
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Add Trade</p>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <label className="block">
              <span className="text-xs text-zinc-500">Trade date</span>
              <div className="mt-1">
                <CalendarPicker value={date} onChange={onDateChange} holidays={holidays} businessDaysOnly maxDate={localISODate(Date.now())} placeholder="Select date" />
              </div>
              {!date && (
                <p className="text-xs text-amber-400 mt-1.5">Today isn't a trading day pick another date to continue.</p>
              )}
            </label>
            <p className="text-xs text-zinc-600">
              A blank, editable row will be added to {date ? monthLabel(monthKeyOf(date)) : "the selected month"}&apos;s table. Pick a date in the current month to add it here, or any other date to jump straight to that month.
            </p>
            {date && date < localISODate(Date.now()) && (
              <div>
                {affectsCapital === null ? (
                  <>
                    <p className="text-xs text-zinc-500 mb-1.5">Should this trade affect your total capital?</p>
                    <div className="flex gap-2">
                      <button onClick={() => onAffectsCapitalChange(true)} className="flex-1 text-xs px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600">Yes</button>
                      <button onClick={() => onAffectsCapitalChange(false)} className="flex-1 text-xs px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600">No</button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-zinc-600">
                    {affectsCapital ? "This trade will count toward your total capital." : "This trade will not affect your total capital."}{" "}
                    <button onClick={() => onAffectsCapitalChange(null)} className="tj-primary-text underline underline-offset-2">Change</button>
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onConfirm} disabled={!date} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                Add Trade
              </button>
              <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
