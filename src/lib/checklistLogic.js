import {
  IconTrendingUp, IconClock, IconActivity, IconTarget, IconCalculator, IconShield, IconBook, IconStack2,
} from "@tabler/icons-react";

/* ============== Strategies ============== */
export const DEFAULT_STRATEGIES = [
  { id: "long_call", label: "Long Call", profile: "long_premium", category: "bullish" },
  { id: "short_put", label: "Short Put (Cash-Secured / Naked)", profile: "short_premium_undefined", category: "bullish" },
  { id: "bull_call_spread", label: "Bull Call Spread (Debit)", profile: "long_premium", category: "bullish" },
  { id: "bull_put_spread", label: "Bull Put Spread (Credit)", profile: "short_premium_defined", category: "bullish" },
  { id: "call_ratio_spread", label: "Call Ratio Spread (Front Ratio)", profile: "jade_lizard_like", category: "bullish" },
  { id: "jade_lizard", label: "Jade Lizard", profile: "jade_lizard_like", category: "bullish" },
  { id: "covered_call", label: "Covered Call (Long Stock/ETF + Short Call)", profile: "hedged_equity", category: "bullish" },
  { id: "protective_put", label: "Protective Put (Long Stock/ETF + Long Put)", profile: "hedged_equity", category: "bullish" },
  { id: "long_futures", label: "Long Futures", profile: "linear_futures", category: "bullish" },
  { id: "synthetic_long", label: "Synthetic Long (Buy Call + Sell Put, same strike)", profile: "linear_futures", category: "bullish" },

  { id: "long_put", label: "Long Put", profile: "long_premium", category: "bearish" },
  { id: "short_call", label: "Short Call (Naked)", profile: "short_premium_undefined", category: "bearish" },
  { id: "bear_put_spread", label: "Bear Put Spread (Debit)", profile: "long_premium", category: "bearish" },
  { id: "bear_call_spread", label: "Bear Call Spread (Credit)", profile: "short_premium_defined", category: "bearish" },
  { id: "put_ratio_spread", label: "Put Ratio Spread (Front Ratio)", profile: "jade_lizard_like", category: "bearish" },
  { id: "reverse_jade_lizard", label: "Reverse Jade Lizard", profile: "jade_lizard_like", category: "bearish" },
  { id: "short_futures", label: "Short Futures", profile: "linear_futures", category: "bearish" },
  { id: "synthetic_short", label: "Synthetic Short (Sell Call + Buy Put, same strike)", profile: "linear_futures", category: "bearish" },

  { id: "short_straddle", label: "Short Straddle", profile: "short_premium_undefined", category: "neutral" },
  { id: "short_strangle", label: "Short Strangle", profile: "short_premium_undefined", category: "neutral" },
  { id: "iron_condor", label: "Iron Condor", profile: "short_premium_defined", category: "neutral" },
  { id: "iron_butterfly", label: "Iron Butterfly", profile: "short_premium_defined", category: "neutral" },
  { id: "long_call_butterfly", label: "Long Call Butterfly", profile: "long_premium", category: "neutral" },
  { id: "long_put_butterfly", label: "Long Put Butterfly", profile: "long_premium", category: "neutral" },
  { id: "collar", label: "Collar (Long Stock/ETF + Short Call + Long Put)", profile: "hedged_equity", category: "neutral" },

  { id: "long_straddle", label: "Long Straddle", profile: "long_premium", category: "other" },
  { id: "long_strangle", label: "Long Strangle", profile: "long_premium", category: "other" },
  { id: "call_calendar_spread", label: "Call Calendar Spread", profile: "calendar_diagonal", category: "other" },
  { id: "put_calendar_spread", label: "Put Calendar Spread", profile: "calendar_diagonal", category: "other" },
  { id: "diagonal_spread", label: "Diagonal Spread", profile: "calendar_diagonal", category: "other" },
];

export const STRATEGY_CATEGORIES = [
  { id: "bullish", label: "Bullish" },
  { id: "bearish", label: "Bearish" },
  { id: "neutral", label: "Neutral" },
  { id: "other", label: "Other" },
];

