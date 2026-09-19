import React from "react";
import { FONT_MONO } from "../../../lib/format.js";

export const LiquidityReferenceCard = React.memo(function LiquidityReferenceCard() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Liquidity floor — rule of thumb</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
          <p className="text-xs text-zinc-500">NIFTY</p>
          <p className="text-sm font-semibold text-zinc-100" style={FONT_MONO}>OI in lakhs at ATM</p>
          <p className="text-xs text-zinc-500 mt-1">Near-month ATM/near-ATM strikes normally run deep. Treat anything far below neighboring strikes as thin.</p>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
          <p className="text-xs text-zinc-500">BANKNIFTY</p>
          <p className="text-sm font-semibold text-zinc-100" style={FONT_MONO}>OI in lakhs at ATM</p>
          <p className="text-xs text-zinc-500 mt-1">Same logic as NIFTY — compare the strike to the ATM strike's OI, not an absolute number.</p>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
          <p className="text-xs text-zinc-500">STOCKS</p>
          <p className="text-sm font-semibold text-zinc-100" style={FONT_MONO}>1,000+ OI, floor ~500</p>
          <p className="text-xs text-zinc-500 mt-1">Varies hugely by name. Below ~100 OI is a hard no. Compare to the 2–3 neighboring strikes.</p>
        </div>
      </div>
      <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">Whatever the OI reads, treat a bid-ask spread wider than roughly 3–5% of the option's price as a liquidity warning on its own.</p>
    </div>
  );
});
