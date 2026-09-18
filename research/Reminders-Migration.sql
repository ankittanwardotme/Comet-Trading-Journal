-- ============================================================
-- Reminders: market events, trade reminders, and personal reminders
-- ============================================================
-- One table for all three reminder categories (event / trade / personal)
-- rather than three separate tables — they share the same shape (a date,
-- an optional time, a severity, an optional trade link) and are always
-- queried together for "what's due" purposes. category distinguishes
-- them; subcategory holds the specific type (e.g. "RBI MPC Policy
-- Decision") and is null for personal reminders, where title is
-- freeform instead.
--
-- The category taxonomy itself (which subcategories exist, and their
-- default severity) is NOT stored here — it lives as a constant in the
-- app code (EVENT_GROUPS / TRADE_GROUPS), with per-user severity
-- overrides kept in dbStorage (key: "reminder-severity-overrides"),
-- the same lightweight per-user-preference mechanism already used for
-- theme and other settings. This table only stores the reminders
-- themselves, not the category structure.
--
-- Matches the existing relational-table pattern used by trades / notes /
-- fund_transactions / checklist_history:
--   - text primary key in a "reminder_<timestamp>_<counter>" format,
--     generated client-side
--   - one row per user_id, RLS-scoped with auth.uid() = user_id
--   - linked_trade_id is a REAL foreign key into trades.id, same
--     ordering rule as checklist_history.pnl_id and notes.linked_trade_id
--     — the referenced trade must already exist first. ON DELETE SET
--     NULL rather than CASCADE: deleting a trade shouldn't delete a
--     reminder that happened to reference it, just unlink it.
--
-- Run this in the Supabase SQL editor once, against the same project
-- referenced in .env (VITE_SUPABASE_URL).
-- ============================================================

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('event', 'trade', 'personal')),
  subcategory text,
  severity text not null default 'blue' check (severity in ('red', 'yellow', 'blue')),
  reminder_date date not null,
  reminder_time text,
  lead_days integer not null default 0,
  linked_trade_id text references public.trades(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-user lookups (every read in the app is scoped to the signed-in user)
create index if not exists reminders_user_id_idx on public.reminders (user_id);

-- "What's due" queries filter/sort by date constantly — the badge count,
-- the today banner, the upcoming list, and the calendar view all hit this
create index if not exists reminders_date_idx on public.reminders (reminder_date);

-- Fast lookup of "reminders linked to this trade", mirroring
-- notes_linked_trade_idx for the same reason
create index if not exists reminders_linked_trade_idx on public.reminders (linked_trade_id);

-- Keep updated_at accurate on every UPDATE, same trigger pattern as notes
create or replace function public.set_reminders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row
  execute function public.set_reminders_updated_at();

-- Row Level Security — identical per-user policy shape to every other
-- table in the app. Every reminder is only ever visible to, and
-- writable by, the user who created it.
alter table public.reminders enable row level security;

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own" on public.reminders
  for select using (auth.uid() = user_id);

drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own" on public.reminders
  for insert with check (auth.uid() = user_id);

drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own" on public.reminders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own" on public.reminders
  for delete using (auth.uid() = user_id);
