import { IconDeviceDesktop, IconTerminal2 } from "@tabler/icons-react";
import { DocsPageLayout, DocsHeader, DocsCardGrid, DocsSection, CopyableCode, DocsToolCard } from "./docsShared.jsx";

export const MCP_SERVER_URL = "https://nqgqebcuycdbihejbjbg.supabase.co/functions/v1/mcp";

export function McpServerDocsPage() {
  const TOOLS = [
    {
      name: "list_trades",
      kind: "read",
      description: "List your option trades, most recent first — a concise summary per trade, not the raw leg-by-leg data (see get_trade_legs for that).",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound on entry date." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound on entry date." },
        { name: "underlying", type: "string", optional: true, desc: 'Filter by symbol, e.g. "NIFTY" or "BANKNIFTY".' },
        { name: "strategy_label", type: "string", optional: true, desc: 'Filter by strategy, e.g. "Short Strangle".' },
        { name: "limit", type: "number", optional: true, desc: "Max rows to return (default 50, max 100)." },
      ],
    },
    {
      name: "get_trade_stats",
      kind: "read",
      description: "Aggregate win/loss stats over a date range — win rate, total realized P&L, average win, average loss. Open positions are reported separately and excluded from win/loss math, since they have no final result yet.",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound." },
      ],
    },
    {
      name: "get_trade_legs",
      kind: "read",
      description: "Full leg-by-leg detail for one trade — strike, option type, action, premium, quantity. Only available for trades entered through Trade Setup; older imported trades only have the plain-text summary list_trades already returns.",
      params: [
        { name: "trade_id", type: "string", optional: false, desc: "The trade id, as returned by list_trades." },
      ],
    },
    {
      name: "get_strategy_breakdown",
      kind: "read",
      description: "Win rate and average P&L broken down by strategy — which strategies actually work for you, not just one overall number.",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound." },
      ],
    },
    {
      name: "get_discipline_stats",
      kind: "read",
      description: "Compares checklist completion against trade outcomes — whether being fully \"armed\" before a trade correlates with better results. Only reflects trades entered live through the Checklist flow; imported trades were never run through a checklist session, so this returns nothing meaningful for history predating live use.",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound." },
      ],
    },
    {
      name: "search_notes",
      kind: "read",
      description: "Search your My Learnings notes by title or content. Excludes templates and saved resource links — this searches actual journal notes, including which trade, underlying, or strategy each note is linked to.",
      params: [
        { name: "query", type: "string", optional: true, desc: "Text to search for in the title or body. Omit to list recent notes." },
        { name: "tag", type: "string", optional: true, desc: "Filter to notes carrying this exact tag." },
        { name: "limit", type: "number", optional: true, desc: "Max notes to return (default 20, max 50)." },
      ],
    },
    {
      name: "list_reminders",
      kind: "read",
      description: "List your reminders. Defaults to upcoming (today or later) only.",
      params: [
        { name: "upcoming_only", type: "boolean", optional: true, desc: "Default true — only reminder_date on or after today." },
        { name: "category", type: '"event" | "trade" | "personal"', optional: true, desc: "Filter by category." },
        { name: "limit", type: "number", optional: true, desc: "Max rows to return (default 50, max 100)." },
      ],
    },
    {
      name: "create_note",
      kind: "write",
      description: "Create a new note in My Learnings. Always creates a new note — it never edits an existing one.",
      params: [
        { name: "title", type: "string", optional: false, desc: "The note title." },
        { name: "content", type: "string", optional: true, desc: "Plain-text body — each line becomes a paragraph." },
        { name: "tags", type: "string[]", optional: true, desc: "Tags to attach to the note." },
      ],
    },
    {
      name: "create_reminder",
      kind: "write",
      description: "Create a new reminder. Always creates a new reminder — it never edits an existing one.",
      params: [
        { name: "title", type: "string", optional: false, desc: "The reminder title." },
        { name: "category", type: '"event" | "trade" | "personal"', optional: false, desc: "Reminder category." },
        { name: "reminder_date", type: "string", optional: false, desc: "ISO date (YYYY-MM-DD) the reminder is for." },
        { name: "reminder_time", type: "string", optional: true, desc: 'Time of day, e.g. "09:30".' },
        { name: "subcategory", type: "string", optional: true, desc: "A more specific subcategory label." },
        { name: "severity", type: "string", optional: true, desc: "Severity label, if this category uses one." },
      ],
    },
  ];

  const CARDS = [
    { id: "claude-desktop", icon: <IconDeviceDesktop size={15} />, title: "Claude Desktop", description: "Browser sign-in, point-and-click setup.", actionLabel: "Connect account" },
    { id: "claude-code", icon: <IconTerminal2 size={15} />, title: "Claude Code", description: "One command in your terminal.", actionLabel: "Run the command" },
  ];

  return (
    <DocsPageLayout>
      <DocsHeader
        title="MCP Server"
        lead="Connect an AI assistant directly to your own trading data — no copy-pasting, no exporting."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="overview" title="Overview">
        <p>
          This journal exposes a Model Context Protocol (MCP) server so an AI assistant can read your trades, stats, notes, and reminders directly, and — for a couple of narrow, additive actions — create new ones too. Access is scoped strictly to your own account: the server authenticates you the same way this app does, and the same account-level security that protects your data here protects it there too. Nothing is ever visible across accounts.
        </p>
      </DocsSection>

      <DocsSection id="connect" title="Connect">
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">Server URL</p>
          <CopyableCode value={MCP_SERVER_URL} />
          <p className="text-xs text-zinc-600">Same URL for every user — it doesn't need to be different. What scopes a connection to your own account is the sign-in step below, not the URL itself.</p>
        </div>

        <div id="claude-desktop" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 scroll-mt-4">
          <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"><IconDeviceDesktop size={14} className="text-zinc-500" /> Claude Desktop</p>
          <ol className="text-sm text-zinc-400 leading-relaxed list-decimal list-inside space-y-1">
            <li>Settings → Connectors → Add custom connector</li>
            <li>Paste the server URL above</li>
            <li>When prompted, sign in with the same account you use for this journal</li>
          </ol>
        </div>

        <div id="claude-code" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 scroll-mt-4">
          <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"><IconTerminal2 size={14} className="text-zinc-500" /> Claude Code</p>
          <CopyableCode value={`claude mcp add --transport http comet-trading ${MCP_SERVER_URL}`} />
          <p className="text-sm text-zinc-500">Run this in your terminal, then approve the sign-in prompt that opens in your browser.</p>
        </div>

        <p className="text-sm text-zinc-600">Once connected, just ask — "what's my win rate this month?" or "summarize my notes from this week" — and it queries your journal directly.</p>
      </DocsSection>

      <DocsSection id="permissions" title="Read tools vs. write tools">
        <p>
          Every tool below is tagged <span className="text-zinc-300 font-semibold">Read-only</span> or <span className="text-amber-400 font-semibold">Writes data</span>. Only two tools write anything — <span className="text-zinc-200">create_note</span> and <span className="text-zinc-200">create_reminder</span> — and both only ever add a new record. Neither can edit or delete something that already exists; there is no tool that can.
        </p>
        <p>
          This tagging follows the Model Context Protocol's own standard for it, so a compliant client (Claude Desktop included) can treat write actions with more caution than reads — for instance, prompting you to confirm before a note actually gets created, the same kind of "allow this?" step you may have already seen when connecting this journal's own Supabase project.
        </p>
        <p>
          Worth being precise about what that does and doesn't guarantee: this tagging is a signal clients can act on, not a hard security boundary enforced by the protocol itself. The actual boundary — the one that can't be bypassed regardless of client behavior — is that every request is authenticated as you, so nothing here can ever touch another account's data, read or write.
        </p>
      </DocsSection>

      <DocsSection id="available-tools" title="Available tools">
        <div className="space-y-2.5">
          {TOOLS.map((t) => <DocsToolCard key={t.name} {...t} />)}
        </div>
      </DocsSection>
    </DocsPageLayout>
  );
}
