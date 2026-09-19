export const FONT_DISPLAY = { fontFamily: "'Victor Mono', ui-sans-serif, system-ui, sans-serif" };
export const FONT_MONO = { fontFamily: "'Victor Mono', ui-monospace, 'SFMono-Regular', 'Menlo', 'Consolas', monospace" };

// Plain 2-decimal number, no currency symbol — used for raw premium values
// (e.g. "Opened 96.00 → Closed 40.00") where the ₹ prefix would be redundant.
export const fmt2dp = (n) => {
  const v = parseFloat(n);
  return Number.isNaN(v) ? "—" : v.toFixed(2);
};
export const fmtINR = (n) => {
  if (n === null || n === undefined || Number.isNaN(n) || n === 0) return "—";
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const fmtINRsigned = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return (n >= 0 ? "+₹" : "-₹") + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function fmtHour12(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export function formatRelativeTime(timestamp) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
}
