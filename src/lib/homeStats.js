import { localISODate, isoToMonDDYYYY, MONTH_ABBR, pad2 } from "./dateUtils.js";

// Derives every Home dashboard number from the trade list itself — nothing
// here is stored separately, so it naturally stays in sync and fills in on
// its own as more trades get logged.
export function computeHomeStats(pnlEntries, history = []) {
  const closed = pnlEntries.filter((e) => e.overallPL !== "" && e.overallPL !== null && e.overallPL !== undefined && !Number.isNaN(parseFloat(e.overallPL)));
  const totalTrades = pnlEntries.length;
  const closedTrades = closed.length;
  const wins = closed.filter((e) => parseFloat(e.overallPL) > 0);
  const losses = closed.filter((e) => parseFloat(e.overallPL) < 0);
  const totalPL = closed.reduce((sum, e) => sum + parseFloat(e.overallPL), 0);
  const winRate = closedTrades > 0 ? (wins.length / closedTrades) * 100 : 0;

  const bestTrade = closed.reduce((best, e) => (!best || parseFloat(e.overallPL) > parseFloat(best.overallPL)) ? e : best, null);
  const worstTrade = closed.reduce((worst, e) => (!worst || parseFloat(e.overallPL) < parseFloat(worst.overallPL)) ? e : worst, null);

  const strategyCounts = {};
  pnlEntries.forEach((e) => { if (e.strategyLabel) strategyCounts[e.strategyLabel] = (strategyCounts[e.strategyLabel] || 0) + 1; });
  const topStrategy = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0] || null;

  const underlyingCounts = {};
  pnlEntries.forEach((e) => { if (e.underlying) underlyingCounts[e.underlying] = (underlyingCounts[e.underlying] || 0) + 1; });
  const topUnderlying = Object.entries(underlyingCounts).sort((a, b) => b[1] - a[1])[0] || null;

  const sortedClosed = [...closed].sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));
  let streak = 0, streakType = null, streakStartDate = null, streakEndDate = null;
  for (const e of sortedClosed) {
    const isWin = parseFloat(e.overallPL) > 0;
    if (streakType === null) { streakType = isWin; streak = 1; streakEndDate = e.entryDate; streakStartDate = e.entryDate; }
    else if (isWin === streakType) { streak++; streakStartDate = e.entryDate; }
    else break;
  }

  const monthlyPL = {};
  closed.forEach((e) => {
    const key = (e.entryDate || "").slice(0, 7);
    if (!key) return;
    monthlyPL[key] = (monthlyPL[key] || 0) + parseFloat(e.overallPL);
  });

  // Avg P/L per trade
  const avgPL = closedTrades > 0 ? totalPL / closedTrades : 0;

  // Profit factor: gross wins / gross losses — a classic trading-system
  // health metric (>1 means the wins outweigh the losses overall).
  const grossWins = wins.reduce((s, e) => s + parseFloat(e.overallPL), 0);
  const grossLosses = Math.abs(losses.reduce((s, e) => s + parseFloat(e.overallPL), 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : (grossWins > 0 ? null : 0); // null = infinite (no losses yet)

  const avgWin = wins.length > 0 ? grossWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLosses / losses.length : 0; // positive magnitude

  // Avg holding period, in days, for trades with both an entry and exit date
  const holdingPeriods = closed
    .filter((e) => e.entryDate && e.exitDate)
    .map((e) => {
      const [y1, m1, d1] = e.entryDate.split("-").map(Number);
      const [y2, m2, d2] = e.exitDate.split("-").map(Number);
      return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
    });
  const avgHoldingDays = holdingPeriods.length > 0 ? holdingPeriods.reduce((s, v) => s + v, 0) / holdingPeriods.length : 0;

  // Best strategy by total P/L contributed — distinct from "most-used" (a
  // frequency count): this is about which strategy actually made the money.
  const strategyPL = {};
  closed.forEach((e) => { if (e.strategyLabel) strategyPL[e.strategyLabel] = (strategyPL[e.strategyLabel] || 0) + parseFloat(e.overallPL); });
  const bestStrategyByPL = Object.entries(strategyPL).sort((a, b) => b[1] - a[1])[0] || null;

  // Longest historical win/loss streaks, each with the date range that
  // achieved it (not just the count) — distinct from "current streak".
  const chronological = [...closed].sort((a, b) => (a.entryDate || "").localeCompare(b.entryDate || ""));
  let longestWinStreak = 0, longestLossStreak = 0, curWin = 0, curLoss = 0;
  let curWinStart = null, curLossStart = null, bestWinStreakRange = null, bestLossStreakRange = null;
  chronological.forEach((e) => {
    if (parseFloat(e.overallPL) > 0) {
      if (curWin === 0) curWinStart = e.entryDate;
      curWin++; curLoss = 0;
      if (curWin > longestWinStreak) { longestWinStreak = curWin; bestWinStreakRange = { start: curWinStart, end: e.entryDate }; }
    } else {
      if (curLoss === 0) curLossStart = e.entryDate;
      curLoss++; curWin = 0;
      if (curLoss > longestLossStreak) { longestLossStreak = curLoss; bestLossStreakRange = { start: curLossStart, end: e.entryDate }; }
    }
  });

  // Most active calendar month by trade count
  const monthCounts = {};
  pnlEntries.forEach((e) => { const k = (e.entryDate || "").slice(0, 7); if (k) monthCounts[k] = (monthCounts[k] || 0) + 1; });
  const mostActiveMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0] || null;

  // Win/Loss ratio — avg win size vs avg loss size (distinct from profit
  // factor, which compares totals rather than per-trade averages).
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : null;

  // Expectancy — expected P/L per trade given this account's actual win
  // rate and average win/loss size.
  const expectancy = closedTrades > 0 ? (wins.length / closedTrades) * avgWin - (losses.length / closedTrades) * avgLoss : 0;

  // Median P/L — less skewed by one huge win or loss than the average is.
  const sortedPLs = closed.map((e) => parseFloat(e.overallPL)).sort((a, b) => a - b);
  const medianPL = sortedPLs.length === 0 ? 0 : sortedPLs.length % 2 === 1
    ? sortedPLs[(sortedPLs.length - 1) / 2]
    : (sortedPLs[sortedPLs.length / 2 - 1] + sortedPLs[sortedPLs.length / 2]) / 2;

  // Max drawdown — largest peak-to-trough decline in cumulative P/L over
  // time, a standard risk metric.
  let running = 0, peak = 0, maxDrawdown = 0;
  chronological.forEach((e) => {
    running += parseFloat(e.overallPL);
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  // Avg trades per month, across the span from the first trade to now
  let avgTradesPerMonth = 0;
  if (pnlEntries.length > 0) {
    const dates = pnlEntries.map((e) => e.entryDate).filter(Boolean).sort();
    if (dates.length > 0) {
      const [fy, fm] = dates[0].split("-").map(Number);
      const now = new Date();
      const monthsSpan = Math.max(1, (now.getFullYear() - fy) * 12 + (now.getMonth() + 1 - fm) + 1);
      avgTradesPerMonth = totalTrades / monthsSpan;
    }
  }

  // Best week and best month by total P/L — grouped by the Monday-starting
  // week of the entry date, and reusing the monthlyPL already computed above.
  const weekPL = {};
  closed.forEach((e) => {
    if (!e.entryDate) return;
    const [y, m, d] = e.entryDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    const weekKey = localISODate(monday.getTime());
    weekPL[weekKey] = (weekPL[weekKey] || 0) + parseFloat(e.overallPL);
  });
  const bestWeekEntry = Object.entries(weekPL).sort((a, b) => b[1] - a[1])[0] || null;
  const bestWeek = bestWeekEntry
    ? (() => {
        const [wy, wm, wd] = bestWeekEntry[0].split("-").map(Number);
        const mondayDate = new Date(wy, wm - 1, wd);
        const sundayDate = new Date(mondayDate);
        sundayDate.setDate(mondayDate.getDate() + 6);
        const sundayIso = localISODate(sundayDate.getTime());
        const [sy, sm, sd] = sundayIso.split("-").map(Number);
        let label;
        if (wy !== sy) {
          label = `${isoToMonDDYYYY(bestWeekEntry[0])} - ${isoToMonDDYYYY(sundayIso)}`;
        } else if (wm !== sm) {
          label = `${MONTH_ABBR[wm - 1]} ${pad2(wd)} - ${MONTH_ABBR[sm - 1]} ${pad2(sd)}, ${wy}`;
        } else {
          label = `${MONTH_ABBR[wm - 1]} ${pad2(wd)} - ${pad2(sd)}, ${wy}`;
        }
        return { label, pl: bestWeekEntry[1] };
      })()
    : null;

  const bestMonthEntry = Object.entries(monthlyPL).sort((a, b) => b[1] - a[1])[0] || null;
  const bestMonth = bestMonthEntry
    ? { label: `${MONTH_ABBR[parseInt(bestMonthEntry[0].slice(5, 7), 10) - 1]} ${bestMonthEntry[0].slice(0, 4)}`, pl: bestMonthEntry[1] }
    : null;

  // Recent form — win rate of your last 10 closed trades, compared against
  // the all-time win rate, to show whether things are trending up or down.
  const recentClosed = sortedClosed.slice(0, 10);
  const recentWinRate = recentClosed.length > 0 ? (recentClosed.filter((e) => parseFloat(e.overallPL) > 0).length / recentClosed.length) * 100 : null;

  // Stop-loss discipline: for closed losing trades whose checklist entry
  // recorded a planned max loss, compare that plan against what actually
  // happened. Only counts trades where a plan exists to compare against.
  const historyByPnlId = {};
  history.forEach((h) => { if (h.pnlId && !historyByPnlId[h.pnlId]) historyByPnlId[h.pnlId] = h; });
  const lossesWithPlan = losses
    .map((e) => {
      const h = historyByPnlId[e.id];
      if (!h || !h.plannedLoss) return null;
      const actualLoss = Math.abs(parseFloat(e.overallPL));
      return { overshoot: actualLoss - h.plannedLoss };
    })
    .filter(Boolean);
  const slPlannedCount = lossesWithPlan.length;
  const slExceededCount = lossesWithPlan.filter((x) => x.overshoot > 0).length;
  const slAvgOvershoot = slExceededCount > 0
    ? lossesWithPlan.filter((x) => x.overshoot > 0).reduce((s, x) => s + x.overshoot, 0) / slExceededCount
    : 0;

  // Hold time split by outcome — same calculation as avgHoldingDays above,
  // but kept separate for winners vs losers instead of blended together.
  const winHoldingPeriods = wins.filter((e) => e.entryDate && e.exitDate).map((e) => {
    const [y1, m1, d1] = e.entryDate.split("-").map(Number);
    const [y2, m2, d2] = e.exitDate.split("-").map(Number);
    return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
  });
  const lossHoldingPeriods = losses.filter((e) => e.entryDate && e.exitDate).map((e) => {
    const [y1, m1, d1] = e.entryDate.split("-").map(Number);
    const [y2, m2, d2] = e.exitDate.split("-").map(Number);
    return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
  });
  const avgHoldWinners = winHoldingPeriods.length > 0 ? winHoldingPeriods.reduce((s, v) => s + v, 0) / winHoldingPeriods.length : null;
  const avgHoldLosers = lossHoldingPeriods.length > 0 ? lossHoldingPeriods.reduce((s, v) => s + v, 0) / lossHoldingPeriods.length : null;

  // Mood vs performance — grouped by exit mood (the mood recorded when the
  // trade was actually closed). Only moods with at least 3 trades are kept,
  // so a single outlier trade can't masquerade as a pattern.
  const moodGroups = {};
  closed.forEach((e) => {
    if (!e.exitMood) return;
    (moodGroups[e.exitMood] = moodGroups[e.exitMood] || []).push(e);
  });
  const moodStats = Object.entries(moodGroups)
    .filter(([, trades]) => trades.length >= 3)
    .map(([mood, trades]) => {
      const moodWins = trades.filter((e) => parseFloat(e.overallPL) > 0).length;
      const moodTotalPL = trades.reduce((s, e) => s + parseFloat(e.overallPL), 0);
      return { mood, count: trades.length, winRate: (moodWins / trades.length) * 100, avgPL: moodTotalPL / trades.length };
    })
    .sort((a, b) => b.avgPL - a.avgPL);

  return {
    totalTrades, closedTrades, openTrades: totalTrades - closedTrades, wins: wins.length, losses: losses.length,
    totalPL, winRate, bestTrade, worstTrade, topStrategy, topUnderlying, streak, streakType, streakStartDate, streakEndDate, monthlyPL,
    avgPL, profitFactor, avgWin, avgLoss, avgHoldingDays, bestStrategyByPL, longestWinStreak, longestLossStreak,
    bestWinStreakRange, bestLossStreakRange, mostActiveMonth, winLossRatio, expectancy, medianPL, maxDrawdown, avgTradesPerMonth, bestWeek, bestMonth, recentWinRate,
    slPlannedCount, slExceededCount, slAvgOvershoot, avgHoldWinners, avgHoldLosers, moodStats,
  };
}

// GitHub-style contribution grid — one square per day over the last 12
// calendar months, colored by that day's total exit-date P/L. Color is a
// single green (profit) or red (loss), quantized into 4 discrete opacity
// stops — 60%, 73%, 87%, 100% — based on how large that day's P/L is
// relative to this account's own best/worst day, plus a soft matching glow
// around each colored cell so nearby squares stay easy to tell apart.
const HEAT_GREEN_RGB = "4, 180, 136";    // #04B488
const HEAT_RED_RGB = "241, 94, 59";      // #F15E3B
const HEAT_OPACITY_STOPS = [0.60, 0.73, 0.87, 1.00];
export function heatCellStyle(pl, maxProfit, maxLoss) {
  if (pl === undefined) return {};
  if (pl === 0) return { background: "#52525b" };
  const rgb = pl > 0 ? HEAT_GREEN_RGB : HEAT_RED_RGB;
  const pct = pl > 0
    ? (maxProfit > 0 ? Math.min(1, pl / maxProfit) : 1)
    : (maxLoss > 0 ? Math.min(1, Math.abs(pl) / maxLoss) : 1);
  const stopIndex = Math.min(HEAT_OPACITY_STOPS.length - 1, Math.floor(pct * HEAT_OPACITY_STOPS.length));
  const opacity = HEAT_OPACITY_STOPS[stopIndex];
  return {
    background: `rgba(${rgb}, ${opacity.toFixed(2)})`,
    boxShadow: `0 0 4px rgba(${rgb}, ${(opacity * 0.8).toFixed(2)})`,
  };
}

// Builds one calendar month's own column grid — columns break exactly at
// that month's first and last date. The first column is padded with blank
// cells before day 1 (whatever weekday it falls on), and the last column is
// padded with blank cells after the final day — so a week never straddles
// two different months' worth of squares.
export function buildMonthColumns(year, monthIdx, plByDate, today) {
  const fullDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && monthIdx === today.getMonth();
  const daysInMonth = isCurrentMonth ? today.getDate() : fullDaysInMonth;
  const startDow = new Date(year, monthIdx, 1).getDay(); // 0=Sun..6=Sat
  const totalCols = Math.ceil((startDow + daysInMonth) / 7);
  const cols = [];
  for (let c = 0; c < totalCols; c++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const dayNum = c * 7 + r - startDow + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        col.push(null);
      } else {
        const date = new Date(year, monthIdx, dayNum);
        const iso = localISODate(date.getTime());
        col.push({ iso, pl: plByDate[iso], isFuture: false });
      }
    }
    cols.push(col);
  }
  return cols;
}
