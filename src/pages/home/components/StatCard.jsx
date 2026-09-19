import React from "react";
import { FONT_MONO } from "../../../lib/format.js";
import { InfoIcon } from "../../../components/shared/InfoIcon.jsx";

export const StatCard = React.memo(function StatCard({ icon: Icon, label, value, valueColor = "text-zinc-100", small = false, info }) {
  return (
    <div className={`tj-info-card relative rounded-2xl border border-zinc-800 bg-zinc-900/40 ${small ? "p-4" : "p-5"} hover:border-zinc-700 transition-colors`}>
      {info && <div className="absolute top-3 right-3"><InfoIcon text={info} /></div>}
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="tj-primary-text flex-shrink-0" />
        <span className={`text-[11px] uppercase tracking-wide text-zinc-500 truncate ${info ? "pr-4" : ""}`} style={FONT_MONO}>{label}</span>
      </div>
      <p className={`${small ? "text-lg" : "text-2xl"} font-bold ${valueColor} truncate`} style={FONT_MONO}>{value}</p>
    </div>
  );
});
