import { useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import logo from "../../assets/logo.png";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";
import { GoogleLogo } from "./components/GoogleLogo.jsx";

export function LoginPage({ forceReauth }) {
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
