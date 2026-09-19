import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconBellRinging } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";
import { reminderCombinedEpoch, reminderRelativeAgo, currentTimeString } from "../../../lib/reminderTime.js";
import { playAlarmChime } from "../../../lib/audio.js";
import { localISODate } from "../../../lib/dateUtils.js";
import { getPortalTarget } from "../../../lib/portal.js";
import { SnoozeQuickPick } from "./SnoozeQuickPick.jsx";

// Dashboard banner — everything currently "due" (today, or within its own
// lead-time window), color-coded by severity. Dismissal is per-day: it
// clears itself the next day rather than being gone forever, so a
// reminder you dismissed today still resurfaces if it's still due tomorrow.
export function ReminderAlarmPopup({ dueAlarms, onClose, onCloseAll, onSnoozeMinutes, onSnoozeAllMinutes, onSaveDateTime, onSaveDateTimeAll }) {
  const [snoozeOpenId, setSnoozeOpenId] = useState(null);
  const [snoozeAllOpen, setSnoozeAllOpen] = useState(false);
  const playedForIds = useRef(new Set());

  useEffect(() => {
    const ids = dueAlarms.map((r) => r.id).join(",");
    if (dueAlarms.length > 0 && ids !== [...playedForIds.current].join(",")) {
      const isNewSet = dueAlarms.some((r) => !playedForIds.current.has(r.id));
      if (isNewSet) playAlarmChime();
      playedForIds.current = new Set(dueAlarms.map((r) => r.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAlarms.map((r) => r.id).join(",")]);

  if (dueAlarms.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-start justify-center pt-12 px-4 pb-4">
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative rounded-2xl border border-zinc-800 tj-solid-bg p-6 shadow-2xl w-full overflow-y-auto" style={{ maxWidth: 480, maxHeight: "calc(100vh - 4rem)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center flex-shrink-0">
            <IconBellRinging size={20} className="text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide" style={FONT_MONO}>Reminder{dueAlarms.length > 1 ? "s" : ""}</p>
            <p className="text-sm font-bold text-zinc-100">{dueAlarms.length > 1 ? `${dueAlarms.length} reminders due` : "It's time"}</p>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {dueAlarms.map((r, i) => {
            const s = REMINDER_SEVERITY[r.severity];
            const epoch = reminderCombinedEpoch(r);
            const ago = epoch ? reminderRelativeAgo(epoch) : null;
            return (
              <div key={r.id} className={`rounded-xl border-l-4 ${s.border} bg-zinc-900/60 p-3`}>
                {dueAlarms.length > 1 && <p className="text-[10px] text-zinc-600 mb-1" style={FONT_MONO}>{i + 1} of {dueAlarms.length}</p>}
                <p className="text-sm text-zinc-100 font-semibold">{r.title}</p>
                <p className="text-xs text-zinc-500 mb-2">{ago ? ago : "Just now"}</p>
                <div className="flex gap-2">
                  <button onClick={() => setSnoozeOpenId(snoozeOpenId === r.id ? null : r.id)} className="flex-1 text-xs text-zinc-300 border border-zinc-800 rounded-lg py-1.5 font-semibold hover:bg-zinc-900">Snooze</button>
                  <button onClick={() => onClose(r)} className="flex-1 text-xs tj-primary-bg font-semibold rounded-lg py-1.5">Close</button>
                </div>
                {snoozeOpenId === r.id && (
                  <SnoozeQuickPick
                    onPick={(mins) => { onSnoozeMinutes(r, mins); setSnoozeOpenId(null); }}
                    onSaveDateTime={(date, time) => { onSaveDateTime(r, date, time); setSnoozeOpenId(null); }}
                    onCancel={() => setSnoozeOpenId(null)}
                    initialDate={r.date}
                    initialTime={r.time}
                  />
                )}
              </div>
            );
          })}
        </div>

        {dueAlarms.length > 1 && (
          <div className="pt-4 mt-1 border-t border-zinc-800">
            <div className="flex gap-2">
              <button onClick={() => setSnoozeAllOpen((v) => !v)} className="flex-1 text-xs text-zinc-300 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">Snooze all</button>
              <button onClick={onCloseAll} className="flex-1 text-xs tj-primary-bg font-semibold rounded-lg py-2">Close all</button>
            </div>
            {snoozeAllOpen && (
              <SnoozeQuickPick
                onPick={(mins) => { onSnoozeAllMinutes(mins); setSnoozeAllOpen(false); }}
                onSaveDateTime={(date, time) => { onSaveDateTimeAll(date, time); setSnoozeAllOpen(false); }}
                onCancel={() => setSnoozeAllOpen(false)}
                initialDate={localISODate(Date.now())}
                initialTime={currentTimeString()}
              />
            )}
          </div>
        )}
      </div>
    </div>,
    getPortalTarget()
  );
}
