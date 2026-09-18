-- ============================================================
-- My Learnings: notes + resources
-- ============================================================
-- One table for both notes and saved-link "resources" — a resource is
-- just a note with is_resource = true and a resource_url set. This
-- avoids a second nearly-identical table for what is, in practice, one
-- browsing/search/tagging experience in the UI.
--
-- Matches the existing relational-table pattern used by trades /
-- fund_transactions / checklist_history:
--   - text primary key in a "<prefix>_<timestamp>_<counter>" format
--     (here: note_<timestamp>_<counter>), generated client-side
--   - one row per user_id, RLS-scoped with auth.uid() = user_id
--   - linked_trade_id is a REAL foreign key into trades.id, so — same
--     ordering rule as checklist_history.pnl_id — the referenced trade
--     must already exist before a note can reference it. ON DELETE SET
--     NULL rather than CASCADE: deleting a trade should not delete the
--     lesson you wrote about it, just unlink it.
--
-- Run this in the Supabase SQL editor once, against the same project
-- referenced in .env (VITE_SUPABASE_URL).
-- ============================================================

create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  tags text[] not null default '{}',
  is_resource boolean not null default false,
  resource_url text,
  linked_trade_id text references public.trades(id) on delete set null,
  linked_underlying text,
  linked_strategy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-user lookups (every read in the app is scoped to the signed-in user)
create index if not exists notes_user_id_idx on public.notes (user_id);

-- Tag filtering — notes.tags @> array['some-tag'] style queries, and the
-- "what tags exist across my notes" aggregation the tag-filter chips use
create index if not exists notes_tags_idx on public.notes using gin (tags);

-- Fast lookup of "notes linked to this trade" (used by the note→trade
-- link resolver; also the natural home for a future "show notes on this
-- trade's Trade Log entry" backlink feature)
create index if not exists notes_linked_trade_idx on public.notes (linked_trade_id);

-- Keep updated_at accurate on every UPDATE without relying on every
-- call site remembering to set it (the app's own upsert path already
-- does this too, but a trigger keeps it correct even for
-- direct SQL edits made outside the app, e.g. during support/debugging)
create or replace function public.set_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function public.set_notes_updated_at();

-- Row Level Security — identical per-user policy shape to trades /
-- fund_transactions / checklist_history. Every note is only ever
-- visible to, and writable by, the user who owns it.
alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);
