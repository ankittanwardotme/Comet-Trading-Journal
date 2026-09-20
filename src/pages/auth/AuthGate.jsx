import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, dbStorage, deleteAllUserData } from "../../lib/supabaseClient.js";
import { tabToPath } from "../../lib/routes.js";
import { AppLoadingScreen } from "../../components/shared/AppLoadingScreen.jsx";
import { AppShell } from "../../shell/AppShell.jsx";
import { LoginPage } from "./LoginPage.jsx";
import { OAuthConsentPage } from "./OAuthConsentPage.jsx";
import { PinSetupScreen } from "./PinSetupScreen.jsx";
import { PinLockedOutScreen } from "./PinLockedOutScreen.jsx";
import { PinLockScreen } from "./PinLockScreen.jsx";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AuthGate() {
  const navigate = useNavigate();
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

  // Tracks the last known session outside React state so the "SIGNED_IN"
  // handler below can tell a genuine fresh login apart from Supabase simply
  // re-confirming an already-restored session — which it does fire
  // "SIGNED_IN" for on a plain page load/refresh, not just real logins.
  // undefined = not yet determined, null = confirmed signed out, object =
  // signed in. Only the null -> session transition is a real sign-in.
  const sessionRef = useRef(undefined);

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
        sessionRef.current = null;
        setSession(null);
        return;
      }
      sessionRef.current = data.session;
      setSession(data.session);
      if (data.session) { setForceGoogleReauth(false); evaluatePinGate(data.session); }
      else setPinGate("checking");
    }).catch(() => { if (!cancelled) { sessionRef.current = null; setSession(null); } });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      dbStorage.setUserId(newSession ? newSession.user.id : null);
      if (event === "SIGNED_IN" && sessionRef.current === null) {
        // A genuine, active sign-in (as opposed to the page simply
        // restoring an already-logged-in session on load) should always
        // land on the dashboard, not wherever the user happened to be
        // when they last signed out.
        navigate(tabToPath("home"), { replace: true });
      }
      sessionRef.current = newSession;
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
