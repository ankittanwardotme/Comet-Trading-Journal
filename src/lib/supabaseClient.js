import { createClient } from "@supabase/supabase-js";
import { notify } from "./notifications.js";
import { parseNoteBlocks } from "./noteBlocks.js";

/* ============== Supabase-backed storage (drop-in replacement for window.storage) ============== */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Shared (non-per-user) records — like the one holiday calendar every
// signed-in user reads — are filed under a key name no per-user feature
// ever uses ("shared-holidays", not "holidays"), so there's no collision
// with anyone's own personal data under the ordinary per-user key. The row
// itself is still owned by a real user_id (whichever account writes it,
// i.e. the admin's own id) — app_storage.user_id has a foreign key to the
// real users table, so an invented placeholder id can never be inserted.
// Enforcing that only the designated admin can WRITE to this key is done
// at the database level via a Row Level Security policy (see ADMIN_EMAIL
// below); reads are allowed for any signed-in user regardless of whose
// row it technically is.
export const SHARED_HOLIDAYS_KEY = "shared-holidays";
// An append-only log of holiday-calendar changes, shared the same way the
// calendar itself is — only the admin ever writes to it, but every user's
// client reads it (on load and while the app stays open) to turn the
// admin's edits into a notification of their own, without needing any
// realtime/push infrastructure. Capped the same way per-user notification
// history is, so it can't grow without bound.
export const SHARED_HOLIDAY_LOG_KEY = "shared-holiday-log";
// Checks the shared holiday change log for entries newer than this user's
// own last-seen marker and turns each into a local notification — this is
// how non-admin users learn about admin edits, since there's no
// realtime/push infrastructure. Called on load and on a periodic interval
// (see PreTradeChecklist) so users who keep the app open for a while still
// hear about changes without needing to refresh.
let holidayLogCheckInFlight = null;
export function checkForHolidayLogUpdates() {
  // Deduped rather than run again in parallel — two overlapping calls (e.g.
  // React StrictMode double-invoking this on mount in development) would
  // otherwise both read the same not-yet-updated last-seen marker and each
  // independently decide the same entries are new, notifying twice for the
  // same change.
  if (holidayLogCheckInFlight) return holidayLogCheckInFlight;
  holidayLogCheckInFlight = (async () => {
    try {
      const [logRes, seenRes] = await Promise.all([
        dbStorage.getShared(SHARED_HOLIDAY_LOG_KEY),
        dbStorage.get("holiday-log-last-seen"),
      ]);
      const log = logRes && logRes.value ? JSON.parse(logRes.value) : [];
      const lastSeen = seenRes && seenRes.value ? JSON.parse(seenRes.value) : 0;
      if (!Array.isArray(log) || log.length === 0) return;
      // Log is newest-first; only entries after our own last-seen marker are
      // new to us. Oldest-of-the-new-batch first, so if several changes
      // happened while we were away, the notifications land in the order
      // they actually occurred.
      const unseen = log.filter((entry) => entry.createdAt > lastSeen).sort((a, b) => a.createdAt - b.createdAt);
      if (unseen.length === 0) return;
      unseen.forEach((entry) => notify(entry.message));
      await dbStorage.set("holiday-log-last-seen", JSON.stringify(log[0].createdAt));
    } catch (err) {
      console.error("Failed to check for holiday calendar updates:", err);
    } finally {
      holidayLogCheckInFlight = null;
    }
  })();
  return holidayLogCheckInFlight;
}
// The one account allowed to edit the shared holiday calendar. Editing
// controls are hidden client-side for everyone else, but the actual
// enforcement — what happens if someone calls the API directly instead of
// clicking through the UI — lives in Supabase's Row Level Security policy,
// not here.
export const ADMIN_EMAIL = "ankittanwar.me@gmail.com";
export const isAdminSession = (session) => (session?.user?.email || "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

// Seeded into the shared holiday record the first time the admin's client
// finds it empty (see the holiday-loading effect) — after that, the stored
// record is the source of truth and this constant is never referenced
// again, so editing this list later has no effect on what users see.
export const DEFAULT_HOLIDAYS_2026 = [
  { id: "holiday_2026_01", name: "Republic Day", date: "2026-01-26" },
  { id: "holiday_2026_02", name: "Holi", date: "2026-03-03" },
  { id: "holiday_2026_03", name: "Shri Ram Navami", date: "2026-03-26" },
  { id: "holiday_2026_04", name: "Shri Mahavir Jayanti", date: "2026-03-31" },
  { id: "holiday_2026_05", name: "Good Friday", date: "2026-04-03" },
  { id: "holiday_2026_06", name: "Dr. Baba Saheb Ambedkar Jayanti", date: "2026-04-14" },
  { id: "holiday_2026_07", name: "Maharashtra Day", date: "2026-05-01" },
  { id: "holiday_2026_08", name: "Bakri Id", date: "2026-05-28" },
  { id: "holiday_2026_09", name: "Muharram", date: "2026-06-26" },
  { id: "holiday_2026_10", name: "Ganesh Chaturthi", date: "2026-09-14" },
  { id: "holiday_2026_11", name: "Mahatma Gandhi Jayanti", date: "2026-10-02" },
  { id: "holiday_2026_12", name: "Dussehra", date: "2026-10-20" },
  { id: "holiday_2026_13", name: "Diwali-Balipratipada", date: "2026-11-10" },
  { id: "holiday_2026_14", name: "Prakash Gurpurb Sri Guru Nanak Dev", date: "2026-11-24" },
  { id: "holiday_2026_15", name: "Christmas", date: "2026-12-25" },
];

// Set once after sign-in (see AuthGate below) so every existing dbStorage.get/set
// call site throughout the app keeps working unchanged — they don't know or
// care about auth, they just read/write a key. This is what actually scopes
// every row to the signed-in user.
export let currentUserId = null;

// Mirrors the window.storage.get(key) / window.storage.set(key, value) shape exactly,
// so the rest of the app's code (built around window.storage) needs no other changes.
export const dbStorage = {
  setUserId(id) { currentUserId = id; },
  async deleteAllForUser() {
    if (!currentUserId) return;
    const { error } = await supabase.from("app_storage").delete().eq("user_id", currentUserId);
    if (error) throw error;
  },
  async get(key) {
    if (!currentUserId) return null;
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
      .eq("user_id", currentUserId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    // data.value is already JSONB -> a JS value. window.storage.get returned
    // { value: <jsonString> } and callers do JSON.parse(res.value), so we
    // re-stringify here to keep every existing call site working unchanged.
    return { value: JSON.stringify(data.value) };
  },
  // Actually removes the row, rather than setting its value to JSON null —
  // app_storage.value is NOT NULL, so writing null to "clear" a flag like
  // pin-reset-pending fails outright. Every reader already treats a missing
  // row the same as a null value (`res && res.value ? JSON.parse(...) : null`),
  // so deleting is a safe, equivalent way to represent "not set".
  async delete(key) {
    if (!currentUserId) return null;
    const { error } = await supabase
      .from("app_storage")
      .delete()
      .eq("key", key)
      .eq("user_id", currentUserId);
    if (error) throw error;
    return { key };
  },
  async set(key, jsonString) {
    if (!currentUserId) return null;
    const value = JSON.parse(jsonString);
    const nowIso = new Date().toISOString();
    // Try updating an existing row first (the common case). Deliberately
    // not using .upsert()'s onConflict here — that requires a specific
    // named unique constraint to exist exactly as expected, and depending
    // on that silently breaks if a migration's constraint state ever
    // drifts. This update-then-insert-fallback works regardless.
    const { data: updated, error: updateErr } = await supabase
      .from("app_storage")
      .update({ value, updated_at: nowIso })
      .eq("key", key)
      .eq("user_id", currentUserId)
      .select("key");
    if (updateErr) throw updateErr;
    if (updated && updated.length > 0) return { key };
    const { error: insertErr } = await supabase
      .from("app_storage")
      .insert({ key, value, user_id: currentUserId, updated_at: nowIso });
    if (insertErr) throw insertErr;
    return { key };
  },
  // Same shape as get/set, but keyed only by `key` — not paired with the
  // signed-in user's own id — so every user's client resolves to the exact
  // same row regardless of whose account technically owns it. Whether a
  // given user's write actually succeeds is decided by Supabase's Row Level
  // Security policy on app_storage, not by anything client-side.
  async getShared(key) {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { value: JSON.stringify(data.value) };
  },
  async setShared(key, jsonString) {
    if (!currentUserId) return null;
    const value = JSON.parse(jsonString);
    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("app_storage")
      .update({ value, updated_at: nowIso })
      .eq("key", key)
      .select("key");
    if (updateErr) throw updateErr;
    if (updated && updated.length > 0) return { key };
    // No shared row exists yet — create it under the caller's own real,
    // valid user_id (app_storage.user_id has a foreign key to the real
    // users table, so it must belong to an actual account). Whether this
    // insert is actually allowed is enforced by the RLS policy restricting
    // writes on this key to the admin's email, not by this check.
    const { error: insertErr } = await supabase
      .from("app_storage")
      .insert({ key, value, user_id: currentUserId, updated_at: nowIso });
    if (insertErr) throw insertErr;
    return { key };
  },
};

/* ============== Relational tables (trades, fund_transactions,
   checklist_history) — replacing the old unbounded JSON-blob storage for
   these three datasets. Each mutation now writes only the row(s) that
   actually changed, instead of rewriting the entire history on every
   save. RLS on these tables mirrors app_storage's per-user policies. */
export const dbTable = {
  async selectAll(table, orderColumn) {
    if (!currentUserId) return [];
    let query = supabase.from(table).select("*").eq("user_id", currentUserId);
    if (orderColumn) query = query.order(orderColumn, { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  async insert(table, row) {
    const { error } = await supabase.from(table).insert(row);
    if (error) throw error;
  },
  async upsert(table, rows) {
    const { error } = await supabase.from(table).upsert(Array.isArray(rows) ? rows : [rows]);
    if (error) throw error;
  },
  async upsertOnConflict(table, rows, onConflict) {
    const { error } = await supabase.from(table).upsert(Array.isArray(rows) ? rows : [rows], { onConflict });
    if (error) throw error;
  },
  async deleteById(table, id) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },
  async deleteWhere(table, column, value) {
    const { error } = await supabase.from(table).delete().eq(column, value);
    if (error) throw error;
  },
  async updateWhere(table, column, value, patch) {
    const { error } = await supabase.from(table).update(patch).eq(column, value);
    if (error) throw error;
  },
  async deleteAllForUser(table) {
    if (!currentUserId) return;
    const { error } = await supabase.from(table).delete().eq("user_id", currentUserId);
    if (error) throw error;
  },
};

// --- note file uploads ---
// Any file inserted into a note — images, PDFs, spreadsheets, anything —
// goes to a private Storage bucket instead of being embedded as base64,
// keeping each note's own stored content small regardless of how many or
// how large the attachments are. BlockNote's image/video/audio/file
// blocks all funnel through this same uploadFile callback (confirmed in
// its own source — it's a generic "a file needs uploading" hook, not
// image-specific), so this one function covers all of them.
// The bucket stays private (RLS-gated, not publicly listable) and each
// file's path is scoped under the uploader's own user id, matching how
// every other table in this app is scoped. A signed URL is generated
// once at upload time with a 10-year expiry and stored directly as the
// block's url — long enough to be effectively permanent for a personal
// journal, and far simpler than re-signing URLs every time a note is
// opened. (Bucket id stays "note-images" even though it now holds any
// file type, to avoid requiring a second migration/bucket for something
// Storage doesn't actually restrict by type anyway.)
export const NOTE_FILES_BUCKET = "note-images";
const SIGNED_URL_TEN_YEARS = 60 * 60 * 24 * 365 * 10;
export async function uploadNoteFile(file) {
  if (!currentUserId) throw new Error("Not signed in");
  const nameExtMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name || "");
  const fallbackExt = (file.type || "").startsWith("image/") ? "png" : "bin"; // clipboard-pasted screenshots often have no filename at all; anything dragged/picked from disk (PDFs, xlsx, etc.) will already have a real extension
  const ext = (nameExtMatch ? nameExtMatch[1] : fallbackExt).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(NOTE_FILES_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data: signedData, error: signError } = await supabase.storage.from(NOTE_FILES_BUCKET).createSignedUrl(path, SIGNED_URL_TEN_YEARS);
  if (signError) throw signError;
  return signedData.signedUrl;
}
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Walks a note's content blocks and returns every Storage path referenced
// by an image/video/audio/file block's url — so those can be removed from
// Storage when the note itself is deleted. Blocks embedding base64 data
// (the fallback used if Storage wasn't reachable at upload time) are
// skipped, since there's nothing in Storage to clean up for those.
export function extractStoragePathsFromContent(contentJson) {
  const blocks = parseNoteBlocks(contentJson);
  const paths = [];
  const marker = `/storage/v1/object/sign/${NOTE_FILES_BUCKET}/`;
  const walk = (list) => {
    for (const b of list) {
      const url = b && b.props && b.props.url;
      if (typeof url === "string" && url.includes(marker)) {
        const afterMarker = url.slice(url.indexOf(marker) + marker.length);
        const path = afterMarker.split("?")[0];
        if (path) paths.push(decodeURIComponent(path));
      }
      if (b.children && b.children.length) walk(b.children);
    }
  };
  walk(blocks);
  return paths;
}
// Best-effort — by the time this runs the note row is already gone (or
// about to be), so a cleanup failure here shouldn't surface as a
// user-facing error for a delete the user already completed successfully.
export async function deleteNoteStorageFiles(contentJson) {
  const paths = extractStoragePathsFromContent(contentJson);
  if (paths.length === 0) return;
  try { await supabase.storage.from(NOTE_FILES_BUCKET).remove(paths); } catch (err) { /* best effort */ }
}
// Wipes every file under this user's own folder in the bucket at once —
// used for the "clear all learnings data" bulk wipe, where every note is
// being deleted anyway, so there's no need to parse each one's content
// individually to find what to remove.
export async function deleteAllNoteStorageFilesForUser() {
  if (!currentUserId) return;
  try {
    const { data: files, error: listError } = await supabase.storage.from(NOTE_FILES_BUCKET).list(currentUserId, { limit: 1000 });
    if (listError || !files || files.length === 0) return;
    const paths = files.map((f) => `${currentUserId}/${f.name}`);
    await supabase.storage.from(NOTE_FILES_BUCKET).remove(paths);
  } catch (err) { /* best effort */ }
}

// --- trade screenshots ---
// A dedicated bucket (not a shared one with note-images), specifically so
// "clear my trading data" and "clear my learnings data" can each wipe
// their own files in bulk with zero risk of touching the other's —
// see the trade_screenshots migration for the full reasoning.
export const TRADE_IMAGES_BUCKET = "trade-images";
export async function uploadTradeFile(file) {
  if (!currentUserId) throw new Error("Not signed in");
  const nameExtMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name || "");
  const fallbackExt = (file.type || "").startsWith("image/") ? "png" : "bin";
  const ext = (nameExtMatch ? nameExtMatch[1] : fallbackExt).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(TRADE_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data: signedData, error: signError } = await supabase.storage.from(TRADE_IMAGES_BUCKET).createSignedUrl(path, SIGNED_URL_TEN_YEARS);
  if (signError) throw signError;
  return signedData.signedUrl;
}
// Best-effort — mirrors deleteNoteStorageFiles: by the time this runs the
// trade row is already gone (or about to be), so a cleanup failure here
// shouldn't surface as a user-facing error for a delete that already
// completed successfully from the user's point of view.
export async function deleteTradeScreenshotFiles(screenshots) {
  if (!Array.isArray(screenshots) || screenshots.length === 0) return;
  const marker = `/storage/v1/object/sign/${TRADE_IMAGES_BUCKET}/`;
  const paths = screenshots
    .map((s) => (s && typeof s.url === "string" ? s.url : null))
    .filter(Boolean)
    .filter((url) => url.includes(marker))
    .map((url) => decodeURIComponent(url.slice(url.indexOf(marker) + marker.length).split("?")[0]));
  if (paths.length === 0) return;
  try { await supabase.storage.from(TRADE_IMAGES_BUCKET).remove(paths); } catch (err) { /* best effort */ }
}
export async function deleteAllTradeStorageFilesForUser() {
  if (!currentUserId) return;
  try {
    const { data: files, error: listError } = await supabase.storage.from(TRADE_IMAGES_BUCKET).list(currentUserId, { limit: 1000 });
    if (listError || !files || files.length === 0) return;
    const paths = files.map((f) => `${currentUserId}/${f.name}`);
    await supabase.storage.from(TRADE_IMAGES_BUCKET).remove(paths);
  } catch (err) { /* best effort */ }
}

// Wipes every table, every Storage file, and every app_storage setting for
// the current user — the full, unconditional "delete this account's data"
// operation, as opposed to clearSelectedData's per-category selective
// clearing (trading / strategies / learnings independently). Used by the
// account-deletion-after-7-days flow, which lives in LoginPage — a
// separate component from where clearSelectedData is defined, and one
// that runs before the app's data has been loaded into React state at
// all, so there's nothing to reset there beyond the database itself.
export async function deleteAllUserData() {
  await Promise.all([
    dbTable.deleteAllForUser("trades"),
    dbTable.deleteAllForUser("checklist_history"),
    dbTable.deleteAllForUser("fund_transactions"),
    dbTable.deleteAllForUser("notes"),
    dbTable.deleteAllForUser("note_folders"),
    dbTable.deleteAllForUser("reminders"),
    deleteAllNoteStorageFilesForUser(),
    deleteAllTradeStorageFilesForUser(),
  ]);
  // Last: also wipes app_storage's own "account-deletion-requested-at"
  // marker as a side effect (it's a row in the same table), so a later
  // login doesn't find a stale marker and try to re-run this.
  await dbStorage.deleteAllForUser();
}
