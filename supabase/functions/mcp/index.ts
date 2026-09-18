// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@hono/mcp'
import { Hono } from 'hono'
import { z } from 'zod'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Deployed as the "mcp" function, so Hono needs this base path — Edge
// Function URLs are always prefixed with the function's own name.
const app = new Hono().basePath('/mcp')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// ---------------------------------------------------------------------
// Auth: this function is deployed with verify_jwt disabled at the
// platform level (Supabase's own MCP tutorial notes that automatic,
// MCP-aware JWT verification isn't available yet), so every request is
// authenticated here instead. The incoming bearer token is used to build
// a Supabase client scoped to that user — every query below runs through
// PostgREST AS that user, so the same RLS policies already protecting
// the main app (auth.uid() = user_id, on every table) are what actually
// enforce isolation here. There's no separate authorization model to
// get right a second time.
// ---------------------------------------------------------------------
async function authenticate(req: Request): Promise<
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; status: number; message: string }
> {
  const authHeader = req.headers.get('Authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(authHeader)
  if (!match) {
    return { ok: false, status: 401, message: 'Missing bearer token.' }
  }
  const token = match[1]
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error) {
    // AuthApiError with a real status means Supabase's server genuinely
    // rejected this token — a plain 401 is correct. Anything else (e.g.
    // AuthUnknownError, a network failure reaching the auth server) is
    // NOT the same thing as "this token is invalid," and telling a user
    // that would be misleading when the real issue is transient
    // connectivity — surface it as a retryable failure instead.
    const status = (error as any)?.status
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return { ok: false, status: 401, message: 'Invalid or expired token.' }
    }
    return { ok: false, status: 503, message: 'Could not reach the authentication service — please try again.' }
  }
  if (!data?.user) {
    return { ok: false, status: 401, message: 'Invalid or expired token.' }
  }
  return { ok: true, supabase, userId: data.user.id }
}

