import React, { useState, useEffect } from "react";
import { IconCheck, IconLock, IconRotate, IconShield } from "@tabler/icons-react";
import logo from "./assets/logo.png";
import { supabase, dbStorage, deleteAllUserData } from "./lib/supabaseClient.js";
import { THEMES, themeGlobalCss, THEME_PRIMARY_CSS } from "./lib/theme.js";
import { useThemeSettings } from "./hooks/useThemeSettings.js";
import { FONT_DISPLAY, FONT_MONO } from "./lib/format.js";
import { createPinRecord, verifyPin, SECURITY_QUESTIONS, normalizeAnswer, pickRandomQuestions } from "./lib/security.js";
import { Tooltip } from "./components/shared/Tooltip.jsx";
import { PinDigitInput } from "./components/shared/PinDigitInput.jsx";
import { pad2 } from "./lib/dateUtils.js";
import { AppShell } from "./shell/AppShell.jsx";
import { AppLoadingScreen } from "./components/shared/AppLoadingScreen.jsx";



/* ============== Small components ============== */

function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="flex-shrink-0">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}

function PinDialogShell({ children }) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-7 text-center tj-popover">
        <img src={logo} alt="Comet Trading Journal" className="h-14 w-auto mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}

function PinSetupScreen({ onComplete, existingUser, hasExistingSecurityQuestions }) {
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

function PinLockedOutScreen({ until, onSignOutReset, onExpired }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= until) { onExpired(); return; }
      forceTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  const remainingMs = Math.max(0, until - Date.now());
  const totalSec = Math.ceil(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const countdown = `${h}:${pad2(m)}:${pad2(s)}`;

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-rose-500" />
        Account Blocked
      </div>
      <p className="text-sm text-zinc-500 mb-2">Too many incorrect attempts. Try again in:</p>
      <p className="text-3xl font-bold text-rose-500 mb-6" style={FONT_MONO}>{countdown}</p>
      <div className="pointer-events-none opacity-40">
        <PinDigitInput value={["", "", "", ""]} onChange={() => {}} onComplete={() => {}} autoFocus={false} />
      </div>
      <button onClick={onSignOutReset} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl mt-6 transition-colors">
        Logout
      </button>
    </PinDialogShell>
  );
}

function PinLockScreen({ pinRecord, securityQuestions, onUnlock, onSignOutReset, onPinCleared, onLockout, greetingName }) {
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

function LoginPage({ forceReauth }) {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    setError("");
    setSigningIn(true);
    const queryParams = forceReauth
      ? { prompt: "login select_account", max_age: "0" }
      : { prompt: "select_account" };
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname + window.location.search, queryParams },
    });
    if (err) { setError(err.message || "Couldn't start Google sign-in. Please try again."); setSigningIn(false); }
    // On success the browser navigates away to Google, so no further state change is needed here.
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4" style={FONT_DISPLAY}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-2">
          <img src={logo} alt="" className="h-20 w-auto mb-1" />
          <div className="text-xl text-zinc-50" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Comet Trading Journal</div>
        </div>
        <p className="text-center text-sm text-zinc-500 mb-8" style={FONT_MONO}>A pre-trade discipline layer for options sellers and buyers.</p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-400 mb-5 text-center">
            {forceReauth ? "For security, please sign in again to confirm it's you before resetting your PIN." : "Sign in to access your journal."}
          </p>
          <button
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 disabled:opacity-60 text-zinc-800 font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
          >
            <GoogleLogo />
            {signingIn ? "Redirecting..." : "Sign in with Google"}
          </button>
          {error && <p className="text-xs text-rose-400 mt-3 text-center">{error}</p>}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6" style={FONT_MONO}>Your journal is private to your account.</p>
      </div>
    </div>
  );
}