export const PROFILE_OPTIONS = [
  { id: "short_premium_undefined", label: "Undefined-risk short premium (naked strangle/straddle style)" },
  { id: "short_premium_defined", label: "Defined-risk short premium (credit spread/condor style)" },
  { id: "long_premium", label: "Long premium / debit (you pay, risk capped at premium)" },
  { id: "jade_lizard_like", label: "Mixed: one side capped, one side naked (jade lizard/ratio style)" },
  { id: "calendar_diagonal", label: "Calendar or diagonal (different expiries per leg)" },
  { id: "hedged_equity", label: "Hedged equity/ETF (covered call, protective put, collar style)" },
  { id: "linear_futures", label: "Futures / synthetic (linear payoff, no options premium)" },
];

// Infers the closest risk-profile bucket from leg STRUCTURE alone (action +
// type per leg) — no strikes or premiums, since a custom strategy is a
// reusable template, not a specific trade. This can correctly detect: pure
// futures/ETF, hedged equity, fully-naked short (both sides uncapped), mixed
// jade-lizard-style (one side naked, one side spread), and pure long buying.
// It CANNOT reliably tell a debit spread from a credit spread from structure
// alone (e.g. a bull call spread and a bear call spread have identical
// Buy+Sell-same-type shape) — that genuinely depends on the premiums, which
// aren't collected here. Matched short+long-same-type structures default to
// "defined-risk short premium", the more common custom-spread pattern; the
// explanation text in the dialog spells out this limitation plainly.
export function inferStrategyProfile(legRows) {
  const calls = legRows.filter((l) => l.type === "CE");
  const puts = legRows.filter((l) => l.type === "PE");
  const hasLinear = legRows.some((l) => l.type === "FUT" || l.type === "Other");
  const hasOptions = calls.length > 0 || puts.length > 0;

  if (!hasOptions && !hasLinear) return null;
  if (!hasOptions && hasLinear) return "linear_futures";
  if (hasOptions && hasLinear) return "hedged_equity";

  const shortCalls = calls.filter((l) => l.action === "Sell").length;
  const longCalls = calls.filter((l) => l.action === "Buy").length;
  const shortPuts = puts.filter((l) => l.action === "Sell").length;
  const longPuts = puts.filter((l) => l.action === "Buy").length;

  const callSideNaked = shortCalls > 0 && shortCalls > longCalls;
  const putSideNaked = shortPuts > 0 && shortPuts > longPuts;
  const callSideCapped = shortCalls > 0 && shortCalls <= longCalls;
  const putSideCapped = shortPuts > 0 && shortPuts <= longPuts;

  const nakedSides = (callSideNaked ? 1 : 0) + (putSideNaked ? 1 : 0);
  const cappedSides = (callSideCapped ? 1 : 0) + (putSideCapped ? 1 : 0);

  if (nakedSides >= 1 && cappedSides >= 1) return "jade_lizard_like";
  if (nakedSides >= 1) return "short_premium_undefined";
  if (shortCalls + shortPuts > 0) return "short_premium_defined";
  return "long_premium";
}

