-- ============================================================
-- My Learnings: folder hierarchy (Obsidian-style tree)
-- ============================================================
-- Additive migration — run this AFTER Notes-Migration.sql. It does not
-- touch or drop anything from that migration, it only adds a new table
-- and one new column.
--
-- Folders can nest (parent_id -> note_folders.id) to any depth. Deleting
-- a folder cascades to its subfolders (a subfolder is meaningless without
-- its parent), but NEVER deletes notes — any note filed inside a deleted
-- folder just becomes unfiled (folder_id set to NULL), the same
-- "unlink, don't destroy" behavior already used for linked_trade_id in
-- Notes-Migration.sql.
-- ============================================================

create table if not exists public.note_folders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'New Folder',
  parent_id text references public.note_folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists note_folders_user_id_idx on public.note_folders (user_id);
create index if not exists note_folders_parent_id_idx on public.note_folders (parent_id);

alter table public.note_folders enable row level security;

drop policy if exists "note_folders_select_own" on public.note_folders;
create policy "note_folders_select_own" on public.note_folders
  for select using (auth.uid() = user_id);

drop policy if exists "note_folders_insert_own" on public.note_folders;
create policy "note_folders_insert_own" on public.note_folders
  for insert with check (auth.uid() = user_id);

drop policy if exists "note_folders_update_own" on public.note_folders;
create policy "note_folders_update_own" on public.note_folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "note_folders_delete_own" on public.note_folders;
create policy "note_folders_delete_own" on public.note_folders
  for delete using (auth.uid() = user_id);

-- Every existing note (from before folders existed) simply has
-- folder_id = NULL, which the app treats as "Uncategorized" — nothing
-- needs backfilling for old rows.
alter table public.notes add column if not exists folder_id text
  references public.note_folders(id) on delete set null;

create index if not exists notes_folder_id_idx on public.notes (folder_id);
