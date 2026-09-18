-- ============================================================
-- My Learnings: drag-to-reorder support
-- ============================================================
-- Adds a numeric sort_order to both notes and folders. Default display
-- order is newest-first, which this column encodes directly (higher
-- value = shown first) — new rows get sort_order = extract(epoch from
-- now()), so "newest on top" falls straight out of "order by sort_order
-- desc" with no separate date-vs-manual-order branching anywhere.
--
-- Dragging to reorder recomputes sort_order for just the moved row (as
-- the midpoint between its new neighbors, or a value beyond the current
-- max/min at the ends of a list) — nothing else's sort_order changes,
-- so "only dragging changes position" holds by construction.
--
-- Run this in the Supabase SQL editor once, alongside the other Notes
-- migrations already applied.
-- ============================================================

alter table public.notes
  add column if not exists sort_order double precision;

alter table public.note_folders
  add column if not exists sort_order double precision;

-- Backfill existing rows so older notes/folders (created before this
-- column existed) still sort sensibly — newest created_at gets the
-- highest sort_order, matching "newest on top".
update public.notes
  set sort_order = extract(epoch from created_at)
  where sort_order is null;

update public.note_folders
  set sort_order = extract(epoch from created_at)
  where sort_order is null;

create index if not exists notes_sort_order_idx on public.notes (sort_order);
create index if not exists note_folders_sort_order_idx on public.note_folders (sort_order);
