import { useState } from "react";
import { playErrorBeep } from "../../../lib/audio.js";
import { CHECKLIST_PROFILE_OPTIONS } from "../../../lib/checklistLogic.js";

export function ChecklistItemForm({ initial, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [sub, setSub] = useState(typeof initial?.sub === "string" ? initial.sub : "");
  const [critical, setCritical] = useState(!!initial?.critical);
  const [appliesAll, setAppliesAll] = useState(!initial || initial.applies === "all");
  const [appliesProfiles, setAppliesProfiles] = useState(
    initial && Array.isArray(initial.applies) ? initial.applies : []
  );

  const toggleProfile = (id) => setAppliesProfiles((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const handleSave = () => {
    if (!label.trim()) { playErrorBeep(); return; }
    onSave({
      label,
      sub,
      critical,
      applies: appliesAll ? "all" : appliesProfiles,
    });
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950/80 p-4 space-y-3">
      <label className="block">
        <span className="text-xs text-zinc-500">Checklist point</span>
        <input
          type="text" value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Checked overnight news before holding position"
          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </label>
      <label className="block">
        <span className="text-xs text-zinc-500">Note / explanation (optional)</span>
        <textarea
          value={sub} onChange={(e) => setSub(e.target.value)} rows={2}
          placeholder="Why this check matters"
          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </label>
      <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
        <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} className="w-4 h-4 accent-amber-400" />
        Mark as critical — blocks "Armed" status until checked
      </label>
      <div>
        <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer mb-1.5">
          <input type="checkbox" checked={appliesAll} onChange={(e) => setAppliesAll(e.target.checked)} className="w-4 h-4 accent-amber-400" />
          Applies to all strategies
        </label>
        {!appliesAll && (
          <div className="ml-6 space-y-1.5">
            {CHECKLIST_PROFILE_OPTIONS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={appliesProfiles.includes(p.id)} onChange={() => toggleProfile(p.id)} className="w-3.5 h-3.5 accent-amber-400" />
                {p.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={!label.trim()} className="tj-primary-bg disabled:opacity-40 font-semibold text-xs px-4 py-2 rounded-lg flex-1">
          Save
        </button>
        <button onClick={onCancel} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-4 py-2 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  );
}
