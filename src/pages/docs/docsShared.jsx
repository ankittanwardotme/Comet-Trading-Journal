import { useState } from "react";
import { IconCheck, IconCopy, IconChevronRight } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../lib/format.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";

export const DOCS_SECTIONS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "checklist", label: "Pre-Trade Checklist" },
  { id: "trade-setup", label: "Trade Setup" },
  { id: "trade-history", label: "Trade History" },
  { id: "reminders", label: "Reminders" },
  { id: "learnings", label: "My Learnings" },
  { id: "downloads", label: "Downloads" },
  { id: "settings", label: "Settings & Security" },
  { id: "mcp-server", label: "MCP Server" },
];

export function CopyableCode({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (err) { /* clipboard unavailable */ }
  };
  return (
    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5">
      <code className="flex-1 text-xs text-zinc-300 overflow-x-auto whitespace-pre" style={FONT_MONO}>{value}</code>
      <Tooltip text={copied ? "Copied!" : "Copy"}>
        <button onClick={copy} className="flex-shrink-0 text-zinc-500 hover:tj-primary-text">
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </Tooltip>
    </div>
  );
}

export function DocsToolCard({ name, description, params, kind = "read" }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold tj-primary-text" style={FONT_MONO}>{name}</p>
        {kind === "write" ? (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5 flex-shrink-0">Writes data</span>
        ) : (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-zinc-500 bg-zinc-800/70 rounded-full px-2 py-0.5 flex-shrink-0">Read-only</span>
        )}
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      {params.length > 0 && (
        <div className="pt-1.5 border-t border-zinc-800/70 space-y-1">
          {params.map((p) => (
            <p key={p.name} className="text-sm text-zinc-500">
              <span className="text-zinc-300" style={FONT_MONO}>{p.name}</span>
              <span className="text-zinc-600"> ({p.type}{p.optional ? ", optional" : ""})</span>
              {" — "}{p.desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsCardLink({ icon, title, description, actionLabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 p-4 space-y-2.5 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="w-7 h-7 rounded-lg bg-zinc-800/70 flex items-center justify-center text-zinc-400">{icon}</div>
        <IconChevronRight size={14} className="text-zinc-600" />
      </div>
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      <p className="text-sm tj-primary-text font-semibold flex items-center gap-1 pt-0.5">{actionLabel} <IconChevronRight size={12} /></p>
    </button>
  );
}

export function DocsHeader({ title, lead }) {
  return (
    <div>
      <p className="text-2xl font-bold text-zinc-100 mb-2" style={FONT_DISPLAY}>{title}</p>
      <p className="text-base text-zinc-400 leading-relaxed">{lead}</p>
    </div>
  );
}

export function DocsSection({ id, title, children }) {
  return (
    <div id={id} className="space-y-2.5 scroll-mt-4">
      <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>{title}</p>
      <div className="text-sm text-zinc-400 leading-relaxed space-y-2.5">{children}</div>
    </div>
  );
}

export function DocsSubCard({ title, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      <div className="text-sm text-zinc-400 leading-relaxed space-y-1.5">{children}</div>
    </div>
  );
}

// Single-column layout used by every doc page — kept as a shared wrapper
// (rather than inlined per page) purely so the width constraint stays
// consistent everywhere without repeating it nine times.
export function DocsPageLayout({ children }) {
  return <div className="max-w-6xl space-y-7">{children}</div>;
}

// Shared quick-access card grid — cards still jump to their matching
// section below via the same ids DocsSection targets already carry.
export function DocsCardGrid({ cards }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Column count chosen per page so cards never leave a single orphan
  // stranded alone on its own row with empty space beside it — a 4-card
  // page becomes a balanced 2x2, not a 3-then-1.
  const cols = cards.length === 2 || cards.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid ${cols} gap-3`}>
      {cards.map((c) => (
        <DocsCardLink key={c.id} icon={c.icon} title={c.title} description={c.description} actionLabel={c.actionLabel} onClick={() => scrollTo(c.id)} />
      ))}
    </div>
  );
}