// ---------------------------------------------------------------------
// BlockNote plain-text conversion — notes' `content` column stores the
// same rich-text BlockNote JSON the main app's editor produces, not
// plain text. Returning that raw JSON to an LLM would be unreadable, so
// this mirrors the client app's own parseNoteBlocks/blockInlineText/
// blockNoteToPlainText logic exactly, rather than reinventing a
// different, possibly-inconsistent conversion here.
// ---------------------------------------------------------------------
function parseNoteBlocks(contentJson: string | null): any[] {
  if (!contentJson) return []
  try {
    const parsed = JSON.parse(contentJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
function blockInlineText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content.map((c: any) => (c && typeof c.text === 'string' ? c.text : '')).join('')
}
function blockNoteToPlainText(contentJson: string | null): string {
  const blocks = parseNoteBlocks(contentJson)
  const lines: string[] = []
  const walk = (list: any[]) => {
    for (const b of list) {
      const line = blockInlineText(b?.content)
      if (line.trim()) lines.push(line)
      if (Array.isArray(b?.children) && b.children.length) walk(b.children)
    }
  }
  walk(blocks)
  return lines.join('\n')
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// Inverse of blockNoteToPlainText above — builds the BlockNote block
// structure the editor expects, one paragraph block per line. Verified
// against genuine output from the real @blocknote/core editor (rendered
// in an actual browser, not guessed from types) — a block needs a real
// id and these three specific default props, not an empty props object,
// or a note created here would show as broken when opened in the app.
function plainTextToBlockNoteJson(text: string): string {
  const lines = text.split('\n')
  const blocks = lines.map((line) => ({
    id: crypto.randomUUID(),
    type: 'paragraph',
    props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
    content: line ? [{ type: 'text', text: line, styles: {} }] : [],
    children: [],
  }))
  return JSON.stringify(blocks)
}

// ---------------------------------------------------------------------
// MCP server + tools. Edge Functions are inherently stateless and
// per-request, so the server and its tools are constructed fresh inside
// each HTTP request rather than once at module scope — that's also
// exactly what's needed here anyway, since each request carries a
// different user's token and must only ever see that user's own data.
// ---------------------------------------------------------------------
function buildServer(supabase: SupabaseClient) {
  const server = new McpServer({ name: 'comet-trading-journal', version: '0.2.0' })

  server.registerTool(
    'list_trades',
    {
      title: 'List Trades',
      description:
        "List the user's option trades, most recent first. Supports filtering by date range, underlying, and strategy. Returns a concise summary per trade (not the raw leg-by-leg data — use get_trade_legs for that) — use for browsing or answering questions about specific trades.",
      inputSchema: {
        start_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive lower bound on entry_date.'),
        end_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive upper bound on entry_date.'),
        underlying: z.string().optional().describe('Filter by underlying symbol, e.g. "NIFTY" or "BANKNIFTY".'),
        strategy_label: z.string().optional().describe('Filter by strategy, e.g. "Short Strangle".'),
        limit: z.number().int().optional().describe('Max rows to return (default 50, max 100).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ start_date, end_date, underlying, strategy_label, limit }) => {
      let query = supabase
        .from('trades')
        .select('id, entry_date, exit_date, underlying, strategy_label, legs_summary, premium_summary, overall_pl, expiry_date, affects_capital, exit_mood')
        .order('entry_date', { ascending: false })
        .limit(clamp(limit ?? 50, 1, 100))
      if (start_date) query = query.gte('entry_date', start_date)
      if (end_date) query = query.lte('entry_date', end_date)
      if (underlying) query = query.ilike('underlying', underlying)
      if (strategy_label) query = query.ilike('strategy_label', strategy_label)

      const { data, error } = await query
      if (error) return { content: [{ type: 'text', text: `Query failed: ${error.message}` }], isError: true }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
    },
  )

  server.registerTool(
    'get_trade_stats',
    {
      title: 'Get Trade Stats',
      description:
        'Aggregate win/loss stats over a date range — win rate, total realized P&L, average win, average loss. Only counts closed trades; open positions are reported separately and excluded from win/loss math since they have no final result yet.',
      inputSchema: {
        start_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive lower bound on entry_date.'),
        end_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive upper bound on entry_date.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ start_date, end_date }) => {
      let query = supabase.from('trades').select('entry_date, exit_date, overall_pl')
      if (start_date) query = query.gte('entry_date', start_date)
      if (end_date) query = query.lte('entry_date', end_date)

      const { data, error } = await query
      if (error) return { content: [{ type: 'text', text: `Query failed: ${error.message}` }], isError: true }

      const rows = data ?? []
      const closed = rows.filter((r) => r.exit_date !== null)
      const open = rows.filter((r) => r.exit_date === null)
      const wins = closed.filter((r) => Number(r.overall_pl) > 0)
      const losses = closed.filter((r) => Number(r.overall_pl) < 0)
      const totalPl = closed.reduce((sum, r) => sum + Number(r.overall_pl ?? 0), 0)
      const avg = (arr: typeof closed) => (arr.length ? arr.reduce((s, r) => s + Number(r.overall_pl), 0) / arr.length : null)

      const stats = {
        closed_trades: closed.length,
        open_trades: open.length,
        wins: wins.length,
        losses: losses.length,
        win_rate_pct: closed.length ? Math.round((wins.length / closed.length) * 1000) / 10 : null,
        total_realized_pl: Math.round(totalPl * 100) / 100,
        avg_win: avg(wins) !== null ? Math.round(avg(wins)! * 100) / 100 : null,
        avg_loss: avg(losses) !== null ? Math.round(avg(losses)! * 100) / 100 : null,
      }
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] }
    },
  )

  server.registerTool(
    'search_notes',
    {
      title: 'Search Notes',
      description:
        "Search the user's My Learnings notes by title or content text. Excludes templates and saved resource links by default — this searches actual journal notes. Content is converted from the editor's rich-text format to plain text before returning.",
      inputSchema: {
        query: z.string().optional().describe('Text to search for in the title or body. Omit to list recent notes.'),
        tag: z.string().optional().describe('Filter to notes carrying this exact tag.'),
        limit: z.number().int().optional().describe('Max notes to return (default 20, max 50).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query: searchQuery, tag, limit }) => {
      let q = supabase
        .from('notes')
        .select('id, title, content, tags, starred, updated_at, linked_trade_id, linked_underlying, linked_strategy')
        .eq('is_resource', false)
        .eq('is_template', false)
        .order('updated_at', { ascending: false })
        .limit(clamp(limit ?? 20, 1, 50))
      if (tag) q = q.contains('tags', [tag])
      if (searchQuery) q = q.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)

      const { data, error } = await q
      if (error) return { content: [{ type: 'text', text: `Query failed: ${error.message}` }], isError: true }

      const results = (data ?? []).map((n) => ({
        id: n.id,
        title: n.title || 'Untitled',
        tags: n.tags,
        starred: n.starred,
        updated_at: n.updated_at,
        linked_trade_id: n.linked_trade_id,
        linked_underlying: n.linked_underlying,
        linked_strategy: n.linked_strategy,
        content: blockNoteToPlainText(n.content),
      }))
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] }
    },
  )

  server.registerTool(
    'list_reminders',
    {
      title: 'List Reminders',
      description: "List the user's reminders. Defaults to upcoming (today or later) only.",
      inputSchema: {
        upcoming_only: z.boolean().optional().describe('Default true — only reminder_date >= today.'),
        category: z.enum(['event', 'trade', 'personal']).optional(),
        limit: z.number().int().optional().describe('Max rows to return (default 50, max 100).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ upcoming_only, category, limit }) => {
      let q = supabase
        .from('reminders')
        .select('id, title, category, subcategory, severity, reminder_date, reminder_time, linked_trade_id')
        .order('reminder_date', { ascending: true })
        .limit(clamp(limit ?? 50, 1, 100))
      if (upcoming_only !== false) q = q.gte('reminder_date', new Date().toISOString().slice(0, 10))
      if (category) q = q.eq('category', category)

      const { data, error } = await q
      if (error) return { content: [{ type: 'text', text: `Query failed: ${error.message}` }], isError: true }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
    },
  )

  server.registerTool(
    'get_trade_legs',
    {
      title: 'Get Trade Legs',
      description:
        "Get the full leg-by-leg detail for one trade — strike, option type, action, premium, and quantity per leg — for trades that have structured leg data. Trades entered through Trade Setup have this; older imported trades typically don't and only have the plain-text legs_summary already returned by list_trades.",
      inputSchema: {
        trade_id: z.string().describe('The trade id, as returned by list_trades.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ trade_id }) => {
      const { data, error } = await supabase.from('trades').select('id, legs, legs_summary').eq('id', trade_id).maybeSingle()
      if (error) return { content: [{ type: 'text', text: `Query failed: ${error.message}` }], isError: true }
      if (!data) return { content: [{ type: 'text', text: `No trade found with id "${trade_id}".` }], isError: true }
      if (!data.legs || (Array.isArray(data.legs) && data.legs.length === 0)) {
        return { content: [{ type: 'text', text: `This trade has no structured leg data (common for older imported trades). Its summary: ${data.legs_summary || 'none'}` }] }
      }
      return { content: [{ type: 'text', text: JSON.stringify(data.legs, null, 2) }] }
    },
  )

  server.registerTool(
    'get_strategy_breakdown',
    {
      title: 'Get Strategy Breakdown',
      description:
        'Win rate and average P&L broken down by strategy, over an optional date range — which strategies actually work for this user, not just an overall number.',
      inputSchema: {
        start_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive lower bound on entry_date.'),
        end_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive upper bound on entry_date.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ start_date, end_date }) => {
      let query = supabase.from('trades').select('strategy_label, exit_date, overall_pl')
      if (start_date) query = query.gte('entry_date', start_date)
      if (end_date) query = query.lte('entry_date', end_date)

      const { data, error } = await query
      if (error) return { content: [{ type: 'text', text: `Query failed: ${error.message}` }], isError: true }

      const byStrategy = new Map<string, { closed: number; wins: number; totalPl: number }>()
      for (const r of data ?? []) {
        const key = r.strategy_label || 'Unlabeled'
        if (!byStrategy.has(key)) byStrategy.set(key, { closed: 0, wins: 0, totalPl: 0 })
        const bucket = byStrategy.get(key)!
        if (r.exit_date !== null) {
          bucket.closed += 1
          bucket.totalPl += Number(r.overall_pl ?? 0)
          if (Number(r.overall_pl) > 0) bucket.wins += 1
        }
      }
      const breakdown = Array.from(byStrategy.entries())
        .map(([strategy_label, b]) => ({
          strategy_label,
          closed_trades: b.closed,
          win_rate_pct: b.closed ? Math.round((b.wins / b.closed) * 1000) / 10 : null,
          avg_pl: b.closed ? Math.round((b.totalPl / b.closed) * 100) / 100 : null,
        }))
        .sort((a, b) => b.closed_trades - a.closed_trades)

      return { content: [{ type: 'text', text: JSON.stringify(breakdown, null, 2) }] }
    },
  )

  server.registerTool(
    'get_discipline_stats',
    {
      title: 'Get Discipline Stats',
      description:
        "Compares checklist completion against trade outcomes — whether being fully \"armed\" (all critical checklist items checked) before a trade correlates with better results. Only reflects trades actually entered through the live Checklist → Trade Setup flow; older imported trades were never run through a checklist session and won't appear in this breakdown, so an all-null or empty result usually just means the account's history predates using the checklist live.",
      inputSchema: {
        start_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive lower bound on entry_date.'),
        end_date: z.string().optional().describe('ISO date (YYYY-MM-DD), inclusive upper bound on entry_date.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ start_date, end_date }) => {
      let query = supabase
        .from('checklist_history')
        .select('ready, pnl_id, entry_date, mode')
        .not('ready', 'is', null)
      if (start_date) query = query.gte('entry_date', start_date)
      if (end_date) query = query.lte('entry_date', end_date)

      const { data: sessions, error } = await query
      if (error) return { content: [{ type: 'text', text: `Query failed: ${error.message}` }], isError: true }

      if (!sessions || sessions.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No checklist sessions with recorded readiness found in this range. This is expected if trades in this range were imported rather than entered live through the Checklist flow.',
          }],
        }
      }

      const pnlIds = sessions.map((s) => s.pnl_id).filter(Boolean)
      const { data: trades, error: tradesError } = await supabase.from('trades').select('id, exit_date, overall_pl').in('id', pnlIds.length ? pnlIds : [''])
      if (tradesError) return { content: [{ type: 'text', text: `Query failed: ${tradesError.message}` }], isError: true }
      const tradeById = new Map((trades ?? []).map((t) => [t.id, t]))

      const groups = { armed: { count: 0, closedWithPl: 0, totalPl: 0 }, not_armed: { count: 0, closedWithPl: 0, totalPl: 0 } }
      for (const s of sessions) {
        const bucket = s.ready ? groups.armed : groups.not_armed
        bucket.count += 1
        const trade = s.pnl_id ? tradeById.get(s.pnl_id) : null
        if (trade && trade.exit_date !== null) {
          bucket.closedWithPl += 1
          bucket.totalPl += Number(trade.overall_pl ?? 0)
        }
      }
      const summarize = (g: typeof groups.armed) => ({
        sessions: g.count,
        matched_closed_trades: g.closedWithPl,
        avg_realized_pl: g.closedWithPl ? Math.round((g.totalPl / g.closedWithPl) * 100) / 100 : null,
      })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ fully_armed: summarize(groups.armed), not_fully_armed: summarize(groups.not_armed) }, null, 2),
        }],
      }
    },
  )

  server.registerTool(
    'create_note',
    {
      title: 'Create Note',
      description:
        "Create a new note in the user's My Learnings. Content is plain text (each line becomes its own paragraph) — this always creates a new note, it never edits an existing one.",
      inputSchema: {
        title: z.string().describe('The note title.'),
        content: z.string().optional().describe('Plain-text body. Each line becomes a paragraph. Omit for a blank note.'),
        tags: z.array(z.string()).optional().describe('Tags to attach to the note.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ title, content, tags }) => {
      const id = `note_mcp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
      const row = {
        id,
        title,
        content: content ? plainTextToBlockNoteJson(content) : '',
        tags: tags ?? [],
        is_resource: false,
        is_template: false,
        starred: false,
        folder_id: null,
        sort_order: Date.now() / 1000,
      }
      const { error } = await supabase.from('notes').insert(row)
      if (error) return { content: [{ type: 'text', text: `Couldn't create the note: ${error.message}` }], isError: true }
      return { content: [{ type: 'text', text: `Note created: "${title}" (id: ${id}).` }] }
    },
  )

  server.registerTool(
    'create_reminder',
    {
      title: 'Create Reminder',
      description: "Create a new reminder for the user. This always creates a new reminder, it never edits an existing one.",
      inputSchema: {
        title: z.string().describe('The reminder title.'),
        category: z.enum(['event', 'trade', 'personal']).describe('Reminder category.'),
        reminder_date: z.string().describe('ISO date (YYYY-MM-DD) the reminder is for.'),
        reminder_time: z.string().optional().describe('Time of day, e.g. "09:30".'),
        subcategory: z.string().optional().describe('A more specific subcategory label.'),
        severity: z.string().optional().describe('Severity label, if this category uses one.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ title, category, reminder_date, reminder_time, subcategory, severity }) => {
      const id = `reminder_mcp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
      const row = {
        id,
        title,
        category,
        reminder_date,
        reminder_time: reminder_time ?? null,
        subcategory: subcategory ?? null,
        severity: severity ?? null,
        lead_days: 0,
      }
      const { error } = await supabase.from('reminders').insert(row)
      if (error) return { content: [{ type: 'text', text: `Couldn't create the reminder: ${error.message}` }], isError: true }
      return { content: [{ type: 'text', text: `Reminder created: "${title}" for ${reminder_date} (id: ${id}).` }] }
    },
  )

  return server
}

// ---------------------------------------------------------------------
// RFC 9728 Protected Resource Metadata. The spec's default convention
// inserts /.well-known/oauth-protected-resource between the host and
// this resource's own path — but that URL would sit at the bare origin
// root, which Supabase never routes to an Edge Function (everything
// lives under /functions/v1/{name}/). Serving it here instead, at a URL
// this function can actually answer, and pointing every 401's
// WWW-Authenticate header at it explicitly via resource_metadata (RFC
// 9728 §5.1) is the spec-sanctioned way to handle exactly this case —
// clients are meant to follow that pointer rather than only ever
// guessing the default path.
// ---------------------------------------------------------------------
const RESOURCE_URL = `${SUPABASE_URL}/functions/v1/mcp`
const RESOURCE_METADATA_URL = `${RESOURCE_URL}/.well-known/oauth-protected-resource`
const WWW_AUTHENTICATE = `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`

app.get('/.well-known/oauth-protected-resource', (c) => {
  return c.json({
    resource: RESOURCE_URL,
    authorization_servers: [`${SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ['header'],
  })
})

app.all('*', async (c) => {
  const auth = await authenticate(c.req.raw)
  if (!auth.ok) {
    return c.json({ error: auth.message }, auth.status as 401, { 'WWW-Authenticate': WWW_AUTHENTICATE })
  }
  const server = buildServer(auth.supabase)
  const transport = new StreamableHTTPTransport()
  await server.connect(transport)
  return transport.handleRequest(c)
})

Deno.serve(app.fetch)
