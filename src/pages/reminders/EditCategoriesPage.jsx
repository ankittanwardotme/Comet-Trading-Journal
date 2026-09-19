import { useState } from "react";
import { IconChevronLeft } from "@tabler/icons-react";
import { FONT_MONO } from "../../lib/format.js";
import { EditCategoryGroupCard } from "./components/EditCategoryGroupCard.jsx";
import { AddCategoryCard } from "./components/AddCategoryCard.jsx";

export function EditCategoriesPage({ onBack, effectiveGroups, reminderSeverityFor, onChangeSeverity, onHide, customNames, onRemoveCustom, onAddCustom, onRenameItem, onRenameGroup }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  const filtered = effectiveGroups.map((g) => ({ ...g, items: g.items.filter(([name]) => name.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0);
  const totalCount = effectiveGroups.reduce((s, g) => s + g.items.length, 0);
  const customSet = new Set(customNames);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>

      <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Edit Categories</p>

      <input
        value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${totalCount} types…`}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-500">No types match "{query}".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <EditCategoryGroupCard
              key={g.group}
              group={g.group}
              items={g.items}
              reminderSeverityFor={reminderSeverityFor}
              onChangeSeverity={onChangeSeverity}
              onHide={onHide}
              customSet={customSet}
              onRemoveCustom={onRemoveCustom}
              onAddCustom={onAddCustom}
              onRenameItem={onRenameItem}
              onRenameGroup={onRenameGroup}
              forceOpen={isSearching}
            />
          ))}
        </div>
      )}

      {!isSearching && <AddCategoryCard onAddCustom={onAddCustom} />}
    </div>
  );
}
