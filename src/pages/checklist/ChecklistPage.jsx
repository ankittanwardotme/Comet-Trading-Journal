import { IconSettings2, IconAlertTriangle, IconFlag, IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { FONT_MONO } from "../../lib/format.js";
import { CollapsibleRegion } from "../../components/shared/CollapsibleSection.jsx";
import { TabBar } from "../../components/shared/TabBar.jsx";
import { ChecklistManagerTab } from "./components/ChecklistManagerTab.jsx";
import { DataInterpretationSection } from "./components/DataInterpretationSection.jsx";
import { ChecklistTabPanel } from "./components/ChecklistTabPanel.jsx";
import { TradeActionsFooter } from "../../shell/components/TradeActionsFooter.jsx";

export function ChecklistPage({
  checklistManagerOpen, setChecklistManagerOpen, mode, handleModeToggle, region2Animated, sc,
  readyToTrade, missingCritical, progressPct, tabs, activeTab, setActiveTab,
  sections, addChecklistItem, editChecklistItem, deleteChecklistItem, addChecklistSection, deleteChecklistSection, editChecklistSectionTitle,
  dataReads, setDataRow, marketAvg, marketVerdict, contentUsesSpecialSlide, activeSection, profile, strategyType, checked, toggleItem, toggleAllInSection,
  setTopTab, itemToSection,
  notes, setNotes, noteTemplates, screenshots, setScreenshots, underlying,
  entryMood, setEntryMood, entryMoodNoteOpen, setEntryMoodNoteOpen, entryMoodNoteDraft, setEntryMoodNoteDraft, entryMoodNote, setEntryMoodNote,
  handleSaveClick, saveStatus, currentStrategy, legsComplete, startNewCheck,
}) {
  return (
    <>
          <div key="checklist" className="tj-fade space-y-7">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>
                {checklistManagerOpen ? "Manage Checklist" : "Pre-Trade Checklist"}
              </p>
              {!checklistManagerOpen && (
                <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-full p-1 text-sm">
                  <button onClick={() => handleModeToggle("trade")} className={`px-4 py-2 rounded-full transition-colors ${mode === "trade" ? "tj-primary-bg font-semibold" : "text-zinc-400"}`}>Trade Day</button>
                  <button onClick={() => handleModeToggle("no_trade")} className={`px-4 py-2 rounded-full transition-colors ${mode === "no_trade" ? "bg-zinc-200 text-zinc-950 font-semibold" : "text-zinc-400"}`}>No-Trade Day</button>
                </div>
              )}
            </div>

            {!checklistManagerOpen && (
              <CollapsibleRegion open={mode === "trade"} animated={region2Animated} duration={750}>
                <div className="space-y-4 p-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className={`inline-flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 ring-1 ${sc.ring}`}>
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        {!readyToTrade && <span className={`animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full ${sc.glow} opacity-60`}></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sc.dot}`}></span>
                      </span>
                      <span className={`text-xs font-bold tracking-wide ${sc.text}`} style={FONT_MONO}>
                        {readyToTrade ? "ARMED" : `${missingCritical.length} CRITICAL CHECKS PENDING`}
                      </span>
                    </div>
                    <button
                      onClick={() => setChecklistManagerOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                    >
                      <IconSettings2 size={13} /> Manage Checklist
                    </button>
                  </div>
                  <div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${sc.bar} rounded-full transition-all duration-300`} style={{ width: `${progressPct}%` }}></div>
                    </div>
                    <div className="mt-4 mb-4">
                      <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
                    </div>
                  </div>
                </div>
              </CollapsibleRegion>
            )}

            {checklistManagerOpen && (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setChecklistManagerOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform"
                >
                  <IconSettings2 size={13} /> Back to Checklist
                </button>
              </div>
            )}

            {checklistManagerOpen ? (
              <ChecklistManagerTab
                sections={sections}
                onAddItem={addChecklistItem}
                onEditItem={editChecklistItem}
                onDeleteItem={deleteChecklistItem}
                onAddSection={addChecklistSection}
                onDeleteSection={deleteChecklistSection}
                onEditSection={editChecklistSectionTitle}
              />
            ) : (
              <div key={activeTab} className={activeTab === "data" && contentUsesSpecialSlide ? "" : "tj-slide-in"}>
                {activeTab === "data" ? (
                  <DataInterpretationSection dataReads={dataReads} onSetRow={setDataRow} avg={marketAvg} verdict={marketVerdict} staggerIn={contentUsesSpecialSlide} />
                ) : activeSection ? (
                  <ChecklistTabPanel section={activeSection} profile={profile} strategyId={strategyType} checked={checked} onToggle={toggleItem} onToggleAll={toggleAllInSection} />
                ) : null}
              </div>
            )}
          </div>

      {mode === "trade" && !readyToTrade && missingCritical.length > 0 && (
        <div className="tj-fade rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-rose-300 mb-3">
            <IconAlertTriangle size={16} /> Not armed yet — {missingCritical.length} critical {missingCritical.length === 1 ? "check" : "checks"} left
          </p>
          <div className="space-y-2">
            {missingCritical.map((i) => (
              <button
                key={i.id}
                onClick={() => { setTopTab("checklist"); setActiveTab(itemToSection[i.id]); }}
                className="w-full flex items-center gap-2.5 text-left text-sm text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg px-3.5 py-2.5 transition-colors"
              >
                <IconFlag size={13} className="text-rose-600 flex-shrink-0" />
                {i.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "trade" && (
        <div className="flex flex-col items-center gap-2 pt-2 pb-1">
          <button
            onClick={() => setTopTab("setup")}
            disabled={!readyToTrade}
            className="flex items-center gap-2 tj-primary-bg font-semibold text-sm px-6 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <IconAdjustmentsHorizontal size={15} /> Continue to Trade Setup
          </button>
          {!readyToTrade && <p className="text-xs text-zinc-600">Finish the critical checks above to continue.</p>}
        </div>
      )}

      {mode === "no_trade" && (
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
      )}
    </>
  );
}
