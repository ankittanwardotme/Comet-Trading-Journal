import { useState } from "react";
import { IconPlus, IconPencil, IconTrash, IconFlag, IconLock } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../../lib/format.js";
import { playErrorBeep } from "../../../lib/audio.js";
import { COLOR_CLASSES } from "../../../lib/greeks.js";
import { DEFAULT_SECTION_DEFS, CHECKLIST_PROFILE_OPTIONS } from "../../../lib/checklistLogic.js";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";
import { ChecklistItemForm } from "./ChecklistItemForm.jsx";

export function ChecklistManagerTab({ sections, onAddItem, onEditItem, onDeleteItem, onAddSection, onDeleteSection, onEditSection }) {
  const [addingSectionId, setAddingSectionId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteSectionId, setPendingDeleteSectionId] = useState(null);
  const [addingNewSection, setAddingNewSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const defaultSectionIds = DEFAULT_SECTION_DEFS.map((s) => s.id);

  const startEditingSectionTitle = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
  };
  const submitSectionTitle = () => {
    if (!editingSectionTitle.trim()) { playErrorBeep(); return; }
    onEditSection(editingSectionId, editingSectionTitle);
    setEditingSectionId(null);
    setEditingSectionTitle("");
  };

  const submitNewSection = () => {
    if (!newSectionTitle.trim()) { playErrorBeep(); return; }
    onAddSection(newSectionTitle);
    setNewSectionTitle("");
    setAddingNewSection(false);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-zinc-500">
        Add, edit, or remove points from your pre-trade checklist. Anything marked <span className="text-amber-400 font-semibold">Critical</span> must be checked before a trade counts as "Armed".
      </p>

      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 p-5">
        {addingNewSection ? (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-zinc-500">New checklist section title</span>
              <input
                type="text" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g. Post-Trade Review"
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <div className="flex gap-2">
              <button onClick={submitNewSection} disabled={!newSectionTitle.trim()} className="tj-primary-bg disabled:opacity-40 font-semibold text-xs px-4 py-2 rounded-lg flex-1">
                Create Section
              </button>
              <button onClick={() => { setAddingNewSection(false); setNewSectionTitle(""); }} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingNewSection(true)} className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
            <IconPlus size={13} /> New Checklist Section
          </button>
        )}
      </div>
      {sections.map((s) => {
        const Icon = s.icon;
        const cc = COLOR_CLASSES[s.color] || COLOR_CLASSES.amber;
        const isCustomSection = !defaultSectionIds.includes(s.id);
        const isEditingTitle = editingSectionId === s.id;
        return (
          <div key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-8 h-8 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center flex-shrink-0`}>
                <Icon size={15} />
              </span>
              {isEditingTitle ? (
                <input
                  type="text" autoFocus value={editingSectionTitle} onChange={(e) => setEditingSectionTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitSectionTitle(); if (e.key === "Escape") setEditingSectionId(null); }}
                  className="flex-1 bg-zinc-950 border border-amber-400 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none"
                  style={FONT_DISPLAY}
                />
              ) : (
                <p className="text-sm font-semibold text-zinc-100 flex-1" style={FONT_DISPLAY}>{s.title}</p>
              )}
              {isEditingTitle ? (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={submitSectionTitle} disabled={!editingSectionTitle.trim()} className="text-[10px] font-semibold text-zinc-950 tj-primary-bg disabled:opacity-40 px-2 py-1 rounded">Save</button>
                  <button onClick={() => setEditingSectionId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                </span>
              ) : (
                <Tooltip text="Edit section name">
                  <button onClick={() => startEditingSectionTitle(s)} className="text-zinc-500 hover:tj-primary-text flex-shrink-0">
                    <IconPencil size={14} />
                  </button>
                </Tooltip>
              )}
              {isCustomSection && !isEditingTitle && (
                pendingDeleteSectionId === s.id ? (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { onDeleteSection(s.id); setPendingDeleteSectionId(null); }} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 px-2 py-1 rounded">Confirm</button>
                    <button onClick={() => setPendingDeleteSectionId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                  </span>
                ) : (
                  <Tooltip text="Delete section">
                    <button onClick={() => setPendingDeleteSectionId(s.id)} className="text-zinc-500 hover:text-rose-600 flex-shrink-0">
                      <IconTrash size={14} />
                    </button>
                  </Tooltip>
                )
              )}
            </div>
            <div className="space-y-2">
              {s.items.map((item) => {
                const isDynamic = typeof item.sub === "function";
                return (
                <div key={item.id}>
                  {editingItemId === item.id && !isDynamic ? (
                    <ChecklistItemForm
                      initial={item}
                      onSave={(values) => { onEditItem(item, s.id, values); setEditingItemId(null); }}
                      onCancel={() => setEditingItemId(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 flex items-center gap-2 flex-wrap">
                          {item.label}
                          {item.critical && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded" style={FONT_MONO}>
                              <IconFlag size={10} /> Critical
                            </span>
                          )}
                          {isDynamic && (
                            <Tooltip text="Its note changes automatically depending on the selected strategy, so it can't be edited.">
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded" style={FONT_MONO}>
                                <IconLock size={10} /> Auto note
                              </span>
                            </Tooltip>
                          )}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {item.applies === "all" ? "Applies to all strategies" : `Applies to: ${(item.applies || []).map((p) => (CHECKLIST_PROFILE_OPTIONS.find((o) => o.id === p) || {}).label || p).join(", ") || "—"}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isDynamic && (
                          <Tooltip text="Edit">
                            <button onClick={() => setEditingItemId(item.id)} className="text-zinc-500 hover:text-zinc-200">
                              <IconPencil size={14} />
                            </button>
                          </Tooltip>
                        )}
                        {pendingDeleteId === item.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => { onDeleteItem(item, s.id); setPendingDeleteId(null); }} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 px-2 py-1 rounded">Confirm</button>
                            <button onClick={() => setPendingDeleteId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                          </span>
                        ) : (
                          <Tooltip text="Delete">
                            <button onClick={() => setPendingDeleteId(item.id)} className="text-zinc-500 hover:text-rose-600">
                              <IconTrash size={14} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
              {s.items.length === 0 && <p className="text-xs text-zinc-600">No checklist points in this section.</p>}
            </div>
            <div className="mt-3">
              {addingSectionId === s.id ? (
                <ChecklistItemForm
                  onSave={(values) => { onAddItem(s.id, values); setAddingSectionId(null); }}
                  onCancel={() => setAddingSectionId(null)}
                />
              ) : (
                <button onClick={() => setAddingSectionId(s.id)} className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
                  <IconPlus size={13} /> Add checklist point
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
