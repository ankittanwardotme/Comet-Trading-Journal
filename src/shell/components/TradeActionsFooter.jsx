import { IconDeviceFloppy, IconRotate } from "@tabler/icons-react";
import { FONT_MONO } from "../../lib/format.js";
import { MOOD_OPTIONS } from "../../lib/moodOptions.js";
import { MoodEmoji } from "../../components/shared/MoodEmoji.jsx";
import { ExpandableNoteField } from "../../components/shared/ExpandableNoteField.jsx";
import { TradeScreenshotsButton } from "../../components/shared/TradeScreenshotsButton.jsx";

// Notes/screenshots/mood/save — shared between the Trade Setup tab (always,
// since it only renders in trade mode) and the Checklist tab's No-Trade Day
// view (a full market-read-only check with no strategy/legs to save).
export function TradeActionsFooter({
  notes, setNotes, noteTemplates, screenshots, setScreenshots, underlying,
  entryMood, setEntryMood, entryMoodNoteOpen, setEntryMoodNoteOpen, entryMoodNoteDraft, setEntryMoodNoteDraft, entryMoodNote, setEntryMoodNote,
  handleSaveClick, saveStatus, mode, currentStrategy, legsComplete, startNewCheck,
}) {
  return (
    <>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Notes — directional view & reasoning</p>
                  <ExpandableNoteField
                    value={notes}
                    onChange={setNotes}
                    placeholder="What's the read today, and why? Write it before checking the chain."
                    label="Notes — directional view & reasoning"
                    variant="block"
                    templates={noteTemplates}
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Chart screenshots</p>
                  <div className="flex items-center gap-2">
                    <TradeScreenshotsButton screenshots={screenshots} onChange={setScreenshots} tradeLabel={underlying || "this trade"} />
                    <p className="text-xs text-zinc-600">{screenshots.length ? `${screenshots.length} attached` : "Attach the setup you're looking at"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>How are you feeling right now?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEntryMood((prev) => (prev === m.id ? null : m.id))}
                        className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border transition-colors ${
                          entryMood === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        <MoodEmoji id={m.id} size={16} /> {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    {entryMoodNoteOpen ? (
                      <div className="space-y-2">
                        <input
                          type="text" value={entryMoodNoteDraft} onChange={(e) => setEntryMoodNoteDraft(e.target.value)} autoFocus
                          placeholder="What triggered this?"
                          className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEntryMoodNote(entryMoodNoteDraft); setEntryMoodNoteOpen(false); }} className="flex items-center gap-1 text-xs tj-primary-bg font-semibold px-3 py-1.5 rounded-lg hover:scale-[1.02] active:scale-95 transition-transform">
                            <IconDeviceFloppy size={12} /> Save
                          </button>
                          <button type="button" onClick={() => setEntryMoodNoteOpen(false)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setEntryMoodNoteDraft(entryMoodNote); setEntryMoodNoteOpen(true); }} className="text-xs text-zinc-500 hover:text-zinc-300 underline decoration-dotted">
                        {entryMoodNote ? "Edit note on what triggered this" : "+ Add a note on what triggered this"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={handleSaveClick} disabled={saveStatus === "saving" || (mode === "trade" && (!currentStrategy || !underlying.trim() || !legsComplete))} className="flex items-center gap-2 tj-primary-bg font-semibold text-sm px-5 py-3 rounded-xl disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                    <IconDeviceFloppy size={15} />
                    {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Couldn't save — retry" : mode === "no_trade" ? "Save Market Read" : "Save This Check"}
                  </button>
                  <button onClick={startNewCheck} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    <IconRotate size={15} /> {mode === "no_trade" ? "Clear Notes" : "Start New Trade Check"}
                  </button>
                  {mode === "trade" && !currentStrategy && <span className="text-xs text-amber-400">Pick a strategy above before saving.</span>}
                  {mode === "trade" && currentStrategy && !underlying.trim() && <span className="text-xs text-amber-400">Enter the underlying above before saving.</span>}
                  {mode === "trade" && currentStrategy && underlying.trim() && !legsComplete && <span className="text-xs text-amber-400">Fill in every field on each leg before saving.</span>}
                </div>
              </>
  );
}
