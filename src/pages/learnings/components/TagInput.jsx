import { useState, useRef, useMemo } from "react";
import { IconTag, IconX } from "@tabler/icons-react";

export function TagInput({ tags, onChange, allTags, recentTags = [] }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const addTag = (raw) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) return;
    if (!tags.includes(t)) onChange([...tags, t]);
    setDraft("");
    setOpen(false);
  };
  const removeTag = (t) => onChange(tags.filter((x) => x !== t));

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return recentTags.filter((t) => !tags.includes(t)).slice(0, 6);
    return allTags.filter((t) => t.includes(q) && !tags.includes(t)).slice(0, 6);
  }, [draft, allTags, tags, recentTags]);
  const suggestionsAreRecent = !draft.trim();

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current && inputRef.current.focus()}
        className="w-full flex flex-wrap items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 cursor-text focus-within:border-amber-400"
      >
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full tj-primary-bg font-semibold flex-shrink-0">
            <IconTag size={9} /> {t}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(t); }} className="hover:opacity-70"><IconX size={10} /></button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(draft); }
            else if (e.key === "Backspace" && !draft && tags.length > 0) removeTag(tags[tags.length - 1]);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={tags.length === 0 ? "Add a tag and press Enter..." : ""}
          autoComplete="off"
          className="flex-1 min-w-[80px] bg-transparent text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none py-0.5"
          style={{ outline: "none", boxShadow: "none" }}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-800 tj-solid-bg shadow-2xl p-1 tj-popover">
          {suggestionsAreRecent && (
            <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide px-2.5 pt-1 pb-1">Recently used</p>
          )}
          {suggestions.map((s) => (
            <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addTag(s)} className="w-full text-left text-xs px-2.5 py-1.5 rounded-md tj-row-hover text-zinc-300 flex items-center gap-1.5">
              <IconTag size={10} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
