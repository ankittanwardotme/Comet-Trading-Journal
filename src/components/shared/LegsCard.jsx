import { IconStack2, IconPlus, IconClock, IconX } from "@tabler/icons-react";
import { FONT_MONO, fmt2dp, fmtINR, fmtINRsigned } from "../../lib/format.js";
import { isoToDMY, localISODate, computeLegPL } from "../../lib/dateUtils.js";
import { Tooltip } from "./Tooltip.jsx";
import { ExpiryPicker } from "./ExpiryPicker.jsx";
import { CloseLegForm } from "./CloseLegForm.jsx";

export function LegsCard({ underlying, onUnderlyingChange, legs, onAdd, onRemove, onUpdate, netPremium, payoffInfo, holidays, referenceDate, closingLegId, onStartClose, onCancelClose, onCloseLeg, closedLegsPL, onSetLegKind, onOpenTimeline }) {
  const allClosed = legs.length > 0 && legs.every((l) => l.closedAt);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2" style={FONT_MONO}>
          <IconStack2 size={13} /> Strategy Legs
        </p>
        {!allClosed && (
          <button onClick={onAdd} className="flex items-center gap-1 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
            <IconPlus size={13} /> Add Leg
          </button>
        )}
      </div>
      {allClosed && (
        <p className="text-xs text-zinc-500 -mt-2 mb-4">Position fully closed — nothing further to edit.</p>
      )}
      {onOpenTimeline && legs.length > 0 && (
        <button onClick={onOpenTimeline} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg px-3 py-1.5 mb-4 transition-colors">
          <IconClock size={13} /> View Timeline
        </button>
      )}
      <div className="mb-4">
        <label className="block">
          <span className="text-xs text-zinc-500">Underlying (e.g. NIFTY, BANKNIFTY, RELIANCE) <span className="text-rose-600">*</span></span>
          <input
            type="text" value={underlying} onChange={(e) => onUnderlyingChange(e.target.value.toUpperCase())}
            placeholder="e.g. NIFTY"
            className={`mt-1 w-full sm:w-64 bg-zinc-950 border rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 ${underlying.trim() ? "border-zinc-800" : "border-rose-500/50"}`}
            style={FONT_MONO}
          />
        </label>
      </div>
      <div className="space-y-3">
        {legs.map((leg) => {
          const locked = !!leg._locked;
          const closed = !!leg.closedAt;
          const lockedOrClosed = locked || closed;
          const cardBorderColor = leg.legKind === "hedge" ? "border-sky-400/70" : leg.legKind === "adjustment" ? "border-yellow-400/70" : "border-[#8B5E34]/70";

          return (
          <div key={leg.id} className={`rounded-xl border bg-zinc-950/60 p-3.5 ${cardBorderColor}`}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text" value={leg.name} placeholder="Leg name" disabled={lockedOrClosed}
                onChange={(e) => onUpdate(leg.id, "name", e.target.value)}
                className={`flex-1 min-w-0 bg-transparent border-b text-sm text-zinc-100 placeholder-zinc-600 px-1 py-1 focus:outline-none focus:border-amber-400 ${lockedOrClosed ? "opacity-60 cursor-not-allowed" : ""} ${leg.name && leg.name.trim() ? "border-zinc-800" : "border-rose-500/50"}`}
              />
              <Tooltip text={lockedOrClosed ? "This leg is part of an already-saved trade and can't be removed" : undefined}>
                <button onClick={() => onRemove(leg.id)} disabled={lockedOrClosed} className={`text-zinc-600 flex-shrink-0 ${lockedOrClosed ? "opacity-30 cursor-not-allowed" : "hover:text-rose-600"}`}>
                  <IconX size={16} />
                </button>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
              <div className={`flex rounded-lg overflow-hidden border border-zinc-800 ${lockedOrClosed ? "opacity-60" : ""}`}>
                <button onClick={() => onUpdate(leg.id, "action", "Buy")} disabled={lockedOrClosed} className={`flex-1 text-xs py-1.5 ${lockedOrClosed ? "cursor-not-allowed" : ""} ${leg.action === "Buy" ? "bg-emerald-500 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400"}`}>Buy</button>
                <button onClick={() => onUpdate(leg.id, "action", "Sell")} disabled={lockedOrClosed} className={`flex-1 text-xs py-1.5 ${lockedOrClosed ? "cursor-not-allowed" : ""} ${leg.action === "Sell" ? "bg-rose-500 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400"}`}>Sell</button>
              </div>
              <select value={leg.type} disabled={lockedOrClosed} onChange={(e) => onUpdate(leg.id, "type", e.target.value)} className={`bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${lockedOrClosed ? "opacity-60 cursor-not-allowed" : ""}`} style={FONT_MONO}>
                <option value="CE">CE</option><option value="PE">PE</option><option value="FUT">FUT</option><option value="Other">Other</option>
              </select>
              {(leg.type === "CE" || leg.type === "PE" || leg.type === "FUT") ? (
                lockedOrClosed ? (
                  <input type="text" disabled value={leg.expiry ? isoToDMY(leg.expiry) : ""} className="bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400 px-2 py-1.5 opacity-60 cursor-not-allowed" style={FONT_MONO} />
                ) : (
                  <div className={leg.expiry ? "" : "rounded-lg ring-1 ring-rose-500/50"}>
                    <ExpiryPicker value={leg.expiry || ""} onChange={(iso) => onUpdate(leg.id, "expiry", iso)} holidays={holidays} referenceDate={referenceDate} />
                  </div>
                )
              ) : null}
              <input type="text" inputMode="decimal" disabled={lockedOrClosed} placeholder={leg.type === "FUT" || leg.type === "Other" ? "Entry Price" : "Strike"} value={leg.strike} onChange={(e) => onUpdate(leg.id, "strike", e.target.value.replace(/[^0-9.]/g, ""))} className={`bg-zinc-900 border rounded-lg text-xs text-zinc-200 placeholder-zinc-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${lockedOrClosed ? "opacity-60 cursor-not-allowed" : ""} ${leg.strike ? "border-zinc-800" : "border-rose-500/50"}`} style={FONT_MONO} />
              {(leg.type === "CE" || leg.type === "PE") ? (
                <input type="text" inputMode="decimal" disabled={lockedOrClosed} placeholder="Premium" value={leg.premium} onChange={(e) => onUpdate(leg.id, "premium", e.target.value.replace(/[^0-9.]/g, ""))} className={`bg-zinc-900 border rounded-lg text-xs text-zinc-200 placeholder-zinc-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${lockedOrClosed ? "opacity-60 cursor-not-allowed" : ""} ${leg.premium ? "border-zinc-800" : "border-rose-500/50"}`} style={FONT_MONO} />
              ) : null}
              <input type="text" inputMode="numeric" disabled={lockedOrClosed} placeholder={leg.type === "Other" ? "Qty" : "Qty (lots)"} value={leg.qty} onChange={(e) => onUpdate(leg.id, "qty", e.target.value.replace(/[^0-9.]/g, ""))} className={`bg-zinc-900 border rounded-lg text-xs text-zinc-200 placeholder-zinc-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${lockedOrClosed ? "opacity-60 cursor-not-allowed" : ""} ${leg.qty ? "border-zinc-800" : "border-rose-500/50"}`} style={FONT_MONO} />
              {leg.type !== "Other" && (
                <input type="text" inputMode="numeric" disabled={lockedOrClosed} placeholder="Lot size" value={leg.lotSize} onChange={(e) => onUpdate(leg.id, "lotSize", e.target.value.replace(/[^0-9.]/g, ""))} className={`bg-zinc-900 border rounded-lg text-xs text-zinc-200 placeholder-zinc-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${lockedOrClosed ? "opacity-60 cursor-not-allowed" : ""} ${leg.lotSize ? "border-zinc-800" : "border-rose-500/50"}`} style={FONT_MONO} />
              )}
            </div>
            {leg.addedViaEdit && !leg._locked && !leg.closedAt && (() => {
              if (leg.legKind === "roll-replacement") return <p className="mt-2.5 text-[11px] text-amber-400/80">Replacement leg for a roll.</p>;
              if (!leg.legKind) return (
                <div className="mt-2.5 rounded-lg border border-amber-400/40 bg-zinc-900/60 p-2.5">
                  <p className="text-[11px] text-zinc-400 mb-1.5">Is this leg a hedge?</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => onSetLegKind(leg.id, "hedge")} className="flex-1 text-xs py-1 rounded-md border border-zinc-800 text-zinc-300 hover:border-amber-400">Yes</button>
                    <button onClick={() => onSetLegKind(leg.id, "adjustment")} className="flex-1 text-xs py-1 rounded-md border border-zinc-800 text-zinc-300 hover:border-amber-400">No</button>
                  </div>
                </div>
              );
              const idKeyReady = leg.type === "Other" ? !!leg.strike : !!(leg.action && leg.type && leg.strike && (leg.type === "Other" || leg.expiry));
              if (!idKeyReady) {
                if (leg.legKind === "hedge") return <p className="mt-2.5 text-[11px] text-sky-400/80">Recorded as a Hedge.</p>;
                if (leg.legKind === "adjustment" && !leg.legKindAuto) return <p className="mt-2.5 text-[11px] text-zinc-500">Recorded as an Adjustment.</p>;
                return null;
              }
              if (leg.legKind === "increase-position") return <p className="mt-2.5 text-[11px] text-sky-400/80">This matches an existing leg — will increase that position.</p>;
              if (leg.legKind === "adjustment" && leg.legKindAuto) return <p className="mt-2.5 text-[11px] text-zinc-500">Recorded as an Adjustment (this strategy's structure already has defined risk).</p>;
              if (leg.legKind === "hedge") return <p className="mt-2.5 text-[11px] text-sky-400/80">Recorded as a Hedge.</p>;
              if (leg.legKind === "adjustment") return <p className="mt-2.5 text-[11px] text-zinc-500">Recorded as an Adjustment.</p>;
              return null;
            })()}
            {closed ? (
              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  {leg.closeType === "roll" ? "Rolled" : leg.partialCloseOfLegId || leg.closeType === "partial" ? "Partially closed" : "Closed"} at {fmt2dp(leg.closePremium)} on {isoToDMY(localISODate(leg.closedAt))}
                </p>
                {(() => { const pl = computeLegPL(leg); return pl !== null ? (
                  <p className={`text-sm font-semibold ${pl >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{pl >= 0 ? "+" : ""}{fmtINR(pl)}</p>
                ) : null; })()}
              </div>
            ) : locked && onStartClose && (
              closingLegId === leg.id ? (
                <CloseLegForm leg={leg} onConfirm={(closePremium, closeType, lots) => onCloseLeg(leg, closePremium, closeType, lots)} onCancel={onCancelClose} />
              ) : (
                <button onClick={() => onStartClose(leg.id)} className="mt-3 text-xs text-amber-400 font-semibold hover:text-amber-300 transition-colors">
                  Close this leg
                </button>
              )
            )}
          </div>
          );
        })}
        {legs.length === 0 && <p className="text-xs text-zinc-600">No legs yet — click "Add Leg".</p>}
      </div>
      {legs.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-zinc-800 space-y-2">
          {!!closedLegsPL && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Realized on closed legs</span>
              <span className={`text-sm font-bold ${closedLegsPL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>
                {closedLegsPL >= 0 ? "+" : ""}{fmtINR(closedLegsPL)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Net option premium (sell − buy, × qty)</span>
            <span className={`text-sm font-bold ${netPremium >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>
              {netPremium >= 0 ? "+" : ""}{fmtINR(netPremium)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Max Profit (at expiry)</span>
            {payoffInfo && payoffInfo.maxProfit.type === "value" ? (
              <span className="text-sm font-bold text-[#04B488]" style={FONT_MONO}>{fmtINRsigned(payoffInfo.maxProfit.value)}</span>
            ) : (
              <span className="text-xs text-zinc-400 text-right max-w-[60%]">{payoffInfo ? payoffInfo.maxProfit.value : "—"}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Max Loss (at expiry)</span>
            {payoffInfo && payoffInfo.maxLoss.type === "value" ? (
              <span className="text-sm font-bold text-[#F15E3B]" style={FONT_MONO}>{fmtINRsigned(payoffInfo.maxLoss.value)}</span>
            ) : (
              <span className="text-xs text-zinc-400 text-right max-w-[60%]">{payoffInfo ? payoffInfo.maxLoss.value : "—"}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