// Plain-English explanation shown in the dialog — describes the actual
// structural reasoning rather than just echoing the profile bucket's label,
// since the bucket alone can't capture the debit/credit ambiguity noted above.
export function describeInferredProfile(legRows) {
  const calls = legRows.filter((l) => l.type === "CE");
  const puts = legRows.filter((l) => l.type === "PE");
  const hasLinear = legRows.some((l) => l.type === "FUT" || l.type === "Other");
  const hasOptions = calls.length > 0 || puts.length > 0;

  if (!hasOptions && !hasLinear) return "Add at least one leg to see this.";
  if (!hasOptions && hasLinear) return "Pure futures/ETF position — theoretically unlimited profit and loss on the naked side(s), same as any leveraged linear instrument.";
  if (hasOptions && hasLinear) return "Options combined with a futures/stock/ETF leg — reads as a hedged equity structure (covered call / protective put / collar style).";

  const shortCalls = calls.filter((l) => l.action === "Sell").length;
  const longCalls = calls.filter((l) => l.action === "Buy").length;
  const shortPuts = puts.filter((l) => l.action === "Sell").length;
  const longPuts = puts.filter((l) => l.action === "Buy").length;
  const callSideNaked = shortCalls > 0 && shortCalls > longCalls;
  const putSideNaked = shortPuts > 0 && shortPuts > longPuts;
  const callSideMatched = shortCalls > 0 && longCalls > 0;
  const putSideMatched = shortPuts > 0 && longPuts > 0;

  if (callSideNaked && putSideNaked) return "Naked short exposure on both the Call and Put side — undefined risk, like a short straddle/strangle.";
  if (callSideNaked && putSideMatched) return "Call side is naked (undefined risk above), Put side is a matched spread (capped) — mixed structure, like a reverse jade lizard.";
  if (putSideNaked && callSideMatched) return "Put side is naked (undefined risk below), Call side is a matched spread (capped) — mixed structure, like a jade lizard.";
  if (callSideNaked) return longCalls > 0
    ? "More short calls than long calls — the extra short call(s) are naked, undefined risk to the upside beyond the matched portion (ratio-spread style)."
    : "Naked short call, no offsetting long call — undefined risk to the upside.";
  if (putSideNaked) return longPuts > 0
    ? "More short puts than long puts — the extra short put(s) are naked, undefined risk to the downside beyond the matched portion (ratio-spread style)."
    : "Naked short put, no offsetting long put — undefined risk to the downside.";
  if (callSideMatched || putSideMatched) return "Every short leg has an offsetting long leg of the same type — defined risk both ways. (Whether it's a net credit or debit depends on the premiums you enter per trade — can't tell that from the legs alone.)";
  return "Only long (bought) legs — risk is capped at whatever premium you pay, upside depends on the leg types.";
}

