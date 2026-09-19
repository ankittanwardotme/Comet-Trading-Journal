import React from "react";
import { IconCheck, IconFlag } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";

export const CheckItem = React.memo(function CheckItem({ item, checked, onToggle, profile }) {
  const sub = typeof item.sub === "function" ? item.sub(profile) : item.sub;
  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
        checked ? "bg-emerald-500/10 border-emerald-500/40" : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${checked ? "bg-emerald-500 border-emerald-500 tj-pop" : "border-zinc-600"}`}>
        {checked && <IconCheck size={14} strokeWidth={3} className="text-zinc-950" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${checked ? "text-emerald-100" : "text-zinc-200"}`}>{item.label}</span>
          {item.critical && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded" style={FONT_MONO}>
              <IconFlag size={10} /> Critical
            </span>
          )}
        </span>
        {sub && <span className="block text-xs text-zinc-500 mt-1.5 leading-relaxed">{sub}</span>}
      </span>
    </button>
  );
});
