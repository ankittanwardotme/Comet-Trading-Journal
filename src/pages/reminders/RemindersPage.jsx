import { useState } from "react";
import { IconPlus, IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { RemindersCalendar } from "./components/RemindersCalendar.jsx";
import { ReminderRowDisplay } from "./components/ReminderRowDisplay.jsx";

export function RemindersPage({ remindersWithDays, onDeleteReminder, onAddClick, onSettingsClick, pnlEntries, holidays, onOpenTrade, onCreateAt, windowDays, onEdit }) {
  const [view, setView] = useState("list"); // "list" | "calendar"
  const todayItems = remindersWithDays.filter((r) => r.daysUntil === 0);
  const upcomingItems = remindersWithDays.filter((r) => r.daysUntil !== null && r.daysUntil > 0 && r.daysUntil <= windowDays);
  const pastItems = remindersWithDays.filter((r) => r.daysUntil !== null && r.daysUntil < 0 && r.daysUntil >= -windowDays);
  const upcomingGrouped = {};
  upcomingItems.forEach((r) => {
    const key = r.daysUntil === 1 ? "Tomorrow" : `In ${r.daysUntil} days`;
    (upcomingGrouped[key] = upcomingGrouped[key] || []).push(r);
  });
  const isEmpty = todayItems.length === 0 && upcomingItems.length === 0 && pastItems.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold text-zinc-100" style={FONT_DISPLAY}>My Reminders</p>
          <p className="text-xs text-zinc-500 mt-0.5">Market events, trade reminders, and your own notes-to-self — plus expiries and holidays on the calendar.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
            <button onClick={() => setView("list")} className={`text-xs rounded-full font-semibold transition-colors flex items-center justify-center ${view === "list" ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`} style={{ height: 40, width: 88 }}>List</button>
            <button onClick={() => setView("calendar")} className={`text-xs rounded-full font-semibold transition-colors flex items-center justify-center ${view === "calendar" ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`} style={{ height: 40, width: 88 }}>Calendar</button>
          </div>
          <button onClick={onAddClick} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-xl px-3.5 flex-shrink-0" style={{ height: 40 }}>
            <IconPlus size={13} /> Add Reminder
          </button>
          <Tooltip text="Settings"><button onClick={onSettingsClick} className="text-zinc-500 hover:tj-primary-text bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40 }}><IconAdjustmentsHorizontal size={15} /></button></Tooltip>
        </div>
      </div>

      {view === "calendar" ? (
        <RemindersCalendar remindersWithDays={remindersWithDays} pnlEntries={pnlEntries} holidays={holidays} onOpenTrade={onOpenTrade} onCreateAt={onCreateAt} onEdit={onEdit} />
      ) : (
        <div className="space-y-5">
          {isEmpty && <p className="text-sm text-zinc-600 text-center py-8">No upcoming reminders. Add one to get started.</p>}
          {todayItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-amber-400 mb-2" style={FONT_MONO}>Today</p>
              <div className="space-y-1.5">{todayItems.map((r) => <ReminderRowDisplay key={r.id} r={r} onDelete={onDeleteReminder} onEdit={onEdit} />)}</div>
            </div>
          )}
          {upcomingItems.length > 0 && (
            <div className="space-y-4">
              {Object.entries(upcomingGrouped).map(([day, items]) => (
                <div key={day}>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-2" style={FONT_MONO}>{day}</p>
                  <div className="space-y-1.5">{items.map((r) => <ReminderRowDisplay key={r.id} r={r} onDelete={onDeleteReminder} onEdit={onEdit} />)}</div>
                </div>
              ))}
            </div>
          )}
          {pastItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-700 mb-2" style={FONT_MONO}>Past</p>
              <div className="space-y-1.5 opacity-60">{pastItems.map((r) => <ReminderRowDisplay key={r.id} r={r} onDelete={onDeleteReminder} onEdit={onEdit} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
