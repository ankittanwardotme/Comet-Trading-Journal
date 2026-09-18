// Pure date/leg/strategy-math utilities extracted from App.jsx to help
// keep the main file under Babel's code-generation size threshold. These
// have zero dependency on React state or component closures — plain
// functions in, plain values out.

export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const localISODate = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function isWeekendISO(iso) {
  if (!iso) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

// A trade's "effective" expiry is its nearest (front-month) leg expiry — the
// one that actually matters for managing the position, since that's the date
// the trade needs attention by (see calendar/diagonal spreads, where the
// back-month leg expires later but the front-month leg is what forces action).
export function nearestLegExpiry(legs) {
  const dates = (legs || []).map((l) => l.expiry).filter(Boolean).sort();
  return dates.length > 0 ? dates[0] : "";
}

// NSE-style contract date code, e.g. 2026-08-18 -> "18AUG"
export function contractDateCode(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  return pad2(d) + MONTH_ABBR[m - 1].toUpperCase();
}

// e.g. "BUY NIFTY18AUG 25000CE @ 100x1"
export function isLegComplete(leg) {
  if (!leg.name || !leg.name.trim() || !leg.strike || !leg.qty) return false;
  if (leg.type !== "Other" && !leg.lotSize) return false;
  if ((leg.type === "CE" || leg.type === "PE" || leg.type === "FUT") && !leg.expiry) return false;
  if ((leg.type === "CE" || leg.type === "PE") && !leg.premium) return false;
  return true;
}

/* ============== PDF generation helpers ==============
   jsPDF's built-in fonts only support basic Latin — the rupee symbol (₹)
   and other characters used throughout this app render as garbage without
   a custom font. DejaVu Sans (subsetted to just the ~20 characters this
   app actually needs, ~35KB total) is embedded and dynamically imported
   so it's code-split rather than bundled into the main app. */
// Draws the shared "logo + app name" masthead centered at the top of a page,
// with the logo and bold display-font name on the same line. Returns the y
// position just below the masthead so callers know where to continue.
export function drawPdfMasthead(doc, logoB64, logoAspect, pageWidth) {
  const logoHeight = 12;
  const logoWidth = logoHeight * logoAspect;
  const text = "Comet Trading Journal";
  doc.setFont("JostSemiBold", "bold");
  doc.setFontSize(17);
  const textWidth = doc.getTextWidth(text);
  const gap = 3.5;
  const totalWidth = logoWidth + gap + textWidth;
  const startX = (pageWidth - totalWidth) / 2;
  const centerY = 15;
  doc.addImage(`data:image/png;base64,${logoB64}`, "PNG", startX, centerY - logoHeight / 2, logoWidth, logoHeight);
  doc.setTextColor(24, 24, 27);
  doc.text(text, startX + logoWidth + gap, centerY + 2.2);
  doc.setFont("DejaVuSans", "normal");
  return centerY + logoHeight / 2 + 12;
}

export function formatLegLine(leg, underlying) {
  const action = (leg.action || "").toUpperCase();
  const u = underlying || "";
  if (leg.type === "CE" || leg.type === "PE") {
    const code = leg.expiry ? contractDateCode(leg.expiry) : "";
    return `${action} ${u}${code} ${leg.strike || "—"}${leg.type} @ ${leg.premium || "—"}x${leg.qty || "—"}`;
  }
  if (leg.type === "FUT") {
    const code = leg.expiry ? contractDateCode(leg.expiry) : "";
    return `${action} ${u}${code} FUT @ ${leg.strike || "—"}x${leg.qty || "—"}`;
  }
  return `${action} ${u || leg.name || "Other"} @ ${leg.strike || "—"}x${leg.qty || "—"}`;
}
// Strategies whose payoff profile still carries genuine unhedged risk —
// these are the only ones where "is this leg a hedge?" is a meaningful
// question. Profiles with built-in protective legs (spreads, iron condors),
// pure long-premium positions (nothing to hedge against), or equity-hedge
// strategies (already hedged at the stock level) skip the question
// entirely and any added leg is just an Adjustment.
const HEDGE_ELIGIBLE_PROFILES = new Set(["short_premium_undefined", "jade_lizard_like", "linear_futures"]);
export function isStrategyHedgeEligible(strategyLabel, allStrategies) {
  const strat = (allStrategies || []).find((s) => s.label === strategyLabel);
  return !!(strat && HEDGE_ELIGIBLE_PROFILES.has(strat.profile));
}

// Two legs are "the same position" for grouping/FIFO purposes if they
// share strike, option type, action, and expiry — the only thing that can
// differ between batches is when they were opened and at what premium.
export function legsMatchForGrouping(a, b) {
  return a.type === b.type && a.action === b.action && String(a.strike) === String(b.strike) && (a.expiry || "") === (b.expiry || "");
}
export function findMatchingActiveLeg(newLeg, existingLegs) {
  return (existingLegs || []).find((l) => l.id !== newLeg.id && !l.closedAt && legsMatchForGrouping(l, newLeg));
}
// Groups a leg list into position batches (same strike/type/action/expiry),
// each batch carrying its member legs sorted oldest-first — the basis for
// both the combined "x2 (avg 140.00)" table display and FIFO closing.
export function groupLegsByPosition(legs) {
  const groups = [];
  (legs || []).forEach((l) => {
    let g = groups.find((g) => legsMatchForGrouping(g.legs[0], l));
    if (!g) { g = { key: `${l.type}-${l.action}-${l.strike}-${l.expiry}`, legs: [] }; groups.push(g); }
    g.legs.push(l);
  });
  groups.forEach((g) => g.legs.sort((a, b) => (a.openedAt || 0) - (b.openedAt || 0)));
  return groups;
}

// Closes `lotsToClose` lots out of a same-position batch, oldest-first
// (FIFO). Returns the updated leg array: fully-consumed batches become
// closed records for their whole quantity; a batch only partially consumed
// splits into a closed portion (for the lots taken) and a new active leg
// for what's left, preserving that remaining portion's own original
// openedAt/premium (its real cost basis, not blended with anything else).
export function closeLotsFIFO(allLegs, matchLeg, lotsToClose, closePremium, closeType, freshId) {
  const group = (allLegs || []).filter((l) => !l.closedAt && legsMatchForGrouping(l, matchLeg)).sort((a, b) => (a.openedAt || 0) - (b.openedAt || 0));
  let remaining = lotsToClose;
  const now = Date.now();
  const updates = new Map(); // id -> updated leg (replaces in place)
  const newRemainders = []; // genuinely new legs, appended at the end
  for (const batch of group) {
    if (remaining <= 0) break;
    const batchQty = parseFloat(batch.qty) || 0;
    if (remaining >= batchQty) {
      // Whole batch consumed — becomes a closed record for all of it, in place.
      updates.set(batch.id, { ...batch, closedAt: now, closePremium, closeType });
      remaining -= batchQty;
    } else {
      // Partially consumed — the closed portion stays in the original
      // leg's spot; only the new remainder leg is genuinely new and goes
      // at the end, the rest keeping its original openedAt/premium (same
      // cost basis).
      updates.set(batch.id, { ...batch, qty: String(remaining), closedAt: now, closePremium, closeType });
      newRemainders.push({ ...batch, id: freshId(), qty: String(batchQty - remaining), partialCloseOfLegId: batch.id });
      remaining = 0;
    }
  }
  const inPlace = (allLegs || []).map((l) => updates.get(l.id) || l);
  return [...inPlace, ...newRemainders];
}

// Classifies a leg for the small status symbol shown next to it. Driven
// entirely by explicit, stored data (closeType and legKind, both set at
// the moment the user actually made the choice) rather than inferred from
// timing — reliable regardless of how quickly or slowly edits happen.
export function classifyLegSymbol(leg) {
  // Rolling is the most significant thing that can happen to a leg, so it
  // takes priority regardless of why the leg existed in the first place.
  if (leg.closedAt && leg.closeType === "roll") return "rolled";
  // A leg's hedge/adjustment origin is a lasting fact about why it was
  // added — it stays the leg's symbol whether or not it's since been
  // closed, rather than being replaced by a generic "closed" marker.
  if (leg.legKind === "hedge") return "hedge";
  if (leg.legKind === "adjustment") return "adjustment";
  if (leg.closedAt) return "partial-close";
  return "open";
}

// Recognizes the most common option-strategy shapes from a trade's current
// active legs, so the app can flag when adding legs has structurally
// changed what the position actually is (e.g. hedging both sides of a
// short strangle turns it into an iron condor) rather than silently
// keeping the original label. Only option (CE/PE) legs are considered —
// futures/stock legs and equity-hedge combinations aren't covered here.
// Returns { canonicalName, profile } or null when the legs don't clearly
// match one of these shapes. The profile is what actually decides whether
// a relabel gets suggested (see resolveDetectedStrategyLabel below) —
// comparing by structural profile rather than exact label text, since a
// catalog's actual name for a shape ("Bull Put Spread (Credit)") often
// isn't the bare canonical name.
export function detectStrategyShape(activeLegs) {
  const opts = (activeLegs || []).filter((l) => l.type === "CE" || l.type === "PE");
  if (opts.length < 1 || opts.length > 4) return null;
  const byTypeAction = { CE: { Sell: [], Buy: [] }, PE: { Sell: [], Buy: [] } };
  for (const l of opts) {
    if (!byTypeAction[l.type] || !byTypeAction[l.type][l.action]) return null; // unexpected shape (multiple legs same type+action, etc.)
    byTypeAction[l.type][l.action].push(l);
  }
  const ceSell = byTypeAction.CE.Sell, ceBuy = byTypeAction.CE.Buy;
  const peSell = byTypeAction.PE.Sell, peBuy = byTypeAction.PE.Buy;
  const counts = [ceSell.length, ceBuy.length, peSell.length, peBuy.length];
  if (counts.some((c) => c > 1)) return null; // more than one leg in some bucket — not a shape this detects

  const strike = (l) => parseFloat(l.strike) || 0;

  // Both sides hedged: 1 short call + 1 long call (further OTM) and
  // 1 short put + 1 long put (further OTM) = Iron Condor (or Iron
  // Butterfly if both shorts sit at the same strike, i.e. started as a
  // straddle).
  if (ceSell.length === 1 && ceBuy.length === 1 && peSell.length === 1 && peBuy.length === 1) {
    if (strike(ceBuy[0]) > strike(ceSell[0]) && strike(peBuy[0]) < strike(peSell[0])) {
      return strike(ceSell[0]) === strike(peSell[0])
        ? { canonicalName: "Iron Butterfly", profile: "short_premium_defined" }
        : { canonicalName: "Iron Condor", profile: "short_premium_defined" };
    }
    return null;
  }
  // One side hedged only: a credit spread.
  if (ceSell.length === 1 && ceBuy.length === 1 && peSell.length === 0 && peBuy.length === 0) {
    return strike(ceBuy[0]) > strike(ceSell[0]) ? { canonicalName: "Bear Call Spread", profile: "short_premium_defined" } : null;
  }
  if (peSell.length === 1 && peBuy.length === 1 && ceSell.length === 0 && ceBuy.length === 0) {
    return strike(peBuy[0]) < strike(peSell[0]) ? { canonicalName: "Bull Put Spread", profile: "short_premium_defined" } : null;
  }
  // Both sides naked, nothing bought: short strangle/straddle.
  if (ceSell.length === 1 && peSell.length === 1 && ceBuy.length === 0 && peBuy.length === 0) {
    return strike(ceSell[0]) === strike(peSell[0])
      ? { canonicalName: "Short Straddle", profile: "short_premium_undefined" }
      : { canonicalName: "Short Strangle", profile: "short_premium_undefined" };
  }
  // A single naked leg.
  if (ceSell.length === 1 && peSell.length === 0 && ceBuy.length === 0 && peBuy.length === 0) return { canonicalName: "Short Call", profile: "short_premium_undefined" };
  if (peSell.length === 1 && ceSell.length === 0 && ceBuy.length === 0 && peBuy.length === 0) return { canonicalName: "Short Put", profile: "short_premium_undefined" };

  return null;
}

// Turns a detected shape into an actual suggestion: null if the current
// strategy's own catalog profile already matches the detected shape (same
// structure, regardless of exact label wording — this is what stops
// "Bull Put Spread (Credit)" from getting suggested as "Bull Put Spread").
// Otherwise resolves to the best real catalog label for that shape
// (matching by canonical name, e.g. "Bull Put Spread" matches "Bull Put
// Spread (Credit)"), falling back to the bare canonical name only if no
// catalog entry exists for it (e.g. a fully custom strategy setup).
export function resolveDetectedStrategyLabel(shape, currentStrategyLabel, allStrategies) {
  if (!shape) return null;
  const current = (allStrategies || []).find((s) => s.label === currentStrategyLabel);
  if (current && current.profile === shape.profile) return null;
  const catalogMatch = (allStrategies || []).find((s) => s.label === shape.canonicalName || s.label.startsWith(shape.canonicalName + " "));
  return catalogMatch ? catalogMatch.label : shape.canonicalName;
}

export function pad2(n) { return String(n).padStart(2, "0"); }
export const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtDateDMY(ts) {
  const d = new Date(ts);
  return pad2(d.getDate()) + " " + MONTH_ABBR[d.getMonth()] + " " + d.getFullYear();
}
export function fmtDateTimeDMY(ts) {
  const d = new Date(ts);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return fmtDateDMY(ts) + ", " + pad2(h) + ":" + pad2(d.getMinutes()) + " " + ampm;
}
export function fmtTimeOnly(ts) {
  const d = new Date(ts);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return pad2(h) + ":" + pad2(d.getMinutes()) + " " + ampm;
}
export function isoToDMY(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}
export function isoToWordDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const mi = parseInt(m, 10) - 1;
  return pad2(parseInt(d, 10)) + " " + (MONTH_ABBR[mi] || m) + " " + y;
}
export function isoToMonDDYYYY(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const mi = parseInt(m, 10) - 1;
  return (MONTH_ABBR[mi] || m) + " " + pad2(parseInt(d, 10)) + ", " + y;
}
export function isoToShortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${MONTH_ABBR[parseInt(m, 10) - 1] || m}`;
}
export function daysUntil(expiryDateStr) {
  if (!expiryDateStr) return null;
  const parts = expiryDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((expiry - todayMid) / 86400000);
}

// Weekly expiries fall on Tuesdays; monthly expiries are the last Tuesday of
// each month. Generates the next 4 weekly Tuesdays plus the monthly (last
// Tuesday) expiry for the next 12 months, deduplicated and sorted, so the leg
// expiry picker offers real, valid expiry dates instead of a raw calendar.
// Holidays are entirely user-maintained (via the Holiday Calendar page) —
// no hardcoded list or external source, so nothing here can go stale.
export function shiftForHoliday(d, holidaySet) {
  const iso = localISODate(d.getTime());
  if (!holidaySet || !holidaySet.has(iso)) return d;
  const shifted = new Date(d);
  shifted.setDate(shifted.getDate() - 1); // shifts to the previous trading day
  return shifted;
}
export function nextWeekdayOnOrAfter(d, targetDow) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (targetDow - day + 7) % 7;
  const out = new Date(d);
  out.setDate(out.getDate() + diff);
  return out;
}
export function lastWeekdayOfMonth(year, monthIndex, targetDow) {
  const lastDay = new Date(year, monthIndex + 1, 0);
  const day = lastDay.getDay();
  const diff = (day - targetDow + 7) % 7;
  lastDay.setDate(lastDay.getDate() - diff);
  return lastDay;
}
// NSE moved weekly/monthly index options expiry from Thursday to Tuesday
// effective this date — expiry generation looks at the trade's own date
// (not today) to decide which rule applied at the time.
export const EXPIRY_DOW_CUTOVER = "2025-09-01";
export function expiryDayOfWeekFor(referenceDate) {
  const iso = localISODate(referenceDate.getTime());
  return iso < EXPIRY_DOW_CUTOVER ? 4 : 2; // 4=Thursday, 2=Tuesday
}
export function generateExpiryOptions(holidays, referenceDate) {
  const holidaySet = new Set((holidays || []).map((h) => h.date));
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  ref.setHours(0, 0, 0, 0);
  const targetDow = expiryDayOfWeekFor(ref);
  const seen = new Set();
  const dates = [];

  let cursor = nextWeekdayOnOrAfter(ref, targetDow);
  for (let i = 0; i < 4; i++) {
    const adjusted = shiftForHoliday(cursor, holidaySet);
    const iso = localISODate(adjusted.getTime());
    if (!seen.has(iso)) { seen.add(iso); dates.push(adjusted.getTime()); }
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  for (let m = 0; m <= 12; m++) {
    const monthDate = new Date(ref.getFullYear(), ref.getMonth() + m, 1);
    const lastDay = shiftForHoliday(lastWeekdayOfMonth(monthDate.getFullYear(), monthDate.getMonth(), targetDow), holidaySet);
    if (lastDay.getTime() < ref.getTime()) continue;
    const iso = localISODate(lastDay.getTime());
    if (!seen.has(iso)) { seen.add(iso); dates.push(lastDay.getTime()); }
  }

  return dates.sort((a, b) => a - b).map((ts) => {
    const iso = localISODate(ts);
    const days = daysUntil(iso);
    return { iso, label: fmtDateDMY(ts).replace(/ \d{4}$/, ""), days };
  });
}
export function monthKeyOf(dateStr) { return (dateStr || "").slice(0, 7); }
export function monthLabel(key) {
  const parts = key.split("-");
  const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
  return (MONTH_NAMES[m - 1] || "") + " " + y;
}
export function legsToParts(legs) {
  const filtered = legs.filter((l) => l.name || l.strike || l.premium);
  const legsDesc = filtered.map((l) => `${l.action} ${l.type}${l.strike ? " " + l.strike : ""}${l.qty ? " x" + l.qty : ""}`).join(", ");
  const premiumDesc = filtered.map((l) => (l.premium ? `${l.premium}` : "—")).join(", ");
  return { legsDesc, premiumDesc };
}

// Real net premium in rupees (sell = credit = positive, buy = debit = negative),
// only counting option legs — futures/stock-ETF legs don't carry a premium.
export function computeNetPremiumSigned(legs) {
  return (legs || []).reduce((sum, l) => {
    if (l.type !== "CE" && l.type !== "PE") return sum;
    const prem = parseFloat(l.premium) || 0, qty = parseFloat(l.qty) || 0, lot = parseFloat(l.lotSize) || 0;
    return sum + (l.action === "Sell" ? 1 : -1) * prem * qty * lot;
  }, 0);
}

// A closed leg's own realized P/L: a Sell leg profits when closing premium
// is lower than opening premium (bought back cheaper than sold); a Buy leg
// profits the opposite way (sold to close for more than it cost to open).
export function computeLegPL(leg) {
  if (leg.closePremium === undefined || leg.closePremium === null || leg.closePremium === "") return null;
  const open = parseFloat(leg.premium) || 0, close = parseFloat(leg.closePremium) || 0;
  const qty = parseFloat(leg.qty) || 0, lot = parseFloat(leg.lotSize) || 0;
  return (leg.action === "Sell" ? 1 : -1) * (open - close) * qty * lot;
}

// Sum of every closed leg's own realized P/L — this is what a roll,
// adjustment, or partial close actually locked in, tracked separately from
// the ongoing live position's unrealized net premium.
export function computeClosedLegsPL(legs) {
  return (legs || []).reduce((sum, l) => {
    const pl = computeLegPL(l);
    return pl === null ? sum : sum + pl;
  }, 0);
}

// Computes exact max profit / max loss at expiry for ANY combination of legs —
// options (CE/PE), futures, or stock/ETF ("Other", using its strike field as
// entry price) — by building the position's true piecewise-linear payoff curve
// and evaluating it at every strike (where the curve can kink) plus price = 0
// (the underlying's real floor), then checking whether the curve is unbounded
// as price rises. This works correctly for spreads, straddles/strangles,
// condors, butterflies, ratio spreads, jade lizards, covered calls, protective
// puts, collars, and any custom combination — no per-strategy-name formulas
// needed. Calendar/diagonal spreads (different expiries per leg) can't be
// represented this way since this data model has no per-leg expiry, so they
// keep an explanatory text fallback.
export function computeStrategyPayoff(profile, legs) {
  if (profile === "calendar_diagonal") {
    const note = "Depends on IV & underlying price at front-month expiry";
    return { maxProfit: { type: "text", value: note }, maxLoss: { type: "text", value: note } };
  }

  const usable = legs.filter((l) => l.strike && (l.type === "CE" || l.type === "PE" || l.type === "FUT" || l.type === "Other"));
  if (usable.length === 0) {
    const note = "Enter strike/entry price to calculate";
    return { maxProfit: { type: "text", value: note }, maxLoss: { type: "text", value: note } };
  }

  const cashFlow = legs.reduce((sum, l) => {
    if (l.type !== "CE" && l.type !== "PE") return sum; // futures/stock-ETF legs don't have a premium
    const prem = parseFloat(l.premium) || 0, qty = parseFloat(l.qty) || 0, lot = parseFloat(l.lotSize) || 0;
    return sum + (l.action === "Sell" ? 1 : -1) * prem * qty * lot;
  }, 0);

  const parsed = usable.map((l) => ({
    sign: l.action === "Buy" ? 1 : -1,
    qtyLot: (parseFloat(l.qty) || 0) * (parseFloat(l.lotSize) || 0),
    strike: parseFloat(l.strike) || 0,
    isCall: l.type === "CE",
    isPut: l.type === "PE",
    isFuture: l.type === "FUT",
    isLinear: l.type === "FUT" || l.type === "Other",
  })).filter((v) => v.qtyLot > 0);

  if (parsed.length === 0) {
    const note = "Enter qty and lot size to calculate";
    return { maxProfit: { type: "text", value: note }, maxLoss: { type: "text", value: note } };
  }

  const payoffAt = (S) => parsed.reduce((total, v) => {
    let intrinsic = 0;
    if (v.isCall) intrinsic = Math.max(S - v.strike, 0);
    else if (v.isPut) intrinsic = Math.max(v.strike - S, 0);
    else intrinsic = S - v.strike; // futures / stock-ETF: linear payoff from entry price
    return total + v.sign * intrinsic * v.qtyLot;
  }, cashFlow);

  const breakpoints = Array.from(new Set(parsed.filter((v) => v.isCall || v.isPut).map((v) => v.strike)));
  const candidates = [0, ...breakpoints];
  const values = candidates.map(payoffAt);

  // Slope of the payoff curve as price -> +infinity (calls and linear legs stay
  // "active" out there; puts flatten to zero slope once deep OTM).
  const rightSlope = parsed.reduce((s, v) => s + (v.isCall || v.isLinear ? v.sign * v.qtyLot : 0), 0);

  // Slope in the region below every strike (puts are still "active" there;
  // calls flatten to zero).
  const leftSlope = parsed.reduce((s, v) => s + (v.isPut ? -v.sign * v.qtyLot : (v.isLinear ? v.sign * v.qtyLot : 0)), 0);

  // A naked (unhedged) put or a futures leg carries the standard "no
  // offsetting leg = Unlimited" convention on its exposed side — the same
  // convention every real options platform uses (a plain long put shows Max
  // Profit as Unlimited, not "strike minus premium", even though that's the
  // technical price=0 ceiling), and the same language this app already uses
  // elsewhere ("undefined-risk short premium"). Plain fully-paid stock/ETF
  // exposure never gets this label on its own — its downside is always the
  // real, finite amount invested, not a leveraged/naked position. A hedged
  // combination (e.g. futures + protective put, or a collar) still nets to a
  // bounded, finite number here, since the offsetting leg zeroes out the
  // slope on that side.
  const hasPutOrFuture = parsed.some((v) => v.isPut || v.isFuture);

  let maxProfit, maxLoss;

  if (rightSlope > 1e-9) {
    maxProfit = { type: "text", value: "Unlimited (theoretical)" };
  } else if (hasPutOrFuture && leftSlope < -1e-9) {
    maxProfit = { type: "text", value: "Unlimited (theoretical)" };
  } else {
    maxProfit = { type: "value", value: Math.max(...values) };
  }

  if (hasPutOrFuture && leftSlope > 1e-9) {
    maxLoss = { type: "text", value: "Unlimited (theoretical)" };
  } else if (rightSlope < -1e-9) {
    maxLoss = { type: "text", value: "Unlimited (theoretical)" };
  } else {
    maxLoss = { type: "value", value: Math.min(...values) };
  }

  return { maxProfit, maxLoss };
}

export function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
