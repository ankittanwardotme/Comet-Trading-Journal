import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import { FONT_MONO } from "../../lib/format.js";
import { tabToPath } from "../../lib/routes.js";

// Each link is either { tab } (an authenticated AppShell page, resolved via
// tabToPath) or { path } (a standalone public page mounted at the top-level
// App.jsx router, outside AppShell entirely).
const FOOTER_LINK_GROUPS = [
  {
    title: "Trading",
    links: [
      { label: "Dashboard", tab: "home" },
      { label: "Pre-Trade Checklist", tab: "checklist" },
      { label: "Trade Setup", tab: "setup" },
      { label: "Trade History", tab: "pnl" },
      { label: "Trade Log", tab: "log" },
      { label: "Add Your Own Strategy", tab: "strategyBuilder" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "My Learnings", tab: "learn" },
      { label: "Reminders", tab: "reminders" },
      { label: "Holiday Calendar", tab: "holidays" },
      { label: "Docs", tab: "docs" },
      { label: "Settings", tab: "profile" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "About", path: "/about" },
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Terms of Service", path: "/terms" },
      { label: "Risk Disclaimer", path: "/disclaimer" },
    ],
  },
];

export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-800 mt-8 pt-5">
      <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr_1fr] gap-5">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 mb-1">
            <img src={logo} alt="" className="h-5 w-auto" />
            <span className="text-xs font-semibold text-zinc-100">Comet Trading Journal</span>
          </div>
          <p className="text-xs text-zinc-500 max-w-xs">A pre-trade discipline layer for options sellers and buyers.</p>
        </div>
        {FOOTER_LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5" style={FONT_MONO}>{group.title}</p>
            <ul className="space-y-1">
              {group.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.path || tabToPath(l.tab)} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800 mt-5 pt-3 text-center text-[11px] text-zinc-600">
        © {year} Comet Trading Journal. All rights reserved.
      </div>
    </footer>
  );
}
