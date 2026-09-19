export const DATA_ROWS = [
  { id: "oi_read", label: "OI Read", sub: "Rising Call OI at a strike often builds resistance there; rising Put OI often builds support. Falling OI on a rally can mean short-covering, not fresh buying.", contrarian: false },
  { id: "fresh_oi", label: "Fresh OI Addition Today (Calls vs Puts)", sub: "Where NEW OI is building today, not just total OI — often a more real-time read than a static PCR.", contrarian: false },
  { id: "pcr", label: "PCR (Put-Call Ratio)", sub: "Readings toward the extremes matter more than the middle — very high is often read as oversold, very low as overbought.", contrarian: false },
  { id: "fii_options", label: "FII — Options Data", sub: "FII net positioning in options, often considered the more informed side of participant data.", contrarian: false },
  { id: "pro_options", label: "Pro — Options Data", sub: "Proprietary desk positioning in options — another smart-money proxy alongside FII.", contrarian: false },
  { id: "client_options", label: "Client — Options Data", sub: "Retail and client positioning — historically the side most often wrong at extremes.", contrarian: true },
  { id: "fii_futures", label: "FII — Index Futures", sub: "Net FII long/short buildup in index futures — a classic institutional directional tell.", contrarian: false },
  { id: "fii_cash", label: "FII — Cash Market", sub: "Net FII buying or selling in the cash market, separate from their futures positioning.", contrarian: false },
  { id: "global_cues_read", label: "Global Cues / GIFT Nifty Indication", sub: "How GIFT Nifty, the US close, and Asian markets are pointing coming into or during today's session.", contrarian: false },
  { id: "breadth", label: "Market Breadth (Advances vs Declines)", sub: "More advances than declines means broader participation and a healthier move. A narrow, breadth-poor rally is more fragile.", contrarian: false },
  { id: "vix_trend", label: "VIX Trend Today", sub: "Rising VIX intraday often accompanies a nervous, falling market; falling VIX often accompanies a calm or rising one.", contrarian: false },
];
export const RADIO_OPTIONS = [
  { value: -2, label: "Bearish" }, { value: -1, label: "Sl. Bearish" }, { value: 0, label: "Neutral" },
  { value: 1, label: "Sl. Bullish" }, { value: 2, label: "Bullish" },
];
export function dataReadLabel(val) {
  if (val === undefined || val === null) return "—";
  const opt = RADIO_OPTIONS.find((o) => o.value === val);
  return opt ? opt.label : "—";
}
export function getVerdict(avg) {
  if (avg === null || avg === undefined) return { label: "No reads entered yet", color: "zinc" };
  if (avg >= 1.2) return { label: "Bullish", color: "emerald" };
  if (avg >= 0.4) return { label: "Slightly Bullish", color: "emerald" };
  if (avg > -0.4) return { label: "Neutral / Mixed", color: "zinc" };
  if (avg > -1.2) return { label: "Slightly Bearish", color: "rose" };
  return { label: "Bearish", color: "rose" };
}
