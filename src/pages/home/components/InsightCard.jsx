import React from "react";
import { FONT_DISPLAY, FONT_MONO } from "../../../lib/format.js";

export const InsightCard = React.memo(function InsightCard({ label, value, sub, valueColor = "text-zinc-100" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5" style={FONT_MONO}>{label}</p>
      <p className={`text-lg font-bold ${valueColor} truncate`} style={FONT_DISPLAY}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
});
