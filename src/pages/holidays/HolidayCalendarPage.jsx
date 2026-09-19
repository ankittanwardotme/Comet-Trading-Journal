import { useState } from "react";
import { IconPlus, IconLock, IconPencil, IconCheck, IconX, IconTrash } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../lib/format.js";
import { isoToDMY } from "../../lib/dateUtils.js";
import { playErrorBeep } from "../../lib/audio.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { CalendarPicker } from "../../components/shared/CalendarPicker.jsx";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function dayNameOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

export function HolidayCalendarPage({ holidays, onSave, onDelete, isAdmin }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const startAdd = () => { setEditId(null); setNameDraft(""); setDateDraft(""); setDialogOpen(true); };
  const startEdit = (h) => {
    if (parseInt(h.date.slice(0, 4), 10) < new Date().getFullYear()) return; // archived — read-only
    setEditId(h.id); setNameDraft(h.name); setDateDraft(h.date); setDialogOpen(true);
  };
  const cancel = () => { setDialogOpen(false); setEditId(null); };

  const save = () => {
    if (!nameDraft.trim() || !dateDraft) { playErrorBeep(); return; }
    onSave({ id: editId || ("holiday_" + Date.now()), name: nameDraft.trim(), date: dateDraft }, !!editId);
    setDialogOpen(false);
    setEditId(null);
  };

  const sorted = [...(holidays || [])].sort((a, b) => a.date.localeCompare(b.date));
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1" style={FONT_MONO}>Holiday Calendar</p>
          <p className="text-xs text-zinc-600">
            {isAdmin
              ? "Add every trading holiday as NSE announces it. If it falls on a Tuesday, weekly/monthly expiry dates — including already-saved trades — shift to the previous trading day automatically."
              : "NSE trading holidays, shared across every account. If one falls on a Tuesday, weekly/monthly expiry dates shift to the previous trading day automatically."}
          </p>
        </div>
        {isAdmin && (
          <button onClick={startAdd} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2.5 hover:scale-105 active:scale-95 transition-transform flex-shrink-0">
            <IconPlus size={14} /> Add Holiday
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-500">No holidays added yet.</p>
          {isAdmin && <p className="text-xs text-zinc-600 mt-1">Click "Add Holiday" to start building your calendar.</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 text-left">
                <th className="px-4 py-2.5 font-medium">Holiday</th>
                <th className="px-4 py-2.5 font-medium">Day</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => {
                const holidayYear = parseInt(h.date.slice(0, 4), 10);
                const isArchived = holidayYear < currentYear;
                return (
                  <tr key={h.id} className={`border-t border-zinc-800 ${isArchived ? "opacity-60" : ""}`}>
                    <td className="px-4 py-2.5 text-zinc-200">{h.name}</td>
                    <td className={`px-4 py-2.5 ${dayNameOf(h.date) === "Tuesday" ? "text-amber-400 font-semibold" : "text-zinc-400"}`}>{dayNameOf(h.date)}</td>
                    <td className="px-4 py-2.5 text-zinc-400" style={FONT_MONO}>{isoToDMY(h.date)}</td>
                    <td className="px-4 py-2.5">
                      {isArchived ? (
                        <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-zinc-600" style={FONT_MONO}>
                          <IconLock size={11} /> Archived
                        </div>
                      ) : !isAdmin ? null : (
                        <div className="flex items-center gap-2 justify-end">
                          <Tooltip text="Edit holiday">
                            <button onClick={() => startEdit(h)} className="text-zinc-500 hover:tj-primary-text">
                              <IconPencil size={14} />
                            </button>
                          </Tooltip>
                          {pendingDeleteId === h.id ? (
                            <span className="flex items-center gap-1">
                              <Tooltip text="Confirm delete">
                                <button onClick={() => { onDelete(h.id); setPendingDeleteId(null); }} className="flex items-center text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded">
                                  <IconCheck size={12} strokeWidth={3} />
                                </button>
                              </Tooltip>
                              <Tooltip text="Cancel">
                                <button onClick={() => setPendingDeleteId(null)} className="text-zinc-500 hover:text-zinc-300">
                                  <IconX size={14} />
                                </button>
                              </Tooltip>
                            </span>
                          ) : (
                            <Tooltip text="Delete holiday">
                              <button onClick={() => setPendingDeleteId(h.id)} className="text-zinc-600 hover:text-rose-600">
                                <IconTrash size={14} />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={cancel}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{editId ? "Edit Holiday" : "Add Holiday"}</p>
              <button onClick={cancel} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <label className="block">
              <span className="text-xs text-zinc-500">Holiday name</span>
              <input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="e.g. Diwali — Balipratipada"
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Date</span>
              <div className="mt-1">
                <CalendarPicker value={dateDraft} onChange={setDateDraft} placeholder="Select date" />
              </div>
              {dateDraft && <p className="text-xs text-zinc-600 mt-1">{dayNameOf(dateDraft)}{dayNameOf(dateDraft) === "Tuesday" ? " — expiry dates on this day will shift to Monday" : ""}</p>}
            </label>
            <div className="flex gap-2">
              <button onClick={save} disabled={!nameDraft.trim() || !dateDraft} className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
                {editId ? "Save Changes" : "Add Holiday"}
              </button>
              <button onClick={cancel} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
