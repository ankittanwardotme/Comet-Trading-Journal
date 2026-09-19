import React, { useState, useEffect } from "react";
import { IconActivity } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { nearestLegExpiry, daysUntil, contractDateCode } from "../../../lib/dateUtils.js";
import { getEffectiveGreeksProfile, GREEKS_POLARITY, getGreeksBand, POLARITY_DISPLAY } from "../../../lib/greeks.js";

const AnimatedBar = React.memo(function AnimatedBar({ val, gradient }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    setDisplay(0);
    const t = setTimeout(() => setDisplay(val), 50);
    return () => clearTimeout(t);
  }, [val]);
  return (
    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${display}%`, background: gradient, transition: "width .8s cubic-bezier(0.16, 1, 0.3, 1)" }}></div>
    </div>
  );
});

export function DaysToExpiryWidget({ profile, strategyLabel, legs, underlying }) {
  const expiryDate = nearestLegExpiry(legs);
  const days = daysUntil(expiryDate);
  const valid = expiryDate !== "" && days !== null && days >= 0;
  const effectiveProfile = getEffectiveGreeksProfile(profile, legs);
  const hasOptionLegs = effectiveProfile !== null;
  const band = valid && hasOptionLegs ? getGreeksBand(days, effectiveProfile) : null;
  const polarity = GREEKS_POLARITY[effectiveProfile] || GREEKS_POLARITY.short_premium_undefined;
  const hasAnyLegExpiry = (legs || []).some((l) => l.expiry);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2" style={FONT_MONO}>
        <IconActivity size={13} /> Greeks Watch — for {strategyLabel}
      </p>
      {hasAnyLegExpiry ? (
        <p className="text-xs text-zinc-500">
          Using the nearest leg's expiry{underlying ? ` (${underlying}${contractDateCode(expiryDate)})` : ""} — {days < 0 ? "already passed." : days === 0 ? "today." : `${days} day${days === 1 ? "" : "s"} away`}
        </p>
      ) : (
        <p className="text-xs text-zinc-600">Set an expiry date on a leg above to see Greeks guidance here.</p>
      )}
      {valid && !hasOptionLegs && (
        <p className="text-xs text-zinc-600 mt-3">
          No option (CE/PE) legs in this trade — Gamma, Theta, and Vega don't apply to a bare futures or stock/ETF position. Add an option leg to see Greeks guidance.
        </p>
      )}
      {band && (
        <div className="tj-slide-in mt-4 space-y-3.5">
          <p className="text-sm font-semibold tj-primary-text">{band.name}</p>
          <div className="space-y-2">
            {[
              { label: "Gamma", val: band.gamma, gradient: "linear-gradient(90deg, #f43f5e, #fb923c)", pol: polarity.gamma },
              { label: "Theta", val: band.theta, gradient: "linear-gradient(90deg, #10b981, #22d3ee)", pol: polarity.theta },
              { label: "Vega", val: band.vega, gradient: "linear-gradient(90deg, #8b5cf6, #ec4899)", pol: polarity.vega },
            ].map((g) => {
              const disp = POLARITY_DISPLAY[g.pol];
              return (
                <div key={g.label} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-12 flex-shrink-0" style={FONT_MONO}>{g.label}</span>
                  <AnimatedBar val={g.val} gradient={g.gradient} />
                  <span className={`text-xs w-28 flex-shrink-0 text-right ${disp[1]}`} style={FONT_MONO}>{disp[0]}</span>
                </div>
              );
            })}
          </div>
          <ul className="space-y-1.5">
            {band.bullets.map((b, idx) => (
              <li key={idx} className="text-xs text-zinc-400 leading-relaxed">— {b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
