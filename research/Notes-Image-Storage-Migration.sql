-- ============================================================
-- My Learnings: image storage for notes
-- ============================================================
-- A private Storage bucket for images inserted into notes, replacing
-- the previous approach of embedding images as base64 directly inside
-- a note's own content (fine for an occasional screenshot, but bloats
-- that note's stored size for anything more).
--
-- Each file is uploaded to a path of the form "<user_id>/<filename>" —
-- the RLS policies below check that the first path segment matches the
-- uploader's own auth.uid(), the same per-user scoping already used by
-- every table in this app (RLS with auth.uid() = user_id). The bucket
-- itself stays private (not publicly listable/readable) rather than
-- relying on unguessable filenames alone.
--
-- The app requests a signed URL once, at upload time, with a 10-year
-- expiry, and stores that URL directly as the image's src — long
-- enough to be effectively permanent for a personal journal, avoiding
-- the complexity of re-signing URLs every time a note is opened.
--
-- Run this in the Supabase SQL editor once, against the same project
-- referenced in .env (VITE_SUPABASE_URL).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', false)
on conflict (id) do nothing;

create policy "Users can upload their own note images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'note-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own note images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'note-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own note images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'note-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
