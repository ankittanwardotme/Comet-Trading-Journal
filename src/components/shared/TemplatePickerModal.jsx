import { useState, useMemo } from "react";
import { IconX, IconSearch } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";
import { blockNoteSnippet } from "../../lib/noteBlocks.js";

export function TemplatePickerModal({ templates, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => (t.title || "").toLowerCase().includes(q) || blockNoteSnippet(t.content, 200).toLowerCase().includes(q));
  }, [templates, search]);

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl flex flex-col tj-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-3 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Use a Template</p>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
          </div>
          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus-within:border-amber-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">{templates.length === 0 ? "No templates yet." : "No templates match your search."}</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-amber-400/60 p-3.5 transition-colors"
              >
                <p className="text-sm font-semibold text-zinc-100 mb-1">{t.title || "Untitled"}</p>
                {blockNoteSnippet(t.content) && <p className="text-xs text-zinc-500 leading-relaxed">{blockNoteSnippet(t.content)}</p>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
