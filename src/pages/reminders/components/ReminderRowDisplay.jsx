import { IconPencil, IconTrash } from "@tabler/icons-react";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";
import { reminderDayLabel, reminderTimeDisplay } from "../../../lib/reminderTime.js";
import { ReminderPill } from "./ReminderPill.jsx";

export function ReminderRowDisplay({ r, onDelete, onEdit }) {
  const s = REMINDER_SEVERITY[r.severity];
  const dayLabel = reminderDayLabel(r.daysUntil, r.date);
  const canEdit = onEdit && r.daysUntil !== null && r.daysUntil >= 0;
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-xl border-l-4 ${s.border} bg-zinc-900/60`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-zinc-100 font-medium truncate">{r.title}</p>
          <ReminderPill severity={r.severity} label={r.subcategory ? (r.category === "other" ? r.subcategory.charAt(0).toUpperCase() + r.subcategory.slice(1) : r.subcategory) : "Reminder"} />
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {dayLabel}{r.time ? `, ${reminderTimeDisplay(r.time)}` : ""}
        </p>
        {r.notes && (
          <p className="text-xs text-zinc-400 mt-1" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {r.notes}
          </p>
        )}
      </div>
      {canEdit && (
        <button onClick={() => onEdit(r)} className="text-zinc-600 hover:tj-primary-text flex-shrink-0">
          <IconPencil size={13} />
        </button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(r.id)} className="text-zinc-600 hover:text-rose-500 flex-shrink-0">
          <IconTrash size={13} />
        </button>
      )}
    </div>
  );
}
