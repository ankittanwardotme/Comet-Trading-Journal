import { useState, useEffect, useMemo } from "react";
import { dbTable, dbStorage, currentUserId } from "../lib/supabaseClient.js";
import { deleteWithUndo } from "../lib/notifications.js";
import { reminderRowToJs, reminderJsToRow } from "../lib/rowMappers.js";
import { REMINDER_EVENT_GROUPS, REMINDER_TRADE_GROUPS, reminderBuiltInSeverity } from "../lib/remindersData.js";
import { reminderCombinedEpoch } from "../lib/reminderTime.js";
import { localISODate } from "../lib/dateUtils.js";
import { notify } from "../lib/notifications.js";
import { freshReminderId } from "../lib/exportEngine.js";

// Reminders: the reminder list itself plus the taxonomy customization
// (per-subcategory severity overrides, hidden built-ins, user-added custom
// subcategories), the due/window computations the Home banner and
// RemindersPage key off, and the alarm-popup lifecycle (which reminders are
// currently due, dismissing/snoozing them).
export function useReminders() {
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [reminderSeverityOverrides, setReminderSeverityOverrides] = useState({});
  const [reminderHiddenSubcategories, setReminderHiddenSubcategories] = useState([]);
  const [reminderCustomSubcategories, setReminderCustomSubcategories] = useState([]); // [{ group, name, severity }]
  const [reminderListWindowDays, setReminderListWindowDays] = useState(14);
  const [reminderAlarmDismissed, setReminderAlarmDismissed] = useState({}); // { [id]: dismissedForEpochMs }
  const [reminderAlarmDismissedLoaded, setReminderAlarmDismissedLoaded] = useState(false);
  const [dueAlarms, setDueAlarms] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await dbTable.selectAll("reminders", "reminder_date");
        if (!cancelled) setReminders(rows.map(reminderRowToJs));
      } catch (err) { if (!cancelled) setReminders([]); }
      finally { if (!cancelled) setRemindersLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-severity-overrides");
        const parsed = res && res.value ? JSON.parse(res.value) : {};
        if (!cancelled) setReminderSeverityOverrides(parsed && typeof parsed === "object" ? parsed : {});
      } catch (err) { if (!cancelled) setReminderSeverityOverrides({}); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-hidden-subcategories");
        const parsed = res && res.value ? JSON.parse(res.value) : [];
        if (!cancelled) setReminderHiddenSubcategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) { if (!cancelled) setReminderHiddenSubcategories([]); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-custom-subcategories");
        const parsed = res && res.value ? JSON.parse(res.value) : [];
        if (!cancelled) setReminderCustomSubcategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) { if (!cancelled) setReminderCustomSubcategories([]); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-list-window-days");
        const parsed = res && res.value ? parseInt(res.value, 10) : 14;
        if (!cancelled) setReminderListWindowDays(Number.isFinite(parsed) ? parsed : 14);
      } catch (err) { if (!cancelled) setReminderListWindowDays(14); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-alarm-dismissed");
        const parsed = res && res.value ? JSON.parse(res.value) : {};
        if (!cancelled) setReminderAlarmDismissed(parsed && typeof parsed === "object" ? parsed : {});
      } catch (err) { if (!cancelled) setReminderAlarmDismissed({}); }
      finally { if (!cancelled) setReminderAlarmDismissedLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Effective severity for a subcategory — a per-user override if one has
  // been set via Edit Categories, otherwise the built-in default. Never
  // touches the taxonomy itself, just how it's colored for this user.
  const reminderSeverityFor = (subcategory) => reminderSeverityOverrides[subcategory] || reminderBuiltInSeverity(subcategory);

  const setReminderCategorySeverity = async (subcategory, severity) => {
    const next = { ...reminderSeverityOverrides, [subcategory]: severity };
    setReminderSeverityOverrides(next);
    try { await dbStorage.set("reminder-severity-overrides", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };

  // The taxonomy actually shown in the app: built-in groups with any
  // user-hidden items removed, plus the user's own custom additions
  // appended to their group (or a new group, if it doesn't exist yet).
  // Severity always resolves through reminderSeverityFor, so an override
  // applies whether the type is built-in or custom.
  const reminderEffectiveGroups = useMemo(() => {
    const hidden = new Set(reminderHiddenSubcategories);
    const base = [...REMINDER_EVENT_GROUPS, ...REMINDER_TRADE_GROUPS].map((g) => ({ group: g.group, items: g.items.filter(([name]) => !hidden.has(name)) }));
    reminderCustomSubcategories.forEach(({ group, name }) => {
      let target = base.find((g) => g.group === group);
      if (!target) { target = { group, items: [] }; base.push(target); }
      target.items.push([name, reminderSeverityFor(name)]);
    });
    return base.filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderHiddenSubcategories, reminderCustomSubcategories, reminderSeverityOverrides]);

  const hideReminderSubcategory = async (name) => {
    const next = [...reminderHiddenSubcategories, name];
    setReminderHiddenSubcategories(next);
    try { await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };
  const addCustomReminderSubcategory = async (group, name, severity) => {
    const next = [...reminderCustomSubcategories, { group, name, severity }];
    setReminderCustomSubcategories(next);
    try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
    if (severity) await setReminderCategorySeverity(name, severity);
  };
  const removeCustomReminderSubcategory = async (name) => {
    const next = reminderCustomSubcategories.filter((c) => c.name !== name);
    setReminderCustomSubcategories(next);
    try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };

  const setReminderListWindow = async (days) => {
    setReminderListWindowDays(days);
    try { await dbStorage.set("reminder-list-window-days", String(days)); } catch (err) { /* best effort */ }
  };

  // Renaming a built-in item or group has no dedicated data model — it's
  // implemented by hiding the original name(s) and re-adding under the new
  // name(s) with the same severity, reusing the hide/custom-add mechanisms
  // that already exist. A rename of a custom (already user-added) item just
  // updates its entry directly rather than hide+re-add, since there's
  // nothing built-in to hide.
  const renameReminderItem = async (group, oldName, newName) => {
    if (!newName.trim() || newName === oldName) return;
    const isCustom = reminderCustomSubcategories.some((c) => c.name === oldName);
    const severity = reminderSeverityFor(oldName);
    if (isCustom) {
      const nextCustom = reminderCustomSubcategories.map((c) => (c.name === oldName ? { ...c, name: newName } : c));
      setReminderCustomSubcategories(nextCustom);
      try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom)); } catch (err) { /* best effort */ }
    } else {
      const nextHidden = [...reminderHiddenSubcategories, oldName];
      const nextCustom = [...reminderCustomSubcategories, { group, name: newName, severity }];
      setReminderHiddenSubcategories(nextHidden);
      setReminderCustomSubcategories(nextCustom);
      try {
        await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(nextHidden));
        await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom));
      } catch (err) { /* best effort */ }
    }
    if (severity) await setReminderCategorySeverity(newName, severity);
  };

  const renameReminderGroup = async (oldGroup, newGroup, itemsInGroup) => {
    if (!newGroup.trim() || newGroup === oldGroup) return;
    const builtInNames = itemsInGroup.filter(([name]) => !reminderCustomSubcategories.some((c) => c.name === name)).map(([name]) => name);
    const nextHidden = [...reminderHiddenSubcategories, ...builtInNames];
    const nextCustom = [
      ...reminderCustomSubcategories.map((c) => (c.group === oldGroup ? { ...c, group: newGroup } : c)),
      ...itemsInGroup.filter(([name]) => builtInNames.includes(name)).map(([name, sev]) => ({ group: newGroup, name, severity: reminderSeverityFor(name) })),
    ];
    setReminderHiddenSubcategories(nextHidden);
    setReminderCustomSubcategories(nextCustom);
    try {
      await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(nextHidden));
      await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom));
    } catch (err) { /* best effort */ }
  };

  const addReminder = async (payload) => {
    const reminder = { id: freshReminderId(), leadDays: 0, ...payload };
    try {
      await dbTable.insert("reminders", reminderJsToRow(reminder, currentUserId));
      setReminders((prev) => [...prev, reminder]);
      notify(`Reminder added — ${reminder.title}.`);
      return reminder;
    } catch (err) {
      notify("Couldn't add the reminder — please try again.", "error");
      return null;
    }
  };
  const updateReminder = async (id, payload) => {
    const existing = reminders.find((r) => r.id === id);
    if (!existing) return;
    const updated = { ...existing, ...payload, id };
    try {
      await dbTable.upsert("reminders", reminderJsToRow(updated, currentUserId));
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      notify("Couldn't update the reminder — please try again.", "error");
    }
  };
  const deleteReminder = async (id) => {
    const targetIndex = reminders.findIndex((r) => r.id === id);
    const reminder = reminders[targetIndex];
    setReminders((prev) => prev.filter((r) => r.id !== id));
    deleteWithUndo({
      message: `Reminder deleted — ${reminder ? reminder.title : ""}.`,
      performDelete: async () => { try { await dbTable.deleteById("reminders", id); } catch (err) { /* best effort */ } },
      restoreLocal: () => { if (reminder) setReminders((prev) => { const next = [...prev]; next.splice(Math.min(targetIndex, next.length), 0, reminder); return next; }); },
    });
    return true;
  };

  const remindersWithDays = useMemo(() => {
    const todayIso = localISODate(Date.now());
    const [ty, tm, td] = todayIso.split("-").map(Number);
    const todayMs = new Date(ty, tm - 1, td).getTime();
    return reminders.map((r) => {
      if (!r.date) return { ...r, daysUntil: null };
      const [y, m, d] = r.date.split("-").map(Number);
      const daysUntil = Math.round((new Date(y, m - 1, d).getTime() - todayMs) / 86400000);
      return { ...r, daysUntil };
    }).sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
  }, [reminders]);

  // "Due" means today, or within its own lead time window (e.g. a reminder
  // set for 3 days before shows starting 3 days out and stays visible
  // through the day itself) — this is what the badge count and the
  // dashboard banner both key off.
  const dueReminders = useMemo(
    () => remindersWithDays.filter((r) => r.daysUntil !== null && r.daysUntil >= 0 && r.daysUntil <= (r.leadDays || 0)),
    [remindersWithDays]
  );

  // Periodic check: fires the alarm popup for any reminder whose exact
  // date+time has arrived and hasn't been dismissed for that specific
  // moment yet (rescheduling naturally clears an old dismissal, since the
  // new moment won't match what was recorded).
  useEffect(() => {
    if (!reminderAlarmDismissedLoaded) return; // avoid checking against a not-yet-loaded {} that would look like "nothing dismissed"
    const checkAlarms = () => {
      const now = Date.now();
      const due = remindersWithDays.filter((r) => {
        const epoch = reminderCombinedEpoch(r);
        if (epoch === null || epoch > now) return false;
        return reminderAlarmDismissed[r.id] !== epoch;
      });
      setDueAlarms(due);
    };
    checkAlarms();
    const interval = setInterval(checkAlarms, 20000);
    return () => clearInterval(interval);
  }, [remindersWithDays, reminderAlarmDismissed, reminderAlarmDismissedLoaded]);

  const persistAlarmDismissed = async (next) => {
    setReminderAlarmDismissed(next);
    try { await dbStorage.set("reminder-alarm-dismissed", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };
  const dismissAlarm = (reminder) => {
    const epoch = reminderCombinedEpoch(reminder);
    persistAlarmDismissed({ ...reminderAlarmDismissed, [reminder.id]: epoch });
  };
  const handleAlarmClose = (reminder) => dismissAlarm(reminder);
  const handleAlarmCloseAll = () => {
    const next = { ...reminderAlarmDismissed };
    dueAlarms.forEach((r) => { next[r.id] = reminderCombinedEpoch(r); });
    persistAlarmDismissed(next);
  };
  const handleAlarmSnoozeMinutes = async (reminder, mins) => {
    const target = new Date(Date.now() + mins * 60000);
    const newDate = localISODate(target.getTime());
    const h24 = target.getHours();
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const newTime = `${h12}:${String(target.getMinutes()).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
    await updateReminder(reminder.id, { date: newDate, time: newTime });
    dismissAlarm(reminder);
  };
  const handleAlarmSnoozeAllMinutes = (mins) => { dueAlarms.forEach((r) => handleAlarmSnoozeMinutes(r, mins)); };
  const handleAlarmSaveDateTime = async (reminder, date, time) => {
    await updateReminder(reminder.id, { date, time });
    dismissAlarm(reminder);
  };
  const handleAlarmSaveDateTimeAll = (date, time) => { dueAlarms.forEach((r) => handleAlarmSaveDateTime(r, date, time)); };

  return {
    reminders, setReminders, remindersLoading, reminderSeverityOverrides, setReminderSeverityOverrides,
    reminderHiddenSubcategories, setReminderHiddenSubcategories, reminderCustomSubcategories, setReminderCustomSubcategories,
    reminderListWindowDays, reminderAlarmDismissed, setReminderAlarmDismissed, dueAlarms,
    reminderSeverityFor, setReminderCategorySeverity, reminderEffectiveGroups,
    hideReminderSubcategory, addCustomReminderSubcategory, removeCustomReminderSubcategory, setReminderListWindow,
    renameReminderItem, renameReminderGroup, addReminder, updateReminder, deleteReminder,
    remindersWithDays, dueReminders,
    handleAlarmClose, handleAlarmCloseAll, handleAlarmSnoozeMinutes, handleAlarmSnoozeAllMinutes,
    handleAlarmSaveDateTime, handleAlarmSaveDateTimeAll,
  };
}
