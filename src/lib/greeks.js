export function bandIndexForDays(days) {
  if (days <= 1) return 0;
  if (days <= 3) return 1;
  if (days <= 7) return 2;
  if (days <= 14) return 3;
  return 4;
}

export const GREEKS_PROFILES = {
  short_premium_undefined: [
    { name: "Expiry Gamma Zone", gamma: 95, theta: 40, vega: 30, bullets: [
      "Gamma is at its structural maximum on expiry day — small moves in the underlying can cause outsized swings in premium.",
      "Avoid fresh naked or cheap premium selling today.",
      "Premium-based hard stops only — a level-based stop reacts too slowly here.",
      "Theta looks juiciest today but is the least reliable protector — a small move can overwhelm days of decay in minutes." ]},
    { name: "Gamma Rising", gamma: 75, theta: 55, vega: 35, bullets: [
      "Gamma is climbing fast on both legs — deltas can shift meaningfully even on moderate moves.",
      "Tighten the stop-loss basis versus a quiet week.",
      "Re-confirm the event calendar for the next 48–72 hrs — a gap here hits harder than it would with more time left." ]},
    { name: "Theta Accelerating", gamma: 50, theta: 70, vega: 45, bullets: [
      "Theta is accelerating and working in favor, but gamma is no longer negligible on either leg.",
      "Re-check IV Percentile — a pop here can still outweigh a few days of decay." ]},
    { name: "Theta Building, Vega Live", gamma: 25, theta: 75, vega: 60, bullets: [
      "Vega still matters — an IV move from any scheduled event in this window can swing the position even if price barely moves.",
      "Theta is present but gradual, not yet the dominant force." ]},
    { name: "Vega-Dominant Zone", gamma: 10, theta: 55, vega: 80, bullets: [
      "Gamma is low — normal daily moves shouldn't cause outsized premium swings.",
      "IV-moving events anywhere in this window are the main thing to track.",
      "A reasonable zone to initiate new premium-selling positions if IV Percentile supports it." ]},
  ],
  short_premium_defined: [
    { name: "Expiry Gamma Zone — Hedge Leg Cushions It", gamma: 70, theta: 45, vega: 25, bullets: [
      "Gamma still rises sharply near expiry, but the long leg caps how far a loss can run, unlike a naked position.",
      "Still avoid initiating fresh spreads today — the cushion reduces damage, it doesn't remove gamma risk.",
      "Premium-based hard stop at 50–60% of max loss, placed as an actual order, not a mental number." ]},
    { name: "Gamma Rising — Width Still Protects You", gamma: 55, theta: 55, vega: 30, bullets: [
      "Deltas shift meaningfully, but max loss stays capped by the spread width.",
      "Re-confirm the event calendar for the next 48–72 hrs — IV can still move the losing side even with a hedge in place." ]},
    { name: "Theta Accelerating", gamma: 35, theta: 70, vega: 40, bullets: [
      "Theta works in favor and gamma stays manageable thanks to the defined structure.",
      "Re-check the credit-to-width ratio is still worth the remaining risk." ]},
    { name: "Theta Building, Vega Live", gamma: 18, theta: 75, vega: 55, bullets: [
      "Vega still relevant, especially if an event falls in this window.",
      "Gamma is low enough that the width is doing most of the protecting." ]},
    { name: "Vega-Dominant Zone", gamma: 8, theta: 55, vega: 75, bullets: [
      "A reasonable zone to initiate new spreads if credit-to-width and IV Percentile both clear the bar.",
      "Gamma is barely a factor this far out." ]},
  ],
  jade_lizard_like: [
    { name: "Expiry Gamma Zone — Uncapped Side Fully Exposed", gamma: 85, theta: 40, vega: 30, bullets: [
      "The capped side is protected, but the naked/uncapped side behaves exactly like an outright short position here.",
      "All the expiry-day gamma danger sits on that uncapped side — treat it like a naked short for stop-loss purposes.",
      "Premium-based hard stop on the uncapped leg, no exceptions." ]},
    { name: "Gamma Rising — Watch the Uncapped Side", gamma: 65, theta: 55, vega: 35, bullets: [
      "Gamma on the uncapped side is climbing; the capped side stays contained by its hedge.",
      "Re-confirm the event calendar — the uncapped side carries the real directional risk." ]},
    { name: "Theta Accelerating", gamma: 45, theta: 70, vega: 45, bullets: [
      "Theta helps across the position, but only the capped side has a hard ceiling on loss." ]},
    { name: "Theta Building, Vega Live", gamma: 22, theta: 75, vega: 58, bullets: [
      "Vega risk lives almost entirely on the uncapped side." ]},
    { name: "Vega-Dominant Zone", gamma: 9, theta: 55, vega: 78, bullets: [
      "A reasonable zone to initiate if IV Percentile supports it.",
      "The uncapped side still needs the same delta and IV discipline as a naked short position." ]},
  ],
  long_premium: [
    { name: "Expiry Gamma Zone — Double-Edged", gamma: 95, theta: 70, vega: 25, bullets: [
      "Gamma is on your side now — a real move can multiply the position's value fast.",
      "But theta is brutal today too — a flat market erases premium by the close.",
      "If the thesis hasn't played out, exit on a time-stop regardless of a small percent loss, not just a price stop." ]},
    { name: "Gamma Rising — Move Needs To Happen Soon", gamma: 75, theta: 65, vega: 30, bullets: [
      "The breakeven move needs to happen in the next couple of sessions or theta starts winning.",
      "Gamma works for you on a real move, against you on a stagnant one." ]},
    { name: "Theta Draining, Gamma Building", gamma: 50, theta: 55, vega: 40, bullets: [
      "Theta decay is now a real daily cost, not background noise.",
      "Still enough time for a move to overcome it, but don't overstay a thesis that isn't confirming." ]},
    { name: "Vega Matters, Theta Gentle", gamma: 25, theta: 35, vega: 60, bullets: [
      "Theta cost is mild this far out.",
      "Vega now matters — a rise, or at least steady IV, helps, even if price moves the right way." ]},
    { name: "Vega-Dominant Zone — Cheap Time, Watch IV", gamma: 10, theta: 20, vega: 80, bullets: [
      "Theta is barely a cost yet.",
      "Buying here is cheaper time-wise, but a fall in IV can hurt even a correct directional call.",
      "Best zone to buy when IV Percentile is LOW, not high — the opposite of the seller's rule." ]},
  ],
  calendar_diagonal: [
    { name: "Front-Month Expiry — Roll or Close Zone", gamma: 80, theta: 75, vega: 30, bullets: [
      "The near-dated short leg is expiring — gamma risk concentrates here, not on the far-month long leg.",
      "Decide today: close the whole spread, or roll the short leg to the next expiry to keep the trade alive.",
      "Max-profit zone is narrow right before front-month expiry — a big move today can push price outside it fast." ]},
    { name: "Gamma Rising on the Front Leg", gamma: 60, theta: 70, vega: 35, bullets: [
      "Front-month gamma is climbing — this is where a calendar's risk actually concentrates.",
      "Confirm the roll-or-close plan for expiry day." ]},
    { name: "Theta Differential Working", gamma: 35, theta: 65, vega: 45, bullets: [
      "This is a calendar's sweet spot — front-month theta outpaces back-month theta.",
      "Price staying near the strike is what helps; a big move either way hurts the spread." ]},
    { name: "Vega Still Meaningful, Theta Building", gamma: 15, theta: 45, vega: 60, bullets: [
      "Unlike short-premium strategies, a RISE in IV generally helps a calendar overall, since it's usually net long vega via the back-month leg.",
      "Front-month theta decay is present but not yet dominant." ]},
    { name: "Early Zone — Vega Dominant", gamma: 6, theta: 20, vega: 80, bullets: [
      "Vega-dominant this early — an IV crush can hurt even with time on your side.",
      "Good zone to evaluate entering if IV is expected to rise or hold into front-month expiry." ]},
  ],
  hedged_equity: [
    { name: "Expiry — Option Leg(s) Only", gamma: 55, theta: 45, vega: 25, bullets: [
      "The stock/ETF leg itself has zero gamma, theta, or vega — all of that risk sits on the option leg(s) alone.",
      "A short call (covered call) can get pinned or assigned near the strike today; a long put's hedge value decays fastest right now.",
      "Re-confirm you're fine with assignment/exercise if it happens before letting this ride into the close." ]},
    { name: "Gamma Rising on the Option Leg", gamma: 45, theta: 55, vega: 30, bullets: [
      "The option leg's delta is moving faster now — recheck how much of the stock's move it's currently offsetting or capping.",
      "Re-confirm the event calendar for the next 48–72 hrs." ]},
    { name: "Theta Building", gamma: 30, theta: 60, vega: 35, bullets: [
      "A short call collects theta in your favor; a long put's theta cost keeps building — factor that into the real cost of the hedge.",
      "The stock/ETF leg is unaffected by time decay either way." ]},
    { name: "Theta Building, Vega Live", gamma: 15, theta: 55, vega: 50, bullets: [
      "Vega matters more for the option leg here — an IV move can shift its value meaningfully even with the stock flat.",
      "This far out, the option leg is doing more of the day-to-day moving than the stock/ETF itself." ]},
    { name: "Vega-Dominant Zone", gamma: 6, theta: 45, vega: 65, bullets: [
      "Gamma is low this far from expiry — the option leg behaves more like a slow-moving hedge or income source than a risk driver.",
      "IV level matters most here — rich IV favors selling a covered call, cheap IV favors buying a protective put." ]},
  ],
};

