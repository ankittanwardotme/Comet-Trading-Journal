import { useState, useEffect } from "react";
import {
  dbStorage, dbTable, currentUserId, checkForHolidayLogUpdates, isAdminSession,
  DEFAULT_HOLIDAYS_2026, SHARED_HOLIDAYS_KEY, SHARED_HOLIDAY_LOG_KEY,
} from "../lib/supabaseClient.js";
import { notify } from "../lib/notifications.js";
import { localISODate, isoToShortDate, legsToParts, nearestLegExpiry } from "../lib/dateUtils.js";
import { tradeJsToRow, historyJsToRow } from "../lib/rowMappers.js";

// Shared holiday calendar (holidays table is a single shared record, not
// per-user) plus the reconciliation logic that keeps already-saved trade
// legs and their log entries in sync whenever a holiday is added, edited,
// or removed. Needs read/write access to pnlEntries and history (owned by
// useTradeData/useChecklistState) since reconciling a holiday change can
// shift a leg's expiry and append a change-log entry on the linked trade.
export function useHolidayData({ session, pnlEntries, setPnlEntries, history, setHistory }) {
  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dbStorage.getShared(SHARED_HOLIDAYS_KEY);
        const parsed = res && res.value ? JSON.parse(res.value) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!cancelled) setHolidays(parsed);
        } else if (isAdminSession(session)) {
          // Nobody has seeded the shared calendar yet — the admin's own
          // client does it once, here, so every other user's next load
          // finds a populated record instead of an empty one.
          try {
            await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(DEFAULT_HOLIDAYS_2026));
            if (!cancelled) setHolidays(DEFAULT_HOLIDAYS_2026);
          } catch (seedErr) {
            console.error("Failed to seed shared holiday calendar:", seedErr);
            notify(`Couldn't set up the shared holiday calendar — ${seedErr?.message || "check console for details"}.`, "error");
            if (!cancelled) setHolidays([]);
          }
        } else if (!cancelled) {
          setHolidays([]);
        }
      } catch (err) {
        console.error("Failed to read shared holiday calendar:", err);
        if (isAdminSession(session)) notify(`Couldn't read the shared holiday calendar — ${err?.message || "check console for details"}.`, "error");
        if (!cancelled) setHolidays([]);
      }
      finally { if (!cancelled) setHolidaysLoading(false); }
    })();
    checkForHolidayLogUpdates();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Users who keep the app open for a while (rather than reloading) still
  // get told about holiday-calendar edits made by the admin in the
  // meantime — same check as on load, just re-run periodically.
  useEffect(() => {
    const interval = setInterval(() => { checkForHolidayLogUpdates(); }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // When a holiday lands on a Tuesday, any already-saved trade with a leg
  // expiring that day shifts back to the previous trading day (Monday) — the
  // same rule the expiry picker applies going forward. Each shifted leg is
  // tagged with which holiday caused it (holidayShift: {holidayId, from}), so
  // if that holiday is later edited to a different date or deleted entirely,
  // the shift can be reverted precisely — without touching a leg the user
  // deliberately set to Monday themselves for unrelated reasons.
  const applyHolidayReconciliation = async (holidayId, newDateISO) => {
    let mondayISO = null;
    if (newDateISO) {
      const [y, m, d] = newDateISO.split("-").map(Number);
      if (new Date(y, m - 1, d).getDay() === 2) {
        const monday = new Date(y, m - 1, d);
        monday.setDate(monday.getDate() - 1);
        mondayISO = localISODate(monday.getTime());
      }
    }

    let historyNext = history;
    const changedTrades = [];
    const changedHistoryEntries = [];

    const nextEntries = pnlEntries.map((entry) => {
      if (!entry.legs || entry.legs.length === 0) return entry;
      let legsChanged = false;
      const newLegs = entry.legs.map((leg) => {
        // This leg was previously auto-shifted by this exact holiday — undo
        // it (and re-shift immediately if the holiday's new date still lands
        // on this leg's original expiry).
        if (leg.holidayShift && leg.holidayShift.holidayId === holidayId) {
          legsChanged = true;
          const original = leg.holidayShift.from;
          const { holidayShift, ...rest } = leg;
          if (mondayISO && original === newDateISO) {
            return { ...rest, expiry: mondayISO, holidayShift: { holidayId, from: newDateISO } };
          }
          return { ...rest, expiry: original };
        }
        // This leg's expiry matches a newly added/moved holiday and isn't
        // already tracked — apply a fresh forward shift.
        if (mondayISO && leg.expiry === newDateISO && !leg.holidayShift) {
          legsChanged = true;
          return { ...leg, expiry: mondayISO, holidayShift: { holidayId, from: newDateISO } };
        }
        return leg;
      });
      if (!legsChanged) return entry;

      const { legsDesc, premiumDesc } = legsToParts(newLegs);
      const newExpiryDate = nearestLegExpiry(newLegs);
      const updatedEntry = { ...entry, legs: newLegs, legsSummary: legsDesc, premiumSummary: premiumDesc, expiryDate: newExpiryDate };
      changedTrades.push(updatedEntry);

      const idx = historyNext.findIndex((h) => h.pnlId === entry.id);
      if (idx !== -1) {
        if (historyNext === history) historyNext = [...history];
        const target = historyNext[idx];
        const changeEntry = {
          ts: Date.now(),
          type: "fields",
          changes: [{ field: "Leg expiry", from: "previous value", to: "updated — holiday calendar changed" }],
        };
        const updatedHistoryEntry = { ...target, changes: [...(target.changes || []), changeEntry] };
        historyNext[idx] = updatedHistoryEntry;
        changedHistoryEntries.push(updatedHistoryEntry);
      }

      return updatedEntry;
    });

    if (changedTrades.length > 0) {
      setPnlEntries(nextEntries);
      try { await dbTable.upsert("trades", changedTrades.map((e) => tradeJsToRow(e, currentUserId))); } catch (e) { /* best effort */ }
    }
    if (changedHistoryEntries.length > 0) {
      setHistory(historyNext);
      try {
        await dbTable.upsertOnConflict("checklist_history", changedHistoryEntries.map((h) => historyJsToRow(h, currentUserId)), "user_id,ts");
      } catch (e) { /* best effort */ }
    }
  };

  const appendHolidayLogEntry = async (message) => {
    try {
      const res = await dbStorage.getShared(SHARED_HOLIDAY_LOG_KEY);
      const existing = res && res.value ? JSON.parse(res.value) : [];
      const entry = { id: `hlog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, message, createdAt: Date.now() };
      const next = [entry, ...(Array.isArray(existing) ? existing : [])].slice(0, 30);
      await dbStorage.setShared(SHARED_HOLIDAY_LOG_KEY, JSON.stringify(next));
      // The admin already got a direct notify() call above for their own
      // edit — advance their own marker past it so the generic "notify me
      // about anything new in the shared log" check doesn't fire again for
      // the same change.
      await dbStorage.set("holiday-log-last-seen", JSON.stringify(entry.createdAt));
    } catch (err) {
      // The holiday change itself already succeeded — but if this part
      // fails silently, other users never learn about the change at all,
      // with nothing in the UI to explain why. Surface it visibly instead.
      console.error("Failed to log holiday change:", err);
      notify(`Holiday saved, but other users won't be notified — ${err?.message || "check console for details"}.`, "error");
    }
  };

  const saveHoliday = async (holiday, isEdit) => {
    if (!isAdminSession(session)) return;
    const next = isEdit ? holidays.map((h) => (h.id === holiday.id ? holiday : h)) : [holiday, ...holidays];
    try {
      await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to save holiday:", err);
      notify(`Couldn't save that holiday — ${err?.message || "check console for details"}.`, "error");
      return;
    }
    setHolidays(next);
    await applyHolidayReconciliation(holiday.id, holiday.date);
    const message = `${isEdit ? "Holiday updated" : "Holiday added"} — ${holiday.name}, ${isoToShortDate(holiday.date)}.`;
    notify(message);
    await appendHolidayLogEntry(message);
  };

  const deleteHoliday = async (id) => {
    if (!isAdminSession(session)) return;
    const target = holidays.find((h) => h.id === id);
    if (target && parseInt(target.date.slice(0, 4), 10) < new Date().getFullYear()) return; // archived — read-only
    const next = holidays.filter((h) => h.id !== id);
    try {
      await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to delete holiday:", err);
      notify(`Couldn't delete that holiday — ${err?.message || "check console for details"}.`, "error");
      return;
    }
    setHolidays(next);
    await applyHolidayReconciliation(id, null); // null date -> pure revert, no forward shift
    const message = `Holiday deleted — ${target ? target.name : ""}.`;
    notify(message);
    await appendHolidayLogEntry(message);
  };

  return { holidays, holidaysLoading, saveHoliday, deleteHoliday };
}