export const LEG_TEMPLATES = {
  long_call: [{ name: "Call", action: "Buy", type: "CE" }],
  long_put: [{ name: "Put", action: "Buy", type: "PE" }],
  bull_call_spread: [
    { name: "Long Call (lower strike)", action: "Buy", type: "CE" },
    { name: "Short Call (higher strike)", action: "Sell", type: "CE" },
  ],
  bear_put_spread: [
    { name: "Long Put (higher strike)", action: "Buy", type: "PE" },
    { name: "Short Put (lower strike)", action: "Sell", type: "PE" },
  ],
  bull_put_spread: [
    { name: "Short Put (higher strike)", action: "Sell", type: "PE" },
    { name: "Long Put (lower strike, hedge)", action: "Buy", type: "PE" },
  ],
  bear_call_spread: [
    { name: "Short Call (lower strike)", action: "Sell", type: "CE" },
    { name: "Long Call (higher strike, hedge)", action: "Buy", type: "CE" },
  ],
  long_straddle: [
    { name: "Call (ATM)", action: "Buy", type: "CE" },
    { name: "Put (ATM)", action: "Buy", type: "PE" },
  ],
  short_straddle: [
    { name: "Call (ATM)", action: "Sell", type: "CE" },
    { name: "Put (ATM)", action: "Sell", type: "PE" },
  ],
  long_strangle: [
    { name: "Call (OTM)", action: "Buy", type: "CE" },
    { name: "Put (OTM)", action: "Buy", type: "PE" },
  ],
  short_strangle: [
    { name: "Call (OTM)", action: "Sell", type: "CE" },
    { name: "Put (OTM)", action: "Sell", type: "PE" },
  ],
  iron_condor: [
    { name: "Short Put", action: "Sell", type: "PE" },
    { name: "Long Put (hedge)", action: "Buy", type: "PE" },
    { name: "Short Call", action: "Sell", type: "CE" },
    { name: "Long Call (hedge)", action: "Buy", type: "CE" },
  ],
  iron_butterfly: [
    { name: "Short Put (ATM)", action: "Sell", type: "PE" },
    { name: "Long Put (hedge)", action: "Buy", type: "PE" },
    { name: "Short Call (ATM)", action: "Sell", type: "CE" },
    { name: "Long Call (hedge)", action: "Buy", type: "CE" },
  ],
  long_call_butterfly: [
    { name: "Long Call (lower)", action: "Buy", type: "CE" },
    { name: "Short Calls x2 (middle)", action: "Sell", type: "CE" },
    { name: "Long Call (upper)", action: "Buy", type: "CE" },
  ],
  long_put_butterfly: [
    { name: "Long Put (upper)", action: "Buy", type: "PE" },
    { name: "Short Puts x2 (middle)", action: "Sell", type: "PE" },
    { name: "Long Put (lower)", action: "Buy", type: "PE" },
  ],
  call_ratio_spread: [
    { name: "Long Call (lower strike)", action: "Buy", type: "CE" },
    { name: "Short Calls x2 (higher strike)", action: "Sell", type: "CE" },
  ],
  put_ratio_spread: [
    { name: "Long Put (higher strike)", action: "Buy", type: "PE" },
    { name: "Short Puts x2 (lower strike)", action: "Sell", type: "PE" },
  ],
  call_calendar_spread: [
    { name: "Short Call (near expiry)", action: "Sell", type: "CE" },
    { name: "Long Call (far expiry)", action: "Buy", type: "CE" },
  ],
  put_calendar_spread: [
    { name: "Short Put (near expiry)", action: "Sell", type: "PE" },
    { name: "Long Put (far expiry)", action: "Buy", type: "PE" },
  ],
  diagonal_spread: [
    { name: "Short Leg (near expiry)", action: "Sell", type: "CE" },
    { name: "Long Leg (far expiry, different strike)", action: "Buy", type: "CE" },
  ],
  jade_lizard: [
    { name: "Short Put (naked)", action: "Sell", type: "PE" },
    { name: "Short Call", action: "Sell", type: "CE" },
    { name: "Long Call (hedge)", action: "Buy", type: "CE" },
  ],
  reverse_jade_lizard: [
    { name: "Short Call (naked)", action: "Sell", type: "CE" },
    { name: "Short Put", action: "Sell", type: "PE" },
    { name: "Long Put (hedge)", action: "Buy", type: "PE" },
  ],
  short_call: [{ name: "Short Call (naked)", action: "Sell", type: "CE" }],
  short_put: [{ name: "Short Put (cash-secured / naked)", action: "Sell", type: "PE" }],
  covered_call: [
    { name: "Long Stock/ETF", action: "Buy", type: "Other" },
    { name: "Short Call", action: "Sell", type: "CE" },
  ],
  protective_put: [
    { name: "Long Stock/ETF", action: "Buy", type: "Other" },
    { name: "Long Put (hedge)", action: "Buy", type: "PE" },
  ],
  collar: [
    { name: "Long Stock/ETF", action: "Buy", type: "Other" },
    { name: "Short Call", action: "Sell", type: "CE" },
    { name: "Long Put (hedge)", action: "Buy", type: "PE" },
  ],
  long_futures: [{ name: "Long Futures", action: "Buy", type: "FUT" }],
  short_futures: [{ name: "Short Futures", action: "Sell", type: "FUT" }],
  synthetic_long: [
    { name: "Long Call (ATM)", action: "Buy", type: "CE" },
    { name: "Short Put (ATM)", action: "Sell", type: "PE" },
  ],
  synthetic_short: [
    { name: "Short Call (ATM)", action: "Sell", type: "CE" },
    { name: "Long Put (ATM)", action: "Buy", type: "PE" },
  ],
};

export function slugify(name) {
  const s = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return s || "custom_strategy";
}
export function makeUniqueId(base, existingIds) {
  let id = base, i = 2;
  while (existingIds.indexOf(id) !== -1) { id = base + "_" + i; i++; }
  return id;
}