export const GREEKS_POLARITY = {
  short_premium_undefined: { gamma: "risk", theta: "friend", vega: "risk" },
  short_premium_defined: { gamma: "risk-capped", theta: "friend", vega: "risk-capped" },
  jade_lizard_like: { gamma: "risk-naked", theta: "friend", vega: "risk-naked" },
  long_premium: { gamma: "opportunity", theta: "foe", vega: "opportunity" },
  calendar_diagonal: { gamma: "risk-front", theta: "friend", vega: "opportunity" },
  hedged_equity: { gamma: "risk-capped", theta: "friend", vega: "risk-capped" },
};
export const POLARITY_DISPLAY = {
  risk: ["risk", "text-rose-600"],
  "risk-capped": ["risk (capped)", "text-amber-400"],
  "risk-naked": ["risk (naked side)", "text-amber-400"],
  "risk-front": ["risk (front leg)", "text-amber-400"],
  friend: ["friend", "text-emerald-600"],
  foe: ["foe", "text-rose-600"],
  opportunity: ["opportunity", "text-emerald-600"],
};

// Greeks (Gamma/Theta/Vega) only exist where there's real optionality — a bare
// futures or stock/ETF leg has none. This checks the leg TYPES already present
// (not the strikes, and not just the strategy's nominal profile) so Greeks
// populate the instant a strategy is picked and an expiry date is set — the
// leg types are already known then, via legsFromTemplate, well before strikes
// get filled in. A naked futures trade still correctly shows "no Greeks
// apply", and a synthetic position (built from real option legs) still gets a
// sensible band even though its profile is "linear_futures".
export function getEffectiveGreeksProfile(profile, legs) {
  const hasOptionLegs = (legs || []).some((l) => l.type === "CE" || l.type === "PE");
  if (!hasOptionLegs) return null;
  if (GREEKS_PROFILES[profile]) return profile;
  // Any other profile (including "linear_futures" when it's actually a
  // synthetic built from a naked call + naked put) behaves, Greeks-wise, like
  // an undefined-risk short-premium position — dominated by whichever leg is naked.
  return "short_premium_undefined";
}

export function getGreeksBand(days, effectiveProfile) {
  if (!effectiveProfile) return null;
  const idx = bandIndexForDays(days);
  return GREEKS_PROFILES[effectiveProfile][idx];
}

export const COLOR_CLASSES = {
  sky: { bg: "bg-sky-400/10", text: "text-sky-400" },
  amber: { bg: "bg-amber-400/10", text: "text-amber-400" },
  fuchsia: { bg: "bg-fuchsia-400/10", text: "text-fuchsia-400" },
  teal: { bg: "bg-teal-400/10", text: "text-teal-400" },
  orange: { bg: "bg-orange-400/10", text: "text-orange-400" },
  rose: { bg: "bg-rose-400/10", text: "text-rose-600" },
  emerald: { bg: "bg-emerald-400/10", text: "text-emerald-600" },
  violet: { bg: "bg-violet-400/10", text: "text-violet-400" },
};