// Supabase's OAuth 2.1 Server authenticates the user itself, then redirects
// here with an authorization_id — it deliberately doesn't host its own
// consent UI, so this app has to. Confirmed against this project's own
// installed @supabase/auth-js type definitions (not just doc examples)
// before writing this: getAuthorizationDetails can return either
// authorization details (show the screen below) or an already-consented
// redirect (skip straight through), and approveAuthorization/
// denyAuthorization redirect the browser automatically by default.
function OAuthConsentPage({ authorizationId }) {
  const [status, setStatus] = useState("loading"); // "loading" | "consent" | "processing" | "error"
  const [details, setDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Uses the same shared useThemeSettings load as AppShell, so
  // this one-off page matches whichever theme the user actually has
  // selected instead of a hardcoded look.
  const { themeId, colorMode } = useThemeSettings();
  const baseTh = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const effectiveMode = colorMode || baseTh.defaultMode;
  const th = effectiveMode === baseTh.defaultMode ? baseTh : { ...baseTh, ...baseTh.alt };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message || "Couldn't load this connection request.");
        setStatus("error");
        return;
      }
      if (data && "redirect_url" in data) {
        window.location.href = data.redirect_url; // already consented before — no screen needed
        return;
      }
      setDetails(data);
      setStatus("consent");
    })();
    return () => { cancelled = true; };
  }, [authorizationId]);

  const handleApprove = async () => {
    setStatus("processing");
    const { error } = await supabase.auth.oauth.approveAuthorization(authorizationId);
    if (error) {
      setErrorMsg(error.message || "Couldn't approve this request — please try again.");
      setStatus("error");
    }
    // On success the SDK redirects the browser itself — nothing further to do here.
  };

  const handleDeny = async () => {
    setStatus("processing");
    const { error } = await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (error) {
      setErrorMsg(error.message || "Couldn't deny this request — please try again.");
      setStatus("error");
    }
  };

  const scopes = (details?.scope || "").split(/\s+/).filter(Boolean);

  return (
    <div
      className={`tj-app min-h-screen tj-theme-${th.id} tj-mode-${effectiveMode} flex items-center justify-center px-4`}
      style={{
        "--tj-primary": th.primary,
        "--tj-primary-contrast": th.primaryContrast,
        "--tj-secondary": th.secondary,
        "--tj-accent": th.accent,
        "--tj-bg": th.bg,
        "--tj-panel": th.panel,
        "--tj-panel2": th.panel2,
        "--tj-panel-solid": th.panelSolid || th.panel2,
        "--tj-border": th.border,
        "--tj-border-soft": th.borderSoft,
        "--tj-text1": th.text1,
        "--tj-text2": th.text2,
        "--tj-text3": th.text3,
        "--tj-text4": th.text4,
        "--tj-text5": th.text5,
        "--tj-radius-sm": th.radiusSm,
        "--tj-radius-md": th.radiusMd,
        "--tj-radius-lg": th.radiusLg,
        "--tj-shadow": th.shadow,
        "--tj-dur": th.transDur,
        "--tj-ease": th.transEase,
        "--tj-font-display": th.fontDisplay,
        "--tj-font-body": th.fontBody,
        "--tj-blur": th.blur,
        background: th.bg,
        color: th.text1,
        fontFamily: th.fontBody,
      }}
    >
      <style>{themeGlobalCss(th)}</style>
      {th.id === "crt" && <div className="tj-app-bg-overlay"></div>}
      <style>{THEME_PRIMARY_CSS}</style>
      <div className="w-full max-w-sm rounded-2xl border tj-solid-bg p-6 space-y-5" style={{ borderColor: "var(--tj-border)" }}>
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ ...FONT_MONO, color: "var(--tj-text4)" }}>Comet Trading Journal</p>
          <p className="text-lg font-semibold" style={{ ...FONT_DISPLAY, color: "var(--tj-text1)" }}>Connection Request</p>
        </div>

        {status === "loading" && (
          <p className="text-sm text-center" style={{ color: "var(--tj-text3)" }}>Loading request details...</p>
        )}

        {status === "error" && (
          <>
            <p className="text-sm text-rose-400 text-center">{errorMsg}</p>
            <p className="text-xs text-center" style={{ color: "var(--tj-text4)" }}>You can close this window and try connecting again.</p>
          </>
        )}

        {status === "processing" && (
          <p className="text-sm text-center" style={{ color: "var(--tj-text3)" }}>Working...</p>
        )}

        {status === "consent" && details && (
          <>
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--tj-border)", background: "var(--tj-panel)" }}>
              <div className="flex items-center gap-3">
                {details.client?.logo_uri ? (
                  <img src={details.client.logo_uri} alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "var(--tj-panel2)" }} />
                )}
                <p className="text-sm font-semibold truncate" style={{ color: "var(--tj-text1)" }}>{details.client?.name || "This application"}</p>
              </div>
              <p className="text-xs" style={{ color: "var(--tj-text4)" }}>wants to access your Comet Trading Journal data as <span style={{ color: "var(--tj-text2)" }}>{details.user?.email}</span>.</p>
              {scopes.length > 0 && (
                <div className="pt-1 border-t space-y-1" style={{ borderColor: "var(--tj-border-soft)" }}>
                  <p className="text-[10px] uppercase tracking-widest" style={{ ...FONT_MONO, color: "var(--tj-text5)" }}>Requested access</p>
                  {scopes.map((s) => (
                    <p key={s} className="text-xs" style={{ color: "var(--tj-text4)" }}>&bull; {s}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleApprove} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
                Allow
              </button>
              <button onClick={handleDeny} className="text-sm px-4 py-2.5 rounded-lg flex-1" style={{ background: "var(--tj-panel2)", color: "var(--tj-text2)" }}>
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [pinGate, setPinGate] = useState("checking"); // checking | needs-setup | needs-entry | locked-out | unlocked
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [pinRecord, setPinRecord] = useState(null);
  const [securityQuestions, setSecurityQuestions] = useState(null);
  const [greetingName, setGreetingName] = useState("");
  const [forceGoogleReauth, setForceGoogleReauth] = useState(false);
  const [deletionCancelledNotice, setDeletionCancelledNotice] = useState(false);
  const [pendingAuthorizationId] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("authorization_id");
    if (fromUrl) {
      try { sessionStorage.setItem("pending-oauth-authorization-id", fromUrl); } catch (e) { /* best effort */ }
      return fromUrl;
    }
    try { return sessionStorage.getItem("pending-oauth-authorization-id"); } catch (e) { return null; }
  });

  const forceSignOutStale = () => {
    sessionStorage.removeItem("tj-pin-unlocked");
    localStorage.removeItem("tj-last-active");
    supabase.auth.signOut();
  };

  const evaluatePinGate = async (currentSession) => {
    dbStorage.setUserId(currentSession.user.id);
    setGreetingName(currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name || "");

    // Account deletion is a 7-day grace-period soft-delete, enforced
    // lazily: nothing runs in the background while the user is away, and
    // that's by design — if they never log in again, their data simply
    // stays as-is indefinitely. This check, run at the next login attempt,
    // is the only place the deletion actually happens. If it's been 7+
    // days since they requested deletion, wipe everything now and sign
    // them out; logging in again after that is indistinguishable from a
    // brand new account, since there's nothing left of the old one.
    try {
      const res = await dbStorage.get("account-deletion-requested-at");
      const requestedAt = res && res.value ? JSON.parse(res.value) : null;
      if (requestedAt) {
        if (Date.now() - requestedAt >= SEVEN_DAYS_MS) {
          try { await deleteAllUserData(); } catch (err) { /* best effort */ }
          forceSignOutStale();
          return;
        } else {
          await dbStorage.delete("account-deletion-requested-at");
          setDeletionCancelledNotice(true);
        }
      }
    } catch (err) { /* don't block normal login over this check failing */ }

    // A 2-hour lockout triggered by 5 failed security-question attempts —
    // stored in the database (not just component state) so it survives
    // page reloads and can't be sidestepped by simply refreshing.
    try {
      const lockRes = await dbStorage.get("pin-lockout-until");
      const until = lockRes && lockRes.value ? JSON.parse(lockRes.value) : null;
      if (until) {
        if (Date.now() < until) {
          setLockoutUntil(until);
          setPinGate("locked-out");
          return;
        } else {
          await dbStorage.delete("pin-lockout-until");
        }
      }
    } catch (err) { /* don't block normal login over this check failing */ }

    // A PIN reset was requested (via "Forgot your PIN?") and the user has
    // just proven their identity again via a fresh Google sign-in — now
    // it's safe to actually clear the old PIN and let them choose a new one.
    // Stored in the database (not sessionStorage) so this reliably survives
    // the full sign-out -> Google redirect -> sign-back-in round trip,
    // regardless of browser tab behavior during that redirect.
    try {
      const pendingRes = await dbStorage.get("pin-reset-pending");
      if (pendingRes && pendingRes.value && JSON.parse(pendingRes.value) === true) {
        await dbStorage.delete("pin-reset-pending");
        try { await dbStorage.delete("security-pin"); } catch (err) { /* fall through to setup regardless */ }
        setPinRecord(null);
        setPinGate("needs-setup");
        return;
      }
    } catch (err) { /* fall through to normal pin gate logic if this check fails */ }

    // This reload was triggered by our own idle-timeout, not a fresh tab —
    // skip the "closed for 3h+" check below entirely, since we already know
    // this was a continuously-open tab, and go straight to re-locking it.
    const isIdleTriggeredReload = sessionStorage.getItem("tj-idle-reload-flag");
    if (isIdleTriggeredReload) sessionStorage.removeItem("tj-idle-reload-flag");

    if (!isIdleTriggeredReload) {
      const lastActive = parseInt(localStorage.getItem("tj-last-active") || "0", 10);
      const elapsed = Date.now() - lastActive;
      if (lastActive > 0 && elapsed > THREE_HOURS_MS) {
        // The app was closed (not signed out) for more than 3 hours — treat
        // this like a stale session and require a fresh Google sign-in.
        forceSignOutStale();
        return;
      }
    }

    let record = null;
    try {
      const res = await dbStorage.get("security-pin");
      record = res && res.value ? JSON.parse(res.value) : null;
    } catch (err) { /* treat as no PIN set yet */ }
    setPinRecord(record);

    try {
      const qRes = await dbStorage.get("security-questions");
      setSecurityQuestions(qRes && qRes.value ? JSON.parse(qRes.value) : null);
    } catch (err) { setSecurityQuestions(null); }

    if (!record) { setPinGate("needs-setup"); return; }

    // A PIN exists. If this exact tab session already unlocked it (and
    // hasn't been closed since — sessionStorage clears on tab close), skip
    // straight through. Otherwise, require the PIN again.
    if (sessionStorage.getItem("tj-pin-unlocked") === "1") setPinGate("unlocked");
    else setPinGate("needs-entry");
  };

  useEffect(() => {
    let cancelled = false;
    // A fresh OAuth sign-in redirect lands back here with ?code=... in the
    // URL, and Supabase is asynchronously exchanging it for a session right
    // as this effect runs. Treat that window specially — a getSession()
    // error here is far more likely to be a transient race with that
    // in-flight exchange than a genuinely stale, dangling token, so the
    // aggressive storage-clearing below must not run in that case.
    const oauthCallbackInProgress = window.location.search.includes("code=");
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error && !oauthCallbackInProgress && (error.code === "session_not_found" || (error.message || "").includes("session_id claim"))) {
        // A leftover access token from an earlier session that was already
        // revoked server-side (e.g. by a prior sign-out or forced logout)
        // — the token itself hasn't expired yet, but the session it points
        // to no longer exists. Clear it so this resolves to a clean,
        // logged-out state instead of getting stuck here.
        try {
          Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") && k.endsWith("-auth-token")) localStorage.removeItem(k); });
        } catch (e) { /* best effort */ }
        setSession(null);
        return;
      }
      setSession(data.session);
      if (data.session) { setForceGoogleReauth(false); evaluatePinGate(data.session); }
      else setPinGate("checking");
    }).catch(() => { if (!cancelled) setSession(null); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      dbStorage.setUserId(newSession ? newSession.user.id : null);
      if (event === "SIGNED_IN") {
        // A genuine, active sign-in (as opposed to the page simply
        // restoring an already-logged-in session on load) should always
        // land on the dashboard, not wherever the user happened to be
        // when they last signed out.
        try { localStorage.setItem("tj-last-tab", "home"); } catch (e) { /* best effort */ }
      }
      setSession(newSession);
      if (newSession) { setForceGoogleReauth(false); evaluatePinGate(newSession); }
      else setPinGate("checking");
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While unlocked: track activity, and auto-lock after 3 hours of none.
  useEffect(() => {
    if (pinGate !== "unlocked") return;
    const markActive = () => localStorage.setItem("tj-last-active", String(Date.now()));
    markActive();
    let lastMark = Date.now();
    const throttledMark = () => {
      const now = Date.now();
      if (now - lastMark > 30000) { lastMark = now; markActive(); }
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, throttledMark, { passive: true }));

    const idleCheck = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem("tj-last-active") || "0", 10);
      if (Date.now() - lastActive > THREE_HOURS_MS) {
        sessionStorage.setItem("tj-idle-reload-flag", "1");
        sessionStorage.removeItem("tj-pin-unlocked");
        window.location.reload();
      }
    }, 60000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, throttledMark));
      clearInterval(idleCheck);
    };
  }, [pinGate]);

  const handleSignOutReset = async () => {
    try { await dbStorage.set("pin-reset-pending", JSON.stringify(true)); } catch (err) { /* best effort */ }
    setForceGoogleReauth(true);
    forceSignOutStale();
  };

  const handlePinChangedFromSettings = async (record) => {
    try { await dbStorage.set("security-pin", JSON.stringify(record)); } catch (err) { /* best effort */ }
    setPinRecord(record);
  };

  const handleSecurityQuestionsChangedFromSettings = async (record) => {
    try { await dbStorage.set("security-questions", JSON.stringify(record)); } catch (err) { /* best effort */ }
    setSecurityQuestions(record);
  };

  if (session === undefined) return <AppLoadingScreen />;
  if (session === null) return <LoginPage forceReauth={forceGoogleReauth} />;
  if (pinGate === "checking") return <AppLoadingScreen />;

  const pinOverlayActive = pinGate === "needs-setup" || pinGate === "needs-entry" || pinGate === "locked-out";

  if (pinGate === "unlocked" && pendingAuthorizationId) {
    try { sessionStorage.removeItem("pending-oauth-authorization-id"); } catch (e) { /* best effort */ }
    return <OAuthConsentPage authorizationId={pendingAuthorizationId} />;
  }

  return (
    <>
      <div className={pinOverlayActive ? "tj-blur-locked" : ""}>
        <AppShell
          session={session} pinRecord={pinRecord} onPinChanged={handlePinChangedFromSettings}
          securityQuestions={securityQuestions} onSecurityQuestionsChanged={handleSecurityQuestionsChangedFromSettings}
          deletionCancelledNotice={deletionCancelledNotice} onDismissDeletionNotice={() => setDeletionCancelledNotice(false)}
          pinUnlocked={pinGate === "unlocked"}
        />
      </div>
      {pinGate === "needs-setup" && (
        <PinSetupScreen
          existingUser={!!pinRecord}
          hasExistingSecurityQuestions={!!(securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2)}
          onComplete={(newPinRecord, newSecurityQuestions) => {
            setPinRecord(newPinRecord);
            if (newSecurityQuestions !== undefined) setSecurityQuestions(newSecurityQuestions);
            setPinGate("unlocked");
          }}
        />
      )}
      {pinGate === "locked-out" && (
        <PinLockedOutScreen
          until={lockoutUntil} onSignOutReset={handleSignOutReset}
          onExpired={() => { setLockoutUntil(null); setPinGate("needs-entry"); }}
        />
      )}
      {pinGate === "needs-entry" && (
        <PinLockScreen
          pinRecord={pinRecord} securityQuestions={securityQuestions} greetingName={greetingName}
          onUnlock={() => setPinGate("unlocked")} onSignOutReset={handleSignOutReset}
          onLockout={(until) => { setLockoutUntil(until); setPinGate("locked-out"); }}
          onPinCleared={async () => {
            try { await dbStorage.delete("security-pin"); } catch (err) { /* best effort */ }
            setPinRecord(null);
            setPinGate("needs-setup");
          }}
        />
      )}
    </>
  );
}