/* ============== Checklist content ============== */
const deltaSub = (p) => {
  if (p === "long_premium") return "No fixed number here — higher delta (closer strikes) costs more but needs a smaller move; farther OTM is cheaper but needs a bigger move. Match it to conviction and time horizon.";
  if (p === "jade_lizard_like") return "The naked/uncapped leg matters most: keep it around 10–20 delta, same as a naked short position. The capped side matters less once its hedge test passes.";
  if (p === "calendar_diagonal") return "Often ATM or near-ATM on both legs for a horizontal calendar. For a diagonal, the strike gap and the IV term structure (back vs front month) matter more than raw delta.";
  return "10–20 delta per short leg is the common target. Delta already adjusts for IV — trust it over eyeballing point-distance from spot.";
};
const ivSub = (p) => {
  if (p === "long_premium") return "As a buyer, this should be LOW — cheap premium is the goal. High IV works against a long premium position.";
  if (p === "calendar_diagonal") return "IV term structure matters as much as the flat percentile — look for front-month IV relatively rich versus the back month.";
  return "Sell only when this is roughly 50–60+. In the 40s or below, ratios stay thin no matter how strikes or widths are picked — patience beats forcing it.";
};
const slLevelSub = (p) => {
  switch (p) {
    case "short_premium_undefined": return "1.5x–2x the premium collected. A tighter stop, like 50%, sounds safer but usually just means getting chopped up by normal noise.";
    case "jade_lizard_like": return "Uncapped leg: 1.5x–2x premium collected on that leg, same as a naked short position. The capped side is usually free once its hedge test is met.";
    case "short_premium_defined": return "50–60% of the MAX POSSIBLE LOSS (width minus credit) — not of the premium collected. Gives the trade room to breathe.";
    case "long_premium": return "30–40% of premium PAID, plus a time stop — exit if the thesis hasn't played out in the expected window, even at a small percent loss.";
    case "calendar_diagonal": return "Decide the front-month roll-or-close trigger in advance. Simple proxy: exit if the spread's value drops toward 50–70% of the net debit paid.";
    default: return "";
  }
};

