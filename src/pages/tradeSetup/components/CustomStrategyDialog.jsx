import { useState, useMemo } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../../lib/format.js";
import { STRATEGY_CATEGORIES, inferStrategyProfile, describeInferredProfile } from "../../../lib/checklistLogic.js";

export function CustomStrategyDialog({ initial, isEdit, onSave, onClose }) {
  const [name, setName] = useState(initial?.label || "");
  const [category, setCategory] = useState(initial?.category || "neutral");
  const [legRows, setLegRows] = useState(
    initial?.legTemplate && initial.legTemplate.length > 0
      ? initial.legTemplate.map((l) => ({ name: l.name || "", action: l.action || "Sell", type: l.type || "CE" }))
      : [{ name: "", action: "Sell", type: "CE" }]
  );

  const addRow = () => setLegRows((prev) => [...prev, { name: "", action: "Sell", type: "CE" }]);
  const removeRow = (idx) => setLegRows((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => setLegRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const inferredProfileId = useMemo(() => inferStrategyProfile(legRows), [legRows]);
  const inferredDescription = useMemo(() => describeInferredProfile(legRows), [legRows]);

  const canSave = name.trim().length > 0 && legRows.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name,
      category,
      legTemplate: legRows.map((r) => ({ name: r.name.trim(), action: r.action, type: r.type })),
      profile: inferredProfileId || "short_premium_undefined",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{isEdit ? "Edit Strategy" : "Add Your Own Strategy"}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>

        <label className="block">
          <span className="text-xs text-zinc-500">Strategy name</span>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Broken Wing Butterfly"
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Outlook (which button it'll show under)</p>
          <div className="flex flex-wrap gap-2">
            {STRATEGY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full border ${category === cat.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-zinc-500">Legs <span className="text-zinc-600">— strike, premium, qty & lot size are entered later, per trade</span></p>
            <button onClick={addRow} className="flex items-center gap-1 text-xs tj-primary-text font-semibold flex-shrink-0">
              <IconPlus size={12} /> Add leg
            </button>
          </div>
          <div className="space-y-2">
            {legRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text" value={row.name} onChange={(e) => updateRow(idx, "name", e.target.value)}
                  placeholder="Leg label, e.g. Long Call (lower strike)"
                  className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <div className="flex rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                  <button onClick={() => updateRow(idx, "action", "Buy")} className={`px-2.5 text-xs py-1.5 ${row.action === "Buy" ? "bg-emerald-500 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400"}`}>Buy</button>
                  <button onClick={() => updateRow(idx, "action", "Sell")} className={`px-2.5 text-xs py-1.5 ${row.action === "Sell" ? "bg-rose-500 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400"}`}>Sell</button>
                </div>
                <select
                  value={row.type} onChange={(e) => updateRow(idx, "type", e.target.value)}
                  className="flex-shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="CE">CE</option><option value="PE">PE</option><option value="FUT">FUT</option><option value="Other">Other</option>
                </select>
                {legRows.length > 1 && (
                  <button onClick={() => removeRow(idx)} className="text-zinc-600 hover:text-rose-600 flex-shrink-0">
                    <IconX size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-xs text-zinc-500 mb-1">Based on these legs, this looks like:</p>
          <p className="text-xs text-zinc-200 leading-relaxed">{inferredDescription}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!canSave} className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
            {isEdit ? "Save changes" : "Add strategy"}
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}
