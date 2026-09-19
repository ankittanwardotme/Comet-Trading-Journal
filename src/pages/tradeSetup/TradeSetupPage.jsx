import { IconPlus, IconSettings2, IconPencil, IconTrash, IconCalculator, IconTarget, IconX } from "@tabler/icons-react";
import { FONT_MONO, fmtINR } from "../../lib/format.js";
import { STRATEGY_CATEGORIES } from "../../lib/checklistLogic.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { LegsCard } from "../../components/shared/LegsCard.jsx";
import { CustomStrategyDialog } from "./components/CustomStrategyDialog.jsx";
import { DaysToExpiryWidget } from "./components/DaysToExpiryWidget.jsx";
import { TradeActionsFooter } from "../../shell/components/TradeActionsFooter.jsx";

export function TradeSetupPage({
  strategyCategory, setStrategyCategory, allStrategies, strategyType, setStrategyType, strategiesInCategory,
  showAddStrategy, setShowAddStrategy, customStrategies, showManageStrategies, setShowManageStrategies,
  editingStratId, setEditingStratId, pendingDeleteStratId, setPendingDeleteStratId,
  addCustomStrategy, editCustomStrategy, deleteCustomStrategy,
  underlying, setUnderlying, legs, addLeg, removeLeg, updateLeg, netPremium, payoffInfo, holidays,
  profile, currentStrategy,
  editingTargetRisk, setEditingTargetRisk, targetRiskDraft, setTargetRiskDraft, targetRiskPct, saveTargetRiskPct,
  capital, setCapital, plannedLoss, setPlannedLoss, pct, pctColor, pctVerdict, capNum, activeRiskPct, applyRiskPct,
  customRiskPct, setCustomRiskPct,
  notes, setNotes, noteTemplates, screenshots, setScreenshots,
  entryMood, setEntryMood, entryMoodNoteOpen, setEntryMoodNoteOpen, entryMoodNoteDraft, setEntryMoodNoteDraft, entryMoodNote, setEntryMoodNote,
  handleSaveClick, saveStatus, mode, legsComplete, startNewCheck,
}) {
  return (
          <div key="setup" className="tj-fade space-y-7">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Strategy</p>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {STRATEGY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setStrategyCategory(cat.id);
                      const opts = allStrategies.filter((s) => (s.category || "other") === cat.id);
                      if (opts.length > 0 && !opts.some((s) => s.id === strategyType)) setStrategyType(opts[0].id);
                    }}
                    className={`text-xs px-3.5 py-1.5 rounded-full border ${strategyCategory === cat.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="" disabled>{strategyCategory ? "Select a strategy" : "Pick an outlook above first"}</option>
                {strategiesInCategory.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={() => setShowAddStrategy(true)} className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
                  <IconPlus size={13} /> Add your own strategy
                </button>
                {customStrategies.length > 0 && (
                  <button onClick={() => setShowManageStrategies((v) => !v)} className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 tj-primary-text font-semibold rounded-lg px-2.5 py-1 hover:scale-105 active:scale-95 transition-transform">
                    <IconSettings2 size={13} /> Manage your strategies
                  </button>
                )}
              </div>

              {showAddStrategy && (
                <CustomStrategyDialog
                  initial={{ category: strategyCategory }}
                  isEdit={false}
                  onSave={addCustomStrategy}
                  onClose={() => setShowAddStrategy(false)}
                />
              )}

              {showManageStrategies && customStrategies.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-zinc-500">Your custom strategies</p>
                  {customStrategies.map((s) => (
                    <div key={s.id}>
                      {editingStratId === s.id && (
                        <CustomStrategyDialog
                          initial={{ label: s.label, category: s.category || "other", profile: s.profile, legTemplate: s.legTemplate }}
                          isEdit={true}
                          onSave={(values) => { editCustomStrategy(s.id, values); setEditingStratId(null); }}
                          onClose={() => setEditingStratId(null)}
                        />
                      )}
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-200 truncate">{s.label}</p>
                          <p className="text-[10px] text-zinc-600">{(STRATEGY_CATEGORIES.find((c) => c.id === (s.category || "other")) || {}).label || "Other"}</p>
                        </div>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <LegsCard underlying={underlying} onUnderlyingChange={setUnderlying} legs={legs} onAdd={addLeg} onRemove={removeLeg} onUpdate={updateLeg} netPremium={netPremium} payoffInfo={payoffInfo} holidays={holidays} />

            <DaysToExpiryWidget profile={profile} strategyLabel={currentStrategy ? currentStrategy.label : "your strategy"} legs={legs} underlying={underlying} />

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2" style={FONT_MONO}>
                  <IconCalculator size={13} /> Risk Calculator
                </p>
                {editingTargetRisk ? (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="text" inputMode="decimal" value={targetRiskDraft} autoFocus
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          const num = parseFloat(raw);
                          if (raw === "") { setTargetRiskDraft(""); return; }
                          setTargetRiskDraft(!Number.isNaN(num) && num > 20 ? "20" : raw);
                        }}
                        placeholder="e.g. 2"
                        className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-5 py-1 text-xs text-zinc-100 placeholder-zinc-600 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                        style={FONT_MONO}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500" style={FONT_MONO}>%</span>
                    </div>
                    <button
                      onClick={() => { const v = parseFloat(targetRiskDraft); if (v > 0) saveTargetRiskPct(v); setEditingTargetRisk(false); }}
                      disabled={!(parseFloat(targetRiskDraft) > 0)}
                      className="text-xs px-2.5 py-1 rounded-full tj-primary-bg disabled:opacity-40 font-semibold"
                    >
                      Save
                    </button>
                    <Tooltip text="Cancel">
                      <button onClick={() => setEditingTargetRisk(false)} className="text-zinc-500 hover:text-zinc-300"><IconX size={14} /></button>
                    </Tooltip>
                  </div>
                ) : (
                  <Tooltip text="Set your target risk percentage">
                    <button
                      onClick={() => { setTargetRiskDraft(String(targetRiskPct)); setEditingTargetRisk(true); }}
                      className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-300 px-2.5 py-1 rounded-full transition-colors"
                    >
                      <IconTarget size={11} /> Target: {targetRiskPct}%
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 items-stretch">
                <label className="flex flex-col">
                  <span className="text-xs text-zinc-500">Total capital (₹) <span className="text-zinc-600">— defaults from P/L statement, editable here for a separate amount</span></span>
                  <input type="text" inputMode="numeric" placeholder="e.g. 300000" value={capital} onChange={(e) => setCapital(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="mt-auto pt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" style={FONT_MONO} />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-zinc-500">Planned max loss (₹)</span>
                  <input type="text" inputMode="numeric" placeholder="e.g. 6800" value={plannedLoss} onChange={(e) => setPlannedLoss(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="mt-auto pt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" style={FONT_MONO} />
                </label>
              </div>
              <div className="mt-3.5 flex items-center justify-between flex-wrap gap-2">
                <span className={`text-sm font-semibold ${pctColor}`} style={FONT_MONO}>
                  {pct === null ? "—" : `${pct.toFixed(2)}%`} <span className="font-normal text-zinc-500">of capital</span>
                </span>
                <span className={`text-xs ${pctColor}`}>{pctVerdict}</span>
              </div>
              <div className="mt-3.5 pt-3.5 border-t border-zinc-800 space-y-2">
                <p className="text-xs text-zinc-500">Set planned max loss as % of capital</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => applyRiskPct(1)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 1 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>1% · {fmtINR(capNum * 0.01)}</button>
                  <button onClick={() => applyRiskPct(2)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 2 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>2% · {fmtINR(capNum * 0.02)}</button>
                  <button onClick={() => applyRiskPct(3)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 3 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>3% · {fmtINR(capNum * 0.03)}</button>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="text" inputMode="decimal" value={customRiskPct}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          const num = parseFloat(raw);
                          if (raw === "") { setCustomRiskPct(""); return; }
                          setCustomRiskPct(!Number.isNaN(num) && num > 20 ? "20" : raw);
                        }}
                        placeholder="e.g. 1.5"
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                        style={FONT_MONO}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500" style={FONT_MONO}>%</span>
                    </div>
                    <button
                      onClick={() => applyRiskPct(parseFloat(customRiskPct) || 0)}
                      disabled={!capNum || !customRiskPct}
                      className="text-xs px-3 py-1.5 rounded-full tj-primary-bg disabled:opacity-40 font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-600">Max 20%.</p>
              </div>
            </div>

            <TradeActionsFooter
              notes={notes} setNotes={setNotes} noteTemplates={noteTemplates}
              screenshots={screenshots} setScreenshots={setScreenshots} underlying={underlying}
              entryMood={entryMood} setEntryMood={setEntryMood}
              entryMoodNoteOpen={entryMoodNoteOpen} setEntryMoodNoteOpen={setEntryMoodNoteOpen}
              entryMoodNoteDraft={entryMoodNoteDraft} setEntryMoodNoteDraft={setEntryMoodNoteDraft}
              entryMoodNote={entryMoodNote} setEntryMoodNote={setEntryMoodNote}
              handleSaveClick={handleSaveClick} saveStatus={saveStatus} mode={mode}
              currentStrategy={currentStrategy} legsComplete={legsComplete} startNewCheck={startNewCheck}
            />
          </div>
  );
}
