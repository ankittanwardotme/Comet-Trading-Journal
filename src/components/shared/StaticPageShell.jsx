import { Link } from "react-router-dom";
import { IconChevronLeft } from "@tabler/icons-react";
import logo from "../../assets/logo.png";
import { THEMES, themeGlobalCss, THEME_PRIMARY_CSS } from "../../lib/theme.js";
import { useThemeSettings } from "../../hooks/useThemeSettings.js";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";

const STATIC_PAGES = [
  { label: "About", path: "/about" },
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
  { label: "Risk Disclaimer", path: "/disclaimer" },
];

// Wraps every standalone page that lives outside the signed-in app shell
// (About, Privacy Policy, Terms, Risk Disclaimer) — these are reachable
// whether or not you're signed in, so they can't rely on AppShell's nav
// bar or its data-loading gates. Still picks up the current theme (via
// the same useThemeSettings load AppShell and OAuthConsentPage use) when
// there is a signed-in session to read one from; a signed-out visitor
// just gets the default theme, which is a reasonable first impression.
export function StaticPageShell({ title, children }) {
  const { themeId, colorMode } = useThemeSettings();
  const baseTh = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const effectiveMode = colorMode || baseTh.defaultMode;
  const th = effectiveMode === baseTh.defaultMode ? baseTh : { ...baseTh, ...baseTh.alt };

  return (
    <div
      className={`tj-app min-h-screen tj-theme-${th.id} tj-mode-${effectiveMode}`}
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

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-auto" />
            <span className="text-sm font-semibold" style={{ ...FONT_DISPLAY, color: "var(--tj-text1)" }}>Comet Trading Journal</span>
          </Link>
          <Link to="/" className="flex items-center gap-1 text-xs" style={{ color: "var(--tj-text3)" }}>
            <IconChevronLeft size={14} /> Back
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6" style={{ ...FONT_DISPLAY, color: "var(--tj-text1)" }}>{title}</h1>

        <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--tj-text2)" }}>
          {children}
        </div>

        <div className="mt-12 pt-6 border-t flex flex-wrap gap-x-5 gap-y-2" style={{ borderColor: "var(--tj-border)" }}>
          {STATIC_PAGES.map((p) => (
            <Link key={p.path} to={p.path} className="text-xs" style={{ ...FONT_MONO, color: "var(--tj-text4)" }}>
              {p.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-[11px]" style={{ color: "var(--tj-text5)" }}>© {new Date().getFullYear()} Comet Trading Journal. All rights reserved.</p>
      </div>
    </div>
  );
}
