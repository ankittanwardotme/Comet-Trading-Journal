import { useState } from "react";
import { IconPlus, IconPencil, IconTrash, IconLock } from "@tabler/icons-react";
import { FONT_MONO } from "../../lib/format.js";
import { STRATEGY_CATEGORIES } from "../../lib/checklistLogic.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { CustomStrategyDialog } from "../tradeSetup/components/CustomStrategyDialog.jsx";

// A dedicated home for the strategy library, promoted out of the "Add
// your own strategy" dialog buried in Trade Setup — lets you see every
// built-in and custom strategy at a glance, grouped the same way the
// Trade Setup outlook buttons group them, and manage custom ones without
// first having to start a trade.
export function StrategyBuilderPage({ allStrategies, customStrategies, addCustomStrategy, editCustomStrategy, deleteCustomStrategy }) {
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [editingStratId, setEditingStratId] = useState(null);
  const [pendingDeleteStratId, setPendingDeleteStratId] = useState(null);

  const customIds = new Set(customStrategies.map((s) => s.id));

  return (
    <div className="tj-fade space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1" style={FONT_MONO}>Strategy Builder</p>
          <p className="text-xs text-zinc-600 max-w-md">Every strategy available in Trade Setup and the checklist — built-in ones are read-only, and anything you add here shows up there too.</p>
        </div>
        <button
          onClick={() => setShowAddStrategy(true)}
          className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2 hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
        >
          <IconPlus size={13} /> Add your own strategy
        </button>
      </div>

      {showAddStrategy && (
        <CustomStrategyDialog
          initial={{ category: "neutral" }}
          isEdit={false}
          onSave={(values) => { addCustomStrategy(values); setShowAddStrategy(false); }}
          onClose={() => setShowAddStrategy(false)}
        />
      )}

      {STRATEGY_CATEGORIES.map((cat) => {
        const inCategory = allStrategies.filter((s) => (s.category || "other") === cat.id);
        if (inCategory.length === 0) return null;
        return (
          <div key={cat.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3" style={FONT_MONO}>{cat.label}</p>
            <div className="space-y-2">
              {inCategory.map((s) => {
                const isCustom = customIds.has(s.id);
                return (
                  <div key={s.id}>
                    {editingStratId === s.id && (
                      <CustomStrategyDialog
                        initial={{ label: s.label, category: s.category || "other", profile: s.profile, legTemplate: s.legTemplate }}
                        isEdit={true}
                        onSave={(values) => { editCustomStrategy(s.id, values); setEditingStratId(null); }}
                        onClose={() => setEditingStratId(null)}
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                      <p className="text-xs text-zinc-200 truncate">{s.label}</p>
                      {isCustom ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Tooltip text="Edit">
                            <button onClick={() => setEditingStratId(s.id)} className="text-zinc-500 hover:text-zinc-200">
                              <IconPencil size={13} />
                            </button>
                          </Tooltip>
                          {pendingDeleteStratId === s.id ? (
                            <span className="flex items-center gap-1">
                              <button onClick={() => { deleteCustomStrategy(s.id); setPendingDeleteStratId(null); }} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 px-2 py-1 rounded">Confirm</button>
                              <button onClick={() => setPendingDeleteStratId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                            </span>
                          ) : (
                            <Tooltip text="Delete">
                              <button onClick={() => setPendingDeleteStratId(s.id)} className="text-zinc-500 hover:text-rose-600">
                                <IconTrash size={13} />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      ) : (
                        <Tooltip text="Built-in strategy">
                          <IconLock size={12} className="text-zinc-700 flex-shrink-0" />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
