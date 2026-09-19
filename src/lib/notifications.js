import { dbStorage } from "./supabaseClient.js";
import { playToastPop, playErrorBeep } from "./audio.js";

let notificationListeners = [];
let notificationPersistQueue = Promise.resolve();
export function notify(message, type = "success", options = {}) {
  // System-wide notification sound — since notify() is the one universal
  // entry point every part of the app already calls (trades, notes,
  // reminders, etc.), hooking sound in here makes it apply everywhere
  // without needing every call site to remember to add it itself.
  if (type === "error") playErrorBeep(); else playToastPop();
  // Globally unique, not just unique within this page load — the bell's
  // merge logic (reconciling live-received notifications against what's
  // freshly loaded from storage) compares by id, so a simple per-session
  // counter restarting at 1 on every reload would make an old notification
  // from a previous session and a brand new one from this session look
  // identical whenever their counters happened to line up, silently
  // dropping the new one during the merge.
  const id = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  // onUndo is a live function reference, not persisted data — kept only on
  // the object dispatched to listeners (so the toast can call it), and
  // deliberately stripped before anything gets written to notification
  // history below, since a function can't survive a JSON round-trip and
  // an undo button on a reloaded, stale notification wouldn't be safe to
  // act on anyway (the data it would restore may no longer be current).
  const notification = { id, message, type, createdAt: Date.now(), onUndo: options.onUndo || null, duration: options.duration || null };
  notificationListeners.forEach((listener) => listener(notification));
  const { onUndo, ...persistable } = notification;
  notificationPersistQueue = notificationPersistQueue.then(async () => {
    try {
      const res = await dbStorage.get("notification-history");
      const existing = res && res.value ? JSON.parse(res.value) : [];
      const next = [persistable, ...(Array.isArray(existing) ? existing : [])].slice(0, 20);
      await dbStorage.set("notification-history", JSON.stringify(next));
    } catch (err) { /* best effort */ }
  });
}
export function subscribeToNotifications(listener) {
  notificationListeners.push(listener);
  return () => { notificationListeners = notificationListeners.filter((l) => l !== listener); };
}
// Shared "delete with a 10s undo window" pattern, used by every delete
// action across the app. Deliberately delays the REAL deletion (DB writes,
// storage cleanup) until the window passes, rather than deleting
// immediately and re-inserting on undo — that would mean undo racing
// against fire-and-forget cleanup (e.g. a screenshot file already gone
// from Storage before undo is even clicked) and would need every restore
// path to reconstruct a DB row perfectly. This way undo is always fully
// safe: if it fires, the real delete simply never happens at all.
export function deleteWithUndo({ message, performDelete, restoreLocal, duration = 10000 }) {
  let cancelled = false;
  const timer = setTimeout(() => {
    if (!cancelled) performDelete();
  }, duration);
  notify(message, "success", {
    duration,
    onUndo: () => {
      cancelled = true;
      clearTimeout(timer);
      restoreLocal();
    },
  });
}
// Routed through the same queue as notify()'s own persistence so a Clear
// click can't race an in-flight notify() write and have one silently undo
// the other depending on which happens to finish last.
export function clearPersistedNotifications() {
  notificationPersistQueue = notificationPersistQueue.then(async () => {
    try { await dbStorage.set("notification-history", JSON.stringify([])); } catch (err) { /* best effort */ }
  });
  return notificationPersistQueue;
}
