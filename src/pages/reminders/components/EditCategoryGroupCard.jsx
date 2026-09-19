import { useState } from "react";
import { IconPencil, IconChevronDown, IconTrash, IconPlus, IconX } from "@tabler/icons-react";
import { REMINDER_SEVERITY } from "../../../lib/remindersData.js";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";
import { ImpactSegmentedControl } from "./ImpactSegmentedControl.jsx";

export function EditCategoryGroupCard({ group, items, reminderSeverityFor, onChangeSeverity, onHide, customSet, onRemoveCustom, onAddCustom, onRenameItem, onRenameGroup, forceOpen }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeverity, setNewSeverity] = useState("blue");
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupDraft, setGroupDraft] = useState(group);
  const [editingItem, setEditingItem] = useState(null);
  const [itemDraft, setItemDraft] = useState("");

  const commitGroupRename = () => {
    setEditingGroup(false);
    if (groupDraft.trim() && groupDraft !== group) onRenameGroup(group, groupDraft.trim(), items);
    else setGroupDraft(group);
  };
  const commitItemRename = (name) => {
    setEditingItem(null);
    if (itemDraft.trim() && itemDraft !== name) onRenameItem(group, name, itemDraft.trim());
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div
        onClick={() => !editingGroup && setOpen((v) => !v)}
        onKeyDown={(e) => { if (!editingGroup && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen((v) => !v); } }}
        role="button" tabIndex={0}
        className="tj-section-toggle w-full flex items-center justify-between px-5 py-3.5 transition-colors cursor-pointer"
      >
        {editingGroup ? (
          <input
            autoFocus value={groupDraft} onChange={(e) => setGroupDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitGroupRename} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commitGroupRename(); if (e.key === "Escape") { setGroupDraft(group); setEditingGroup(false); } }}
            className="text-sm font-semibold bg-zinc-950 border border-amber-400 rounded-lg px-2 py-1 text-zinc-100 flex-1 mr-2 focus:outline-none"
          />
        ) : (
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-200 min-w-0">
            <span className="truncate">{group}</span> <span className="text-zinc-600 font-normal flex-shrink-0">({items.length})</span>
            <span
              onClick={(e) => { e.stopPropagation(); setGroupDraft(group); setEditingGroup(true); }}
              className="text-zinc-500 hover:text-amber-400 flex-shrink-0 p-0.5"
              role="button" tabIndex={0}
            >
              <IconPencil size={12} />
            </span>
          </span>
        )}
        <IconChevronDown size={15} className="text-zinc-500 transition-transform flex-shrink-0 ml-2" style={{ transform: isOpen ? "none" : "rotate(-90deg)" }} />
      </div>
      {isOpen && (
        <div className="px-5 pb-5 pt-2 space-y-2">
          {items.map(([name]) => {
            const sev = reminderSeverityFor(name);
            const s = REMINDER_SEVERITY[sev];
            const isEditingThis = editingItem === name;
            return (
              <div key={name} className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${s.border} bg-zinc-900/60`}>
                {isEditingThis ? (
                  <input
                    autoFocus value={itemDraft} onChange={(e) => setItemDraft(e.target.value)}
                    onBlur={() => commitItemRename(name)} onKeyDown={(e) => { if (e.key === "Enter") commitItemRename(name); if (e.key === "Escape") setEditingItem(null); }}
                    className="flex-1 min-w-0 bg-zinc-950 border border-amber-400 rounded-lg px-2 py-1 text-sm text-zinc-100 focus:outline-none"
                  />
                ) : (
                  <button onClick={() => { setItemDraft(name); setEditingItem(name); }} className="text-sm text-zinc-200 flex-1 min-w-0 truncate text-left hover:text-amber-400 transition-colors">
                    {name}
                  </button>
                )}
                <ImpactSegmentedControl value={sev} onChange={(v) => onChangeSeverity(name, v)} />
                <Tooltip text={customSet.has(name) ? "Remove type" : "Hide this built-in type"}>
                  <button onClick={() => (customSet.has(name) ? onRemoveCustom(name) : onHide(name))} className="text-zinc-600 hover:text-rose-500 flex-shrink-0">
                    <IconTrash size={14} />
                  </button>
                </Tooltip>
              </div>
            );
          })}
          {adding ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="New type name" onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <ImpactSegmentedControl value={newSeverity} onChange={setNewSeverity} />
              <button
                onClick={() => { if (newName.trim()) { onAddCustom(group, newName.trim(), newSeverity); setNewName(""); setAdding(false); } }}
                className="text-xs tj-primary-bg font-semibold rounded-lg px-3 py-2 flex-shrink-0"
              >
                Add
              </button>
              <button onClick={() => setAdding(false)} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"><IconX size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="text-xs tj-primary-text flex items-center gap-1 pt-1">
              <IconPlus size={12} /> Add a {group.toLowerCase()} type
            </button>
          )}
        </div>
      )}
    </div>
  );
}
