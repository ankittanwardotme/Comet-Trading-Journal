import React, { useMemo, useState } from "react";
import {
  IconWallet, IconTrendingUp, IconTrendingDown, IconPercentage, IconActivity, IconFlag, IconChecklist, IconTrophy, IconAlertTriangle,
  IconCalculator, IconChartBar, IconChevronLeft, IconChevronRight, IconClock, IconTarget, IconMoodSmile, IconShield,
} from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO, fmtINR, fmtINRsigned } from "../../lib/format.js";
import { computeHomeStats } from "../../lib/homeStats.js";
import { MONTH_ABBR, isoToDMY } from "../../lib/dateUtils.js";
import { moodMeta } from "../../lib/moodOptions.js";
import { CollapsibleSection } from "../../components/shared/CollapsibleSection.jsx";
import { InfoIcon } from "../../components/shared/InfoIcon.jsx";
import { MoodEmoji } from "../../components/shared/MoodEmoji.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { InsightCard } from "./components/InsightCard.jsx";
import { MonthlyPLChart } from "./components/MonthlyPLChart.jsx";
import { ExitDateHeatmap } from "./components/ExitDateHeatmap.jsx";
import { TodayReminderBanner } from "./components/TodayReminderBanner.jsx";
import { RemindersButton } from "./components/RemindersButton.jsx";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const GREETING_WORDS = ["Hi", "Hello", "Welcome back", "Hey there", "Greetings"];

const QUOTE_OF_DAY = { quote: "You must expect great things of yourself before you can do them.", author: "Michael Jordan" };

