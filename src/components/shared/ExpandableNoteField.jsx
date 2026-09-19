import { useState } from "react";
import { IconLayoutGrid, IconX, IconCheck } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../lib/format.js";
import { blockNoteToPlainText } from "../../lib/noteBlocks.js";
import { Tooltip } from "./Tooltip.jsx";
import { TemplatePickerModal } from "./TemplatePickerModal.jsx";

export function ExpandableNoteField({ value, onChange, placeholder, label, variant = "cell", disabled = false, templates = [] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const openEditor = () => { if (disabled) return; setDraft(value || ""); setOpen(true); };
  const closeEditor = () => { setOpen(false); setTemplatePickerOpen(false); };
  const save = () => { onChange(draft); closeEditor(); };
  const applyTemplate = (t) => {
    const text = blockNoteToPlainText(t.content);
    setDraft((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
    setTemplatePickerOpen(false);
  };

  const triggerClass = variant === "block"
    ? "w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 cursor-pointer min-h-[84px] whitespace-pre-wrap"
    : `text-xs truncate block w-full rounded ${disabled ? "text-zinc-300" : "text-zinc-100 bg-zinc-950 border border-zinc-800 hover:border-amber-400 px-1.5 py-1"}`;

  // A genuine word-limited preview for the compact table cell — CSS truncate
  // alone can still show more or less than intended depending on character
  // width, so cap it explicitly at a handful of words instead.
  const words = (value || "").trim().split(/\s+/).filter(Boolean);
  const preview = words.length > 6 ? words.slice(0, 6).join(" ") + "…" : value;
  const displayText = variant === "cell" ? preview : value;

  return (
    <>
      <Tooltip text={variant === "block" ? undefined : (disabled ? "Click Edit on this row to change notes" : (value || undefined))} wrapperClassName="block w-full">
        <div
          onClick={openEditor}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => { if (e.key === "Enter") openEditor(); }}
          className={triggerClass}
          style={variant === "cell" ? { ...FONT_MONO, cursor: disabled ? "default" : "pointer" } : undefined}
        >
          {displayText ? (
            displayText
          ) : !disabled ? (
            <span className="text-zinc-600 italic" style={{ fontStyle: "italic" }}>Add a note...</span>
          ) : null}
        </div>
      </Tooltip>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={closeEditor}>
          <div
            className="w-[70vw] max-w-[70vw] max-h-[85vh] min-w-[280px] rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 flex flex-col gap-4 tj-popover overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{label || "Note"}</p>
              <div className="flex items-center gap-3">
                {templates.length > 0 && (
                  <button onClick={() => setTemplatePickerOpen(true)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconLayoutGrid size={13} /> Use Template
                  </button>
                )}
                <button onClick={closeEditor} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
              </div>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note..."
              className="w-full h-64 min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-zinc-100 placeholder:italic placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y flex-shrink-0"
            />
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={save} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                <IconCheck size={14} /> Done
              </button>
              <button onClick={closeEditor} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {templatePickerOpen && (
        <TemplatePickerModal templates={templates} onSelect={applyTemplate} onClose={() => setTemplatePickerOpen(false)} />
      )}
    </>
  );
}
