import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { THEMES, themeGlobalCss, THEME_PRIMARY_CSS } from "../../lib/theme.js";
import { useThemeSettings } from "../../hooks/useThemeSettings.js";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";

// Supabase's OAuth 2.1 Server authenticates the user itself, then redirects
// here with an authorization_id — it deliberately doesn't host its own
// consent UI, so this app has to. Confirmed against this project's own
// installed @supabase/auth-js type definitions (not just doc examples)
// before writing this: getAuthorizationDetails can return either
// authorization details (show the screen below) or an already-consented
// redirect (skip straight through), and approveAuthorization/
// denyAuthorization redirect the browser automatically by default.
export function OAuthConsentPage({ authorizationId }) {
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
