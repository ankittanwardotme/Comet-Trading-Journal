import { useState } from "react";
import { FONT_MONO, fmtINR } from "../../lib/format.js";
import { computeLegPL } from "../../lib/dateUtils.js";

// Inline form for closing a single leg — enter the closing premium, see
// that leg's own P/L before confirming. Separate from generic field edits
// since closing is a one-way, permanent action.
export function CloseLegForm({ leg, onConfirm, onCancel }) {
  const totalQty = parseFloat(leg.qty) || 1;
  const canPartial = totalQty > 1;
  const [closeType, setCloseType] = useState("full"); // "full" | "partial" | "roll"
  const [lotsToClose, setLotsToClose] = useState(canPartial ? "1" : String(totalQty));
  const [closePremium, setClosePremium] = useState("");
  const effectiveLots = closeType === "partial" ? (parseFloat(lotsToClose) || 0) : totalQty;
  const previewPL = closePremium !== "" ? computeLegPL({ ...leg, qty: String(effectiveLots), closePremium }) : null;

  const options = canPartial
    ? [["full", "Close All"], ["partial", "Partial Close"], ["roll", "Roll"]]
    : [["full", "Close"], ["roll", "Roll"]];

  return (
    <div className="mt-3 rounded-lg border border-amber-400/50 bg-zinc-900/60 p-3">
      <label className="text-xs text-zinc-500 mb-1 block">This closure is a...</label>
      <div className="flex gap-1.5 mb-3">
        {options.map(([id, label]) => (
          <button
            key={id} onClick={() => setCloseType(id)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-semibold ${closeType === id ? "tj-primary-bg" : "border border-zinc-800 text-zinc-400"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {closeType === "roll" && (
        <p className="text-[10px] text-zinc-500 mb-2">After confirming, add the new leg below to complete the roll.</p>
      )}
      {closeType === "partial" && (
        <div className="mb-2">
          <label className="text-xs text-zinc-500 mb-1 block">Lots closed (of {totalQty} total)</label>
          <input
            type="text" inputMode="numeric" value={lotsToClose}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              const n = parseInt(v, 10);
              setLotsToClose(v === "" ? "" : String(Math.min(Math.max(n || 0, 0), totalQty - 1)));
            }}
            placeholder="e.g. 1"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={FONT_MONO}
          />
          <p className="text-[10px] text-zinc-600 mt-1">The remaining {totalQty - (parseFloat(lotsToClose) || 0)} lot{totalQty - (parseFloat(lotsToClose) || 0) === 1 ? "" : "s"} stay open as a new position.</p>
        </div>
      )}
      <label className="text-xs text-zinc-500 mb-1 block">Closing premium</label>
      <input
        type="text" inputMode="decimal" autoFocus value={closePremium}
        onChange={(e) => setClosePremium(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="e.g. 40.00"
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2"
        style={FONT_MONO}
      />
      {previewPL !== null && (
        <div className="rounded-lg bg-zinc-950/60 px-3 py-2 mb-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{closeType === "partial" ? `P/L on ${effectiveLots} lot${effectiveLots === 1 ? "" : "s"}` : "This leg's P/L"}</span>
          <span className={`text-sm font-bold ${previewPL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>
            {previewPL >= 0 ? "+" : ""}{fmtINR(previewPL)}
          </span>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 text-xs text-zinc-400 border border-zinc-800 rounded-lg py-2">Cancel</button>
        <button
          onClick={() => closePremium !== "" && effectiveLots > 0 && onConfirm(closePremium, closeType, effectiveLots)}
          disabled={closePremium === "" || effectiveLots <= 0}
          className="flex-1 text-xs tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-lg py-2"
        >
          Confirm Close
        </button>
      </div>
    </div>
  );
}
