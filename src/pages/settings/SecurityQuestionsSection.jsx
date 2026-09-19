import { useState } from "react";
import { IconRotate, IconCheck } from "@tabler/icons-react";
import { FONT_MONO } from "../../lib/format.js";
import { verifyPin, createPinRecord, SECURITY_QUESTIONS, normalizeAnswer, pickRandomQuestions } from "../../lib/security.js";
import { notify } from "../../lib/notifications.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { PinDigitInput } from "../../components/shared/PinDigitInput.jsx";

export function SecurityQuestionsSection({ pinRecord, securityQuestions, onQuestionsChanged }) {
  const [step, setStep] = useState("view"); // view | verify | pick | answer | done
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fiveQuestions, setFiveQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [answers, setAnswers] = useState({});

  const hasExisting = securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2;
  const existingQuestionTexts = hasExisting
    ? securityQuestions.answers.map((rec) => (SECURITY_QUESTIONS.find((sq) => sq.id === rec.questionId) || {}).text).filter(Boolean)
    : [];

  const startUpdate = () => {
    setDigits(["", "", "", ""]);
    setError("");
    setStep("verify");
  };

  const handleVerifyComplete = async (pin) => {
    setBusy(true);
    const ok = await verifyPin(pin, pinRecord);
    setBusy(false);
    if (!ok) { setError("That's not your current PIN."); setDigits(["", "", "", ""]); return; }
    setFiveQuestions(pickRandomQuestions(5));
    setSelectedQuestionIds([]);
    setAnswers({});
    setError("");
    setStep("pick");
  };

  const toggleQuestion = (id) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(id)) return prev.filter((q) => q !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const refreshQuestions = () => {
    setFiveQuestions(pickRandomQuestions(5));
    setSelectedQuestionIds([]);
  };

  const bothAnswered = selectedQuestionIds.length === 2 && selectedQuestionIds.every((qid) => (answers[qid] || "").trim().length > 0);

  const finishUpdate = async () => {
    setBusy(true);
    const questionRecords = await Promise.all(
      selectedQuestionIds.map(async (qid) => {
        const record = await createPinRecord(normalizeAnswer(answers[qid] || ""));
        return { questionId: qid, salt: record.salt, hash: record.hash };
      })
    );
    await onQuestionsChanged({ answers: questionRecords });
    setBusy(false);
    setStep("done");
    notify("Security questions updated.");
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-6">
      <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Security Questions</p>

      {step === "view" && (
        <>
          {hasExisting ? (
            <div className="text-left space-y-2">
              <p className="text-xs text-zinc-500">Used to reset your PIN if you forget it. Your current questions:</p>
              <ul className="text-sm text-zinc-300 list-disc list-inside space-y-1">
                {existingQuestionTexts.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Not set up yet — add these so you can reset your PIN yourself if you ever forget it.</p>
          )}
          <button onClick={startUpdate} className="tj-primary-bg font-semibold text-sm px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
            {hasExisting ? "Update Questions" : "Set Up Security Questions"}
          </button>
        </>
      )}

      {step === "verify" && (
        <>
          <p className="text-sm text-zinc-400">Enter your current PIN to continue.</p>
          <PinDigitInput key="verify" value={digits} onChange={setDigits} onComplete={handleVerifyComplete} autoFocus error={!!error} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {busy && <p className="text-xs text-zinc-500">Checking...</p>}
        </>
      )}

      {step === "pick" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-zinc-500 text-left">Pick any 2 of these 5 questions.</p>
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
                    selected ? "border-amber-400 bg-amber-400/10 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
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
            onClick={() => setStep("answer")} disabled={selectedQuestionIds.length !== 2}
            className="tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
          >
            Continue ({selectedQuestionIds.length}/2 selected)
          </button>
        </>
      )}

      {step === "answer" && (
        <>
          <p className="text-sm text-zinc-500">Answers aren't case-sensitive. Make sure you'll remember exactly what you type.</p>
          <div className="space-y-4 text-left">
            {fiveQuestions.filter((q) => selectedQuestionIds.includes(q.id)).map((q) => (
              <label key={q.id} className="block">
                <span className="text-xs text-zinc-500">{q.text}</span>
                <input
                  type="text" value={answers[q.id] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
            ))}
          </div>
          <button
            onClick={finishUpdate} disabled={!bothAnswered || busy}
            className="tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
          >
            {busy ? "Saving..." : "Save Questions"}
          </button>
          <button onClick={() => setStep("pick")} className="text-xs text-zinc-500 hover:text-zinc-300 block mx-auto underline">
            Back
          </button>
        </>
      )}

      {step === "done" && <p className="text-sm text-emerald-600 font-semibold">Your security questions have been saved.</p>}
    </div>
  );
}
