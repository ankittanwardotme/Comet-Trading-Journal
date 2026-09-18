-- ============================================================
-- My Learnings: note templates
-- ============================================================
-- Adds a simple boolean flag so a note can be marked as a template —
-- shown in its own "Templates" view in the sidebar rail (just above
-- Resources), the same way starred notes and resources already get
-- their own filtered views of the same notes table.
--
-- Run this in the Supabase SQL editor once, against the same project
-- already running Notes-Migration.sql.
-- ============================================================

alter table public.notes
  add column if not exists is_template boolean not null default false;

-- Supports the "Templates" rail view's query (all of this user's
-- templates) without a full table scan — partial index since most notes
-- will never be templates, keeping it small.
create index if not exists notes_is_template_idx on public.notes (user_id) where is_template = true;
