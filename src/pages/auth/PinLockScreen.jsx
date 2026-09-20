import { useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { dbStorage } from "../../lib/supabaseClient.js";
import { FONT_DISPLAY } from "../../lib/format.js";
import { verifyPin, normalizeAnswer, SECURITY_QUESTIONS } from "../../lib/security.js";
import { PinDigitInput } from "../../components/shared/PinDigitInput.jsx";
import { PinDialogShell } from "./components/PinDialogShell.jsx";

export function PinLockScreen({ pinRecord, securityQuestions, onUnlock, onSignOutReset, onPinCleared, onLockout, greetingName }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [view, setView] = useState("pin"); // pin | forgot-options | security-questions
  const [qaAnswers, setQaAnswers] = useState({});
  const [qaError, setQaError] = useState("");
  const [qaChecking, setQaChecking] = useState(false);
  const [qaAttempts, setQaAttempts] = useState(0);

  const handleComplete = async (pin) => {
    setChecking(true);
    const ok = await verifyPin(pin, pinRecord);
    setChecking(false);
    if (ok) {
      sessionStorage.setItem("tj-pin-unlocked", "1");
      onUnlock();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setDigits(["", "", "", ""]);
    if (nextAttempts >= 5) {
      const until = Date.now() + 2 * 60 * 60 * 1000;
      try { await dbStorage.set("pin-lockout-until", JSON.stringify(until)); } catch (err) { /* best effort */ }
      onLockout(until);
      return;
    }
    setError(`Incorrect PIN. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? "" : "s"} left.`);
  };

  const hasSecurityQuestions = securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2;
  const qaLockedOut = qaAttempts >= 5;

  const verifyQuestions = async () => {
    setQaChecking(true);
    setQaError("");
    let allCorrect = true;
    for (const rec of securityQuestions.answers) {
      const given = normalizeAnswer(qaAnswers[rec.questionId] || "");
      const ok = await verifyPin(given, rec);
      if (!ok) { allCorrect = false; break; }
    }
    setQaChecking(false);
    if (allCorrect) { onPinCleared(); return; }
    const nextAttempts = qaAttempts + 1;
    setQaAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      const until = Date.now() + 2 * 60 * 60 * 1000;
      try { await dbStorage.set("pin-lockout-until", JSON.stringify(until)); } catch (err) { /* best effort */ }
      onLockout(until);
      return;
    }
    setQaError(`One or both answers didn't match. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? "" : "s"} left.`);
  };

  if (view === "forgot-options") {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Reset Your PIN
        </div>
        <p className="text-sm text-zinc-500 mb-8">Choose how you'd like to verify it's really you.</p>
        <div className="space-y-3">
          {hasSecurityQuestions && (
            <button onClick={() => setView("security-questions")} className="w-full bg-amber-400 text-zinc-950 font-semibold text-sm px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
              Answer Security Questions
            </button>
          )}
          <button onClick={onSignOutReset} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl transition-colors">
            Logout
          </button>
        </div>
        <button onClick={() => setView("pin")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-8 underline">
          Back to Enter PIN
        </button>
      </PinDialogShell>
    );
  }

  if (view === "security-questions") {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Answer Your Security Questions
        </div>
        <p className="text-sm text-zinc-500 mb-6">Answer both correctly to set up a new PIN.</p>
        <div className="space-y-4 text-left">
          {securityQuestions.answers.map((rec) => {
            const q = SECURITY_QUESTIONS.find((sq) => sq.id === rec.questionId);
            return (
              <label key={rec.questionId} className="block">
                <span className="text-xs text-zinc-500">{q ? q.text : "Question"}</span>
                <input
                  type="text" disabled={qaLockedOut} value={qaAnswers[rec.questionId] || ""}
                  onChange={(e) => setQaAnswers((prev) => ({ ...prev, [rec.questionId]: e.target.value }))}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </label>
            );
          })}
        </div>
        {qaError && <p className="text-xs text-rose-400 mt-4">{qaError}</p>}
        <button
          onClick={verifyQuestions} disabled={qaChecking || qaLockedOut}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {qaChecking ? "Checking..." : "Verify & Reset PIN"}
        </button>
        <button onClick={() => setView("forgot-options")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 underline">
          Back
        </button>
      </PinDialogShell>
    );
  }

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-amber-400" />
        Enter Your PIN
      </div>
      <p className="text-sm text-zinc-500 mb-8">{greetingName ? `Welcome back, ${greetingName}` : "Welcome back"} — enter your PIN to continue.</p>
      <PinDigitInput key={attempts} value={digits} onChange={setDigits} onComplete={handleComplete} autoFocus error={!!error} />
      {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}
      {checking && <p className="text-xs text-zinc-500 mt-4">Checking...</p>}
      <button onClick={() => setView("forgot-options")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-8 underline">
        Forgot your PIN?
      </button>
    </PinDialogShell>
  );
}