export const HomePage = React.memo(function HomePage({ userProfile, totalCapital, pnlEntries, history, journeyOpen, setJourneyOpen, deepDiveOpen, setDeepDiveOpen, dueReminders, onOpenReminders }) {
  const stats = useMemo(() => computeHomeStats(pnlEntries, history), [pnlEntries, history]);
  const greetingName = (userProfile.nickname || "").trim() || (userProfile.name || "").trim().split(/\s+/)[0];
  const [greetingWord] = useState(() => GREETING_WORDS[Math.floor(Math.random() * GREETING_WORDS.length)]);
  const currentYear = new Date().getFullYear();
  const [monthlyPLYear, setMonthlyPLYear] = useState(currentYear);

  const streakRange = (range) => range && range.start && range.end
    ? (range.start === range.end ? isoToDMY(range.start) : `${isoToDMY(range.start)} - ${isoToDMY(range.end)}`)
    : "";
  const roiPct = totalCapital > 0 ? (stats.totalPL / totalCapital) * 100 : null;

  return (
    <div className="space-y-7">
      {dueReminders && dueReminders.length > 0 && <TodayReminderBanner dueReminders={dueReminders} />}
      <div className="rounded-3xl border border-zinc-800 p-7 sm:p-8" style={{ background: "linear-gradient(to bottom right, var(--tj-panel2), var(--tj-panel))" }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5" style={FONT_MONO}>{getGreeting()}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-50 truncate" style={FONT_DISPLAY}>
              {greetingName ? `${greetingWord}, ${greetingName}` : greetingWord}
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5 italic">"{QUOTE_OF_DAY.quote}" — {QUOTE_OF_DAY.author}</p>
          </div>
          {onOpenReminders && <RemindersButton dueCount={dueReminders ? dueReminders.length : 0} onClick={onOpenReminders} />}
        </div>
      </div>

      {/* Section 1 — Account Snapshot */}
      <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2" style={FONT_MONO}>
        <IconWallet size={13} /> Account Snapshot
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={IconWallet} label="Total Capital" value={fmtINR(totalCapital)} />
        <StatCard icon={stats.totalPL >= 0 ? IconTrendingUp : IconTrendingDown} label="All-Time P/L" value={fmtINRsigned(stats.totalPL)} valueColor={stats.totalPL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"} />
        <StatCard icon={IconPercentage} label="Return on Capital" value={roiPct === null ? "—" : `${roiPct.toFixed(1)}%`} valueColor={roiPct === null ? "text-zinc-100" : roiPct >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"} />
        <StatCard icon={IconActivity} label="Open Positions" value={stats.openTrades} />
      </div>

      {/* Section 2 — Heatmap */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-7">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5 flex items-center gap-2" style={FONT_MONO}>
          <IconActivity size={13} /> Last 12 Months' Activity
        </p>
        <ExitDateHeatmap pnlEntries={pnlEntries} />
      </div>

      {/* Section 3 — My Journey at a Glance (collapsible) */}
      <CollapsibleSection title="My Journey at a Glance" icon={IconFlag} open={journeyOpen} onToggle={() => setJourneyOpen((v) => !v)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={IconChecklist} label="Total Trades" value={stats.totalTrades} small />
          <StatCard icon={IconTrophy} label="Wins" value={stats.wins} valueColor="text-[#04B488]" small />
          <StatCard icon={IconAlertTriangle} label="Losses" value={stats.losses} valueColor="text-[#F15E3B]" small />
          <StatCard icon={IconPercentage} label="Win Rate" value={stats.closedTrades > 0 ? `${stats.winRate.toFixed(0)}%` : "—"} small />
        </div>

        {stats.closedTrades > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InsightCard label="Current Streak" value={stats.streak > 0 ? `${stats.streak} ${stats.streakType ? "Win" : "Loss"}${stats.streak === 1 ? "" : "s"}` : "—"} sub={streakRange({ start: stats.streakStartDate, end: stats.streakEndDate })} valueColor={stats.streakType ? "text-[#04B488]" : "text-[#F15E3B]"} />
            <InsightCard label="Best Win Streak" value={stats.longestWinStreak > 0 ? `${stats.longestWinStreak} Win${stats.longestWinStreak === 1 ? "" : "s"}` : "—"} sub={streakRange(stats.bestWinStreakRange)} valueColor="text-[#04B488]" />
            <InsightCard label="Worst Loss Streak" value={stats.longestLossStreak > 0 ? `${stats.longestLossStreak} Loss${stats.longestLossStreak === 1 ? "" : "es"}` : "—"} sub={streakRange(stats.bestLossStreakRange)} valueColor="text-[#F15E3B]" />
            {stats.bestStrategyByPL && <InsightCard label="Most Profitable Strategy" value={stats.bestStrategyByPL[0]} sub={fmtINRsigned(stats.bestStrategyByPL[1]) + " total"} valueColor={stats.bestStrategyByPL[1] >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"} />}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-4">
            {stats.topStrategy ? (
              <InsightCard label="Most-Used Strategy" value={stats.topStrategy[0]} sub={`${stats.topStrategy[1]} trade${stats.topStrategy[1] === 1 ? "" : "s"}`} />
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-5 flex items-center justify-center">
                <p className="text-xs text-zinc-600 text-center">No strategy data yet</p>
              </div>
            )}
            {stats.topUnderlying ? (
              <InsightCard label="Most-Traded Underlying" value={stats.topUnderlying[0]} sub={`${stats.topUnderlying[1]} trade${stats.topUnderlying[1] === 1 ? "" : "s"}`} />
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-5 flex items-center justify-center">
                <p className="text-xs text-zinc-600 text-center">No trade data yet</p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 relative group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2" style={FONT_MONO}>
                <IconChartBar size={13} /> Monthly P/L
              </p>
              <span className="text-xs uppercase tracking-widest tj-primary-text" style={FONT_MONO}>{monthlyPLYear}</span>
            </div>
            <MonthlyPLChart pnlEntries={pnlEntries} year={monthlyPLYear} />
            <button
              onClick={() => setMonthlyPLYear((y) => y - 1)}
              aria-label="Previous year"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
            >
              <IconChevronLeft size={26} />
            </button>
            <button
              onClick={() => setMonthlyPLYear((y) => Math.min(currentYear, y + 1))}
              disabled={monthlyPLYear >= currentYear}
              aria-label="Next year"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 disabled:opacity-0 disabled:group-hover:opacity-0 disabled:pointer-events-none"
            >
              <IconChevronRight size={26} />
            </button>
          </div>
        </div>

        {(stats.bestTrade || stats.worstTrade || stats.mostActiveMonth) && (
          <div className="grid sm:grid-cols-3 gap-4">
            {stats.bestTrade && <InsightCard label="Best Trade" value={fmtINRsigned(parseFloat(stats.bestTrade.overallPL))} sub={`${isoToDMY(stats.bestTrade.entryDate)} · ${stats.bestTrade.underlying || ""}`} valueColor="text-[#04B488]" />}
            {stats.worstTrade && <InsightCard label="Toughest Trade" value={fmtINRsigned(parseFloat(stats.worstTrade.overallPL))} sub={`${isoToDMY(stats.worstTrade.entryDate)} · ${stats.worstTrade.underlying || ""}`} valueColor="text-[#F15E3B]" />}
            {stats.mostActiveMonth && <InsightCard label="Most Active Month" value={`${MONTH_ABBR[parseInt(stats.mostActiveMonth[0].slice(5, 7), 10) - 1]} ${stats.mostActiveMonth[0].slice(0, 4)}`} sub={`${stats.mostActiveMonth[1]} trade${stats.mostActiveMonth[1] === 1 ? "" : "s"}`} />}
          </div>
        )}

        {stats.totalTrades === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
            <p className="text-sm text-zinc-500">No trades logged yet.</p>
            <p className="text-xs text-zinc-600 mt-1">This section fills in on its own as you log trades.</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Section 4 — Deeper into the Numbers (collapsible) */}
      <CollapsibleSection title="Deeper into the Numbers" icon={IconCalculator} open={deepDiveOpen} onToggle={() => setDeepDiveOpen((v) => !v)}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={IconCalculator} label="Avg P/L per Trade" value={stats.closedTrades >= 3 ? fmtINRsigned(stats.avgPL) : "—"} valueColor={stats.closedTrades >= 3 && stats.avgPL >= 0 ? "text-[#04B488]" : stats.closedTrades >= 3 ? "text-[#F15E3B]" : "text-zinc-100"} small
              info={stats.closedTrades >= 3 ? "Average profit or loss across all closed trades — your typical per-trade outcome." : "Shown once you have at least 3 closed trades."} />
            <StatCard icon={IconTarget} label="Profit Factor" value={stats.wins < 2 || stats.losses < 2 ? "—" : (stats.profitFactor === null ? "∞" : stats.profitFactor.toFixed(2))} valueColor={stats.wins < 2 || stats.losses < 2 ? "text-zinc-100" : (stats.profitFactor === null || stats.profitFactor >= 1 ? "text-[#04B488]" : "text-[#F15E3B]")} small
              info={stats.wins < 2 || stats.losses < 2 ? "Shown once you have at least 2 wins and 2 losses." : "Gross profit divided by gross loss. Above 1 means your wins outweigh your losses overall."} />
            <StatCard icon={IconTrendingUp} label="Avg Win" value={stats.wins >= 2 ? fmtINR(stats.avgWin) : "—"} valueColor={stats.wins >= 2 ? "text-[#04B488]" : "text-zinc-100"} small
              info={stats.wins >= 2 ? "Average size of your winning trades only." : "Shown once you have at least 2 winning trades."} />
            <StatCard icon={IconTrendingDown} label="Avg Loss" value={stats.losses >= 2 ? fmtINR(stats.avgLoss) : "—"} valueColor={stats.losses >= 2 ? "text-[#F15E3B]" : "text-zinc-100"} small
              info={stats.losses >= 2 ? "Average size of your losing trades only, shown as a positive magnitude." : "Shown once you have at least 2 losing trades."} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="tj-info-card relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors">
              <div className="absolute top-3 right-3"><InfoIcon text="Average number of days between entering and exiting a trade, split by whether it ended as a win or a loss. Each side needs at least 2 trades." /></div>
              <div className="flex items-center gap-2 mb-2.5">
                <IconClock size={14} className="tj-primary-text flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 truncate pr-4" style={FONT_MONO}>Avg Hold Time</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-zinc-500 truncate">Winners</span>
                  <span className="text-sm font-bold flex-shrink-0 text-[#04B488]" style={FONT_MONO}>
                    {stats.wins < 2 || stats.avgHoldWinners === null ? "—" : `${stats.avgHoldWinners.toFixed(1)}d`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-zinc-500 truncate">Losers</span>
                  <span className="text-sm font-bold flex-shrink-0 text-[#F15E3B]" style={FONT_MONO}>
                    {stats.losses < 2 || stats.avgHoldLosers === null ? "—" : `${stats.avgHoldLosers.toFixed(1)}d`}
                  </span>
                </div>
              </div>
            </div>
            <StatCard icon={IconPercentage} label="Win/Loss Ratio" value={stats.wins < 2 || stats.losses < 2 ? "—" : (stats.winLossRatio === null ? "∞" : `${stats.winLossRatio.toFixed(2)}x`)} valueColor={stats.wins < 2 || stats.losses < 2 ? "text-zinc-100" : (stats.winLossRatio === null || stats.winLossRatio >= 1 ? "text-[#04B488]" : "text-[#F15E3B]")} small
              info={stats.wins < 2 || stats.losses < 2 ? "Shown once you have at least 2 wins and 2 losses." : "Average win size divided by average loss size — how much bigger your typical win is than your typical loss."} />
            <StatCard icon={IconCalculator} label="Expectancy" value={stats.closedTrades >= 5 ? fmtINRsigned(stats.expectancy) : "—"} valueColor={stats.closedTrades >= 5 ? (stats.expectancy >= 0 ? "text-[#04B488]" : "text-[#F15E3B]") : "text-zinc-100"} small
              info={stats.closedTrades >= 5 ? "Expected P/L per trade, combining your win rate with your average win and loss size. Positive means the system is profitable on average." : "Shown once you have at least 5 closed trades."} />
            <StatCard icon={IconChartBar} label="Median P/L" value={stats.closedTrades >= 3 ? fmtINRsigned(stats.medianPL) : "—"} valueColor={stats.closedTrades >= 3 ? (stats.medianPL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]") : "text-zinc-100"} small
              info={stats.closedTrades >= 3 ? "The middle value of all trade outcomes — less skewed by one huge win or loss than the average." : "Shown once you have at least 3 closed trades."} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={IconTrendingDown} label="Max Drawdown" value={stats.closedTrades >= 3 ? fmtINR(stats.maxDrawdown) : "—"} valueColor={stats.closedTrades >= 3 ? "text-[#F15E3B]" : "text-zinc-100"} small
              info={stats.closedTrades >= 3 ? "The largest peak-to-trough decline in your cumulative P/L so far — your worst losing stretch by rupee value." : "Shown once you have at least 3 closed trades."} />
            <StatCard icon={IconActivity} label="Avg Trades / Month" value={stats.totalTrades >= 3 ? stats.avgTradesPerMonth.toFixed(1) : "—"} small
              info={stats.totalTrades >= 3 ? "Total trades divided by the number of months since your first trade — a measure of how active you've been." : "Shown once you have at least 3 trades logged."} />
            <StatCard
              icon={IconPercentage} label="Recent Form" value={stats.closedTrades < 5 || stats.recentWinRate === null ? "—" : `${stats.recentWinRate.toFixed(0)}%`}
              valueColor={stats.closedTrades < 5 || stats.recentWinRate === null ? "text-zinc-100" : stats.recentWinRate >= stats.winRate ? "text-[#04B488]" : "text-[#F15E3B]"}
              small info={stats.closedTrades < 5 ? "Shown once you have at least 5 closed trades." : "Win rate over your last 10 closed trades, compared against your all-time win rate — shows whether you're trending better or worse lately."} />
            <div className="tj-info-card relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors">
              <div className="absolute top-3 right-3"><InfoIcon text={stats.closedTrades >= 3 ? "Your single best-performing calendar week and calendar month, by total P/L." : "Shown once you have at least 3 closed trades."} /></div>
              <div className="flex items-center gap-2 mb-2.5">
                <IconFlag size={14} className="tj-primary-text flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 truncate pr-4" style={FONT_MONO}>Best Week / Month</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-zinc-500 truncate">{stats.closedTrades >= 3 && stats.bestWeek ? stats.bestWeek.label : "Week"}</span>
                  <span className={`text-sm font-bold flex-shrink-0 ${stats.closedTrades >= 3 && stats.bestWeek ? (stats.bestWeek.pl >= 0 ? "text-[#04B488]" : "text-[#F15E3B]") : "text-zinc-100"}`} style={FONT_MONO}>
                    {stats.closedTrades >= 3 && stats.bestWeek ? fmtINRsigned(stats.bestWeek.pl) : "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-zinc-500 truncate">{stats.closedTrades >= 3 && stats.bestMonth ? stats.bestMonth.label : "Month"}</span>
                  <span className={`text-sm font-bold flex-shrink-0 ${stats.closedTrades >= 3 && stats.bestMonth ? (stats.bestMonth.pl >= 0 ? "text-[#04B488]" : "text-[#F15E3B]") : "text-zinc-100"}`} style={FONT_MONO}>
                    {stats.closedTrades >= 3 && stats.bestMonth ? fmtINRsigned(stats.bestMonth.pl) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="tj-info-card relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors">
              <div className="absolute top-3 right-3"><InfoIcon text="Compares the max loss you committed to at checklist time against what actually happened, for losing trades where a plan was recorded. Needs at least 3 such trades." /></div>
              <div className="flex items-center gap-2 mb-2.5">
                <IconShield size={14} className="tj-primary-text flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 truncate pr-4" style={FONT_MONO}>Stop-Loss Discipline</span>
              </div>
              {stats.slPlannedCount < 3 ? (
                <p className="text-xs text-zinc-600">Shown once you have at least 3 losing trades with a recorded plan.</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 truncate">Exceeded Plan</span>
                    <span className={`text-sm font-bold flex-shrink-0 ${stats.slExceededCount === 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>
                      {stats.slExceededCount}/{stats.slPlannedCount} trades
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 truncate">Avg Overshoot</span>
                    <span className={`text-sm font-bold flex-shrink-0 ${stats.slExceededCount === 0 ? "text-zinc-100" : "text-[#F15E3B]"}`} style={FONT_MONO}>
                      {stats.slExceededCount === 0 ? "—" : fmtINR(stats.slAvgOvershoot)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="tj-info-card relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors">
              <div className="absolute top-3 right-3"><InfoIcon text="Average P/L and win rate grouped by the mood recorded when each trade was closed. Only moods with at least 3 trades are shown." /></div>
              <div className="flex items-center gap-2 mb-2.5">
                <IconMoodSmile size={14} className="tj-primary-text flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 truncate pr-4" style={FONT_MONO}>Mood vs Performance</span>
              </div>
              {stats.moodStats.length === 0 ? (
                <p className="text-xs text-zinc-600">Not enough exit-mood data yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.moodStats.map((m) => (
                    <div key={m.mood} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
                        <MoodEmoji id={m.mood} size={14} /> {moodMeta(m.mood)?.label} <span className="text-zinc-600">· {m.count}</span>
                      </span>
                      <span className={`text-xs font-bold flex-shrink-0 ${m.avgPL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>
                        {fmtINRsigned(m.avgPL)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>
    </div>
  );
});
