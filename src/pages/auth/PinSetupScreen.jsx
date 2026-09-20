import { useState } from "react";
import { IconCheck, IconLock, IconRotate, IconShield } from "@tabler/icons-react";
import { dbStorage } from "../../lib/supabaseClient.js";
import { FONT_DISPLAY } from "../../lib/format.js";
import { createPinRecord, normalizeAnswer, pickRandomQuestions } from "../../lib/security.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { PinDigitInput } from "../../components/shared/PinDigitInput.jsx";
import { PinDialogShell } from "./components/PinDialogShell.jsx";

export function PinSetupScreen({ onComplete, existingUser, hasExistingSecurityQuestions }) {
  const [step, setStep] = useState(1); // 1=choose pin, 2=confirm pin, 3=pick questions, 4=answer questions
  const [firstPin, setFirstPin] = useState("");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPinRecord, setSavedPinRecord] = useState(null);
  const [fiveQuestions, setFiveQuestions] = useState(() => pickRandomQuestions(5));
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [answers, setAnswers] = useState({});

  const handleFirstComplete = (pin) => {
    setFirstPin(pin);
    setDigits(["", "", "", ""]);
    setError("");
    setStep(2);
  };

  const handleConfirmComplete = async (pin) => {
    if (pin !== firstPin) {
      setError("PINs didn't match — let's try again.");
      setDigits(["", "", "", ""]);
      setFirstPin("");
      setStep(1);
      return;
    }
    setSaving(true);
    const record = await createPinRecord(pin);
    if (hasExistingSecurityQuestions) {
      // Preserve existing security questions untouched — the user already
      // proved they know the answers (that's how they got here), so there's
      // no reason to force them to set up new ones right now.
      try { await dbStorage.set("security-pin", JSON.stringify(record)); } catch (err) { /* best effort */ }
      sessionStorage.setItem("tj-pin-unlocked", "1");
      setSaving(false);
      onComplete(record); // second arg omitted — tells the parent "questions unchanged"
      return;
    }
    setSaving(false);
    setSavedPinRecord(record);
    setStep(3);
  };

  const toggleQuestion = (id) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(id)) return prev.filter((q) => q !== id);
      if (prev.length >= 2) return prev; // max 2 — deselect one first
      return [...prev, id];
    });
  };

  const refreshQuestions = () => {
    setFiveQuestions(pickRandomQuestions(5));
    setSelectedQuestionIds([]);
  };

  const finishSetup = async () => {
    setSaving(true);
    try { await dbStorage.set("security-pin", JSON.stringify(savedPinRecord)); } catch (err) { /* best effort */ }
    const questionRecords = await Promise.all(
      selectedQuestionIds.map(async (qid) => {
        const record = await createPinRecord(normalizeAnswer(answers[qid] || ""));
        return { questionId: qid, salt: record.salt, hash: record.hash };
      })
    );
    const newSecurityQuestions = { answers: questionRecords };
    try { await dbStorage.set("security-questions", JSON.stringify(newSecurityQuestions)); } catch (err) { /* best effort */ }
    sessionStorage.setItem("tj-pin-unlocked", "1");
    setSaving(false);
    onComplete(savedPinRecord, newSecurityQuestions);
  };

  const skipSecurityQuestions = async () => {
    setSaving(true);
    try { await dbStorage.set("security-pin", JSON.stringify(savedPinRecord)); } catch (err) { /* best effort */ }
    sessionStorage.setItem("tj-pin-unlocked", "1");
    setSaving(false);
    onComplete(savedPinRecord); // second arg omitted — no security questions set up
  };

  const bothAnswered = selectedQuestionIds.length === 2 && selectedQuestionIds.every((qid) => (answers[qid] || "").trim().length > 0);

  if (step === 3) {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Choose 2 Security Questions
        </div>
        <div className="flex items-center justify-between gap-2 mb-6">
          <p className="text-sm text-zinc-500 text-left">These let you reset your PIN later if you forget it. Pick any 2 of these 5.</p>
          <Tooltip text="Get a new set of questions">
            <button onClick={refreshQuestions} className="flex-shrink-0 p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <IconRotate size={15} />
            </button>
          </Tooltip>
        </div>
        <div className="space-y-2 text-left">
          {fiveQuestions.map((q) => {
            const selected = selectedQuestionIds.includes(q.id);
            return (
              <button
                key={q.id} onClick={() => toggleQuestion(q.id)}
                className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${
                  selected ? "border-amber-400 bg-amber-400/10 text-zinc-100" : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span className={`w-4 h-4 rounded flex-shrink-0 border ${selected ? "bg-amber-400 border-amber-400" : "border-zinc-600"}`}>
                  {selected && <IconCheck size={13} strokeWidth={3} className="text-zinc-950" />}
                </span>
                {q.text}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setStep(4)}
          disabled={selectedQuestionIds.length !== 2}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          Continue ({selectedQuestionIds.length}/2 selected)
        </button>
        <button onClick={() => setStep(5)} className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-3">
          Set up later
        </button>
      </PinDialogShell>
    );
  }

  if (step === 5) {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-3" style={FONT_DISPLAY}>
          <IconShield size={22} className="text-amber-400" />
          Security Questions Skipped
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Setting up security questions lets you reset your PIN if you ever forget it. You can set them up anytime from Settings → Security Questions.
        </p>
        <button
          onClick={skipSecurityQuestions}
          disabled={saving}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-60 font-semibold text-sm px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {saving ? "Finishing up…" : "Okay"}
        </button>
      </PinDialogShell>
    );
  }

  if (step === 4) {
    const chosen = fiveQuestions.filter((q) => selectedQuestionIds.includes(q.id));
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Answer Your Questions
        </div>
        <p className="text-sm text-zinc-500 mb-6">Answers aren't case-sensitive. Make sure you'll remember exactly what you type.</p>
        <div className="space-y-4 text-left">
          {chosen.map((q) => (
            <label key={q.id} className="block">
              <span className="text-xs text-zinc-500">{q.text}</span>
              <input
                type="text" value={answers[q.id] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
          ))}
        </div>
        <button
          onClick={finishSetup} disabled={!bothAnswered || saving}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {saving ? "Saving..." : "Finish Setup"}
        </button>
        <button onClick={() => setStep(3)} className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 underline">
          Back to question selection
        </button>
      </PinDialogShell>
    );
  }

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-amber-400" />
        Set Up a Security PIN
      </div>
      <p className="text-sm text-zinc-500 mb-8">
        {existingUser
          ? "Add a PIN to keep your journal locked when you're not using it."
          : "Choose a 4-digit PIN to lock your journal."}
        {step === 2 && " Re-enter it to confirm."}
      </p>
      <PinDigitInput key={step} value={digits} onChange={setDigits} onComplete={step === 1 ? handleFirstComplete : handleConfirmComplete} autoFocus error={!!error} />
      {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}
      {saving && <p className="text-xs text-zinc-500 mt-4">Saving...</p>}
    </PinDialogShell>
  );
}
