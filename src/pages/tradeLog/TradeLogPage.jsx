import {
  IconArrowLeft, IconDownload, IconX, IconChevronLeft, IconChevronRight, IconTrash,
} from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO, fmtINR } from "../../lib/format.js";
import { pastTradeTitle } from "../../lib/exportEngine.js";
import { localISODate } from "../../lib/dateUtils.js";
import { MOOD_OPTIONS, moodMeta } from "../../lib/moodOptions.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { MoodEmoji } from "../../components/shared/MoodEmoji.jsx";
import { CalendarPicker } from "../../components/shared/CalendarPicker.jsx";
import { DropdownFilterButton } from "../../components/shared/DropdownFilterButton.jsx";

export function TradeLogPage({
  setTopTab, logRangeCustomOpen, setLogRangeCustomOpen, activeRangePreset,
  setPresetToday, setPresetWeek, setPresetMonth, setPresetAll,
  rangeFrom, setRangeFrom, rangeTo, setRangeTo, holidays,
  openDownloadDialog, filtered,
  moodFilterPoint, setMoodFilterPoint, moodFilterMood, setMoodFilterMood, moodFilterRefine, setMoodFilterRefine,
  historyLoading, history, pagedHistory, resolvePastTradeDisplay, strategyLabelLookup,
  deletingHistoryTs, setEntryDownloadFor, pendingDeleteTs, setPendingDeleteTs, confirmDeleteEntry,
  totalHistoryPages, clampedPage, setHistoryPage,
}) {
  return (
          <div key="log" className="tj-fade space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-200" style={FONT_DISPLAY}>Trade Log</p>
              <button onClick={() => setTopTab("pnl")} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                <IconArrowLeft size={13} /> Back to Trade History
              </button>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Download Logs</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => { setPresetToday(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "today" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Today</button>
                <button onClick={() => { setPresetWeek(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "week" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Last 7 days</button>
                <button onClick={() => { setPresetMonth(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "month" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Last 30 days</button>
                <button onClick={() => setLogRangeCustomOpen(true)} className={`text-xs px-2.5 py-1 rounded-full border ${logRangeCustomOpen ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Select Dates</button>
                <button onClick={() => { setPresetAll(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "all" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>All time</button>
              </div>
              {logRangeCustomOpen && (
                <div className="flex flex-wrap items-end gap-2.5">
                  <label className="text-xs text-zinc-500">From
                    <div className="mt-1"><CalendarPicker value={rangeFrom} onChange={setRangeFrom} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
                  </label>
                  <label className="text-xs text-zinc-500">To
                    <div className="mt-1"><CalendarPicker value={rangeTo} onChange={setRangeTo} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
                  </label>
                </div>
              )}
              <button onClick={openDownloadDialog} disabled={filtered.length === 0} className="flex items-center gap-1.5 text-xs tj-primary-bg disabled:opacity-40 font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
                <IconDownload size={12} /> Download
              </button>
              <p className="text-xs text-zinc-600">{filtered.length} {filtered.length === 1 ? "entry" : "entries"} in range</p>

              <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap gap-2">
                <DropdownFilterButton
                  label="Mindset" active={!!moodFilterPoint}
                  displayValue={moodFilterPoint ? (moodFilterPoint === "entry" ? "Entry" : "Exit") : "All"}
                  options={[
                    { id: "all", label: "All", selected: !moodFilterPoint },
                    { id: "entry", label: "Entry", selected: moodFilterPoint === "entry" },
                    { id: "exit", label: "Exit", selected: moodFilterPoint === "exit" },
                  ]}
                  onSelect={(id) => {
                    setMoodFilterPoint(id === "all" ? null : id);
                    setMoodFilterMood(null);
                    setMoodFilterRefine(null);
                  }}
                />
                <DropdownFilterButton
                  label="Mood" active={!!moodFilterMood} disabled={!moodFilterPoint}
                  displayValue={moodFilterMood ? <span className="flex items-center gap-1"><MoodEmoji id={moodFilterMood} size={14} /> {moodMeta(moodFilterMood).label}</span> : "Any"}
                  options={[
                    { id: "any", label: "Any", selected: !moodFilterMood },
                    ...MOOD_OPTIONS.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji, selected: moodFilterMood === m.id })),
                  ]}
                  onSelect={(id) => { setMoodFilterMood(id === "any" ? null : id); setMoodFilterRefine(null); }}
                />
                <DropdownFilterButton
                  label="Compare" active={!!moodFilterRefine} disabled={!moodFilterPoint || !moodFilterMood}
                  displayValue={moodFilterRefine === "same" ? "Same Mood" : moodFilterRefine === "changed" ? "Mood Changed" : "Any"}
                  options={[
                    { id: "any", label: "Any", selected: !moodFilterRefine },
                    { id: "same", label: "Same Mood (Entry = Exit)", selected: moodFilterRefine === "same" },
                    { id: "changed", label: "Mood Changed (Entry ≠ Exit)", selected: moodFilterRefine === "changed" },
                  ]}
                  onSelect={(id) => setMoodFilterRefine(id === "any" ? null : id)}
                />
                {(moodFilterPoint || moodFilterMood || moodFilterRefine) && (
                  <button
                    type="button"
                    onClick={() => { setMoodFilterPoint(null); setMoodFilterMood(null); setMoodFilterRefine(null); }}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 transition-colors"
                  >
                    <IconX size={12} /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {historyLoading ? (
              <p className="text-xs text-zinc-500">Loading log...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-zinc-500">No trades logged yet. Complete a check and save it to start the log.</p>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
                {pagedHistory.map((h) => {
                  const displayH = h.pnlId ? resolvePastTradeDisplay(h) : h;
                  return (
                  <div key={h.ts} className={`flex items-center justify-between gap-3 py-2.5 border-b border-zinc-800/70 last:border-0 ${deletingHistoryTs === h.ts ? "tj-row-exit" : "tj-row-enter"}`}>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate">
                        {h.mode === "no_trade" ? "No-Trade Day" : h.mode === "past_trade" ? pastTradeTitle(displayH) : h.mode === "funds_added" ? `Funds Added${h.amount ? " — " + fmtINR(h.amount) : ""}` : h.mode === "funds_withdrawn" ? `Withdrawal${h.amount ? " — " + fmtINR(h.amount) : ""}` : `${h.underlying ? h.underlying + " — " : ""}${strategyLabelLookup(h.strategyType)}`}
                      </p>
                      <p className="text-xs text-zinc-600" style={FONT_MONO}>{h.dateLabel}{h.marketRead ? ` · ${h.marketRead}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {(h.entryMood || displayH.exitMood) && (
                        <Tooltip text={`${h.entryMood ? "Entry: " + moodMeta(h.entryMood).label : ""}${h.entryMood && displayH.exitMood ? " · " : ""}${displayH.exitMood ? "Exit: " + moodMeta(displayH.exitMood).label : ""}`}>
                          <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-full flex-shrink-0">
                            {h.entryMood && <MoodEmoji id={h.entryMood} size={16} />}
                            {h.entryMood && displayH.exitMood && <span className="text-zinc-600 text-[10px]">→</span>}
                            {displayH.exitMood && <MoodEmoji id={displayH.exitMood} size={16} />}
                          </span>
                        </Tooltip>
                      )}
                      {h.mode === "no_trade" || h.mode === "funds_added" || h.mode === "funds_withdrawn" || h.mode === "past_trade" || h.ready ? (
                        <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${h.mode === "no_trade" ? "text-zinc-300 bg-zinc-700/30" : h.mode === "funds_added" ? "text-emerald-600 bg-emerald-400/10" : h.mode === "funds_withdrawn" ? "text-rose-600 bg-rose-400/10" : "text-emerald-600 bg-emerald-400/10"}`} style={FONT_MONO}>
                          {h.mode === "no_trade" ? "Observation" : h.mode === "funds_added" ? "Funds Added" : h.mode === "funds_withdrawn" ? "Withdrawal" : "Trade"}
                        </span>
                      ) : null}
                      <Tooltip text="Download">
                        <button onClick={() => setEntryDownloadFor(h)} className="text-zinc-600 hover:tj-primary-text flex-shrink-0 hover:scale-110 transition-transform">
                          <IconDownload size={14} />
                        </button>
                      </Tooltip>
                      {pendingDeleteTs === h.ts ? (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => confirmDeleteEntry(h.ts)} disabled={deletingHistoryTs === h.ts} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 disabled:opacity-50 px-2 py-1 rounded">Confirm</button>
                          <button onClick={() => setPendingDeleteTs(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                        </span>
                      ) : (
                        <Tooltip text="Delete entry">
                          <button onClick={() => setPendingDeleteTs(h.ts)} className="text-zinc-600 hover:text-rose-600 flex-shrink-0">
                            <IconTrash size={14} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  );
                })}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={clampedPage <= 1} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 px-2 py-1">
                      <IconChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-xs text-zinc-500" style={FONT_MONO}>Page {clampedPage} of {totalHistoryPages}</span>
                    <button onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))} disabled={clampedPage >= totalHistoryPages} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 px-2 py-1">
                      Next <IconChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
  );
}
