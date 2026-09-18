# Comet Trading Journal — Project Context

A personal F&O (futures & options) trading journal, built around a discipline-first
workflow rather than just P&L tracking. This document exists because this project
was built across a very long conversation with a lot of reasoning behind non-obvious
decisions — the code itself is heavily commented for exactly this reason, but this
file is the map before diving in.

## Stack

- **Frontend**: React + Vite + Tailwind, essentially all in `src/App.jsx` (a single
  large file by design choice made early on — components are all in one place
  rather than split across dozens of files).
- **Backend**: Supabase — Postgres, Auth (Google OAuth via `signInWithOAuth`, no
  custom scopes requested — just the default `openid email profile`), Storage,
  and Edge Functions.
- **MCP server**: a separate Edge Function (`supabase/functions/mcp/`) exposing
  trading data to AI clients like Claude Desktop/Code. See its own section below.

## Environment variables (Vite, build-time)

```
VITE_SUPABASE_URL=https://nqgqebcuycdbihejbjbg.supabase.co
VITE_SUPABASE_KEY=<the anon/publishable key from the Supabase dashboard>
```

No `.env` file is committed (correctly — check `.gitignore`). Whoever runs this
locally or deploys it needs to supply these themselves.

## Database

Live Supabase project ref: `nqgqebcuycdbihejbjbg`. Core tables: `trades`,
`checklist_history` (the Trade Log — linked to trades via `pnl_id`), `notes`,
`note_folders`, `reminders`, `fund_transactions`, `app_storage` (a generic
key-value settings table).

**Important gap, not a bug**: there is no formal Supabase CLI migration history.
Every schema change in this project's life was applied ad-hoc, either via the
Supabase SQL Editor or via an AI assistant's direct database connection — never
through `supabase migration` / `db push`. The `research/*.sql` files are a
best-effort paper trail of what was run and in what order, but Supabase itself
has no record of them. If you ever need to rebuild this schema from scratch
(a new environment, a staging copy), you'd need to manually replay those files
in order. Worth actually setting up real migrations if this project keeps growing.

Two dedicated Storage buckets exist, both private, both RLS-scoped so a user can
only touch files under their own `{user_id}/...` folder:
- `note-images` — images embedded in My Learnings notes
- `trade-images` — chart screenshots attached to trades

These are **deliberately separate buckets**, not one shared bucket with a folder
convention. "Clear my trading data" and "Clear my learnings data" are independent
user-triggered operations, and sharing a bucket would risk one wiping the other's
files. This was a real design decision, not an oversight — see the
`trade_screenshots` migration's own comments for the full reasoning.

## The theme system — read this before touching any UI

This app has four selectable themes (Swiss Minimal, Neubrutalist, Apple Glass, CRT
Terminal), each with its own light/dark mode, implemented via CSS custom properties
set on a `.tj-app` wrapper element, plus global CSS rules that remap plain Tailwind
utility classes (`bg-zinc-800`, etc.) to theme-aware values *when rendered inside
`.tj-app`*.

**The recurring bug to avoid**: any component using `createPortal()` — popovers,
lightboxes, dropdowns — must portal into `document.querySelector(".tj-app")`, not
`document.body`. Portaling straight to `document.body` renders content *outside*
the themed subtree, silently falling back to raw untheme defaults regardless of
the user's selected theme. This exact bug was introduced and then found twice in
this project's history (once for the OAuth consent screen, once for trade
screenshot attachments) — always copy this pattern from an existing working
popover (e.g. `MoodPickerButton`) rather than writing `createPortal` from scratch.

## The MCP server

Deployed at `https://nqgqebcuycdbihejbjbg.supabase.co/functions/v1/mcp`, source in
`supabase/functions/mcp/index.ts`. Authenticates via a bearer token forwarded to a
per-request Supabase client, so the same RLS policies protecting the app itself
are what enforce per-user data isolation here — no separate authorization model.

Nine tools: four original read-only ones (`list_trades`, `get_trade_stats`,
`search_notes`, `list_reminders`), three newer read-only analytical ones
(`get_trade_legs`, `get_strategy_breakdown`, `get_discipline_stats`), and two
narrow, additive-only write tools (`create_note`, `create_reminder` — neither can
edit or delete anything that already exists). Every tool carries proper MCP
annotations (`readOnlyHint`/`destructiveHint`) so compliant clients can prompt
before running a write — worth knowing this is a *hint*, not an enforced security
boundary; the real boundary is the per-request auth token.

One thing worth knowing if you extend this: `get_discipline_stats` and
`get_trade_legs` will return empty/null results for this account's current data,
by design — every trade currently in the database was bulk-imported rather than
entered live through the app's own Checklist → Trade Setup flow, so there's no
real checklist-session or structured-leg data to show yet. Both tools say this
explicitly in their output rather than returning a confusing empty result.

## Deployment

Not yet deployed anywhere public as of this handoff — was run locally via
`npm run dev` throughout development. The plan in progress: deploy via Vercel
(CLI or GitHub-connected), which is also needed to get a real homepage URL for
publishing the Google OAuth consent screen out of Testing mode.

## What's built and what's genuinely still open

Fully built: the whole trade lifecycle (setup, rolls, partial closes, hedges,
strategy-shape auto-detection), the pre-trade checklist discipline gate, a full
notes/folders/templates/resources system, reminders, four selectable themes, PIN
security, the MCP server described above, and a 10-second "Undo" toast on deletes
for trades, reminders, folders, notes, templates, resources, and bulk-delete.

Explicitly not yet covered by the undo system: custom strategies, checklist
items/sections, and holiday calendar entries still delete permanently with no
undo window.

Discussed but deliberately not built (cost or scope tradeoffs, not forgotten):
Greeks computation (no live market data source wired into the app itself — usable
today only via chat if both this MCP server and Zerodha's own official MCP server
are connected to the same client), tax/turnover reporting, automated broker trade
import (Zerodha's API doesn't retain historical trades beyond a day regardless of
paid tier — a Console CSV export/import would be the real free path, discussed but
not built), and any autonomous/scheduled agent behavior (would require a
paid Anthropic API key running unattended, separate from a normal Claude
subscription — the person building this wasn't willing to take on that ongoing
cost as of this handoff).

## How this codebase was verified throughout

Worth preserving as a working style, not just a one-off: every UI change was
type/build-checked, then checked for icon imports specifically (a recurring
mistake — Tabler icons used but not added to the big import block at the top of
`App.jsx`), then functionally tested — usually by extracting the relevant
component into an isolated Playwright-driven browser test, often loading the
*real* compiled CSS and a real theme wrapper rather than trusting an unstyled
render. Database-touching changes were verified against the live Supabase project
directly (real queries, real row counts) rather than trusted from the write
succeeding alone. Several real bugs were only caught this way — worth continuing
this level of rigor rather than treating "the build passed" as sufficient.
