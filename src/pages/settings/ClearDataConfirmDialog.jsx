import { useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../lib/format.js";

export function ClearDataConfirmDialog({ scope, onConfirm, onClose }) {
  const [text, setText] = useState("");
  const parts = [];
  if (scope.trading) parts.push("every trade, P&L entry, fund transaction, and checklist log entry");
  if (scope.strategies) parts.push("your custom strategy templates");
  if (scope.learnings) parts.push("all My Learnings notes, folders, and tags");
  if (scope.reminders) parts.push("all your reminders");
  const deletionSummary = parts.length > 1
    ? parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1]
    : (parts[0] || "the selected data");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-rose-900 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <IconAlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-rose-600" style={FONT_DISPLAY}>This can't be undone</p>
        </div>
        <p className="text-xs text-zinc-400">This permanently deletes {deletionSummary}. Anything not selected is kept. Type <span className="font-bold text-zinc-200">DELETE</span> to confirm.</p>
        <input
          type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" autoFocus
          className="w-full bg-zinc-950 border border-rose-900 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          style={FONT_MONO}
        />
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={text !== "DELETE"}
            className="bg-rose-500 hover:bg-rose-400 disabled:opacity-30 disabled:cursor-not-allowed text-rose-950 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 transition-colors"
          >
            Permanently Delete
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}
