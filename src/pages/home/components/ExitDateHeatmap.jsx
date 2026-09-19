import React, { useMemo } from "react";
import { FONT_MONO } from "../../../lib/format.js";
import { heatCellStyle, buildMonthColumns } from "../../../lib/homeStats.js";
import { MONTH_ABBR, isoToMonDDYYYY } from "../../../lib/dateUtils.js";
import { fmtINRsigned } from "../../../lib/format.js";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";

export const ExitDateHeatmap = React.memo(function ExitDateHeatmap({ pnlEntries }) {
  const { plByDate, maxProfit, maxLoss } = useMemo(() => {
    const map = {};
    pnlEntries.forEach((e) => {
      if (!e.exitDate || e.overallPL === "" || e.overallPL === null || e.overallPL === undefined) return;
      const pl = parseFloat(e.overallPL);
      if (Number.isNaN(pl)) return;
      map[e.exitDate] = (map[e.exitDate] || 0) + pl;
    });
    const profits = [];
    const losses = [];
    Object.values(map).forEach((v) => { if (v > 0) profits.push(v); else if (v < 0) losses.push(-v); });
    // The 90th percentile of this account's own days, rather than the single
    // biggest win/loss — one outsized day would otherwise become the only
    // reference point, pushing every ordinary day's ratio down near zero and
    // collapsing them all into the same lowest color band.
    const percentile90 = (arr) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.ceil(0.9 * sorted.length) - 1)];
    };
    return { plByDate: map, maxProfit: percentile90(profits), maxLoss: percentile90(losses) };
  }, [pnlEntries]);

  const monthGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const groups = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const cols = buildMonthColumns(d.getFullYear(), d.getMonth(), plByDate, today);
      groups.push({ key: `${d.getFullYear()}-${d.getMonth()}`, monthIdx: d.getMonth(), cols });
    }
    return groups;
  }, [plByDate]);

  const GAP = 3, GROUP_GAP = 8;
  const gridCols = monthGroups.map((g) => `${g.cols.length}fr`).join(" ");

  return (
    <div className="w-full">
      <div className="grid" style={{ gridTemplateColumns: gridCols, gap: GROUP_GAP }}>
        {monthGroups.map((g) => (
          <div key={g.key} className="text-[10px] text-zinc-600 min-w-0" style={FONT_MONO}>
            {MONTH_ABBR[g.monthIdx]}
          </div>
        ))}
      </div>
      <div className="grid mt-1.5" style={{ gridTemplateColumns: gridCols, gap: GROUP_GAP }}>
        {monthGroups.map((g) => (
          <div key={g.key} className="grid min-w-0" style={{ gridTemplateColumns: `repeat(${g.cols.length}, 1fr)`, gap: GAP }}>
            {g.cols.map((col, ci) => (
              <div key={ci} className="grid min-w-0" style={{ gap: GAP }}>
                {col.map((day, di) => (
                  <Tooltip
                    key={di}
                    text={!day ? undefined : (day.pl !== undefined ? `Gross realised P/L on ${isoToMonDDYYYY(day.iso)}: ${fmtINRsigned(day.pl)}` : `No data on ${isoToMonDDYYYY(day.iso)}`)}
                    wrapperClassName="w-full h-full"
                  >
                    <div
                      className={`w-full aspect-square rounded-sm ${day ? "hover:outline hover:outline-1 hover:outline-[var(--tj-text1)] hover:outline-offset-0" : ""} ${day && day.pl === undefined ? "tj-heat-empty" : ""}`}
                      style={!day ? { background: "transparent" } : heatCellStyle(day.pl, maxProfit, maxLoss)}
                    ></div>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
