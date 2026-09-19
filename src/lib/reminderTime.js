import { isoToWordDate } from "./dateUtils.js";

export function parseReminderTime(value) {
  const match = (value || "").match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return [5, 0, "AM"];
  return [Math.min(12, Math.max(1, parseInt(match[1], 10))), Math.min(59, Math.max(0, parseInt(match[2], 10))), match[3].toUpperCase()];
}

// "H:MM AM/PM" for right now — used as the default time whenever a
// reminder form opens without an existing time to prefill from.
export function currentTimeString() {
  const d = new Date();
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

export function reminderCombinedEpoch(reminder) {
  if (!reminder.date || !reminder.time) return null;
  const [y, mo, d] = reminder.date.split("-").map(Number);
  const [h12, m, ap] = parseReminderTime(reminder.time);
  let h24 = h12 % 12;
  if (ap === "PM") h24 += 12;
  return new Date(y, mo - 1, d, h24, m, 0, 0).getTime();
}

// "It's time" for a freshly-triggered alarm; "N ago" for one discovered
// late (app was closed or the user wasn't logged in when it fired).
export function reminderRelativeAgo(epochMs) {
  const diffMs = Date.now() - epochMs;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return null;
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function reminderDayLabel(daysUntil, isoDate) {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil === -1) return "Yesterday";
  return isoToWordDate(isoDate);
}

// "9:00 PM" -> "9 PM" (on-the-hour reads more naturally without ":00"),
// but "9:30 PM" stays as-is since the minutes actually matter there.
export function reminderTimeDisplay(time) {
  if (!time) return "";
  return time.replace(/:00(\s*[AP]M)$/i, "$1");
}

// "9:00 PM" -> 21, "5:00 AM" -> 5. Reuses the same parser the time wheel
// picker itself uses, so this always agrees with what's actually stored.
export function reminderTimeToHour24(time) {
  if (!time) return null;
  const [h12, , ap] = parseReminderTime(time);
  let hour = h12 % 12;
  if (ap === "PM") hour += 12;
  return hour;
}
