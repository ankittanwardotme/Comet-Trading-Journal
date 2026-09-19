import React, { useMemo } from "react";
import { FONT_MONO, fmtINR } from "../../../lib/format.js";
import { MONTH_ABBR, pad2 } from "../../../lib/dateUtils.js";

export const MonthlyPLChart = React.memo(function MonthlyPLChart({ pnlEntries, year }) {
  const { months, plByMonth, maxAbs } = useMemo(() => {
    const monthsArr = [];
    for (let m = 0; m < 12; m++) {
      monthsArr.push({ key: `${year}-${pad2(m + 1)}`, monthIdx: m });
    }
    const plMap = {};
    pnlEntries.forEach((e) => {
      if (e.overallPL === "" || e.overallPL === null || e.overallPL === undefined) return;
      const pl = parseFloat(e.overallPL);
      if (Number.isNaN(pl)) return;
      const key = (e.entryDate || "").slice(0, 7);
      if (!key) return;
      plMap[key] = (plMap[key] || 0) + pl;
    });
    const max = Math.max(1, ...monthsArr.map((m) => Math.abs(plMap[m.key] || 0)));
    return { months: monthsArr, plByMonth: plMap, maxAbs: max };
  }, [pnlEntries, year]);

  // Labels sit as normal flex children directly above each bar (in DOM
  // order, within a justify-end column) rather than being absolutely
  // positioned — absolute positioning was being taken out of the flex flow
  // entirely, which is why "items-center" was never actually centering it.
  return (
    <div className="flex items-end justify-between gap-0.5 h-32 px-5">
      {months.map((m) => {
        const val = plByMonth[m.key];
        const hasData = val !== undefined && val !== 0;
        const pct = hasData ? Math.max(10, Math.min(72, (Math.abs(val) / maxAbs) * 72)) : 3;
        const isPos = (val || 0) >= 0;
        return (
          <div key={m.key} className="flex-1 flex flex-col items-center h-full justify-end min-w-0">
            {hasData ? (
              <span className={`text-[9px] font-semibold whitespace-nowrap mb-1 ${isPos ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>
                {isPos ? "+" : "−"}{fmtINR(Math.abs(val))}
              </span>
            ) : (
              <span className="text-[9px] mb-1">&nbsp;</span>
            )}
            <div
              className="w-5 rounded-t-sm transition-all duration-700"
              style={{ height: `${pct}%`, background: hasData ? (isPos ? "#04B488" : "#F15E3B") : "var(--tj-border)", minHeight: "3px" }}
            ></div>
            <span className="text-[9px] text-zinc-600 mt-1.5" style={FONT_MONO}>{MONTH_ABBR[m.monthIdx]}</span>
          </div>
        );
      })}
    </div>
  );
});
