-- ============================================================
-- My Learnings: starred notes
-- ============================================================
-- Adds a simple boolean flag so notes can be starred/favorited and
-- filtered to a dedicated "Starred" view in the sidebar rail, the same
-- way tags and resources already get their own filtered views.
--
-- Run this in the Supabase SQL editor once, against the same project
-- already running Notes-Migration.sql.
-- ============================================================

alter table public.notes
  add column if not exists starred boolean not null default false;

-- Supports the "Starred" rail view's query (all of this user's starred
-- notes) without a full table scan — partial index since most notes
-- will never be starred, keeping it small.
create index if not exists notes_starred_idx on public.notes (user_id) where starred = true;