export const DEFAULT_SECTION_DEFS = [
  { id: "context", num: "01", title: "Market Context", icon: IconTrendingUp, color: "sky", items: [
    { id: "vix_range", critical: false, applies: "all", label: "India VIX checked against its own 6–12 month range", sub: "Low VIX means genuinely cheap premium market-wide. The fastest first read, before anything else." },
    { id: "oi_pcr", critical: false, applies: "all", label: "Option chain OI checked — Call OI vs Put OI, and PCR", sub: "Heavy OI at a strike often acts as a wall. PCR gives a rough sentiment read at the extremes." },
    { id: "max_pain", critical: false, applies: "all", label: "Max Pain level noted, and distance from current price", sub: "Not gospel, but price sometimes gravitates toward it into expiry — worth knowing, not worth trading blindly on." },
    { id: "sr_levels", critical: false, applies: "all", label: "Key support/resistance or pivot levels identified", sub: "This is an entry filter and soft stop-loss signal — not the primary exit tool on gamma-heavy days." },
    { id: "trend_structure", critical: false, applies: "all", label: "Underlying assessed as range-bound or trending", sub: "Range-bound favors premium selling; a trending market stacks the odds against it before entry." },
    { id: "directional_journal", critical: false, applies: "all", label: "Directional view and confidence written down BEFORE opening the chain", sub: "The only way to find out later if the read has a real edge, or is closer to a coin-flip." },
  ]},
  { id: "events", num: "02", title: "Event & Calendar Risk", icon: IconClock, color: "amber", items: [
    { id: "event_calendar", critical: true, applies: "all", label: "Checked for RBI policy, Budget, Fed, GST or election dates inside the holding window", sub: "One of the most common causes of large, avoidable losses for premium sellers. Reduce size or skip new entries around known events." },
    { id: "earnings_check", critical: false, applies: "all", label: "Checked major index-constituent earnings this week", sub: "A single heavyweight stock's surprise result can move BANKNIFTY or NIFTY disproportionately." },
    { id: "expiry_day_check", critical: true, applies: "all", label: "Confirmed whether today is expiry day — and adjusted size or approach if so", sub: "Gamma is structurally at its maximum here — small moves can cause outsized swings in premium." },
    { id: "gap_risk", critical: true, applies: "all", label: "Checked for events in the next 12–24 hrs if holding overnight — reduced size or planned an exit before close", sub: "A resting stop-loss can't protect against a gap-down open. This is the one risk a stop order genuinely can't fix." },
  ]},
  { id: "vol", num: "03", title: "Volatility & Pricing", icon: IconActivity, color: "fuchsia", items: [
    { id: "iv_percentile", critical: false, applies: "all", label: "IV Percentile / Rank checked on Sensibull", sub: ivSub },
    { id: "iv_vs_hv", critical: false, applies: "all", label: "Current IV compared to recent Historical / Realized Volatility", sub: "IV running above HV means premium is relatively rich — the market is pricing in more movement than has actually been happening." },
    { id: "skew", critical: false, applies: "all", label: "Put-side vs call-side skew noted as normal index pricing", sub: "Index puts usually carry richer IV than calls at equal deltas — that's hedging demand, not a red flag on its own." },
  ]},
  { id: "entry", num: "04", title: "Entry Selection", icon: IconTarget, color: "teal", items: [
    { id: "delta_selection", critical: false, applies: "all", label: "Strikes chosen using the platform's Delta directly", sub: deltaSub },
    { id: "futures_basis", critical: false, applies: "all", label: "Remembered options price off the FUTURES price, not spot", sub: "Trust the chain's delta over manual spot-distance math — futures basis can quietly shift the real strike distance." },
    { id: "credit_width", critical: false, applies: ["short_premium_defined"], label: "Credit-to-width ratio checked on EACH side independently", sub: "Target 20–33%+. A condor is only as good as its weaker side." },
    { id: "jade_no_upside", critical: false, applies: ["jade_lizard", "reverse_jade_lizard"], appliesBy: "id", label: "Confirmed total credit is at least the hedge spread width (no-upside-risk test)", sub: "This is the entire reason to trade a jade lizard over a plain strangle — if it fails, some risk on that side still exists." },
    { id: "premium_margin", critical: false, applies: ["short_premium_undefined", "jade_lizard_like"], label: "Premium-to-margin ratio checked for the undefined-risk leg", sub: "Rough guideline: 3–5%+ of margin blocked. There's no width here, so this is the compensation check instead." },
    { id: "liquidity", critical: false, applies: "all", label: "Strike liquidity checked — healthy OI, tight bid-ask spread", sub: "A wide spread means a stop-loss order can fill far worse than planned — most dangerous exactly when gamma is already high." },
  ]},
  { id: "sizing", num: "05", title: "Risk Sizing", icon: IconCalculator, color: "orange", items: [
    { id: "position_sizing", critical: true, applies: "all", label: "This trade's max loss is within 1–3% of total capital", sub: "Use the calculator above — the single check most likely to catch an oversized trade before it happens." },
    { id: "margin_concentration", critical: true, applies: "all", label: "Margin required isn't eating an oversized share of total capital", sub: "Even with enough funds, one trade consuming 50%+ of the account concentrates risk far beyond the stop-loss itself." },
    { id: "margin_buffer", critical: false, applies: "all", label: "Genuine free margin remains after this trade, not just enough to place it", sub: "A buffer protects against a forced square-off during adverse moves, before a stop can even trigger." },
  ]},
  { id: "stoploss", num: "06", title: "Stop-Loss Plan", icon: IconShield, color: "rose", items: [
    { id: "sl_type", critical: true, applies: "all", label: "SL type chosen — underlying-level, premium-based, or combination — for today's scenario", sub: "Quiet and far from expiry: level-based is fine. Expiry day, events, or sudden news: premium-based hard stop, no exceptions." },
    { id: "sl_level", critical: true, applies: "all", label: "Stop-loss amount set using the right base for this strategy", sub: slLevelSub },
    { id: "sl_vs_noise", critical: false, applies: "all", label: "Stop confirmed wider than the position's normal daily fluctuation", sub: "Check the option's recent daily range, or scale the underlying's ATR by delta. A stop tighter than normal noise just guarantees getting chopped up." },
    { id: "sl_order_placed", critical: true, applies: "all", label: "Stop-loss placed as an actual GTT/SL order at entry — not a mental number", sub: "This is what removes the live, in-the-moment decision where panic and hope take over." },
    { id: "sl_buffer", critical: false, applies: "all", label: "If using a level-based stop, added a buffer beyond the obvious level", sub: "Stops sitting exactly at an obvious level get caught by ordinary wicks other traders' stops cluster at too." },
  ]},
  { id: "final", num: "07", title: "Before You Click Trade", icon: IconBook, color: "emerald", items: [
    { id: "final_commit", critical: true, applies: "all", label: "Re-confirmed the max loss number — will exit there, no exceptions, no live renegotiation", sub: "Live, in-the-moment adjustment under stress is how disciplined stop-losses get abandoned — decide the exit before entering, not during the trade." },
    { id: "calendar_roll_check", critical: false, applies: ["calendar_diagonal"], label: "Decided in advance: roll the front leg or close the whole spread at front-month expiry", sub: "This decision belongs in the trade plan, not in a panic on expiry morning." },
    { id: "mindset_reminder", critical: false, applies: "all", label: "Reminder: market read is the ENTRY filter, not the exit tool", sub: "VIX, OI, S/R and FII/DII inform whether and how to enter. The stop-loss order does the exit job from here." },
  ]},
];

