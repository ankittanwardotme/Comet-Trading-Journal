export const THEMES = [
  {
    id: "glass", name: "Apple Glass", defaultMode: "dark",
    bg: "radial-gradient(circle at 20% 20%, #232345 0%, #15152b 45%, #0d0d1a 100%)",
    panel: "rgba(255,255,255,0.06)", panel2: "rgba(255,255,255,0.10)", panelSolid: "#1c1c33",
    border: "rgba(255,255,255,0.14)", borderSoft: "rgba(255,255,255,0.24)",
    text1: "#f5f5f7", text2: "#d1d1d6", text3: "#a1a1a6", text4: "#86868b", text5: "#6e6e73",
    radiusSm: "14px", radiusMd: "20px", radiusLg: "26px",
    shadow: "0 8px 32px rgba(0,0,0,0.28)", transDur: "0.4s", transEase: "cubic-bezier(0.16,1,0.3,1)",
    primary: "#0A84FF", primaryContrast: "#ffffff", secondary: "#BF5AF2", accent: "#64D2FF",
    fontDisplay: "'Outfit', 'Noto Sans', sans-serif", fontBody: "'Outfit', 'Noto Sans', sans-serif", blur: "22px", extra: "",
    alt: {
      bg: "radial-gradient(circle at 20% 20%, #ffffff 0%, #f2f2f7 45%, #e5e5ea 100%)",
      panel: "rgba(0,0,0,0.035)", panel2: "rgba(0,0,0,0.06)", panelSolid: "#ffffff",
      border: "rgba(0,0,0,0.10)", borderSoft: "rgba(0,0,0,0.18)",
      text1: "#1d1d1f", text2: "#3a3a3c", text3: "#6e6e73", text4: "#8e8e93", text5: "#aeaeb2",
      shadow: "0 8px 32px rgba(0,0,0,0.10)",
      primary: "#0A84FF", primaryContrast: "#ffffff", secondary: "#AF52DE", accent: "#0091B0",
    },
  },
  {
    id: "neubrutalist", name: "Neubrutalist", defaultMode: "light",
    bg: "#FDF6E9",
    panel: "#FFFFFF", panel2: "#FFFFFF",
    border: "#0A0A0A", borderSoft: "#0A0A0A",
    text1: "#0A0A0A", text2: "#1A1A1A", text3: "#3A3A3A", text4: "#5A5A5A", text5: "#7A7A7A",
    radiusSm: "2px", radiusMd: "2px", radiusLg: "4px",
    shadow: "4px 4px 0px #0A0A0A", transDur: "0.1s", transEase: "linear",
    primary: "#FFE066", primaryContrast: "#0A0A0A", secondary: "#FF6B6B", accent: "#4ECDC4",
    fontDisplay: "'Space Grotesk', 'Noto Sans', sans-serif", fontBody: "'Space Grotesk', 'Noto Sans', sans-serif", blur: "0px",
    extra: `
      .tj-app button:not(:disabled):active { opacity: 0.6 !important; transition: opacity 0.05s ease !important; }
      .tj-app [class*="rounded-2xl"], .tj-app [class*="rounded-xl"], .tj-app [class*="rounded-lg"] { box-shadow: 4px 4px 0px var(--tj-border) !important; border-width: 2px !important; }
      .tj-app button:not(.tj-primary-bg):not(:disabled):hover {
        color: var(--tj-text1) !important;
        background-color: rgba(128,128,128,0.12) !important;
        border-radius: var(--tj-radius-sm) !important;
        transition: background-color 0.15s ease !important;
      }
    `,
  },
  {
    id: "swiss", name: "Swiss Minimal", defaultMode: "dark",
    bg: "#0A0A0A",
    panel: "#0A0A0A", panel2: "#141414",
    border: "#2A2A2A", borderSoft: "#3A3A3A",
    text1: "#FFFFFF", text2: "#C4C4C4", text3: "#8A8A8A", text4: "#6A6A6A", text5: "#4A4A4A",
    radiusSm: "0px", radiusMd: "0px", radiusLg: "2px",
    shadow: "none", transDur: "0.2s", transEase: "ease",
    primary: "#FFFFFF", primaryContrast: "#0A0A0A", secondary: "#A8A8A8", accent: "#E8E8E8",
    fontDisplay: "'Archivo', 'Noto Sans', sans-serif", fontBody: "'Archivo', 'Noto Sans', sans-serif", blur: "0px", extra: "",
    alt: {
      bg: "#FFFFFF",
      panel: "#FFFFFF", panel2: "#F5F5F5",
      border: "#D4D4D4", borderSoft: "#B8B8B8",
      text1: "#0A0A0A", text2: "#2A2A2A", text3: "#5A5A5A", text4: "#8A8A8A", text5: "#ADADAD",
      shadow: "none",
      primary: "#0A0A0A", primaryContrast: "#FFFFFF", secondary: "#5A5A5A", accent: "#2A2A2A",
    },
  },
  {
    id: "crt", name: "CRT Terminal", defaultMode: "dark",
    bg: "#000000",
    panel: "#000000", panel2: "#001a00",
    border: "#0d3d0d", borderSoft: "#1a5c1a",
    text1: "#33ff33", text2: "#29cc29", text3: "#1f991f", text4: "#156615", text5: "#0d4d0d",
    radiusSm: "0px", radiusMd: "0px", radiusLg: "0px",
    shadow: "0 0 10px rgba(51,255,51,0.3)", transDur: "0.05s", transEase: "linear",
    primary: "#33ff33", primaryContrast: "#000000", secondary: "#33ff33", accent: "#66ff66",
    fontDisplay: "'VT323', 'Noto Sans Mono', monospace", fontBody: "'Space Mono', 'Noto Sans Mono', monospace", blur: "0px",
    extra: `
      .tj-app-bg-overlay { background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 2px); }
      .tj-app h1 { text-shadow: 0 0 8px rgba(51,255,51,0.6); }
    `,
  },
];

