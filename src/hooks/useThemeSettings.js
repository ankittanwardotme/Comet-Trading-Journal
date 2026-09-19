import { useState, useEffect } from "react";
import { dbStorage } from "../lib/supabaseClient.js";

// Loads the signed-in user's saved theme selection (themeId/colorMode)
// from Supabase. Previously this exact load effect was independently
// duplicated between PreTradeChecklist (the main app shell) and
// OAuthConsentPage (a one-off page that needs to match the user's theme
// too) — same storage key, same fallback defaults, copy-pasted. This
// hook is the single source of truth for that load; each caller still
// owns its own hook call and its own state, same as before, just without
// the duplication. Persisting a CHANGE back to storage (only
// PreTradeChecklist does this, when the user picks a new theme in
// Settings) stays the caller's own concern — this hook only covers the
// load, which is the part that was actually duplicated.
export function useThemeSettings() {
  const [themeId, setThemeId] = useState("swiss");
  const [colorMode, setColorMode] = useState(null);
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dbStorage.get("theme-settings");
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && parsed.themeId) setThemeId(parsed.themeId);
          if (parsed && (parsed.colorMode === "light" || parsed.colorMode === "dark")) setColorMode(parsed.colorMode);
        }
      } catch (err) { /* default theme stays */ }
      finally { if (!cancelled) setThemeReady(true); }
    })();
    return () => { cancelled = true; };
  }, []);
  return { themeId, setThemeId, colorMode, setColorMode, themeReady };
}