export const CHECKLIST_PROFILE_OPTIONS = [
  { id: "long_premium", label: "Long Premium (buying options)" },
  { id: "short_premium_defined", label: "Short Premium — Defined Risk (spreads, condors)" },
  { id: "short_premium_undefined", label: "Short Premium — Undefined Risk (naked/straddle/strangle)" },
  { id: "jade_lizard_like", label: "Jade Lizard-like (ratio spreads)" },
  { id: "calendar_diagonal", label: "Calendar / Diagonal" },
];

export function freshChecklistItemId(existingIds) {
  let n = 1;
  let id = "custom_item_" + n;
  while (existingIds.includes(id)) { n += 1; id = "custom_item_" + n; }
  return id;
}

export const CUSTOM_SECTION_COLORS = ["sky", "amber", "fuchsia", "teal", "orange", "rose", "emerald", "violet"];

// Merges the user's saved customizations (edits, deletions, additions, and
// custom sections) on top of the built-in checklist, without ever mutating
// DEFAULT_SECTION_DEFS itself.
export function buildEffectiveSections(overrides) {
  const itemOverrides = (overrides && overrides.itemOverrides) || {};
  const deletedItemIds = (overrides && overrides.deletedItemIds) || [];
  const customItems = (overrides && overrides.customItems) || {};
  const customSections = (overrides && overrides.customSections) || [];
  const sectionTitleOverrides = (overrides && overrides.sectionTitleOverrides) || {};
  const base = DEFAULT_SECTION_DEFS.map((s) => {
    const baseItems = s.items
      .filter((i) => !deletedItemIds.includes(i.id))
      .map((i) => (itemOverrides[i.id] ? { ...i, ...itemOverrides[i.id] } : i));
    const extra = customItems[s.id] || [];
    return { ...s, title: sectionTitleOverrides[s.id] || s.title, items: [...baseItems, ...extra] };
  });
  const extraSections = customSections.map((cs, idx) => ({
    id: cs.id,
    num: String(DEFAULT_SECTION_DEFS.length + idx + 1).padStart(2, "0"),
    title: cs.title,
    icon: IconStack2,
    color: CUSTOM_SECTION_COLORS[idx % CUSTOM_SECTION_COLORS.length],
    items: customItems[cs.id] || [],
  }));
  return [...base, ...extraSections];
}
