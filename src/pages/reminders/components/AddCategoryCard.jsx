import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { ImpactSegmentedControl } from "./ImpactSegmentedControl.jsx";

export function AddCategoryCard({ onAddCustom }) {
  const [adding, setAdding] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [itemName, setItemName] = useState("");
  const [severity, setSeverity] = useState("blue");

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full text-sm text-zinc-400 hover:text-zinc-200 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-2xl py-3 flex items-center justify-center gap-1.5 transition-colors"
      >
        <IconPlus size={14} /> Add a new category
      </button>
    );
  }
  const canSave = groupName.trim() && itemName.trim();
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
      <p className="text-sm font-semibold text-zinc-200">New Category</p>
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Category name</label>
        <input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Commodities" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">First type in this category</label>
        <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Crude Oil Price Move" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 mb-1.5 block">Default impact</label>
        <ImpactSegmentedControl value={severity} onChange={setSeverity} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setAdding(false); setGroupName(""); setItemName(""); }} className="flex-1 text-sm text-zinc-400 hover:text-zinc-200 py-2">Cancel</button>
        <button
          disabled={!canSave}
          onClick={() => { onAddCustom(groupName.trim(), itemName.trim(), severity); setAdding(false); setGroupName(""); setItemName(""); }}
          className="flex-1 text-sm tj-primary-bg font-semibold rounded-lg py-2 disabled:opacity-40"
        >
          Create Category
        </button>
      </div>
    </div>
  );
}
