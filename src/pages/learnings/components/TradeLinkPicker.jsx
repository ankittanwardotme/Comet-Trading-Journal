import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { IconLink, IconX, IconSearch } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { monthKeyOf, monthLabel, fmtDateDMY } from "../../../lib/dateUtils.js";
import { getPortalTarget } from "../../../lib/portal.js";
import { MOOD_OPTIONS, moodMeta } from "../../../lib/moodOptions.js";
import { DropdownFilterButton } from "../../../components/shared/DropdownFilterButton.jsx";
import { MoodEmoji } from "../../../components/shared/MoodEmoji.jsx";

// A lightweight searchable combobox for linking a note to one specific
// existing trade. Trade counts here are modest (a handful a month), so a
// simple client-side filter over pnlEntries is plenty.
export function TradeLinkPicker({ pnlEntries, value, onChange }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMood, setFilterMood] = useState(null);
  const [filterUnderlying, setFilterUnderlying] = useState(null);
  const [filterStrategy, setFilterStrategy] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);
  const selected = pnlEntries.find((e) => e.id === value) || null;

  const underlyingOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => e.underlying).filter(Boolean))).sort(), [pnlEntries]);
  const strategyOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => e.strategyLabel).filter(Boolean))).sort(), [pnlEntries]);
  const monthOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => monthKeyOf(e.entryDate)).filter(Boolean))).sort().reverse(), [pnlEntries]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pnlEntries.filter((e) => {
      if (q) {
        const hay = `${e.underlying || ""} ${e.strategyLabel || ""} ${e.entryDate || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterUnderlying && e.underlying !== filterUnderlying) return false;
      if (filterStrategy && e.strategyLabel !== filterStrategy) return false;
      if (filterMonth && monthKeyOf(e.entryDate) !== filterMonth) return false;
      if (filterMood && e.exitMood !== filterMood) return false;
      return true;
    }).sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));
  }, [query, pnlEntries, filterUnderlying, filterStrategy, filterMonth, filterMood]);

  const filtersActive = !!(filterMood || filterUnderlying || filterStrategy || filterMonth);
  const clearFilters = () => { setFilterMood(null); setFilterUnderlying(null); setFilterStrategy(null); setFilterMonth(null); };
  const closeModal = () => { setModalOpen(false); setQuery(""); clearFilters(); };

  if (selected) {
    return (
      <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
        <IconLink size={12} className="text-zinc-500 flex-shrink-0" />
        <span className="flex-1 truncate">{selected.underlying || "—"} — {selected.strategyLabel || "Trade"} · {fmtDateDMY(selected.entryDate)}</span>
        <button type="button" onClick={() => onChange("")} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"><IconX size={12} /></button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-colors text-left"
      >
        <IconSearch size={12} className="flex-shrink-0" /> Search a trade...
      </button>
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={closeModal}>
          <div className="tj-app w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 flex flex-col gap-4 tj-popover" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-zinc-200">Link to a trade</p>
              <button onClick={closeModal} className="text-zinc-500 hover:text-zinc-300"><IconX size={16} /></button>
            </div>
            <div className="relative flex-shrink-0">
              <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search underlying, strategy, date..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <DropdownFilterButton
                label="Mood" active={!!filterMood}
                displayValue={filterMood ? <span className="flex items-center gap-1"><MoodEmoji id={filterMood} size={14} /> {moodMeta(filterMood)?.label}</span> : "Any"}
                options={[{ id: "any", label: "Any", selected: !filterMood }, ...MOOD_OPTIONS.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji, selected: filterMood === m.id }))]}
                onSelect={(id) => setFilterMood(id === "any" ? null : id)}
              />
              {underlyingOptions.length > 0 && (
                <DropdownFilterButton
                  label="Underlying" active={!!filterUnderlying}
                  displayValue={filterUnderlying || "Any"}
                  options={[{ id: "any", label: "Any", selected: !filterUnderlying }, ...underlyingOptions.map((u) => ({ id: u, label: u, selected: filterUnderlying === u }))]}
                  onSelect={(id) => setFilterUnderlying(id === "any" ? null : id)}
                />
              )}
              {strategyOptions.length > 0 && (
                <DropdownFilterButton
                  label="Strategy" active={!!filterStrategy}
                  displayValue={filterStrategy || "Any"}
                  options={[{ id: "any", label: "Any", selected: !filterStrategy }, ...strategyOptions.map((s) => ({ id: s, label: s, selected: filterStrategy === s }))]}
                  onSelect={(id) => setFilterStrategy(id === "any" ? null : id)}
                />
              )}
              {monthOptions.length > 0 && (
                <DropdownFilterButton
                  label="Month" active={!!filterMonth}
                  displayValue={filterMonth ? monthLabel(filterMonth) : "Any"}
                  options={[{ id: "any", label: "Any", selected: !filterMonth }, ...monthOptions.map((m) => ({ id: m, label: monthLabel(m), selected: filterMonth === m }))]}
                  onSelect={(id) => setFilterMonth(id === "any" ? null : id)}
                />
              )}
              {filtersActive && (
                <button onClick={clearFilters} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 flex items-center gap-1">
                  <IconX size={11} /> Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1" style={{ minHeight: 120 }}>
              {results.length === 0 ? (
                <p className="text-xs text-zinc-600 px-2 py-4 text-center">No matching trades.</p>
              ) : results.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { onChange(e.id); closeModal(); }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg tj-row-hover text-zinc-300 flex items-center justify-between gap-2"
                >
                  <span><span className="font-semibold">{e.underlying || "—"}</span> — {e.strategyLabel || "Trade"}</span>
                  <span className="flex items-center gap-1.5 flex-shrink-0 text-zinc-500">
                    {e.exitMood && <MoodEmoji id={e.exitMood} size={13} />}
                    <span style={FONT_MONO}>{fmtDateDMY(e.entryDate)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        getPortalTarget()
      )}
    </>
  );
}
