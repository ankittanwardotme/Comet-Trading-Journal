import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../../lib/format.js";
import { getPortalTarget } from "../../../lib/portal.js";
import {
  isStrategyHedgeEligible, findMatchingActiveLeg, closeLotsFIFO, computeStrategyPayoff, computeClosedLegsPL,
  isLegComplete, detectStrategyShape, resolveDetectedStrategyLabel,
} from "../../../lib/dateUtils.js";
import { freshLegId } from "../../../lib/exportEngine.js";
import { LegsCard } from "../../../components/shared/LegsCard.jsx";
import { LegsTimelineModal } from "../../../components/shared/LegsTimelineModal.jsx";

export function LegsEditDialog({ initialUnderlying, initialLegs, onSave, onClose, holidays, referenceDate, lockOriginalLegs, committedLegIds, strategyLabel, allStrategies }) {
  const [underlying, setUnderlying] = useState(initialUnderlying || "");
  const [legs, setLegs] = useState(() => {
    const base = initialLegs && initialLegs.length > 0 ? initialLegs : [];
    // Only legs that were truly already committed to the database get
    // locked to closing-only (no editing structure/strike/etc). A leg
    // added and staged (via a previous "Done" click) but not yet saved by
    // the row's own Save button was never actually real yet, so it stays
    // fully editable — otherwise correcting a mistake in a not-yet-saved
    // new leg would be impossible.
    const ids = committedLegIds || new Set();
    return lockOriginalLegs ? base.map((l) => ({ ...l, _locked: ids.has(l.id) })) : base;
  });
  const [closingLegId, setClosingLegId] = useState(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const hedgeEligible = useMemo(() => isStrategyHedgeEligible(strategyLabel, allStrategies), [strategyLabel, allStrategies]);

  // Lock the page in place while open, matching the same pattern used for
  // the other popovers/dropdowns in this app. No scrollbar-width
  // compensation needed — the global scrollbar-gutter:stable rule already
  // reserves that space permanently, so re-compensating here would
  // double-count it and shift content when the lock engages.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Classifies a leg synchronously, right here — never via a delayed effect,
  // which is what caused the hedge question to flash briefly (and could
  // leave a leg's legKind stuck undefined if edits raced the effect) before
  // a non-hedge-eligible strategy's legs settled into Adjustment. An exact
  // match against another active leg is always Increase Position; on
  // strategies with no genuine unhedged risk, anything else is immediately
  // an Adjustment; only a strategy with real naked exposure leaves it
  // unset so the UI can ask "is this a hedge?".
  const classifyNewLeg = (leg, otherLegs) => {
    const idKeyReady = leg.type === "Other" ? !!leg.strike : !!(leg.action && leg.type && leg.strike && (leg.type === "Other" || leg.expiry));
    if (idKeyReady) {
      const match = findMatchingActiveLeg(leg, otherLegs);
      if (match) return { legKind: "increase-position", legKindAuto: true };
    }
    if (!hedgeEligible) return { legKind: "adjustment", legKindAuto: true };
    return { legKind: undefined, legKindAuto: undefined };
  };

  const addLeg = () => setLegs((prev) => {
    const base = { id: freshLegId(), name: "", action: "Sell", type: "CE", strike: "", premium: "", qty: "", lotSize: "", expiry: "", openedAt: Date.now(), addedViaEdit: !!lockOriginalLegs };
    const classification = lockOriginalLegs ? classifyNewLeg(base, prev) : {};
    return [...prev, { ...base, ...classification }];
  });
  const removeLeg = (id) => setLegs((prev) => prev.filter((l) => l.id !== id));
  const updateLeg = (id, field, value) => setLegs((prev) => prev.map((l) => {
    if (l.id !== id) return l;
    if (l._locked) return l; // locked legs can only change via the dedicated Close action below, never generic field edits
    const next = { ...l, [field]: value };
    if (field === "type" && (value === "FUT" || value === "Other")) next.premium = "";
    if (field === "type" && value === "Other") next.lotSize = "";
    // Changing any of the identifying fields invalidates a prior hedge/
    // adjustment answer or increase-position match — re-decide fresh,
    // synchronously, right here. A roll-replacement's classification is
    // fixed by how it was created (closing the old leg with Roll), not by
    // whatever terms end up on the new leg, so it's exempt from this.
    const reEvaluatable = l.legKindAuto && l.legKind !== "roll-replacement";
    if (reEvaluatable && ["action", "type", "strike", "expiry"].includes(field)) {
      const classification = classifyNewLeg(next, prev);
      next.legKind = classification.legKind;
      next.legKindAuto = classification.legKindAuto;
    }
    return next;
  }));
  const setLegKind = (id, kind) => setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, legKind: kind, action: kind === "hedge" ? "Buy" : l.action } : l)));

  // Closing a leg is a dedicated action, not a generic field edit. FIFO
  // lot-splitting handles both a full close and a partial one uniformly —
  // a "full" close simply requests every lot on the leg. Choosing "Roll"
  // immediately adds a smart-defaulted replacement (same action/type/lot
  // size as what's closing, since a rolled leg keeps the same market role —
  // e.g. a rolled short OTM put stays a short put), leaving strike/premium/
  // expiry blank for the new terms.
  const closeLeg = (leg, closePremium, closeType, lots) => {
    setLegs((prev) => closeLotsFIFO(prev, leg, lots, closePremium, closeType, freshLegId));
    setClosingLegId(null);
    if (closeType === "roll") {
      const baseName = (leg.name && leg.name.trim()) || `${leg.action === "Sell" ? "Short" : "Long"} ${leg.type === "CE" ? "Call" : leg.type === "PE" ? "Put" : leg.type}`;
      setLegs((prev) => [...prev, {
        id: freshLegId(), name: `${baseName} - Rolled`, action: leg.action, type: leg.type, strike: "",
        premium: "", qty: "", lotSize: leg.lotSize || "", expiry: "", openedAt: Date.now(), addedViaEdit: true,
        legKind: "roll-replacement", legKindAuto: true, rolledFromLegId: leg.id,
      }]);
    }
  };

  // Net premium and payoff reflect the CURRENT live position — closed legs
  // already had their outcome realized and settled, so they're excluded
  // here (their P/L is tracked separately via computeClosedLegsPL) rather
  // than double-counted into the position's ongoing exposure.
  const activeLegs = useMemo(() => legs.filter((l) => !l.closedAt), [legs]);
  const [strategyOverride, setStrategyOverride] = useState(null);
  const [dismissedShape, setDismissedShape] = useState(null);
  const detectedShape = useMemo(() => {
    // Shape detection only cares about the structurally relevant fields —
    // not the cosmetic "name" label, which isLegComplete also requires but
    // has no bearing on what strategy this actually is.
    const structurallyReady = (l) => {
      if (!l.strike || !l.qty) return false;
      if (l.type !== "Other" && !l.lotSize) return false;
      if ((l.type === "CE" || l.type === "PE" || l.type === "FUT") && !l.expiry) return false;
      if ((l.type === "CE" || l.type === "PE") && !l.premium) return false;
      return true;
    };
    if (!activeLegs.every(structurallyReady)) return null; // don't suggest off half-entered legs
    const shape = detectStrategyShape(activeLegs);
    return resolveDetectedStrategyLabel(shape, strategyLabel, allStrategies);
  }, [activeLegs, strategyLabel, allStrategies]);
  const showShapeSuggestion = detectedShape && detectedShape !== strategyLabel && detectedShape !== strategyOverride && detectedShape !== dismissedShape;
  const netPremium = useMemo(() => {
    return activeLegs.reduce((sum, leg) => {
      if (leg.type !== "CE" && leg.type !== "PE") return sum;
      const prem = parseFloat(leg.premium) || 0, qty = parseFloat(leg.qty) || 0;
      return sum + (leg.action === "Sell" ? 1 : -1) * prem * qty;
    }, 0);
  }, [activeLegs]);
  const payoffInfo = useMemo(() => computeStrategyPayoff(null, activeLegs), [activeLegs]);
  // A leg counts as complete only once its hedge/adjustment classification
  // is resolved too, for legs where that question actually applies.
  const legsComplete = legs.length > 0 && legs.every((l) => isLegComplete(l) && (!l.addedViaEdit || l._locked || l.closedAt || !!l.legKind));
  const closedLegsPL = useMemo(() => computeClosedLegsPL(legs), [legs]);

  const handleSave = () => {
    if (!legsComplete) return;
    onSave({ underlying, legs, closedLegsPL, strategyOverride });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div
        className="w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-6 space-y-4 tj-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Edit Strategy Legs</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>
        {lockOriginalLegs && (
          <p className="text-xs text-zinc-500 -mt-2">Existing legs are locked — use "Close this leg" to settle one, or add a new leg below if the structure itself needs to change.</p>
        )}
        {showShapeSuggestion && (
          <div className="rounded-lg border border-sky-400/40 bg-zinc-900/60 p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-300">These legs now look like a <span className="font-semibold text-sky-400">{detectedShape}</span>, not a {strategyLabel || "the current strategy"}.</p>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => setStrategyOverride(detectedShape)} className="text-xs tj-primary-bg font-semibold px-3 py-1.5 rounded-lg">Update label</button>
              <button onClick={() => setDismissedShape(detectedShape)} className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5 rounded-lg">Dismiss</button>
            </div>
          </div>
        )}
        {strategyOverride && (
          <p className="text-xs text-sky-400/80 -mt-2">Strategy will be updated to <span className="font-semibold">{strategyOverride}</span> when you save.</p>
        )}
        <LegsCard
          underlying={underlying} onUnderlyingChange={setUnderlying} legs={legs} onAdd={addLeg} onRemove={removeLeg} onUpdate={updateLeg}
          netPremium={netPremium} payoffInfo={payoffInfo} holidays={holidays} referenceDate={referenceDate}
          closingLegId={closingLegId} onStartClose={setClosingLegId} onCancelClose={() => setClosingLegId(null)} onCloseLeg={closeLeg}
          closedLegsPL={closedLegsPL} onSetLegKind={setLegKind} onOpenTimeline={() => setTimelineOpen(true)}
        />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!legsComplete} className="tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
              Done
            </button>
            <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
          </div>
          {!legsComplete && <p className="text-xs text-amber-400">Fill in every field on each leg (including expiry) before saving.</p>}
        </div>
      </div>
      {timelineOpen && <LegsTimelineModal legs={legs} onClose={() => setTimelineOpen(false)} referenceDate={referenceDate} />}
    </div>,
    getPortalTarget()
  );
}