// Shared, single source of truth for the app's global theming stylesheet —
// used by both the main authenticated app shell and the OAuth consent page,
// so the two can never visually drift out of sync with each other. This is
// the exact same CSS previously inlined only in the main app's own wrapper;
// extracting it here doesn't change what it does, just where it lives.
export function themeGlobalCss(th) {
  return `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Archivo:wght@400;500;600;700;800&family=VT323&family=Space+Mono:wght@400;700&family=Victor+Mono:ital,wght@0,100..700;1,100..700&family=Noto+Sans+Mono:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700;800&display=swap');

        .tj-app, .tj-app * { font-family: var(--tj-font-body); font-variant-numeric: tabular-nums; }
        .tj-app [style] { font-family: inherit !important; }
        .tj-app h1[style] { font-family: var(--tj-font-display) !important; }

        /* Overrides every theme's generic button-hover treatment (background
           box, shift, shadow) for the navbar logo specifically — a plain
           5% scale on the image itself reads better on a logo than the
           boxy hover meant for text/icon buttons elsewhere in the app.
           Selector specificity is boosted above any theme's own button
           rules (via the repeated class) so this wins regardless of the
           DOM order between this block and a theme's injected CSS. */
        .tj-app button.tj-logo-btn.tj-logo-btn:not(:disabled):hover,
        .tj-app button.tj-logo-btn.tj-logo-btn:not(:disabled):active {
          background-color: transparent !important;
          box-shadow: none !important;
          transform: none !important;
        }
        .tj-app button.tj-logo-btn.tj-logo-btn:hover img { transform: scale(1.05); }

        .tj-app [class*="bg-zinc-950"] { background-color: var(--tj-bg) !important; }
        .tj-app [class*="bg-zinc-900"] { background-color: var(--tj-panel) !important; }
        .tj-app [class*="bg-zinc-800"] { background-color: var(--tj-panel2) !important; }
        .tj-app select[class*="bg-zinc-900"], .tj-app select[class*="bg-zinc-950"] {
          background-color: var(--tj-panel-solid) !important;
          backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
        }
        .tj-app select option { background-color: var(--tj-panel-solid); color: var(--tj-text1); }
        .tj-app .tj-solid-bg {
          background-color: var(--tj-panel-solid) !important;
          backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .tj-app .tj-section-toggle:hover { box-shadow: none !important; background-color: rgba(128,128,128,0.08) !important; }
        .tj-app .tj-toast-close:hover { box-shadow: none !important; filter: none !important; transform: none !important; color: var(--tj-text2) !important; }

        /* These light Tailwind shades (rose-100/emerald-100/amber-100 etc.)
           read fine on a dark background but become near-invisible on a
           light one — darken them whenever the active theme is in light
           mode, regardless of which specific theme it is. */
        .tj-mode-light [class*="text-rose-100"], .tj-mode-light [class*="text-rose-200"], .tj-mode-light [class*="text-rose-300"] { color: #9f1239 !important; }
        .tj-mode-light [class*="text-emerald-100"], .tj-mode-light [class*="text-emerald-200"], .tj-mode-light [class*="text-emerald-300"] { color: #065f46 !important; }
        .tj-mode-light [class*="text-amber-100"], .tj-mode-light [class*="text-amber-200"], .tj-mode-light [class*="text-amber-300"] { color: #92400e !important; }
        /* My Learnings uses fixed amber (folders) / sky (notes) colors,
           chosen to read well on a dark background — on a light theme
           those same shades wash out, so darken them specifically here. */
        .tj-mode-light [class*="text-amber-400"] { color: #92400e !important; }
        .tj-mode-light [class*="text-sky-400"] { color: #0369a1 !important; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .tj-app [class*="border-zinc-800"] { border-color: var(--tj-border) !important; }
        .tj-app [class*="border-zinc-700"], .tj-app [class*="border-zinc-600"] { border-color: var(--tj-border-soft) !important; }
        .tj-app [class*="text-zinc-100"], .tj-app [class*="text-zinc-50"] { color: var(--tj-text1) !important; }
        .tj-app [class*="text-zinc-200"], .tj-app [class*="text-zinc-300"] { color: var(--tj-text2) !important; }
        .tj-app [class*="text-zinc-400"] { color: var(--tj-text2) !important; }
        .tj-app [class*="text-zinc-500"] { color: var(--tj-text2) !important; }
        .tj-app [class*="text-zinc-600"] { color: var(--tj-text3) !important; }
        .tj-app [class*="text-zinc-700"] { color: var(--tj-text3) !important; }
        .tj-app [class*="placeholder-zinc-600"]::placeholder,
        .tj-app [class*="placeholder-zinc-700"]::placeholder {
          color: var(--tj-text3) !important; opacity: 0.95 !important;
        }

        /* Replaces the spring-scale "bounce" on click (active:scale-*,
           used across dozens of buttons app-wide) with a quick, uniform
           dull flash instead — same instant feedback, no springy motion.
           Neubrutalist's own signature translate+shadow press (below,
           theme-specific) still applies on top of this for that theme,
           since it targets transform/box-shadow, not opacity. */
        .tj-app [class*="active:scale-"][class*="active:scale-"]:active { --tw-scale-x: 1 !important; --tw-scale-y: 1 !important; opacity: 0.6 !important; transition: opacity 0.05s ease !important; }
        .tj-app [class*="hover:scale-"][class*="hover:scale-"]:hover { --tw-scale-x: 1 !important; --tw-scale-y: 1 !important; }

        /* Focus rings (the glow around inputs/buttons on focus) read as an
           unwanted "hover ring" effect app-wide — replaced with a subtle
           background tint everywhere except the navbar, which keeps its
           own ring styling untouched (matched via a sibling combinator so
           Tailwind's own ring rendering there never needs to be manually
           replicated — it's simply never targeted by this rule at all). */
        .tj-navbar ~ * [class*="focus:ring-"]:focus,
        .tj-navbar ~ [class*="focus:ring-"]:focus {
          box-shadow: none !important;
          background-color: var(--tj-panel2) !important;
          transition: background-color 0.15s ease !important;
        }

        /* My Learnings previously used fixed Tailwind rounding (rounded-md/
           lg/xl/2xl) regardless of theme, so it looked square in themes
           that want sharp corners (Swiss) but also stayed square in themes
           built around soft, rounded shapes (Apple Glass) — remap each
           tier to the active theme's own radius scale instead. Pill-shaped
           tags (rounded-full) are deliberately left alone: a pill is a
           distinct shape choice, not a "how rounded are corners" choice,
           and should stay a pill even in a sharp-cornered theme. */
        .tj-learnings-scope [class*="rounded-md"] { border-radius: var(--tj-radius-sm) !important; }
        .tj-learnings-scope [class*="rounded-lg"] { border-radius: var(--tj-radius-sm) !important; }
        .tj-learnings-scope [class*="rounded-xl"] { border-radius: var(--tj-radius-md) !important; }
        .tj-learnings-scope [class*="rounded-2xl"] { border-radius: var(--tj-radius-lg) !important; }

        /* Sidebar folder/note colors, tuned per theme for contrast and to
           keep folders vs. notes visually distinct — see per-theme
           overrides below (each theme block adds its own). Default here
           covers the two dark themes (Glass dark, Swiss dark, CRT). */
        .tj-folder-text { color: #f59e0b; }
        .tj-note-text { color: #38bdf8; }
        .tj-mode-light .tj-folder-text { color: #92400e; }
        .tj-mode-light .tj-note-text { color: #0369a1; }
        .tj-theme-neubrutalist .tj-folder-text { color: #92400e !important; }
        .tj-theme-neubrutalist .tj-note-text { color: #1D4ED8 !important; }
        .tj-theme-crt .tj-folder-text { color: #66ff66 !important; }
        .tj-theme-crt .tj-note-text { color: #33ff33 !important; }

        /* Empty/non-trade-day heatmap cells — subtle relative to each
           theme's own background, rather than one fixed color that can
           only ever be right for one direction (light vs dark). */
        .tj-heat-empty { background: #35354a; }
        .tj-theme-swiss .tj-heat-empty { background: #262626; }
        .tj-theme-crt .tj-heat-empty { background: #163016; }
        .tj-theme-neubrutalist .tj-heat-empty { background: #d4d4d8; }
        .tj-mode-light.tj-theme-glass .tj-heat-empty { background: #d4d4d8; }
        .tj-mode-light.tj-theme-swiss .tj-heat-empty { background: #d4d4d8; }

        /* Small text is hard to read on every theme at Tailwind's default
           sizes — bump every "small" tier up, app-wide, and give it a touch
           more weight so it doesn't read as faint even once it's brighter. */
        .tj-app [class*="text-xs"] { font-size: 0.875rem !important; line-height: 1.3rem !important; }
        .tj-app [class*="text-[10px]"] { font-size: 0.75rem !important; }
        .tj-app [class*="text-[11px]"] { font-size: 0.8125rem !important; }

        /* Every section heading in the app uses this exact label pattern
           (text-xs uppercase tracking-widest ...) — restyling it here makes
           every section title bigger, brighter, and colorful in one place,
           identically across Trade Setup, Checklist, Trade History, and
           Trade Log, instead of each tab drifting its own way. */
        .tj-app [class*="text-xs"][class*="uppercase"][class*="tracking-widest"] {
          font-size: 1rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em !important;
          color: var(--tj-primary) !important;
          opacity: 1 !important;
        }
        .tj-theme-neubrutalist [class*="text-xs"][class*="uppercase"][class*="tracking-widest"] {
          color: var(--tj-text1) !important;
        }

        .tj-app [class*="rounded-2xl"] { border-radius: var(--tj-radius-lg) !important; }
        .tj-app [class*="rounded-xl"] { border-radius: var(--tj-radius-md) !important; }
        .tj-app [class*="rounded-lg"] { border-radius: var(--tj-radius-sm) !important; }
        .tj-app [class*="shadow-2xl"], .tj-app [class*="shadow-xl"] { box-shadow: var(--tj-shadow) !important; }
        .tj-app [class*="rounded-2xl"], .tj-app [class*="rounded-xl"], .tj-app [class*="rounded-lg"] { box-shadow: var(--tj-shadow); }
        .tj-app button, .tj-app select, .tj-app input, .tj-app textarea, .tj-app a,
        .tj-app .transition-transform, .tj-app .transition-colors, .tj-app .transition-all {
          transition-duration: var(--tj-dur) !important;
          transition-timing-function: var(--tj-ease) !important;
        }
        .tj-app-bg-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        ${th.extra}
`;
}
export const THEME_PRIMARY_CSS = `
        .tj-primary-bg { background-color: var(--tj-primary); color: var(--tj-primary-contrast); }
        .tj-primary-bg:hover { filter: brightness(1.12); }
        .tj-primary-text { color: var(--tj-primary); }
        input:focus, select:focus, textarea:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px var(--tj-primary) !important;
        }
        input[type="date"], input[type="month"], input[type="color"], select { color-scheme: dark; }
        .tj-theme-neubrutalist input[type="date"], .tj-theme-neubrutalist input[type="month"] { color-scheme: light; }
        .tj-theme-neubrutalist .tj-primary-text { color: var(--tj-text1) !important; }

        /* Scoped to interactive elements only — these are exactly the
           selectors the hover/focus rules below target, so every intended
           transition still animates smoothly. Applying this to a bare "*"
           previously forced the browser to watch 7 properties for changes
           on every element in the app, including hundreds of static ones
           (heatmap cells, table rows, plain text) that never used it. */
        .tj-app button, .tj-app select, .tj-app input, .tj-app textarea, .tj-app a,
        .tj-app [class*="cursor-pointer"], .tj-app [role="button"] {
          transition: background-color .16s ease, border-color .16s ease, color .16s ease, transform .14s ease, box-shadow .14s ease, filter .16s ease, opacity .16s ease;
        }

        button, select, a { cursor: pointer; }

        /* Hover/focus/active feedback for every interactive element, in every
           theme. Combines \`filter\` (never fought over — it's a separate
           property from the theme's !important color mapping) with a colored
           box-shadow RING using the theme's own primary/border-soft color.
           The ring is what makes this actually visible on very dark or
           translucent-glass panels, where a brightness bump alone stays too
           close to black/transparent to read as "hover" at a glance. */
        .tj-app button:not(:disabled):hover,
        .tj-app a:hover {
          filter: brightness(1.35) saturate(1.2);
        }
        .tj-navbar button:not(.tj-primary-bg):not(:disabled):hover {
          box-shadow: 0 0 0 2px var(--tj-primary), 0 6px 16px -4px rgba(0,0,0,0.4) !important;
        }
        .tj-app button:not(:disabled):active {
          filter: brightness(0.8);
          box-shadow: none !important;
        }
        .tj-app .tj-primary-bg:hover {
          filter: brightness(1.22) saturate(1.15);
        }
        .tj-app .tj-primary-bg:active { filter: brightness(0.85); opacity: 0.85; transition: opacity 0.05s ease; }
        .tj-app button:disabled { cursor: default; filter: none !important; box-shadow: none !important; transform: none !important; }

        .tj-app select:hover:not(:disabled),
        .tj-app input:hover:not(:disabled):not([type="checkbox"]):not([type="radio"]),
        .tj-app textarea:hover:not(:disabled) {
          filter: brightness(1.4);
          box-shadow: 0 0 0 2px var(--tj-border-soft) !important;
        }
        .tj-app select:focus,
        .tj-app input:focus:not([type="checkbox"]):not([type="radio"]),
        .tj-app textarea:focus {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }
        .tj-app input[type="checkbox"]:hover, .tj-app input[type="radio"]:hover {
          filter: brightness(1.4);
          box-shadow: 0 0 0 3px var(--tj-primary) !important;
        }

        /* Clickable, non-button rows/cards (log entries, checklist items,
           theme picker entries, etc.) — same ring treatment so they read as
           interactive too, not just flat text. */
        .tj-app [class*="cursor-pointer"]:hover,
        .tj-app [role="button"]:hover {
          filter: brightness(1.3);
          box-shadow: 0 0 0 2px var(--tj-border-soft) !important;
        }

        @keyframes tj-fade-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tj-fade-in-simple {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .tj-popover { animation: tj-fade-in .16s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top right; }
        .tj-fade { animation: tj-fade-in-simple .18s ease; }

        @keyframes tj-row-exit {
          0% { opacity: 1; transform: scale(1) translateX(0); }
          60% { opacity: 0.4; transform: scale(0.97) translateX(6px); }
          100% { opacity: 0; transform: scale(0.94) translateX(10px); }
        }
        .tj-row-exit { animation: tj-row-exit .32s ease forwards; pointer-events: none; background-color: rgba(244, 63, 94, 0.08) !important; }

        @keyframes tj-row-enter {
          0% { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .tj-row-enter { animation: tj-row-enter .35s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes tj-row-settle {
          0% { box-shadow: inset 4px 0 0 0 var(--tj-primary); }
          100% { box-shadow: inset 4px 0 0 0 transparent; }
        }
        .tj-row-settle { animation: tj-row-settle 1.4s ease-out; }

        @keyframes tj-slide-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .tj-slide-in { animation: tj-slide-in .3s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes tj-slide-in-left {
          0% { opacity: 0; transform: translateX(-40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .tj-slide-in-left { animation: tj-slide-in-left .35s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes tj-pop {
          0% { clip-path: circle(0% at 50% 50%); opacity: 0.55; }
          100% { clip-path: circle(150% at 50% 50%); opacity: 1; }
        }
        .tj-pop { animation: tj-pop .32s ease-out; }

        @keyframes tj-avatar-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .tj-avatar-breathe { animation: tj-avatar-breathe 3s ease-in-out infinite; transform-origin: center; }

        @keyframes tj-loading-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }

        @keyframes tj-toast-in {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes tj-toast-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(120%); opacity: 0; }
        }
        .tj-toast-in { animation: tj-toast-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
        .tj-toast-out { animation: tj-toast-out 0.25s ease-in forwards; }
        @keyframes tj-toast-countdown {
          from { width: 100%; }
          to { width: 0%; }
        }

        @keyframes tj-popover-out {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-6px) scale(0.97); }
        }
        .tj-popover-out { animation: tj-popover-out .16s ease forwards; }

        @keyframes tj-backdrop-out {
          0% { opacity: 1; } 100% { opacity: 0; }
        }
        .tj-backdrop-out { animation: tj-backdrop-out .16s ease forwards; }

        @keyframes tj-dialog-out {
          0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.94); }
        }
        .tj-dialog-out { animation: tj-dialog-out .16s ease forwards; }

        @keyframes tj-check-pop {
          0% { transform: scale(0.5); } 55% { transform: scale(1.2); } 100% { transform: scale(1); }
        }
        .tj-check-pop { animation: tj-check-pop .3s cubic-bezier(0.34, 1.56, 0.64, 1); }

        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 999px; border: 2px solid #09090b; }
        ::-webkit-scrollbar-thumb:hover { background-color: var(--tj-primary); }
        * { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
        }
`;
