import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  IconActivity, IconAdjustmentsHorizontal, IconAlertTriangle, IconArrowLeft, IconArrowsExchange, IconBell, IconBellRinging, IconBook, IconBooks,
  IconBulb, IconCalculator, IconCalendar, IconCamera, IconChartBar, IconCheck, IconChecklist,
  IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconChevronsDown, IconChevronsUp, IconClock, IconClockHour4, IconCopy, IconCrosshair, IconCurrencyRupee,
  IconDeviceDesktop, IconDeviceFloppy, IconDotsVertical, IconDownload, IconExternalLink, IconFilePlus, IconFileText,
  IconFlag, IconFolder, IconFolderPlus, IconFolderSymlink, IconGitBranch, IconLayoutDashboard, IconLayoutGrid, IconLink, IconList, IconLoader2, IconLock,
  IconMoodSmile, IconMoon, IconPalette, IconPencil, IconPercentage, IconPlus, IconPointFilled, IconRotate,
  IconSearch, IconSettings, IconSettings2, IconShield, IconStack2, IconStar, IconStarFilled, IconSun,
  IconTag, IconTarget, IconTerminal2, IconTrash, IconTrendingDown, IconTrendingUp, IconTrophy,
  IconUserCircle, IconUserOff, IconWallet, IconX,
} from "@tabler/icons-react";
import logo from "./assets/logo.png";
import { playAlarmChime, playErrorBeep } from "./lib/audio.js";
import { parseNoteBlocks, blockInlineText, blockNoteSnippet, blockNoteToPlainText, formatNoteLinks } from "./lib/noteBlocks.js";
import {
  supabase, dbStorage, dbTable, currentUserId, checkForHolidayLogUpdates, ADMIN_EMAIL, isAdminSession, DEFAULT_HOLIDAYS_2026,
  SHARED_HOLIDAYS_KEY, SHARED_HOLIDAY_LOG_KEY,
  NOTE_FILES_BUCKET, uploadNoteFile, readFileAsDataUrl, extractStoragePathsFromContent, deleteNoteStorageFiles, deleteAllNoteStorageFilesForUser,
  TRADE_IMAGES_BUCKET, uploadTradeFile, deleteTradeScreenshotFiles, deleteAllTradeStorageFilesForUser, deleteAllUserData,
} from "./lib/supabaseClient.js";
import { notify, subscribeToNotifications, deleteWithUndo, clearPersistedNotifications } from "./lib/notifications.js";
import { getPortalTarget } from "./lib/portal.js";
import { THEMES, themeGlobalCss, THEME_PRIMARY_CSS } from "./lib/theme.js";
import { useThemeSettings } from "./hooks/useThemeSettings.js";
import { FONT_DISPLAY, FONT_MONO, fmt2dp, fmtINR, fmtINRsigned, fmtHour12, formatRelativeTime } from "./lib/format.js";
import {
  tradeRowToJs, tradeJsToRow, reminderRowToJs, reminderJsToRow, fundTxRowToJs, fundTxJsToRow,
  noteRowToJs, noteJsToRow, folderRowToJs, folderJsToRow, historyRowToJs, historyJsToRow,
} from "./lib/rowMappers.js";
import { bufToHex, hashPin, createPinRecord, verifyPin, SECURITY_QUESTIONS, normalizeAnswer, pickRandomQuestions } from "./lib/security.js";
import { REMINDER_SEVERITY, REMINDER_EVENT_GROUPS, REMINDER_TRADE_GROUPS, REMINDER_TOTAL_COUNT, reminderBuiltInSeverity } from "./lib/remindersData.js";
import {
  DEFAULT_STRATEGIES, STRATEGY_CATEGORIES, PROFILE_OPTIONS, inferStrategyProfile, describeInferredProfile, LEG_TEMPLATES,
  slugify, makeUniqueId, DEFAULT_SECTION_DEFS, CHECKLIST_PROFILE_OPTIONS, freshChecklistItemId, CUSTOM_SECTION_COLORS, buildEffectiveSections,
} from "./lib/checklistLogic.js";
import {
  bandIndexForDays, GREEKS_PROFILES, GREEKS_POLARITY, POLARITY_DISPLAY, getEffectiveGreeksProfile, getGreeksBand, COLOR_CLASSES,
} from "./lib/greeks.js";
import { computeHomeStats, heatCellStyle, buildMonthColumns } from "./lib/homeStats.js";
import {
  createPdfDoc, logCategoryName, pastTradeTitle, buildLegChangeEvents, buildLogDetailPDF, buildLogsDetailPDF,
  buildMarkdownFromHistory, compareTradesNewestFirst, pnlGroupsByMonth, getTradeStatus, buildPnlMarkdown, buildPnlDetailPDF,
  freshLegId, legsFromTemplate, freshPnlId, freshNoteId, freshReminderId, freshFolderId, renderBlockNoteBlocksToPDF, buildNotePDF,
} from "./lib/exportEngine.js";
import { Tooltip } from "./components/shared/Tooltip.jsx";
import { InfoIcon } from "./components/shared/InfoIcon.jsx";
import { MOOD_OPTIONS, moodMeta, TWEMOJI_CDN } from "./lib/moodOptions.js";
import { DATA_ROWS, RADIO_OPTIONS, dataReadLabel, getVerdict } from "./lib/marketRead.js";
import {
  MONTH_NAMES, MONTH_ABBR, EXPIRY_DOW_CUTOVER, localISODate,
  isWeekendISO, nearestLegExpiry, contractDateCode, isLegComplete, drawPdfMasthead, formatLegLine, pad2,
  fmtDateDMY, fmtDateTimeDMY, fmtTimeOnly, isoToDMY, isoToWordDate, isoToMonDDYYYY, isoToShortDate, daysUntil,
  shiftForHoliday, nextWeekdayOnOrAfter, lastWeekdayOfMonth, expiryDayOfWeekFor, generateExpiryOptions,
  monthKeyOf, monthLabel, legsToParts, computeNetPremiumSigned, computeStrategyPayoff, escHtml, computeLegPL, computeClosedLegsPL, classifyLegSymbol,
  isStrategyHedgeEligible, legsMatchForGrouping, findMatchingActiveLeg, groupLegsByPosition, closeLotsFIFO, detectStrategyShape, resolveDetectedStrategyLabel,
} from "./lib/dateUtils.js";

function MoodEmoji({ id, size = 18, className = "" }) {
  const m = moodMeta(id);
  if (!m) return null;
  return (
    <img
      src={`${TWEMOJI_CDN}${m.codepoint}.svg`}
      alt={m.label}
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}


/* ============== Small components ============== */
const CheckItem = React.memo(function CheckItem({ item, checked, onToggle, profile }) {
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

const LiquidityReferenceCard = React.memo(function LiquidityReferenceCard() {
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

const AnimatedBar = React.memo(function AnimatedBar({ val, gradient }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    setDisplay(0);
    const t = setTimeout(() => setDisplay(val), 50);
    return () => clearTimeout(t);
  }, [val]);
  return (
    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${display}%`, background: gradient, transition: "width .8s cubic-bezier(0.16, 1, 0.3, 1)" }}></div>
    </div>
  );
});

function DaysToExpiryWidget({ profile, strategyLabel, legs, underlying }) {
  const expiryDate = nearestLegExpiry(legs);
  const days = daysUntil(expiryDate);
  const valid = expiryDate !== "" && days !== null && days >= 0;
  const effectiveProfile = getEffectiveGreeksProfile(profile, legs);
  const hasOptionLegs = effectiveProfile !== null;
  const band = valid && hasOptionLegs ? getGreeksBand(days, effectiveProfile) : null;
  const polarity = GREEKS_POLARITY[effectiveProfile] || GREEKS_POLARITY.short_premium_undefined;
  const hasAnyLegExpiry = (legs || []).some((l) => l.expiry);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2" style={FONT_MONO}>
        <IconActivity size={13} /> Greeks Watch — for {strategyLabel}
      </p>
      {hasAnyLegExpiry ? (
        <p className="text-xs text-zinc-500">
          Using the nearest leg's expiry{underlying ? ` (${underlying}${contractDateCode(expiryDate)})` : ""} — {days < 0 ? "already passed." : days === 0 ? "today." : `${days} day${days === 1 ? "" : "s"} away`}
        </p>
      ) : (
        <p className="text-xs text-zinc-600">Set an expiry date on a leg above to see Greeks guidance here.</p>
      )}
      {valid && !hasOptionLegs && (
        <p className="text-xs text-zinc-600 mt-3">
          No option (CE/PE) legs in this trade — Gamma, Theta, and Vega don't apply to a bare futures or stock/ETF position. Add an option leg to see Greeks guidance.
        </p>
      )}
      {band && (
        <div className="tj-slide-in mt-4 space-y-3.5">
          <p className="text-sm font-semibold tj-primary-text">{band.name}</p>
          <div className="space-y-2">
            {[
              { label: "Gamma", val: band.gamma, gradient: "linear-gradient(90deg, #f43f5e, #fb923c)", pol: polarity.gamma },
              { label: "Theta", val: band.theta, gradient: "linear-gradient(90deg, #10b981, #22d3ee)", pol: polarity.theta },
              { label: "Vega", val: band.vega, gradient: "linear-gradient(90deg, #8b5cf6, #ec4899)", pol: polarity.vega },
            ].map((g) => {
              const disp = POLARITY_DISPLAY[g.pol];
              return (
                <div key={g.label} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-12 flex-shrink-0" style={FONT_MONO}>{g.label}</span>
                  <AnimatedBar val={g.val} gradient={g.gradient} />
                  <span className={`text-xs w-28 flex-shrink-0 text-right ${disp[1]}`} style={FONT_MONO}>{disp[0]}</span>
                </div>
              );
            })}
          </div>
          <ul className="space-y-1.5">
            {band.bullets.map((b, idx) => (
              <li key={idx} className="text-xs text-zinc-400 leading-relaxed">— {b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DataInterpretationSection({ dataReads, onSetRow, avg, verdict, staggerIn }) {
  const answeredCount = DATA_ROWS.filter((r) => dataReads[r.id] !== undefined).length;
  const gaugePct = avg === null || avg === undefined ? 50 : ((avg + 2) / 4) * 100;
  const verdictColorMap = {
    emerald: "text-emerald-600 bg-emerald-400/10 border-emerald-400/30",
    zinc: "text-zinc-300 bg-zinc-700/20 border-zinc-600/40",
    rose: "text-rose-600 bg-rose-400/10 border-rose-400/30",
  };
  // Each row gets its own copy of the slide-in-left animation, staggered by
  // a growing delay — top row animates first, each one below it a beat
  // later — instead of the whole section entering as a single block.
  // "both" fill-mode holds the from-state during the delay (so a row isn't
  // briefly visible before its turn) and the to-state after finishing.
  const staggerStyle = (index) => (staggerIn ? {
    animation: "tj-slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
    animationDelay: `${index * 60}ms`,
  } : undefined);
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${verdictColorMap[verdict.color]}`} style={staggerStyle(0)}>
        <p className="text-xs uppercase tracking-widest mb-1 opacity-70" style={FONT_MONO}>Overall Market Read</p>
        <p className="text-xl font-bold tracking-tight" style={FONT_DISPLAY}>{verdict.label}</p>
        <div className="mt-3 relative h-2 rounded-full bg-gradient-to-r from-rose-500 via-zinc-600 to-emerald-500">
          {avg !== null && avg !== undefined && (
            <span className="absolute -top-1.5 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-900 shadow" style={{ left: `calc(${gaugePct}% - 8px)` }}></span>
          )}
        </div>
        <p className="text-xs mt-2" style={FONT_MONO}>{answeredCount}/{DATA_ROWS.length} data points filled</p>
      </div>
      <div className="space-y-3">
        {DATA_ROWS.map((row, idx) => (
          <div key={row.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4" style={staggerStyle(idx + 1)}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium text-zinc-200">{row.label}</span>
              {row.contrarian && (
                <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded" style={FONT_MONO}>
                  Contrarian — inverted above
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-2.5 leading-relaxed">{row.sub}</p>
            <div className="flex flex-wrap gap-1.5">
              {RADIO_OPTIONS.map((opt) => {
                const selected = dataReads[row.id] === opt.value;
                let selClass = "bg-zinc-500 border-zinc-500 text-zinc-950 font-semibold";
                if (selected && opt.value < 0) selClass = "bg-rose-500 border-rose-500 text-zinc-950 font-semibold";
                if (selected && opt.value > 0) selClass = "bg-emerald-500 border-emerald-500 text-zinc-950 font-semibold";
                return (
                  <button
                    key={opt.value}
                    onClick={() => onSetRow(row.id, opt.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      selected ? selClass + " tj-pop" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistTabPanel({ section, profile, checked, onToggle, onToggleAll, strategyId }) {
  const applic = section.items.filter((i) => {
    if (i.applies === "all") return true;
    if (i.appliesBy === "id") return i.applies.includes(strategyId);
    return i.applies.includes(profile);
  });
  const cnt = applic.filter((i) => checked[i.id]).length;
  const allChecked = applic.length > 0 && cnt === applic.length;
  const cc = COLOR_CLASSES[section.color] || COLOR_CLASSES.amber;
  const Icon = section.icon;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-9 h-9 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center flex-shrink-0`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{section.title}</p>
          <p className="text-xs text-zinc-500" style={FONT_MONO}>{cnt}/{applic.length} checked in this tab</p>
        </div>
        <button onClick={() => onToggleAll(applic.map((i) => i.id), !allChecked)} className="ml-auto text-xs text-zinc-400 hover:text-zinc-100 underline underline-offset-2 flex-shrink-0">
          {allChecked ? "Uncheck all" : "Check all"}
        </button>
      </div>
      {section.id === "entry" && <div className="mb-4"><LiquidityReferenceCard /></div>}
      <div className="space-y-2.5">
        {applic.map((item) => (
          <CheckItem key={item.id} item={item} checked={!!checked[item.id]} onToggle={onToggle} profile={profile} />
        ))}
      </div>
    </div>
  );
}

function ManageFundsDialog({ onAddFunds, onWithdrawFunds, onClose, currentCapital }) {
  const [tab, setTab] = useState("add");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => localISODate(Date.now()));
  const [notes, setNotes] = useState("");

  const amt = parseFloat(amount) || 0;
  const exceedsCapital = tab === "withdraw" && amt > currentCapital;
  const canSubmit = amt > 0 && !exceedsCapital;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (tab === "add") onAddFunds(amt, date, notes);
    else onWithdrawFunds(amt, date, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Manage Funds</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("add")} className={`flex-1 text-xs px-3 py-2 rounded-lg border ${tab === "add" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>
            Add Funds
          </button>
          <button onClick={() => setTab("withdraw")} className={`flex-1 text-xs px-3 py-2 rounded-lg border ${tab === "withdraw" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>
            Withdraw Funds
          </button>
        </div>
        <label className="block">
          <span className="text-xs text-zinc-500">Amount (₹)</span>
          <input
            type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="e.g. 50000"
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={FONT_MONO}
          />
          {exceedsCapital && <p className="text-xs text-rose-400 mt-1.5">Can't withdraw more than your current capital ({fmtINR(currentCapital)}).</p>}
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Date</span>
          <div className="mt-1">
            <CalendarPicker value={date} onChange={setDate} maxDate={localISODate(Date.now())} placeholder="Select date" />
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Note (optional)</span>
          <input
            type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={tab === "add" ? "e.g. Monthly top-up" : "e.g. Moved to savings"}
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={!canSubmit} className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
            {tab === "add" ? "Add Funds" : "Withdraw Funds"}
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CustomStrategyDialog({ initial, isEdit, onSave, onClose }) {
  const [name, setName] = useState(initial?.label || "");
  const [category, setCategory] = useState(initial?.category || "neutral");
  const [legRows, setLegRows] = useState(
    initial?.legTemplate && initial.legTemplate.length > 0
      ? initial.legTemplate.map((l) => ({ name: l.name || "", action: l.action || "Sell", type: l.type || "CE" }))
      : [{ name: "", action: "Sell", type: "CE" }]
  );

  const addRow = () => setLegRows((prev) => [...prev, { name: "", action: "Sell", type: "CE" }]);
  const removeRow = (idx) => setLegRows((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => setLegRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const inferredProfileId = useMemo(() => inferStrategyProfile(legRows), [legRows]);
  const inferredDescription = useMemo(() => describeInferredProfile(legRows), [legRows]);

  const canSave = name.trim().length > 0 && legRows.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name,
      category,
      legTemplate: legRows.map((r) => ({ name: r.name.trim(), action: r.action, type: r.type })),
      profile: inferredProfileId || "short_premium_undefined",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{isEdit ? "Edit Strategy" : "Add Your Own Strategy"}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>

        <label className="block">
          <span className="text-xs text-zinc-500">Strategy name</span>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Broken Wing Butterfly"
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Outlook (which button it'll show under)</p>
          <div className="flex flex-wrap gap-2">
            {STRATEGY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full border ${category === cat.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-zinc-500">Legs <span className="text-zinc-600">— strike, premium, qty & lot size are entered later, per trade</span></p>
            <button onClick={addRow} className="flex items-center gap-1 text-xs tj-primary-text font-semibold flex-shrink-0">
              <IconPlus size={12} /> Add leg
            </button>
          </div>
          <div className="space-y-2">
            {legRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text" value={row.name} onChange={(e) => updateRow(idx, "name", e.target.value)}
                  placeholder="Leg label, e.g. Long Call (lower strike)"
                  className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <div className="flex rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                  <button onClick={() => updateRow(idx, "action", "Buy")} className={`px-2.5 text-xs py-1.5 ${row.action === "Buy" ? "bg-emerald-500 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400"}`}>Buy</button>
                  <button onClick={() => updateRow(idx, "action", "Sell")} className={`px-2.5 text-xs py-1.5 ${row.action === "Sell" ? "bg-rose-500 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400"}`}>Sell</button>
                </div>
                <select
                  value={row.type} onChange={(e) => updateRow(idx, "type", e.target.value)}
                  className="flex-shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="CE">CE</option><option value="PE">PE</option><option value="FUT">FUT</option><option value="Other">Other</option>
                </select>
                {legRows.length > 1 && (
                  <button onClick={() => removeRow(idx)} className="text-zinc-600 hover:text-rose-600 flex-shrink-0">
                    <IconX size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-xs text-zinc-500 mb-1">Based on these legs, this looks like:</p>
          <p className="text-xs text-zinc-200 leading-relaxed">{inferredDescription}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!canSave} className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
            {isEdit ? "Save changes" : "Add strategy"}
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ChecklistItemForm({ initial, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [sub, setSub] = useState(typeof initial?.sub === "string" ? initial.sub : "");
  const [critical, setCritical] = useState(!!initial?.critical);
  const [appliesAll, setAppliesAll] = useState(!initial || initial.applies === "all");
  const [appliesProfiles, setAppliesProfiles] = useState(
    initial && Array.isArray(initial.applies) ? initial.applies : []
  );

  const toggleProfile = (id) => setAppliesProfiles((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const handleSave = () => {
    if (!label.trim()) { playErrorBeep(); return; }
    onSave({
      label,
      sub,
      critical,
      applies: appliesAll ? "all" : appliesProfiles,
    });
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950/80 p-4 space-y-3">
      <label className="block">
        <span className="text-xs text-zinc-500">Checklist point</span>
        <input
          type="text" value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Checked overnight news before holding position"
          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </label>
      <label className="block">
        <span className="text-xs text-zinc-500">Note / explanation (optional)</span>
        <textarea
          value={sub} onChange={(e) => setSub(e.target.value)} rows={2}
          placeholder="Why this check matters"
          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </label>
      <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
        <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} className="w-4 h-4 accent-amber-400" />
        Mark as critical — blocks "Armed" status until checked
      </label>
      <div>
        <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer mb-1.5">
          <input type="checkbox" checked={appliesAll} onChange={(e) => setAppliesAll(e.target.checked)} className="w-4 h-4 accent-amber-400" />
          Applies to all strategies
        </label>
        {!appliesAll && (
          <div className="ml-6 space-y-1.5">
            {CHECKLIST_PROFILE_OPTIONS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={appliesProfiles.includes(p.id)} onChange={() => toggleProfile(p.id)} className="w-3.5 h-3.5 accent-amber-400" />
                {p.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={!label.trim()} className="tj-primary-bg disabled:opacity-40 font-semibold text-xs px-4 py-2 rounded-lg flex-1">
          Save
        </button>
        <button onClick={onCancel} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-4 py-2 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ChecklistManagerTab({ sections, onAddItem, onEditItem, onDeleteItem, onAddSection, onDeleteSection, onEditSection }) {
  const [addingSectionId, setAddingSectionId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteSectionId, setPendingDeleteSectionId] = useState(null);
  const [addingNewSection, setAddingNewSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const defaultSectionIds = DEFAULT_SECTION_DEFS.map((s) => s.id);

  const startEditingSectionTitle = (section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
  };
  const submitSectionTitle = () => {
    if (!editingSectionTitle.trim()) { playErrorBeep(); return; }
    onEditSection(editingSectionId, editingSectionTitle);
    setEditingSectionId(null);
    setEditingSectionTitle("");
  };

  const submitNewSection = () => {
    if (!newSectionTitle.trim()) { playErrorBeep(); return; }
    onAddSection(newSectionTitle);
    setNewSectionTitle("");
    setAddingNewSection(false);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-zinc-500">
        Add, edit, or remove points from your pre-trade checklist. Anything marked <span className="text-amber-400 font-semibold">Critical</span> must be checked before a trade counts as "Armed".
      </p>

      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 p-5">
        {addingNewSection ? (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-zinc-500">New checklist section title</span>
              <input
                type="text" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g. Post-Trade Review"
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <div className="flex gap-2">
              <button onClick={submitNewSection} disabled={!newSectionTitle.trim()} className="tj-primary-bg disabled:opacity-40 font-semibold text-xs px-4 py-2 rounded-lg flex-1">
                Create Section
              </button>
              <button onClick={() => { setAddingNewSection(false); setNewSectionTitle(""); }} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingNewSection(true)} className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
            <IconPlus size={13} /> New Checklist Section
          </button>
        )}
      </div>
      {sections.map((s) => {
        const Icon = s.icon;
        const cc = COLOR_CLASSES[s.color] || COLOR_CLASSES.amber;
        const isCustomSection = !defaultSectionIds.includes(s.id);
        const isEditingTitle = editingSectionId === s.id;
        return (
          <div key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-8 h-8 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center flex-shrink-0`}>
                <Icon size={15} />
              </span>
              {isEditingTitle ? (
                <input
                  type="text" autoFocus value={editingSectionTitle} onChange={(e) => setEditingSectionTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitSectionTitle(); if (e.key === "Escape") setEditingSectionId(null); }}
                  className="flex-1 bg-zinc-950 border border-amber-400 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none"
                  style={FONT_DISPLAY}
                />
              ) : (
                <p className="text-sm font-semibold text-zinc-100 flex-1" style={FONT_DISPLAY}>{s.title}</p>
              )}
              {isEditingTitle ? (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={submitSectionTitle} disabled={!editingSectionTitle.trim()} className="text-[10px] font-semibold text-zinc-950 tj-primary-bg disabled:opacity-40 px-2 py-1 rounded">Save</button>
                  <button onClick={() => setEditingSectionId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                </span>
              ) : (
                <Tooltip text="Edit section name">
                  <button onClick={() => startEditingSectionTitle(s)} className="text-zinc-500 hover:tj-primary-text flex-shrink-0">
                    <IconPencil size={14} />
                  </button>
                </Tooltip>
              )}
              {isCustomSection && !isEditingTitle && (
                pendingDeleteSectionId === s.id ? (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { onDeleteSection(s.id); setPendingDeleteSectionId(null); }} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 px-2 py-1 rounded">Confirm</button>
                    <button onClick={() => setPendingDeleteSectionId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                  </span>
                ) : (
                  <Tooltip text="Delete section">
                    <button onClick={() => setPendingDeleteSectionId(s.id)} className="text-zinc-500 hover:text-rose-600 flex-shrink-0">
                      <IconTrash size={14} />
                    </button>
                  </Tooltip>
                )
              )}
            </div>
            <div className="space-y-2">
              {s.items.map((item) => {
                const isDynamic = typeof item.sub === "function";
                return (
                <div key={item.id}>
                  {editingItemId === item.id && !isDynamic ? (
                    <ChecklistItemForm
                      initial={item}
                      onSave={(values) => { onEditItem(item, s.id, values); setEditingItemId(null); }}
                      onCancel={() => setEditingItemId(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 flex items-center gap-2 flex-wrap">
                          {item.label}
                          {item.critical && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded" style={FONT_MONO}>
                              <IconFlag size={10} /> Critical
                            </span>
                          )}
                          {isDynamic && (
                            <Tooltip text="Its note changes automatically depending on the selected strategy, so it can't be edited.">
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded" style={FONT_MONO}>
                                <IconLock size={10} /> Auto note
                              </span>
                            </Tooltip>
                          )}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {item.applies === "all" ? "Applies to all strategies" : `Applies to: ${(item.applies || []).map((p) => (CHECKLIST_PROFILE_OPTIONS.find((o) => o.id === p) || {}).label || p).join(", ") || "—"}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isDynamic && (
                          <Tooltip text="Edit">
                            <button onClick={() => setEditingItemId(item.id)} className="text-zinc-500 hover:text-zinc-200">
                              <IconPencil size={14} />
                            </button>
                          </Tooltip>
                        )}
                        {pendingDeleteId === item.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => { onDeleteItem(item, s.id); setPendingDeleteId(null); }} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 px-2 py-1 rounded">Confirm</button>
                            <button onClick={() => setPendingDeleteId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                          </span>
                        ) : (
                          <Tooltip text="Delete">
                            <button onClick={() => setPendingDeleteId(item.id)} className="text-zinc-500 hover:text-rose-600">
                              <IconTrash size={14} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
              {s.items.length === 0 && <p className="text-xs text-zinc-600">No checklist points in this section.</p>}
            </div>
            <div className="mt-3">
              {addingSectionId === s.id ? (
                <ChecklistItemForm
                  onSave={(values) => { onAddItem(s.id, values); setAddingSectionId(null); }}
                  onCancel={() => setAddingSectionId(null)}
                />
              ) : (
                <button onClick={() => setAddingSectionId(s.id)} className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
                  <IconPlus size={13} /> Add checklist point
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabBar({ tabs, activeTab, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl border whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            activeTab === t.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          {t.num && <span style={FONT_MONO} className={activeTab === t.id ? "opacity-100" : "opacity-80"}>{t.num}</span>}
          {t.label}
          <span className="text-[10px]" style={FONT_MONO}>{t.badge}</span>
          {t.warn && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>}
        </button>
      ))}
    </div>
  );
}

const DEFAULT_AVATAR = { id: "f5", hair: "long", colors: ["#14b8a6", "#0f766e"] };

function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "#09090b" }}>
      <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-100" style={FONT_DISPLAY}>
        <IconChecklist size={22} className="tj-primary-text" />
        Comet Trading Journal
      </div>
      <div className="w-40 h-1 rounded-full bg-zinc-800 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-1/3 tj-primary-bg rounded-full" style={{ animation: "tj-loading-sweep 1.1s ease-in-out infinite" }}></div>
      </div>
      <p className="text-xs text-zinc-600" style={FONT_MONO}>Loading your journal...</p>
    </div>
  );
}

const AvatarSVG = React.memo(function AvatarSVG({ preset, size = 64, animate = true, delay = 0 }) {
  if (!preset) return null;
  const gradId = `tj-avatar-grad-${preset.id}`;
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size}
      className={animate ? "tj-avatar-breathe" : ""}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.colors[0]} />
          <stop offset="100%" stopColor={preset.colors[1]} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${gradId})`} />
      <path d="M 18 96 Q 50 64 82 96 Z" fill="rgba(255,255,255,0.9)" />
      <circle cx="50" cy="42" r="18" fill="rgba(255,255,255,0.97)" />
      {preset.hair === "short" ? (
        <path d="M 31 35 Q 50 17 69 35 Q 68 25 50 23 Q 32 25 31 35 Z" fill={preset.colors[1]} />
      ) : (
        <path d="M 29 46 Q 26 19 50 19 Q 74 19 71 46 Q 67 29 50 29 Q 33 29 29 46 Z" fill={preset.colors[1]} />
      )}
    </svg>
  );
});

function buildCalendarWeeks(year, monthIdx) {
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const startDow = new Date(year, monthIdx, 1).getDay(); // 0=Sun..6=Sat
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const weeks = [];
  let week = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    week.push(dayNum < 1 || dayNum > daysInMonth ? null : dayNum);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  return weeks;
}

const CALENDAR_DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// businessDaysOnly=true: weekends + holiday-calendar dates render red and
// are inert — clicking them neither selects nor closes the calendar, per
// spec. businessDaysOnly=false (used for export/filter ranges, which can
// legitimately span any day up to today): every day up to maxDate behaves
// normally, no red styling.
const CALENDAR_EST_HEIGHT = 370;

function CalendarPicker({ value, onChange, holidays, businessDaysOnly = false, highlightNonBusinessDays = false, minDate, maxDate, placeholder = "Select date", compact = false, error = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [subView, setSubView] = useState("days"); // "days" | "months" — click the header to jump years fast
  const btnRef = useRef(null);
  const holidaySet = useMemo(() => new Set((holidays || []).map((h) => h.date)), [holidays]);

  const parseViewFromValue = () => {
    if (value) { const [y, m] = value.split("-").map(Number); return { year: y, month: m - 1 }; }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  };
  const [view, setView] = useState(parseViewFromValue);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const width = Math.max(rect.width, 280);
      // Flip to open upward when there isn't room below but there is
      // above — otherwise the popup can render mostly off-screen with no
      // way to scroll it into view, since it's viewport-fixed, not
      // page-fixed. When flipping, clamp the top so the popup can never
      // itself clip off the top of the viewport (a hard boundary nothing
      // can render above), regardless of how close the button is to it.
      if (spaceBelow < CALENDAR_EST_HEIGHT && spaceAbove > spaceBelow) {
        setCoords({ top: Math.max(8, rect.top - 6 - CALENDAR_EST_HEIGHT), left: rect.left, width, openUpward: true });
      } else {
        setCoords({ top: rect.bottom + 6, left: rect.left, width, openUpward: false });
      }
    }
  };
  const openCalendar = () => {
    setView(parseViewFromValue());
    setSubView("days");
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const isNonBusinessDay = (iso) => isWeekendISO(iso) || holidaySet.has(iso);
  const isSelectable = (iso) => {
    if (minDate && iso < minDate) return false;
    if (maxDate && iso > maxDate) return false;
    if (businessDaysOnly && isNonBusinessDay(iso)) return false;
    return true;
  };

  const handleDayClick = (iso) => {
    if (!isSelectable(iso)) return; // invalid — no selection, no close
    onChange(iso);
    setOpen(false);
  };

  const weeks = buildCalendarWeeks(view.year, view.month);
  const todayIso = localISODate(Date.now());
  const goPrevMonth = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNextMonth = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  const showRedHeader = businessDaysOnly || highlightNonBusinessDays;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        className={`w-full flex items-center justify-between gap-1.5 bg-zinc-950 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 ${error ? "border-rose-500" : "border-zinc-800"} ${compact ? "px-2 py-1.5" : "px-3 py-2"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        style={FONT_MONO}
      >
        <span className={`whitespace-nowrap ${value ? "text-zinc-100" : "text-zinc-600"}`}>{value ? isoToDMY(value) : placeholder}</span>
        <IconCalendar size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-3 tj-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {subView === "days" ? (
              <>
                <div className="flex items-center justify-between mb-3 px-1">
                  <button type="button" onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronLeft size={15} />
                  </button>
                  <button type="button" onClick={() => setSubView("months")} className="text-xs font-semibold text-zinc-200 hover:text-amber-400 transition-colors px-2 py-0.5 rounded" style={FONT_MONO}>
                    {MONTH_NAMES[view.month]} {view.year}
                  </button>
                  <button type="button" onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronRight size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {CALENDAR_DOW_LABELS.map((d, i) => (
                    <div key={i} className={`text-center text-[10px] font-semibold ${showRedHeader && (i === 0 || i === 6) ? "text-rose-600" : "text-zinc-500"}`} style={FONT_MONO}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weeks.flat().map((dayNum, i) => {
                    if (dayNum === null) return <div key={i} />;
                    const iso = `${view.year}-${pad2(view.month + 1)}-${pad2(dayNum)}`;
                    const selectable = isSelectable(iso);
                    const showRed = showRedHeader && isNonBusinessDay(iso);
                    const isSelected = value === iso;
                    const isToday = todayIso === iso;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDayClick(iso)}
                        disabled={!selectable}
                        className={`aspect-square rounded-lg text-xs flex items-center justify-center transition-colors ${
                          isSelected ? "tj-primary-bg font-bold" :
                          !selectable ? `cursor-not-allowed ${showRed ? "text-rose-600/70" : "text-zinc-700"}` :
                          `${showRed ? "text-rose-600" : "text-zinc-200"} hover:bg-zinc-800 ${isToday ? "ring-1 ring-inset ring-zinc-600" : ""}`
                        }`}
                        style={FONT_MONO}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 px-1">
                  <button type="button" onClick={() => setView((v) => ({ ...v, year: v.year - 1 }))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronLeft size={15} />
                  </button>
                  <p className="text-xs font-semibold text-zinc-200" style={FONT_MONO}>{view.year}</p>
                  <button type="button" onClick={() => setView((v) => ({ ...v, year: v.year + 1 }))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconChevronRight size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_ABBR.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setView((v) => ({ ...v, month: i })); setSubView("days"); }}
                      className={`text-xs py-2.5 rounded-lg transition-colors ${view.month === i && subView === "months" ? "tj-primary-bg font-bold" : "text-zinc-200 hover:bg-zinc-800"}`}
                      style={FONT_MONO}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
              <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-colors">
                Clear
              </button>
              <button type="button" onClick={() => setOpen(false)} className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function MonthPicker({ value, onChange, placeholder = "Select month" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const [viewYear, setViewYear] = useState(() => (value ? parseInt(value.slice(0, 4), 10) : new Date().getFullYear()));

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const width = Math.max(rect.width, 240);
      if (spaceBelow < CALENDAR_EST_HEIGHT && spaceAbove > spaceBelow) {
        setCoords({ top: Math.max(8, rect.top - 6 - CALENDAR_EST_HEIGHT), left: rect.left, width, openUpward: true });
      } else {
        setCoords({ top: rect.bottom + 6, left: rect.left, width, openUpward: false });
      }
    }
  };
  const openPicker = () => {
    setViewYear(value ? parseInt(value.slice(0, 4), 10) : new Date().getFullYear());
    updatePosition();
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={() => (open ? setOpen(false) : openPicker())}
        className="w-full flex items-center justify-between gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
        style={FONT_MONO}
      >
        <span className={value ? "text-zinc-100" : "text-zinc-600"}>{value ? monthLabel(value) : placeholder}</span>
        <IconCalendar size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-3 tj-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <button type="button" onClick={() => setViewYear((y) => y - 1)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <IconChevronLeft size={15} />
              </button>
              <p className="text-xs font-semibold text-zinc-200" style={FONT_MONO}>{viewYear}</p>
              <button type="button" onClick={() => setViewYear((y) => y + 1)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <IconChevronRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_ABBR.map((m, i) => {
                const key = `${viewYear}-${pad2(i + 1)}`;
                const isSelected = value === key;
                return (
                  <button
                    key={i} type="button"
                    onClick={() => { onChange(key); setOpen(false); }}
                    className={`text-xs py-2.5 rounded-lg transition-colors ${isSelected ? "tj-primary-bg font-bold" : "text-zinc-200 hover:bg-zinc-800"}`}
                    style={FONT_MONO}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function YearPicker({ value, onChange, years, placeholder = "Select year" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const width = Math.max(rect.width, 160);
      if (spaceBelow < 260 && spaceAbove > spaceBelow) {
        setCoords({ top: Math.max(8, rect.top - 6 - 260), left: rect.left, width, openUpward: true });
      } else {
        setCoords({ top: rect.bottom + 6, left: rect.left, width, openUpward: false });
      }
    }
  };
  const openPicker = () => { updatePosition(); setOpen(true); };
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={() => (open ? setOpen(false) : openPicker())}
        className="w-full flex items-center justify-between gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
        style={FONT_MONO}
      >
        <span className={value ? "text-zinc-100" : "text-zinc-600"}>{value || placeholder}</span>
        <IconCalendar size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] max-h-60 overflow-y-auto rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-2 tj-popover space-y-1"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {years.map((y) => (
              <button
                key={y} type="button"
                onClick={() => { onChange(y); setOpen(false); }}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${value === y ? "tj-primary-bg font-bold" : "text-zinc-200 hover:bg-zinc-800"}`}
                style={FONT_MONO}
              >
                {y}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function ExpiryPicker({ value, onChange, holidays, referenceDate }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const options = useMemo(() => generateExpiryOptions(holidays, referenceDate), [holidays, referenceDate]);
  const selected = options.find((o) => o.iso === value);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 12; // small breathing room from the viewport edge
      const maxHeight = Math.max(120, Math.min(256, spaceBelow));
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight });
    }
    setOpen(true);
  };

  // Lock the page in place while open — a true dropdown, not something that
  // has to chase the button around as the page scrolls underneath it.
  // Scrollbar-width compensation isn't needed here: the global
  // `scrollbar-gutter: stable` rule (index.css) already keeps that space
  // permanently reserved, so adding padding-right on top of it would
  // double-count the gutter and shift content sideways when locking.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="w-full flex items-center justify-between gap-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
        style={FONT_MONO}
      >
        <span className="truncate">{selected ? selected.label : "Expiry"}</span>
        {open ? <IconChevronUp size={13} className="flex-shrink-0" /> : <IconChevronDown size={13} className="flex-shrink-0" />}
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] overflow-y-auto rounded-lg border border-zinc-800 tj-solid-bg shadow-2xl tj-popover"
            style={{ top: coords.top, left: coords.left, width: Math.max(coords.width, 208), maxHeight: coords.maxHeight }}
          >
            {options.map((o) => (
              <button
                type="button"
                key={o.iso}
                onClick={() => { onChange(o.iso); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs ${o.iso === value ? "tj-primary-bg font-semibold" : "text-zinc-200 hover:bg-zinc-800"}`}
                style={FONT_MONO}
              >
                {o.label} ({o.days} Day{o.days === 1 ? "" : "s"})
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function LegsCard({ underlying, onUnderlyingChange, legs, onAdd, onRemove, onUpdate, netPremium, payoffInfo, holidays, referenceDate, closingLegId, onStartClose, onCancelClose, onCloseLeg, closedLegsPL, onSetLegKind, onOpenTimeline }) {
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

// Inline form for closing a single leg — enter the closing premium, see
// that leg's own P/L before confirming. Separate from generic field edits
// since closing is a one-way, permanent action.
function CloseLegForm({ leg, onConfirm, onCancel }) {
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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Builds a chronological, timestamped list of every event across a trade's
// legs: each leg's opening, and separately its closing if it has one
// (roll/partial/full), each tagged with what kind of event it was and any
// relevant detail (P/L, lots, what it rolled into). Sorted purely by real
// timestamp so the sequence always matches when things actually happened,
// regardless of leg array order.
function buildLegTimeline(legs, fallbackTs) {
  const events = [];
  const byId = new Map((legs || []).map((l) => [l.id, l]));
  // A partial close splits one leg record into a closed fragment (keeping
  // the original id) and a new remainder leg (a fresh id, linked back via
  // partialCloseOfLegId). Walking that chain back to its root and summing
  // every fragment's qty reconstructs the position's real original size —
  // otherwise each split fragment would wrongly get counted as its own
  // separate "opened" event.
  const findRoot = (leg) => {
    let current = leg;
    while (current.partialCloseOfLegId && byId.has(current.partialCloseOfLegId)) current = byId.get(current.partialCloseOfLegId);
    return current;
  };
  const openedRootIds = new Set();
  (legs || []).forEach((l) => {
    const root = findRoot(l);
    if (!openedRootIds.has(root.id)) {
      openedRootIds.add(root.id);
      const lineageTotalQty = (legs || []).filter((other) => findRoot(other).id === root.id).reduce((s, other) => s + (parseFloat(other.qty) || 0), 0);
      const openLabel = root.legKind === "hedge" ? "Hedge added" : root.legKind === "adjustment" ? "Adjustment added" : root.legKind === "increase-position" ? "Position increased" : root.legKind === "roll-replacement" ? "Roll — new leg opened" : "Leg opened";
      events.push({ ts: root.openedAt || fallbackTs || 0, kind: "open", legKind: root.legKind, legDesc: root.name || `${root.action} ${root.type} ${root.strike}`, label: openLabel, detail: `at ${fmt2dp(root.premium)}, qty ${lineageTotalQty}` });
    }
    if (l.closedAt) {
      const replacement = (legs || []).find((r) => r.rolledFromLegId === l.id);
      const closeLabel = l.closeType === "roll" ? "Leg rolled" : l.closeType === "partial" ? "Partially closed" : "Leg closed";
      const pl = computeLegPL(l);
      const plStr = pl !== null ? `${pl >= 0 ? "+" : ""}${fmtINR(pl)}` : "—";
      const rollNote = replacement ? ` — rolled into ${replacement.name || `${replacement.action} ${replacement.type} ${replacement.strike || "(new)"}`}` : "";
      events.push({ ts: l.closedAt, kind: "close", legKind: l.closeType, legDesc: l.name || `${l.action} ${l.type} ${l.strike}`, label: closeLabel, detail: `at ${fmt2dp(l.closePremium)}, qty ${l.qty} · P/L ${plStr}${rollNote}` });
    }
  });
  events.sort((a, b) => a.ts - b.ts);
  return events;
}

function LegsTimelineModal({ legs, onClose, referenceDate }) {
  const fallbackTs = useMemo(() => {
    if (!referenceDate) return null;
    const t = new Date(referenceDate + "T00:00:00").getTime();
    return Number.isNaN(t) ? null : t;
  }, [referenceDate]);
  const events = useMemo(() => buildLegTimeline(legs, fallbackTs), [legs, fallbackTs]);
  return createPortal(
    <div className="fixed inset-0 z-[9995] flex items-start justify-center pt-10 px-4 pb-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl w-full overflow-y-auto" style={{ maxWidth: 820, maxHeight: "calc(100vh - 3rem)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 tj-solid-bg z-10">
          <p className="text-base font-bold text-zinc-100" style={FONT_DISPLAY}>Position Timeline</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><IconX size={18} /></button>
        </div>
        <div className="p-6">
          {events.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">No events yet.</p>
          ) : (
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left font-medium py-2 pr-3 w-10">#</th>
                  <th className="text-left font-medium py-2 pr-3">Date &amp; Time</th>
                  <th className="text-left font-medium py-2 pr-3">Event</th>
                  <th className="text-left font-medium py-2 pr-3">Leg</th>
                  <th className="text-left font-medium py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i} className="border-b border-zinc-900">
                    <td className="py-2.5 pr-3 text-zinc-600" style={FONT_MONO}>{i + 1}</td>
                    <td className="py-2.5 pr-3 text-zinc-400 whitespace-nowrap" style={FONT_MONO}>{fmtDateTimeDMY(ev.ts)}</td>
                    <td className="py-2.5 pr-3 text-zinc-200 font-semibold whitespace-nowrap">{ev.label}</td>
                    <td className="py-2.5 pr-3 text-zinc-300" style={FONT_MONO}>{ev.legDesc}</td>
                    <td className="py-2.5 text-zinc-400">{ev.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg font-semibold">Close</button>
        </div>
      </div>
    </div>,
    getPortalTarget()
  );
}

function dayNameOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const GREETING_WORDS = ["Hi", "Hello", "Welcome back", "Hey there", "Greetings"];

const QUOTE_OF_DAY = { quote: "You must expect great things of yourself before you can do them.", author: "Michael Jordan" };

const StatCard = React.memo(function StatCard({ icon: Icon, label, value, valueColor = "text-zinc-100", small = false, info }) {
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

const InsightCard = React.memo(function InsightCard({ label, value, sub, valueColor = "text-zinc-100" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5" style={FONT_MONO}>{label}</p>
      <p className={`text-lg font-bold ${valueColor} truncate`} style={FONT_DISPLAY}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
});

function CollapsibleSection({ title, icon: Icon, open, onToggle, children }) {
  const containerRef = useRef(null);
  const [overflowVisible, setOverflowVisible] = useState(open);

  useEffect(() => {
    if (open) {
      // Keep content clipped until the grid has actually finished growing
      // to fit it — removing the clip immediately let content visually pop
      // into full view before the row height had caught up, making the
      // expand look instant instead of smooth.
      const t = setTimeout(() => setOverflowVisible(true), 750);
      return () => clearTimeout(t);
    }
    setOverflowVisible(false); // closing — clip immediately, no animation to wait for
  }, [open]);

  const handleToggle = () => {
    const wasOpen = open;
    onToggle();
    if (!wasOpen) {
      // Opening from closed — scroll so the section comes into view as it
      // expands, rather than leaving the user to scroll down manually.
      // A single early scroll attempt gets clamped when this section is
      // near the bottom of the page: at that moment the page hasn't grown
      // tall enough yet (the content hasn't expanded), so the browser
      // can't scroll as far as the target requires. Re-asserting the
      // target every frame across the animation lets the scroll catch up
      // naturally as the page grows.
      const el = containerRef.current;
      if (!el) return;
      const NAVBAR_OFFSET = 88;
      const DURATION = 780;
      const start = performance.now();
      const tick = () => {
        const rect = el.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - NAVBAR_OFFSET;
        window.scrollTo({ top: Math.max(0, targetY) });
        if (performance.now() - start < DURATION) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  return (
    <div ref={containerRef} style={{ scrollMarginTop: "88px" }}>
      <button onClick={handleToggle} className="tj-section-toggle flex items-center justify-between w-full group px-6 sm:px-7 py-3 rounded-xl transition-colors">
        <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2 group-hover:text-zinc-300 transition-colors" style={FONT_MONO}>
          <Icon size={13} /> {title}
        </p>
        <IconChevronDown size={16} className={`text-zinc-500 group-hover:text-zinc-300 transition-transform duration-[750ms] ${open ? "" : "-rotate-90"}`} />
      </button>
      <div
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          marginTop: open ? "1rem" : "0px",
          transition: "grid-template-rows 750ms ease-in-out, margin-top 750ms ease-in-out",
        }}
      >
        <div className={overflowVisible ? "min-h-0" : "overflow-hidden min-h-0"}>
          <div className="space-y-4 pt-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Same grid-rows grow animation as CollapsibleSection (0fr -> 1fr, with
// overflow clipped until the transition finishes so content doesn't pop
// into full view early) but with no scroll-into-view behavior — meant to
// be remounted via a changing `key` on the caller's side, so switching to
// different content triggers a fresh "grow into view" each time rather
// than an instant swap.
// Same grid-rows grow/shrink mechanism as CollapsibleSection (0fr <-> 1fr,
// with overflow clipped until the transition finishes) but as a persistent
// element whose `open` state toggles — never unmounted/remounted — so
// toggling smoothly collapses and expands the same content both ways,
// with no scroll-into-view behavior. `animated={false}` snaps instantly
// instead, for the case where this region shouldn't visibly animate at all.
function CollapsibleRegion({ open, animated, duration = 750, children }) {
  const [overflowVisible, setOverflowVisible] = useState(open);
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setOverflowVisible(true), animated ? duration : 0);
      return () => clearTimeout(t);
    }
    setOverflowVisible(false);
  }, [open, animated, duration]);

  return (
    <div
      className="grid overflow-x-hidden"
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        transition: animated ? `grid-template-rows ${duration}ms ease-in-out` : "none",
      }}
    >
      <div className={overflowVisible ? "min-h-0" : "overflow-hidden min-h-0"}>{children}</div>
    </div>
  );
}

const MonthlyPLChart = React.memo(function MonthlyPLChart({ pnlEntries, year }) {
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


const ExitDateHeatmap = React.memo(function ExitDateHeatmap({ pnlEntries }) {
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

const HomePage = React.memo(function HomePage({ userProfile, totalCapital, pnlEntries, history, journeyOpen, setJourneyOpen, deepDiveOpen, setDeepDiveOpen, dueReminders, onOpenReminders }) {
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

const MCP_SERVER_URL = "https://nqgqebcuycdbihejbjbg.supabase.co/functions/v1/mcp";

function CopyableCode({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (err) { /* clipboard unavailable */ }
  };
  return (
    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5">
      <code className="flex-1 text-xs text-zinc-300 overflow-x-auto whitespace-pre" style={FONT_MONO}>{value}</code>
      <Tooltip text={copied ? "Copied!" : "Copy"}>
        <button onClick={copy} className="flex-shrink-0 text-zinc-500 hover:tj-primary-text">
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </Tooltip>
    </div>
  );
}

function DocsToolCard({ name, description, params, kind = "read" }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold tj-primary-text" style={FONT_MONO}>{name}</p>
        {kind === "write" ? (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5 flex-shrink-0">Writes data</span>
        ) : (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-zinc-500 bg-zinc-800/70 rounded-full px-2 py-0.5 flex-shrink-0">Read-only</span>
        )}
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      {params.length > 0 && (
        <div className="pt-1.5 border-t border-zinc-800/70 space-y-1">
          {params.map((p) => (
            <p key={p.name} className="text-sm text-zinc-500">
              <span className="text-zinc-300" style={FONT_MONO}>{p.name}</span>
              <span className="text-zinc-600"> ({p.type}{p.optional ? ", optional" : ""})</span>
              {" — "}{p.desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function DocsCardLink({ icon, title, description, actionLabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 p-4 space-y-2.5 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="w-7 h-7 rounded-lg bg-zinc-800/70 flex items-center justify-center text-zinc-400">{icon}</div>
        <IconChevronRight size={14} className="text-zinc-600" />
      </div>
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      <p className="text-sm tj-primary-text font-semibold flex items-center gap-1 pt-0.5">{actionLabel} <IconChevronRight size={12} /></p>
    </button>
  );
}

const DOCS_SECTIONS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "checklist", label: "Pre-Trade Checklist" },
  { id: "trade-setup", label: "Trade Setup" },
  { id: "trade-history", label: "Trade History" },
  { id: "reminders", label: "Reminders" },
  { id: "learnings", label: "My Learnings" },
  { id: "downloads", label: "Downloads" },
  { id: "settings", label: "Settings & Security" },
  { id: "mcp-server", label: "MCP Server" },
];

function DocsHeader({ title, lead }) {
  return (
    <div>
      <p className="text-2xl font-bold text-zinc-100 mb-2" style={FONT_DISPLAY}>{title}</p>
      <p className="text-base text-zinc-400 leading-relaxed">{lead}</p>
    </div>
  );
}

function DocsSection({ id, title, children }) {
  return (
    <div id={id} className="space-y-2.5 scroll-mt-4">
      <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>{title}</p>
      <div className="text-sm text-zinc-400 leading-relaxed space-y-2.5">{children}</div>
    </div>
  );
}

function DocsSubCard({ title, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      <div className="text-sm text-zinc-400 leading-relaxed space-y-1.5">{children}</div>
    </div>
  );
}

// Single-column layout used by every doc page — kept as a shared wrapper
// (rather than inlined per page) purely so the width constraint stays
// consistent everywhere without repeating it nine times.
function DocsPageLayout({ children }) {
  return <div className="max-w-6xl space-y-7">{children}</div>;
}

// Shared quick-access card grid — cards still jump to their matching
// section below via the same ids DocsSection targets already carry.
function DocsCardGrid({ cards }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Column count chosen per page so cards never leave a single orphan
  // stranded alone on its own row with empty space beside it — a 4-card
  // page becomes a balanced 2x2, not a 3-then-1.
  const cols = cards.length === 2 || cards.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid ${cols} gap-3`}>
      {cards.map((c) => (
        <DocsCardLink key={c.id} icon={c.icon} title={c.title} description={c.description} actionLabel={c.actionLabel} onClick={() => scrollTo(c.id)} />
      ))}
    </div>
  );
}

function GettingStartedDocsPage() {
  const CARDS = [
    { id: "workflow", icon: <IconChecklist size={15} />, title: "The Core Workflow", description: "Checklist → Setup → History → Dashboard.", actionLabel: "See the workflow" },
    { id: "other-areas", icon: <IconBulb size={15} />, title: "Everything Else", description: "Reminders, My Learnings, and more.", actionLabel: "Explore" },
    { id: "security", icon: <IconLock size={15} />, title: "Your Data & Security", description: "Account scope and the PIN lock.", actionLabel: "Learn more" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Getting Started"
        lead="Comet Trading Journal is a personal F&O (futures & options) trading journal — built around a discipline-first workflow, not just a P&L spreadsheet."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="workflow" title="The core workflow">
        <p>The app is built around four areas, meant to be used roughly in order for each trade:</p>
        <p><span className="text-zinc-200 font-semibold">1. Checklist</span> — before entering a trade, run through your own pre-trade discipline checklist. Critical items must be checked before the app considers you "armed" to trade.</p>
        <p><span className="text-zinc-200 font-semibold">2. Trade Setup</span> — pick a strategy, build out its legs, see the payoff shape, and record your reasoning before you actually place the trade.</p>
        <p><span className="text-zinc-200 font-semibold">3. Trade History</span> — once a trade is live, this is where it's tracked: editing legs as the position evolves, closing, rolling, or adjusting, and reviewing P&L.</p>
        <p><span className="text-zinc-200 font-semibold">4. Dashboard</span> — the numbers roll up here automatically: win rate, streaks, profit factor, expectancy, and more, all computed from your actual logged trades.</p>
      </DocsSection>

      <DocsSection id="other-areas" title="Everything else">
        <p><span className="text-zinc-200 font-semibold">Reminders</span> — market events, trade-specific alerts, and personal reminders, each with its own severity.</p>
        <p><span className="text-zinc-200 font-semibold">My Learnings</span> — a full notes system for trade journaling, research, and reusable templates, separate from the trade log itself.</p>
        <p>Everything above is reached from the top navigation bar. Your profile picture (top right) opens Settings, the Holiday Calendar, these Docs, and Sign Out.</p>
      </DocsSection>

      <DocsSection id="security" title="Your data, and getting locked out">
        <p>Every trade, note, and reminder is scoped strictly to your own account — nothing is ever visible across accounts, including through the MCP server (see that section for detail).</p>
        <p>On top of your account login, this app has its own PIN lock, checked independently every time you open it. See <span className="text-zinc-200">Settings &amp; Security</span> for how PIN setup, lockouts, and recovery work.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function ChecklistDocsPage() {
  const CARDS = [
    { id: "modes", icon: <IconAdjustmentsHorizontal size={15} />, title: "Trade Day vs. No-Trade Day", description: "Two modes, one for each kind of day.", actionLabel: "See the modes" },
    { id: "armed", icon: <IconChecklist size={15} />, title: "Critical vs. Optional", description: "What actually gates you from trading.", actionLabel: "How it works" },
    { id: "manage", icon: <IconSettings size={15} />, title: "Customize Your Checklist", description: "Add, edit, and reorder your own items.", actionLabel: "Manage it" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Pre-Trade Checklist"
        lead="A discipline gate that runs before every trade — not a formality, it actually controls whether you're considered ready to trade."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="modes" title="Trade Day vs. No-Trade Day">
        <p>Every day, pick one of two modes:</p>
        <p><span className="text-zinc-200 font-semibold">Trade Day</span> — the full checklist applies, and the <span className="text-zinc-200">Trade Setup</span> tab only becomes available once you're "armed" (see below).</p>
        <p><span className="text-zinc-200 font-semibold">No-Trade Day</span> — a simpler flow for days you've deliberately decided to sit out. Trade Setup stays hidden from the top navigation entirely while in this mode.</p>
      </DocsSection>

      <DocsSection id="armed" title="Critical vs. optional items">
        <p>Checklist items live in sections, and each item is either <span className="text-zinc-200 font-semibold">critical</span> or optional. Critical items must be checked before you're "ARMED" — shown as a status pill at the top of the page, with a pulsing indicator while checks are still pending.</p>
        <p>Items can also be scoped to only apply to certain strategies — a critical check for a directional trade doesn't need to block you on a delta-neutral one, for example. The set of applicable items updates automatically based on what strategy you've selected.</p>
      </DocsSection>

      <DocsSection id="manage" title="Customizing your own checklist">
        <p>Click <span className="text-zinc-200">Manage Checklist</span> to add, edit, reorder, or remove sections and items — this is your own checklist, not a fixed template. Mark an item critical or optional, and choose which strategies it applies to.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function TradeSetupDocsPage() {
  const CARDS = [
    { id: "strategy", icon: <IconTarget size={15} />, title: "Picking a Strategy", description: "Categories, and adding your own.", actionLabel: "See strategies" },
    { id: "legs", icon: <IconAdjustmentsHorizontal size={15} />, title: "Legs & Payoff", description: "Templates, hedges, and the payoff shape.", actionLabel: "Build a position" },
    { id: "notes", icon: <IconFileText size={15} />, title: "Notes & Templates", description: "Your reasoning, with template support.", actionLabel: "See notes" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Trade Setup"
        lead="Build out a strategy — legs, payoff, and reasoning — before it becomes a live position in Trade History."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="strategy" title="Picking a strategy">
        <p>Start with a directional outlook — Bullish, Bearish, Neutral, or Other — then choose a specific strategy within that category. Strategies are grouped this way so you're picking from a relevant, short list rather than one long dropdown.</p>
        <p>Don't see a strategy you use? <span className="text-zinc-200">Add your own strategy</span> — it'll show up in the category you assign it to, right alongside the built-in ones, and can be managed or removed later from the same screen.</p>
      </DocsSection>

      <DocsSection id="legs" title="Legs and payoff">
        <p>Most built-in strategies auto-populate their legs from a template — an Iron Condor arrives with all four legs already shaped, for instance. From there you fill in strikes, premiums, and quantities.</p>
        <p>Some templates include a built-in hedge leg (like the protective long option in a defined-risk spread) — those are automatically tagged as a hedge from the moment they're created, not left for you to classify manually.</p>
        <p>As legs are filled in, a payoff summary builds alongside them, so you can see the strategy's shape before you've committed to it.</p>
      </DocsSection>

      <DocsSection id="notes" title="Notes — directional view & reasoning">
        <p>A free-text field for your actual reasoning — why this trade, why now. This is a plain-text field (not the rich-text editor used in My Learnings), but it can pull in a template: click <span className="text-zinc-200">Use Template</span> to insert one of your saved templates directly into it.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function TradeHistoryDocsPage() {
  const CARDS = [
    { id: "table", icon: <IconCurrencyRupee size={15} />, title: "The Table", description: "Editable rows, grouped by month.", actionLabel: "See the table" },
    { id: "leg-lifecycle", icon: <IconGitBranch size={15} />, title: "Rolls & Adjustments", description: "Rolling, partial closes, hedges.", actionLabel: "Leg lifecycle" },
    { id: "strategy-shape", icon: <IconTarget size={15} />, title: "Strategy Shape Detection", description: "Auto-relabeling as legs change.", actionLabel: "How it works" },
    { id: "pl-and-mood", icon: <IconBulb size={15} />, title: "P/L & Mood", description: "Incremental P/L, entry mood.", actionLabel: "See P/L" },
    { id: "notes-and-log", icon: <IconFileText size={15} />, title: "Notes & Trade Log", description: "Per-trade notes, full log view.", actionLabel: "See notes" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Trade History"
        lead="The full P&L ledger — every trade you've logged, editable in place, with full support for rolls, adjustments, and partial closes."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="table" title="The table">
        <p>One row per trade, grouped by month. Click <span className="text-zinc-200">Edit</span> on a row to make changes; nothing is editable until you do. <span className="text-zinc-200">Add Trade</span> creates a blank row for a specific date and opens it straight into editing.</p>
        <p>Exit date stays locked until every leg in the position has been closed — there's nothing to set an exit date to while the position is still partially open.</p>
      </DocsSection>

      <DocsSection id="leg-lifecycle" title="Leg lifecycle — rolls, adjustments, partial closes">
        <p>Legs carry a colored left border showing what they are: a plain brown border for an original leg, sky blue for a hedge, yellow for an adjustment.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <DocsSubCard title="Rolling a leg">
            <p>Closing a leg and opening a new one to replace it — same position, new strike or expiry. The new leg's name carries a "— Rolled" suffix, and the timeline records it as a distinct roll event, not two unrelated opens/closes.</p>
          </DocsSubCard>
          <DocsSubCard title="Partial close">
            <p>Closing only some of a leg's quantity. The remainder keeps trading as its own leg, and its history still traces back to the original lot it split from — the timeline shows one "opened" event for the true original quantity, not a separate one per fragment.</p>
          </DocsSubCard>
          <DocsSubCard title="Hedge vs. adjustment">
            <p>Adding a leg after the trade is already open — the app asks whether it's a <span className="text-zinc-200">hedge</span> (protective) or an <span className="text-zinc-200">adjustment</span> (structural change) when the strategy's shape doesn't make that obvious on its own.</p>
          </DocsSubCard>
          <DocsSubCard title="Increasing position">
            <p>Adding more quantity to an already-open leg, detected automatically when a new leg exactly matches an existing one's strike and type.</p>
          </DocsSubCard>
        </div>
      </DocsSection>

      <DocsSection id="strategy-shape" title="Strategy shape detection">
        <p>As you edit legs, the app checks whether their actual structure now matches a different, more specific strategy than the one originally selected — a Bull Put Spread that's had a leg added and now reads as an Iron Condor, for example — and offers to relabel it, rather than leaving the label stale.</p>
      </DocsSection>

      <DocsSection id="pl-and-mood" title="P/L and mood">
        <p>Realized P/L updates incrementally as legs close — you don't have to wait for the entire position to be shut before seeing a number. Open legs are excluded from win/loss math everywhere in the app (Dashboard stats, MCP tools) until they actually close.</p>
        <p>Adding a trade for today also prompts for your mood at entry — a quick, optional tag (confident, fearful, greedy, and others) you can look back on later.</p>
      </DocsSection>

      <DocsSection id="notes-and-log" title="Notes and the Trade Log">
        <p>Each trade has its own plain-text notes field, same <span className="text-zinc-200">Use Template</span> support as Trade Setup's. The <span className="text-zinc-200">Trade Log</span> button opens a dedicated, full-page log of raw entries, separate from the P&L table itself — see <span className="text-zinc-200">Downloads</span> for exactly what can be exported from each.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function RemindersDocsPage() {
  const CARDS = [
    { id: "categories", icon: <IconBell size={15} />, title: "Categories & Severity", description: "Event, trade, and personal.", actionLabel: "See categories" },
    { id: "reschedule-snooze", icon: <IconClockHour4 size={15} />, title: "Reschedule vs. Snooze", description: "Two different ways to push a date.", actionLabel: "The difference" },
    { id: "linking", icon: <IconLink size={15} />, title: "Linking to a Trade", description: "Keep reminders in context.", actionLabel: "Learn more" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Reminders"
        lead="Market events, trade-specific alerts, and personal reminders — one list, with severity and category to sort out what actually needs attention."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="categories" title="Categories and severity">
        <p>Every reminder is one of three categories — <span className="text-zinc-200">event</span> (market-wide), <span className="text-zinc-200">trade</span> (tied to a specific position), or <span className="text-zinc-200">personal</span>. Within those, subcategories carry a severity level; you can add your own custom subcategories, each with its own severity, or hide built-in ones you don't use.</p>
      </DocsSection>

      <DocsSection id="reschedule-snooze" title="Rescheduling vs. snoozing">
        <p>Two different ways to change when a reminder fires: <span className="text-zinc-200">Reschedule</span> is a dedicated page for deliberately picking a new date and time. <span className="text-zinc-200">Snooze</span> is the quick option offered right on an active alarm popup — push it 10 minutes, an hour, whatever — meant for the moment an alarm actually goes off, not for planned rescheduling.</p>
      </DocsSection>

      <DocsSection id="linking" title="Linking to a trade">
        <p>A trade-category reminder can be linked to a specific position, so it shows up in context rather than as a bare, disconnected note.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function LearningsDocsPage() {
  const CARDS = [
    { id: "notes", icon: <IconBulb size={15} />, title: "Notes", description: "Rich text, images, tags.", actionLabel: "See notes" },
    { id: "folders", icon: <IconFolder size={15} />, title: "Folders", description: "Organize without losing anything.", actionLabel: "See folders" },
    { id: "search-tags-starred", icon: <IconSearch size={15} />, title: "Search, Tags, Starred", description: "Four ways to find a note.", actionLabel: "See how" },
    { id: "resources", icon: <IconLink size={15} />, title: "Resources", description: "Saved links, kept separate.", actionLabel: "See resources" },
    { id: "templates", icon: <IconLayoutGrid size={15} />, title: "Templates", description: "Reusable structure, three ways to use it.", actionLabel: "See templates" },
    { id: "bulk", icon: <IconCheck size={15} />, title: "Bulk Actions", description: "Multi-select delete, duplicate, move.", actionLabel: "See bulk actions" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="My Learnings"
        lead="A full notes system — rich text, folders, tags, saved resources, and reusable templates — separate from the trade log itself."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="notes" title="Notes">
        <p>Notes use a rich-text editor: headings, lists, and images. Images upload to private cloud storage rather than being embedded directly, so a note with several screenshots doesn't bloat in size — if that upload ever fails, it falls back to embedding the image directly rather than losing it.</p>
        <p>A note can carry <span className="text-zinc-200">tags</span>, be <span className="text-zinc-200">starred</span> for quick access, and optionally be <span className="text-zinc-200">linked to a specific trade</span>, underlying, or strategy — so your reasoning stays connected to what it was actually about.</p>
      </DocsSection>

      <DocsSection id="folders" title="Folders">
        <p>Organize notes into folders — create, rename, delete, drag-and-drop to move, or duplicate. Deleting a folder never deletes the notes inside it; they're simply unfiled, not destroyed.</p>
      </DocsSection>

      <DocsSection id="search-tags-starred" title="Search, tags, and starred">
        <p>The sidebar rail switches between browsing by folder, full-text search, filtering by tag, and a dedicated starred view — four different ways to find the same underlying notes.</p>
      </DocsSection>

      <DocsSection id="resources" title="Resources">
        <p>A separate, lighter-weight category for saved links — a resource is really just a note flagged differently, with a URL and a short description, kept out of your main notes list so it doesn't clutter actual journal entries.</p>
      </DocsSection>

      <DocsSection id="templates" title="Templates">
        <p>Save a note's structure as a reusable template, then insert it three different ways:</p>
        <p><span className="text-zinc-200 font-semibold">From the Templates section</span> — click <span className="text-zinc-200">Use Template</span> on a template card to create a brand-new note from it, starting untitled, and jump straight into editing.</p>
        <p><span className="text-zinc-200 font-semibold">From inside a note you're already writing</span> — insert a template exactly where your cursor is, letting you drop a template's structure in the middle of something you've already started, not just at the top.</p>
        <p><span className="text-zinc-200 font-semibold">From Trade Setup or Trade History's notes field</span> — since those fields are plain text, the template's content is converted down to plain text on insert.</p>
      </DocsSection>

      <DocsSection id="bulk" title="Bulk actions">
        <p>Multi-select notes to delete, duplicate, or move several at once — each action confirms with exactly how many notes were affected.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function DownloadsDocsPage() {
  const CARDS = [
    { id: "trade-log-download", icon: <IconFileText size={15} />, title: "Trade Log", description: "Raw entries, by date range.", actionLabel: "PDF or Markdown" },
    { id: "pnl-report-download", icon: <IconCurrencyRupee size={15} />, title: "P&L Report", description: "The summarized ledger.", actionLabel: "By month or year" },
    { id: "note-pdf-download", icon: <IconBulb size={15} />, title: "A Single Note", description: "Export one note as PDF.", actionLabel: "From the editor" },
    { id: "backup-download", icon: <IconDownload size={15} />, title: "Full Backup", description: "Everything, as one file.", actionLabel: "From Settings" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Downloads"
        lead="Everything in this app that can be exported, exactly what it contains, and exactly where to find it."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="trade-log-download" title="Trade Log — raw entries, by date range">
        <p>From <span className="text-zinc-200">Trade History → Trade Log</span>, the <span className="text-zinc-200">Download Logs</span> panel lets you pick a range — Today, Last 7 days, Last 30 days, All time, or a custom range — then choose <span className="text-zinc-200">Download</span>.</p>
        <p>A dialog then lets you pick exactly which entry types to include: <span className="text-zinc-200">Observation data</span>, <span className="text-zinc-200">Trade data</span>, <span className="text-zinc-200">Funds added</span>, and <span className="text-zinc-200">Withdrawals</span> — check any combination. Export as <span className="text-zinc-200">.PDF</span> or <span className="text-zinc-200">.MD</span> (Markdown).</p>
      </DocsSection>

      <DocsSection id="pnl-report-download" title="P&L report — the summarized ledger">
        <p>From the main <span className="text-zinc-200">Trade History</span> table itself (not the Trade Log), the <span className="text-zinc-200">Download P&L report</span> panel scopes the export <span className="text-zinc-200">By Month</span>, <span className="text-zinc-200">By Year</span>, or a custom date range, then downloads as Markdown or opens a PDF view you can save.</p>
        <p>This is the summarized trade ledger itself — different from the Trade Log's raw, timestamped entries above.</p>
      </DocsSection>

      <DocsSection id="note-pdf-download" title="A single note — as PDF">
        <p>Open any note in <span className="text-zinc-200">My Learnings</span> and use the download icon in its own toolbar (next to <span className="text-zinc-200">Use Template</span>) to export just that note as a PDF, formatted content and all.</p>
      </DocsSection>

      <DocsSection id="backup-download" title="Full backup — everything, as one file">
        <p>From your profile menu → <span className="text-zinc-200">Settings → Download Backup</span>, get a single JSON file containing your trades, checklist history, fund transactions, custom strategies, and My Learnings notes and folders.</p>
        <p>It does not include reminders or app settings (theme, PIN) — those live outside this export.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function SettingsDocsPage() {
  const CARDS = [
    { id: "profile-theme", icon: <IconUserCircle size={15} />, title: "Profile & Theme", description: "4 themes, light and dark.", actionLabel: "Customize" },
    { id: "pin", icon: <IconLock size={15} />, title: "PIN Lock", description: "A second layer, independent of login.", actionLabel: "Set it up" },
    { id: "clear-data", icon: <IconTrash size={15} />, title: "Clearing Your Data", description: "Wipe categories independently.", actionLabel: "See options" },
    { id: "delete-account", icon: <IconUserOff size={15} />, title: "Deleting Your Account", description: "7-day grace period.", actionLabel: "How it works" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Settings & Security"
        lead="Profile, appearance, your PIN, and everything to do with your own data — reached from your profile picture, top right."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="profile-theme" title="Profile and theme">
        <p>Set a profile picture, nickname, and name. Appearance is fully skinnable — four themes (Swiss Minimal, Neubrutalist, Apple Glass, CRT Terminal), each with its own light and dark mode, changing colors, fonts, and even small interaction details, not just a color swap.</p>
      </DocsSection>

      <DocsSection id="pin" title="PIN lock">
        <p>Independent of your account login, the app has its own PIN, checked every time you open it. Set up security questions alongside it so a forgotten PIN is recoverable rather than a dead end. Too many failed attempts locks you out temporarily rather than allowing unlimited guesses.</p>
      </DocsSection>

      <DocsSection id="clear-data" title="Clearing your data">
        <p>Clear specific categories of your own data independently — Trading data, Strategies, Reminders, and My Learnings each have their own checkbox, so you can wipe one without touching the others. Every category's checkbox clears both the underlying records and any related settings tied to it (severity overrides, custom strategies, and so on) — not just the visible rows.</p>
      </DocsSection>

      <DocsSection id="delete-account" title="Deleting your account">
        <p>Requesting account deletion starts a 7-day grace period. Log back in within that window and it's automatically cancelled — nothing is lost. Let those 7 days pass and log in again after, and everything is gone at that point: every trade, note, and reminder, permanently, with no separate confirmation step once the window has closed.</p>
        <p>A full backup (see <span className="text-zinc-200">Downloads</span>) is independent of this flow, and worth taking before requesting deletion if you want a record.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  return (
    <div className="flex gap-12">
      <div className="w-52 flex-shrink-0 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 px-2.5" style={FONT_MONO}>Docs</p>
        {DOCS_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`w-full text-left text-xs px-2.5 py-2 rounded-lg transition-colors ${activeSection === s.id ? "tj-primary-bg font-semibold" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        {activeSection === "getting-started" && <GettingStartedDocsPage />}
        {activeSection === "checklist" && <ChecklistDocsPage />}
        {activeSection === "trade-setup" && <TradeSetupDocsPage />}
        {activeSection === "trade-history" && <TradeHistoryDocsPage />}
        {activeSection === "reminders" && <RemindersDocsPage />}
        {activeSection === "learnings" && <LearningsDocsPage />}
        {activeSection === "downloads" && <DownloadsDocsPage />}
        {activeSection === "settings" && <SettingsDocsPage />}
        {activeSection === "mcp-server" && <McpServerDocsPage />}
      </div>
    </div>
  );
}

function McpServerDocsPage() {
  const TOOLS = [
    {
      name: "list_trades",
      kind: "read",
      description: "List your option trades, most recent first — a concise summary per trade, not the raw leg-by-leg data (see get_trade_legs for that).",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound on entry date." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound on entry date." },
        { name: "underlying", type: "string", optional: true, desc: 'Filter by symbol, e.g. "NIFTY" or "BANKNIFTY".' },
        { name: "strategy_label", type: "string", optional: true, desc: 'Filter by strategy, e.g. "Short Strangle".' },
        { name: "limit", type: "number", optional: true, desc: "Max rows to return (default 50, max 100)." },
      ],
    },
    {
      name: "get_trade_stats",
      kind: "read",
      description: "Aggregate win/loss stats over a date range — win rate, total realized P&L, average win, average loss. Open positions are reported separately and excluded from win/loss math, since they have no final result yet.",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound." },
      ],
    },
    {
      name: "get_trade_legs",
      kind: "read",
      description: "Full leg-by-leg detail for one trade — strike, option type, action, premium, quantity. Only available for trades entered through Trade Setup; older imported trades only have the plain-text summary list_trades already returns.",
      params: [
        { name: "trade_id", type: "string", optional: false, desc: "The trade id, as returned by list_trades." },
      ],
    },
    {
      name: "get_strategy_breakdown",
      kind: "read",
      description: "Win rate and average P&L broken down by strategy — which strategies actually work for you, not just one overall number.",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound." },
      ],
    },
    {
      name: "get_discipline_stats",
      kind: "read",
      description: "Compares checklist completion against trade outcomes — whether being fully \"armed\" before a trade correlates with better results. Only reflects trades entered live through the Checklist flow; imported trades were never run through a checklist session, so this returns nothing meaningful for history predating live use.",
      params: [
        { name: "start_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive lower bound." },
        { name: "end_date", type: "string", optional: true, desc: "ISO date (YYYY-MM-DD), inclusive upper bound." },
      ],
    },
    {
      name: "search_notes",
      kind: "read",
      description: "Search your My Learnings notes by title or content. Excludes templates and saved resource links — this searches actual journal notes, including which trade, underlying, or strategy each note is linked to.",
      params: [
        { name: "query", type: "string", optional: true, desc: "Text to search for in the title or body. Omit to list recent notes." },
        { name: "tag", type: "string", optional: true, desc: "Filter to notes carrying this exact tag." },
        { name: "limit", type: "number", optional: true, desc: "Max notes to return (default 20, max 50)." },
      ],
    },
    {
      name: "list_reminders",
      kind: "read",
      description: "List your reminders. Defaults to upcoming (today or later) only.",
      params: [
        { name: "upcoming_only", type: "boolean", optional: true, desc: "Default true — only reminder_date on or after today." },
        { name: "category", type: '"event" | "trade" | "personal"', optional: true, desc: "Filter by category." },
        { name: "limit", type: "number", optional: true, desc: "Max rows to return (default 50, max 100)." },
      ],
    },
    {
      name: "create_note",
      kind: "write",
      description: "Create a new note in My Learnings. Always creates a new note — it never edits an existing one.",
      params: [
        { name: "title", type: "string", optional: false, desc: "The note title." },
        { name: "content", type: "string", optional: true, desc: "Plain-text body — each line becomes a paragraph." },
        { name: "tags", type: "string[]", optional: true, desc: "Tags to attach to the note." },
      ],
    },
    {
      name: "create_reminder",
      kind: "write",
      description: "Create a new reminder. Always creates a new reminder — it never edits an existing one.",
      params: [
        { name: "title", type: "string", optional: false, desc: "The reminder title." },
        { name: "category", type: '"event" | "trade" | "personal"', optional: false, desc: "Reminder category." },
        { name: "reminder_date", type: "string", optional: false, desc: "ISO date (YYYY-MM-DD) the reminder is for." },
        { name: "reminder_time", type: "string", optional: true, desc: 'Time of day, e.g. "09:30".' },
        { name: "subcategory", type: "string", optional: true, desc: "A more specific subcategory label." },
        { name: "severity", type: "string", optional: true, desc: "Severity label, if this category uses one." },
      ],
    },
  ];

  const CARDS = [
    { id: "claude-desktop", icon: <IconDeviceDesktop size={15} />, title: "Claude Desktop", description: "Browser sign-in, point-and-click setup.", actionLabel: "Connect account" },
    { id: "claude-code", icon: <IconTerminal2 size={15} />, title: "Claude Code", description: "One command in your terminal.", actionLabel: "Run the command" },
  ];

  return (
    <DocsPageLayout>
      <DocsHeader
        title="MCP Server"
        lead="Connect an AI assistant directly to your own trading data — no copy-pasting, no exporting."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="overview" title="Overview">
        <p>
          This journal exposes a Model Context Protocol (MCP) server so an AI assistant can read your trades, stats, notes, and reminders directly, and — for a couple of narrow, additive actions — create new ones too. Access is scoped strictly to your own account: the server authenticates you the same way this app does, and the same account-level security that protects your data here protects it there too. Nothing is ever visible across accounts.
        </p>
      </DocsSection>

      <DocsSection id="connect" title="Connect">
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">Server URL</p>
          <CopyableCode value={MCP_SERVER_URL} />
          <p className="text-xs text-zinc-600">Same URL for every user — it doesn't need to be different. What scopes a connection to your own account is the sign-in step below, not the URL itself.</p>
        </div>

        <div id="claude-desktop" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 scroll-mt-4">
          <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"><IconDeviceDesktop size={14} className="text-zinc-500" /> Claude Desktop</p>
          <ol className="text-sm text-zinc-400 leading-relaxed list-decimal list-inside space-y-1">
            <li>Settings → Connectors → Add custom connector</li>
            <li>Paste the server URL above</li>
            <li>When prompted, sign in with the same account you use for this journal</li>
          </ol>
        </div>

        <div id="claude-code" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 scroll-mt-4">
          <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"><IconTerminal2 size={14} className="text-zinc-500" /> Claude Code</p>
          <CopyableCode value={`claude mcp add --transport http comet-trading ${MCP_SERVER_URL}`} />
          <p className="text-sm text-zinc-500">Run this in your terminal, then approve the sign-in prompt that opens in your browser.</p>
        </div>

        <p className="text-sm text-zinc-600">Once connected, just ask — "what's my win rate this month?" or "summarize my notes from this week" — and it queries your journal directly.</p>
      </DocsSection>

      <DocsSection id="permissions" title="Read tools vs. write tools">
        <p>
          Every tool below is tagged <span className="text-zinc-300 font-semibold">Read-only</span> or <span className="text-amber-400 font-semibold">Writes data</span>. Only two tools write anything — <span className="text-zinc-200">create_note</span> and <span className="text-zinc-200">create_reminder</span> — and both only ever add a new record. Neither can edit or delete something that already exists; there is no tool that can.
        </p>
        <p>
          This tagging follows the Model Context Protocol's own standard for it, so a compliant client (Claude Desktop included) can treat write actions with more caution than reads — for instance, prompting you to confirm before a note actually gets created, the same kind of "allow this?" step you may have already seen when connecting this journal's own Supabase project.
        </p>
        <p>
          Worth being precise about what that does and doesn't guarantee: this tagging is a signal clients can act on, not a hard security boundary enforced by the protocol itself. The actual boundary — the one that can't be bypassed regardless of client behavior — is that every request is authenticated as you, so nothing here can ever touch another account's data, read or write.
        </p>
      </DocsSection>

      <DocsSection id="available-tools" title="Available tools">
        <div className="space-y-2.5">
          {TOOLS.map((t) => <DocsToolCard key={t.name} {...t} />)}
        </div>
      </DocsSection>
    </DocsPageLayout>
  );
}

function HolidayCalendarPage({ holidays, onSave, onDelete, isAdmin }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const startAdd = () => { setEditId(null); setNameDraft(""); setDateDraft(""); setDialogOpen(true); };
  const startEdit = (h) => {
    if (parseInt(h.date.slice(0, 4), 10) < new Date().getFullYear()) return; // archived — read-only
    setEditId(h.id); setNameDraft(h.name); setDateDraft(h.date); setDialogOpen(true);
  };
  const cancel = () => { setDialogOpen(false); setEditId(null); };

  const save = () => {
    if (!nameDraft.trim() || !dateDraft) { playErrorBeep(); return; }
    onSave({ id: editId || ("holiday_" + Date.now()), name: nameDraft.trim(), date: dateDraft }, !!editId);
    setDialogOpen(false);
    setEditId(null);
  };

  const sorted = [...(holidays || [])].sort((a, b) => a.date.localeCompare(b.date));
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1" style={FONT_MONO}>Holiday Calendar</p>
          <p className="text-xs text-zinc-600">
            {isAdmin
              ? "Add every trading holiday as NSE announces it. If it falls on a Tuesday, weekly/monthly expiry dates — including already-saved trades — shift to the previous trading day automatically."
              : "NSE trading holidays, shared across every account. If one falls on a Tuesday, weekly/monthly expiry dates shift to the previous trading day automatically."}
          </p>
        </div>
        {isAdmin && (
          <button onClick={startAdd} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2.5 hover:scale-105 active:scale-95 transition-transform flex-shrink-0">
            <IconPlus size={14} /> Add Holiday
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-500">No holidays added yet.</p>
          {isAdmin && <p className="text-xs text-zinc-600 mt-1">Click "Add Holiday" to start building your calendar.</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 text-left">
                <th className="px-4 py-2.5 font-medium">Holiday</th>
                <th className="px-4 py-2.5 font-medium">Day</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => {
                const holidayYear = parseInt(h.date.slice(0, 4), 10);
                const isArchived = holidayYear < currentYear;
                return (
                  <tr key={h.id} className={`border-t border-zinc-800 ${isArchived ? "opacity-60" : ""}`}>
                    <td className="px-4 py-2.5 text-zinc-200">{h.name}</td>
                    <td className={`px-4 py-2.5 ${dayNameOf(h.date) === "Tuesday" ? "text-amber-400 font-semibold" : "text-zinc-400"}`}>{dayNameOf(h.date)}</td>
                    <td className="px-4 py-2.5 text-zinc-400" style={FONT_MONO}>{isoToDMY(h.date)}</td>
                    <td className="px-4 py-2.5">
                      {isArchived ? (
                        <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-zinc-600" style={FONT_MONO}>
                          <IconLock size={11} /> Archived
                        </div>
                      ) : !isAdmin ? null : (
                        <div className="flex items-center gap-2 justify-end">
                          <Tooltip text="Edit holiday">
                            <button onClick={() => startEdit(h)} className="text-zinc-500 hover:tj-primary-text">
                              <IconPencil size={14} />
                            </button>
                          </Tooltip>
                          {pendingDeleteId === h.id ? (
                            <span className="flex items-center gap-1">
                              <Tooltip text="Confirm delete">
                                <button onClick={() => { onDelete(h.id); setPendingDeleteId(null); }} className="flex items-center text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded">
                                  <IconCheck size={12} strokeWidth={3} />
                                </button>
                              </Tooltip>
                              <Tooltip text="Cancel">
                                <button onClick={() => setPendingDeleteId(null)} className="text-zinc-500 hover:text-zinc-300">
                                  <IconX size={14} />
                                </button>
                              </Tooltip>
                            </span>
                          ) : (
                            <Tooltip text="Delete holiday">
                              <button onClick={() => setPendingDeleteId(h.id)} className="text-zinc-600 hover:text-rose-600">
                                <IconTrash size={14} />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={cancel}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{editId ? "Edit Holiday" : "Add Holiday"}</p>
              <button onClick={cancel} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <label className="block">
              <span className="text-xs text-zinc-500">Holiday name</span>
              <input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="e.g. Diwali — Balipratipada"
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Date</span>
              <div className="mt-1">
                <CalendarPicker value={dateDraft} onChange={setDateDraft} placeholder="Select date" />
              </div>
              {dateDraft && <p className="text-xs text-zinc-600 mt-1">{dayNameOf(dateDraft)}{dayNameOf(dateDraft) === "Tuesday" ? " — expiry dates on this day will shift to Monday" : ""}</p>}
            </label>
            <div className="flex gap-2">
              <button onClick={save} disabled={!nameDraft.trim() || !dateDraft} className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
                {editId ? "Save Changes" : "Add Holiday"}
              </button>
              <button onClick={cancel} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoCropDialog({ file, onApply, onClose }) {
  const FRAME = 260;
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [imgUrl, setImgUrl] = useState(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImgNatural({ w: img.width, h: img.height });
        setImgUrl(ev.target.result);
        setZoom(1);
        setPos({ x: 0, y: 0 });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, [file]);

  const baseScale = imgNatural.w && imgNatural.h ? Math.max(FRAME / imgNatural.w, FRAME / imgNatural.h) : 1;
  const displayScale = baseScale * zoom;
  const displayW = imgNatural.w * displayScale;
  const displayH = imgNatural.h * displayScale;

  const clampPos = (p, scale) => {
    const w = imgNatural.w * scale, h = imgNatural.h * scale;
    const maxX = Math.max(0, (w - FRAME) / 2);
    const maxY = Math.max(0, (h - FRAME) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  };

  const pointOf = (e) => (e.touches ? e.touches[0] : e);
  const onDragStart = (e) => {
    dragging.current = true;
    const pt = pointOf(e);
    dragStart.current = { x: pt.clientX, y: pt.clientY };
    posStart.current = { ...pos };
  };
  const onDragMove = (e) => {
    if (!dragging.current) return;
    const pt = pointOf(e);
    const dx = pt.clientX - dragStart.current.x;
    const dy = pt.clientY - dragStart.current.y;
    setPos(clampPos({ x: posStart.current.x + dx, y: posStart.current.y + dy }, displayScale));
  };
  const onDragEnd = () => { dragging.current = false; };

  const handleZoom = (v) => {
    setZoom(v);
    setPos((p) => clampPos(p, baseScale * v));
  };

  const apply = () => {
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const outScale = (size / FRAME) * displayScale;
      const cx = size / 2 + pos.x * (size / FRAME);
      const cy = size / 2 + pos.y * (size / FRAME);
      ctx.drawImage(img, cx - (imgNatural.w * outScale) / 2, cy - (imgNatural.h * outScale) / 2, imgNatural.w * outScale, imgNatural.h * outScale);
      onApply(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = imgUrl;
  };

  if (!imgUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Adjust Photo</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>
        <div
          className="relative mx-auto rounded-full overflow-hidden border-2 border-zinc-700 cursor-move select-none touch-none"
          style={{ width: FRAME, height: FRAME }}
          onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
        >
          <img
            src={imgUrl}
            draggable={false}
            alt="Crop preview"
            style={{
              position: "absolute", left: "50%", top: "50%",
              width: displayW, height: displayH,
              maxWidth: "none", maxHeight: "none",
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 flex-shrink-0">Zoom</span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => handleZoom(parseFloat(e.target.value))} className="flex-1 accent-amber-400" />
        </div>
        <p className="text-xs text-zinc-600 text-center">Drag the photo to reposition it</p>
        <div className="flex gap-2">
          <button onClick={apply} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">Use Photo</button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ClearDataConfirmDialog({ scope, onConfirm, onClose }) {
  const [text, setText] = useState("");
  const parts = [];
  if (scope.trading) parts.push("every trade, P&L entry, fund transaction, and checklist log entry");
  if (scope.strategies) parts.push("your custom strategy templates");
  if (scope.learnings) parts.push("all My Learnings notes, folders, and tags");
  if (scope.reminders) parts.push("all your reminders");
  const deletionSummary = parts.length > 1
    ? parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1]
    : (parts[0] || "the selected data");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-rose-900 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <IconAlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-rose-600" style={FONT_DISPLAY}>This can't be undone</p>
        </div>
        <p className="text-xs text-zinc-400">This permanently deletes {deletionSummary}. Anything not selected is kept. Type <span className="font-bold text-zinc-200">DELETE</span> to confirm.</p>
        <input
          type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" autoFocus
          className="w-full bg-zinc-950 border border-rose-900 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          style={FONT_MONO}
        />
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={text !== "DELETE"}
            className="bg-rose-500 hover:bg-rose-400 disabled:opacity-30 disabled:cursor-not-allowed text-rose-950 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 transition-colors"
          >
            Permanently Delete
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SecurityQuestionsSection({ pinRecord, securityQuestions, onQuestionsChanged }) {
  const [step, setStep] = useState("view"); // view | verify | pick | answer | done
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fiveQuestions, setFiveQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [answers, setAnswers] = useState({});

  const hasExisting = securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2;
  const existingQuestionTexts = hasExisting
    ? securityQuestions.answers.map((rec) => (SECURITY_QUESTIONS.find((sq) => sq.id === rec.questionId) || {}).text).filter(Boolean)
    : [];

  const startUpdate = () => {
    setDigits(["", "", "", ""]);
    setError("");
    setStep("verify");
  };

  const handleVerifyComplete = async (pin) => {
    setBusy(true);
    const ok = await verifyPin(pin, pinRecord);
    setBusy(false);
    if (!ok) { setError("That's not your current PIN."); setDigits(["", "", "", ""]); return; }
    setFiveQuestions(pickRandomQuestions(5));
    setSelectedQuestionIds([]);
    setAnswers({});
    setError("");
    setStep("pick");
  };

  const toggleQuestion = (id) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(id)) return prev.filter((q) => q !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const refreshQuestions = () => {
    setFiveQuestions(pickRandomQuestions(5));
    setSelectedQuestionIds([]);
  };

  const bothAnswered = selectedQuestionIds.length === 2 && selectedQuestionIds.every((qid) => (answers[qid] || "").trim().length > 0);

  const finishUpdate = async () => {
    setBusy(true);
    const questionRecords = await Promise.all(
      selectedQuestionIds.map(async (qid) => {
        const record = await createPinRecord(normalizeAnswer(answers[qid] || ""));
        return { questionId: qid, salt: record.salt, hash: record.hash };
      })
    );
    await onQuestionsChanged({ answers: questionRecords });
    setBusy(false);
    setStep("done");
    notify("Security questions updated.");
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-6">
      <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Security Questions</p>

      {step === "view" && (
        <>
          {hasExisting ? (
            <div className="text-left space-y-2">
              <p className="text-xs text-zinc-500">Used to reset your PIN if you forget it. Your current questions:</p>
              <ul className="text-sm text-zinc-300 list-disc list-inside space-y-1">
                {existingQuestionTexts.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Not set up yet — add these so you can reset your PIN yourself if you ever forget it.</p>
          )}
          <button onClick={startUpdate} className="tj-primary-bg font-semibold text-sm px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
            {hasExisting ? "Update Questions" : "Set Up Security Questions"}
          </button>
        </>
      )}

      {step === "verify" && (
        <>
          <p className="text-sm text-zinc-400">Enter your current PIN to continue.</p>
          <PinDigitInput key="verify" value={digits} onChange={setDigits} onComplete={handleVerifyComplete} autoFocus error={!!error} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {busy && <p className="text-xs text-zinc-500">Checking...</p>}
        </>
      )}

      {step === "pick" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-zinc-500 text-left">Pick any 2 of these 5 questions.</p>
            <Tooltip text="Get a new set of questions">
              <button onClick={refreshQuestions} className="flex-shrink-0 p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                <IconRotate size={15} />
              </button>
            </Tooltip>
          </div>
          <div className="space-y-2 text-left">
            {fiveQuestions.map((q) => {
              const selected = selectedQuestionIds.includes(q.id);
              return (
                <button
                  key={q.id} onClick={() => toggleQuestion(q.id)}
                  className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${
                    selected ? "border-amber-400 bg-amber-400/10 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex-shrink-0 border ${selected ? "bg-amber-400 border-amber-400" : "border-zinc-600"}`}>
                    {selected && <IconCheck size={13} strokeWidth={3} className="text-zinc-950" />}
                  </span>
                  {q.text}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setStep("answer")} disabled={selectedQuestionIds.length !== 2}
            className="tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
          >
            Continue ({selectedQuestionIds.length}/2 selected)
          </button>
        </>
      )}

      {step === "answer" && (
        <>
          <p className="text-sm text-zinc-500">Answers aren't case-sensitive. Make sure you'll remember exactly what you type.</p>
          <div className="space-y-4 text-left">
            {fiveQuestions.filter((q) => selectedQuestionIds.includes(q.id)).map((q) => (
              <label key={q.id} className="block">
                <span className="text-xs text-zinc-500">{q.text}</span>
                <input
                  type="text" value={answers[q.id] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
            ))}
          </div>
          <button
            onClick={finishUpdate} disabled={!bothAnswered || busy}
            className="tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
          >
            {busy ? "Saving..." : "Save Questions"}
          </button>
          <button onClick={() => setStep("pick")} className="text-xs text-zinc-500 hover:text-zinc-300 block mx-auto underline">
            Back
          </button>
        </>
      )}

      {step === "done" && <p className="text-sm text-emerald-600 font-semibold">Your security questions have been saved.</p>}
    </div>
  );
}

function ChangePinSection({ pinRecord, onPinChanged }) {
  const [step, setStep] = useState("current"); // current | new | confirm | done
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCurrentComplete = async (pin) => {
    setBusy(true);
    const ok = await verifyPin(pin, pinRecord);
    setBusy(false);
    if (!ok) { setError("That's not your current PIN."); setDigits(["", "", "", ""]); return; }
    setError("");
    setDigits(["", "", "", ""]);
    setStep("new");
  };

  const handleNewComplete = (pin) => {
    setNewPin(pin);
    setDigits(["", "", "", ""]);
    setError("");
    setStep("confirm");
  };

  const handleConfirmComplete = async (pin) => {
    if (pin !== newPin) {
      setError("PINs didn't match — let's try again.");
      setDigits(["", "", "", ""]);
      setNewPin("");
      setStep("new");
      return;
    }
    setBusy(true);
    const record = await createPinRecord(pin);
    await onPinChanged(record);
    setBusy(false);
    setStep("done");
    notify("PIN updated.");
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-6">
      <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Change PIN</p>
      {step === "done" ? (
        <p className="text-sm text-emerald-600 font-semibold">Your PIN has been updated.</p>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            {step === "current" && "Enter your current PIN to continue."}
            {step === "new" && "Choose a new 4-digit PIN."}
            {step === "confirm" && "Re-enter it to confirm."}
          </p>
          <PinDigitInput
            key={step} value={digits} onChange={setDigits} autoFocus error={!!error}
            onComplete={step === "current" ? handleCurrentComplete : step === "new" ? handleNewComplete : handleConfirmComplete}
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {busy && <p className="text-xs text-zinc-500">Working...</p>}
        </>
      )}
    </div>
  );
}

function SettingsPage({ profile, onSaveProfile, onClearData, onDownloadBackup, hasCustomStrategies, themeId, onSaveTheme, pinRecord, onPinChanged, onDeleteAccount, securityQuestions, onSecurityQuestionsChanged }) {
  const [section, setSection] = useState("account");
  const [draft, setDraft] = useState({ ...profile });
  const [themeDraft, setThemeDraft] = useState(themeId);
  const [savedFlash, setSavedFlash] = useState(false);
  const [themeSavedFlash, setThemeSavedFlash] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const fileInputRef = useRef(null);

  const [clearPinConfirmOpen, setClearPinConfirmOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearScope, setClearScope] = useState({ trading: true, strategies: false, learnings: false, reminders: false });
  const clearScopeSelectedCount = Object.values(clearScope).filter(Boolean).length;
  const [deletePinConfirmOpen, setDeletePinConfirmOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  useEffect(() => { setDraft({ ...profile }); }, [profile]);
  useEffect(() => { setThemeDraft(themeId); }, [themeId]);

  const accountDirty = draft.name !== profile.name || draft.nickname !== profile.nickname || draft.avatarType !== profile.avatarType || draft.avatarValue !== profile.avatarValue;
  const themeDirty = themeDraft !== themeId;

  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = "";
  };
  const [photoSavedFlash, setPhotoSavedFlash] = useState(false);
  const applyCroppedPhoto = (dataUrl) => {
    const next = { ...draft, avatarType: "custom", avatarValue: dataUrl };
    setDraft(next);
    setCropFile(null);
    onSaveProfile({ ...profile, avatarType: "custom", avatarValue: dataUrl });
    setPhotoSavedFlash(true);
    setTimeout(() => setPhotoSavedFlash(false), 1800);
    notify("Profile photo updated.");
  };
  const handleRemovePhoto = () => {
    setDraft((prev) => ({ ...prev, avatarType: null, avatarValue: "" }));
    onSaveProfile({ ...profile, avatarType: null, avatarValue: "" });
    setPhotoSavedFlash(true);
    setTimeout(() => setPhotoSavedFlash(false), 1800);
    notify("Profile photo removed.");
  };
  const handleSaveAccount = () => {
    onSaveProfile(draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    notify("Account details saved.");
  };
  const handleSaveTheme = () => {
    onSaveTheme(themeDraft);
    setThemeSavedFlash(true);
    setTimeout(() => setThemeSavedFlash(false), 1800);
  };

  const sections = [
    { id: "account", label: "Account Details", icon: IconUserCircle },
    { id: "appearance", label: "Appearance", icon: IconPalette },
    { id: "pin", label: "Change PIN", icon: IconLock },
    { id: "questions", label: "Security Questions", icon: IconShield },
    { id: "clear", label: "Clear My Data", icon: IconRotate },
    { id: "delete", label: "Delete My Account", icon: IconAlertTriangle },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5" style={FONT_MONO}>Settings</p>
      <div className="grid grid-cols-1 sm:grid-cols-[250px_1fr] gap-6">
        <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2.5 text-sm px-3.5 py-2.5 rounded-xl text-left flex-shrink-0 transition-colors ${
                section === s.id ? "tj-primary-bg font-semibold" : `text-zinc-400 hover:bg-zinc-900 ${s.id === "delete" ? "hover:text-rose-400" : "hover:text-zinc-200"}`
              } ${s.id === "delete" && section !== s.id ? "text-rose-500/80" : ""}`}
            >
              <s.icon size={15} className="flex-shrink-0" /> <span className="whitespace-nowrap">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6 min-w-0">
          {section === "account" && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-800 flex items-center justify-center bg-zinc-800">
                  {draft.avatarType === "custom" && draft.avatarValue ? (
                    <img src={draft.avatarValue} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarSVG preset={DEFAULT_AVATAR} size={96} animate={false} />
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg font-semibold transition-colors">
                    Upload Photo
                  </button>
                  {draft.avatarType === "custom" && (
                    <button onClick={handleRemovePhoto} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-2 rounded-lg font-semibold transition-colors">
                      Remove Photo
                    </button>
                  )}
                </div>
                {photoSavedFlash && <p className="text-xs text-emerald-600">Saved</p>}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 text-left">
                <label className="block">
                  <span className="text-xs text-zinc-500">Name</span>
                  <input
                    type="text" value={draft.name || ""} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your name"
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Nickname — what should I call you?</span>
                  <input
                    type="text" value={draft.nickname || ""} onChange={(e) => setDraft((prev) => ({ ...prev, nickname: e.target.value }))} placeholder="e.g. The Closer"
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-xs text-zinc-600 mt-1 block">Used for your greeting on the Home dashboard.</span>
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Email</span>
                  <input type="email" value={draft.email || ""} readOnly disabled className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
                  <span className="text-xs text-zinc-600 mt-1 block">From your Google account — can't be changed here.</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveAccount} disabled={!accountDirty} className="flex items-center gap-2 tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-6 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
                  <IconDeviceFloppy size={15} /> {savedFlash ? "Saved" : "Save"}
                </button>
              </div>
            </>
          )}

          {section === "appearance" && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-left">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3" style={FONT_MONO}>Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeDraft(t.id)}
                      className={`flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border text-left hover:scale-[1.03] active:scale-95 transition-transform ${
                        themeDraft === t.id ? "border-zinc-500 bg-zinc-800" : "border-zinc-800 bg-zinc-950"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md flex-shrink-0 border border-white/10 overflow-hidden relative" style={{ background: t.bg }}>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-tl" style={{ background: t.primary }}></span>
                      </span>
                      <span className="text-zinc-200 truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSaveTheme} disabled={!themeDirty} className="flex items-center gap-2 tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-6 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
                  <IconDeviceFloppy size={15} /> {themeSavedFlash ? "Saved" : "Save"}
                </button>
              </div>
            </>
          )}

          {section === "pin" && <ChangePinSection pinRecord={pinRecord} onPinChanged={onPinChanged} />}

          {section === "questions" && <SecurityQuestionsSection pinRecord={pinRecord} securityQuestions={securityQuestions} onQuestionsChanged={onSecurityQuestionsChanged} />}

          {section === "clear" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Download Full Backup</p>
                  <p className="text-xs text-zinc-500 mt-1">A single JSON file with every trade, checklist entry, fund transaction, custom strategy, and My Learnings note — everything below can delete. Worth doing before you clear anything.</p>
                </div>
                <button onClick={onDownloadBackup} className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold rounded-lg px-3.5 py-2.5 transition-colors">
                  <IconDownload size={13} /> Download Backup
                </button>
              </div>
            <div className="rounded-2xl border border-rose-900/50 bg-rose-950/10 p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-rose-600">Clear My Data</p>
                <p className="text-xs text-zinc-500 mt-1">Choose what to permanently delete. Anything left unchecked is kept.</p>
              </div>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={clearScope.trading}
                    onChange={(e) => setClearScope((prev) => ({ ...prev, trading: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                  />
                  <span>
                    <span className="text-sm text-zinc-200 font-semibold block">Trading data</span>
                    <span className="text-xs text-zinc-500">Every trade, P&L entry, fund transaction, and checklist log entry.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={clearScope.reminders}
                    onChange={(e) => setClearScope((prev) => ({ ...prev, reminders: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                  />
                  <span>
                    <span className="text-sm text-zinc-200 font-semibold block">Reminders</span>
                    <span className="text-xs text-zinc-500">All market, trade, and personal reminders, and your severity/subcategory customizations.</span>
                  </span>
                </label>
                {hasCustomStrategies && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={clearScope.strategies}
                      onChange={(e) => setClearScope((prev) => ({ ...prev, strategies: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                    />
                    <span>
                      <span className="text-sm text-zinc-200 font-semibold block">Custom strategies</span>
                      <span className="text-xs text-zinc-500">Your saved custom strategy templates.</span>
                    </span>
                  </label>
                )}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={clearScope.learnings}
                    onChange={(e) => setClearScope((prev) => ({ ...prev, learnings: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                  />
                  <span>
                    <span className="text-sm text-zinc-200 font-semibold block">My Learnings</span>
                    <span className="text-xs text-zinc-500">All notes, folders, and related tags.</span>
                  </span>
                </label>
              </div>
              <p className="text-xs text-zinc-600">Theme, holidays, and this profile are always kept.</p>
              <button
                onClick={() => setClearPinConfirmOpen(true)}
                disabled={clearScopeSelectedCount === 0}
                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed border border-rose-800 text-rose-600 font-semibold px-3.5 py-2.5 rounded-lg transition-colors"
              >
                Delete Selected Data
              </button>
            </div>
            </div>
          )}

          {section === "delete" && (
            <div className="rounded-2xl border border-rose-900/50 bg-rose-950/10 p-6 space-y-3">
              <p className="text-sm font-semibold text-rose-600">Delete My Account</p>
              <p className="text-xs text-zinc-500">
                This signs you out and schedules your account — profile, trades, everything — for deletion.
                If you log back in within <span className="font-semibold text-zinc-300">7 days</span>, it's automatically cancelled and your data is untouched.
                After 7 days with no login, everything is permanently deleted. Signing up again afterward starts as a completely new account.
              </p>
              <button onClick={() => setDeletePinConfirmOpen(true)} className="text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-800 text-rose-600 font-semibold px-3.5 py-2.5 rounded-lg transition-colors">
                Delete My Account
              </button>
            </div>
          )}
        </div>
      </div>

      {clearPinConfirmOpen && (
        <PinConfirmDialog
          pinRecord={pinRecord} title="Confirm it's you" message="Enter your PIN to continue clearing the selected data."
          onConfirm={() => { setClearPinConfirmOpen(false); setClearDialogOpen(true); }}
          onClose={() => setClearPinConfirmOpen(false)}
        />
      )}
      {clearDialogOpen && (
        <ClearDataConfirmDialog scope={clearScope} onConfirm={() => { onClearData(clearScope); setClearDialogOpen(false); }} onClose={() => setClearDialogOpen(false)} />
      )}

      {deletePinConfirmOpen && (
        <PinConfirmDialog
          pinRecord={pinRecord} title="Confirm it's you" message="Enter your PIN to continue deleting your account."
          onConfirm={() => { setDeletePinConfirmOpen(false); setDeleteDialogOpen(true); setDeleteText(""); }}
          onClose={() => setDeletePinConfirmOpen(false)}
        />
      )}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={() => setDeleteDialogOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-rose-900 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-rose-600" style={FONT_DISPLAY}>Last step</p>
            </div>
            <p className="text-xs text-zinc-400">
              You'll be signed out now. If you don't log back in within 7 days, your account and every piece of data in it is permanently deleted.
              Type <span className="font-bold text-zinc-200">DELETE MY ACCOUNT</span> to confirm.
            </p>
            <input
              type="text" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE MY ACCOUNT" autoFocus
              className="w-full bg-zinc-950 border border-rose-900 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              style={FONT_MONO}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onDeleteAccount(); setDeleteDialogOpen(false); }}
                disabled={deleteText !== "DELETE MY ACCOUNT"}
                className="bg-rose-500 hover:bg-rose-400 disabled:opacity-30 disabled:cursor-not-allowed text-rose-950 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 transition-colors"
              >
                Schedule Deletion
              </button>
              <button onClick={() => setDeleteDialogOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {cropFile && <PhotoCropDialog file={cropFile} onApply={applyCroppedPhoto} onClose={() => setCropFile(null)} />}
    </div>
  );
}

function LegsEditDialog({ initialUnderlying, initialLegs, onSave, onClose, holidays, referenceDate, lockOriginalLegs, committedLegIds, strategyLabel, allStrategies }) {
  const [underlying, setUnderlying] = useState(initialUnderlying || "");
  const [legs, setLegs] = useState(() => {
    const base = initialLegs && initialLegs.length > 0 ? initialLegs : [];
    // Only legs that were truly already committed to the database get
    // locked to closing-only (no editing structure/strike/etc). A leg
    // added and staged (via a previous "Done" click) but not yet saved by
    // the row's own Save button was never actually real yet, so it stays
    // fully editable — otherwise correcting a mistake in a not-yet-saved
    // new leg would be impossible.
    const ids = committedLegIds || new Set();
    return lockOriginalLegs ? base.map((l) => ({ ...l, _locked: ids.has(l.id) })) : base;
  });
  const [closingLegId, setClosingLegId] = useState(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const hedgeEligible = useMemo(() => isStrategyHedgeEligible(strategyLabel, allStrategies), [strategyLabel, allStrategies]);

  // Lock the page in place while open, matching the same pattern used for
  // the other popovers/dropdowns in this app. No scrollbar-width
  // compensation needed — the global scrollbar-gutter:stable rule already
  // reserves that space permanently, so re-compensating here would
  // double-count it and shift content when the lock engages.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Classifies a leg synchronously, right here — never via a delayed effect,
  // which is what caused the hedge question to flash briefly (and could
  // leave a leg's legKind stuck undefined if edits raced the effect) before
  // a non-hedge-eligible strategy's legs settled into Adjustment. An exact
  // match against another active leg is always Increase Position; on
  // strategies with no genuine unhedged risk, anything else is immediately
  // an Adjustment; only a strategy with real naked exposure leaves it
  // unset so the UI can ask "is this a hedge?".
  const classifyNewLeg = (leg, otherLegs) => {
    const idKeyReady = leg.type === "Other" ? !!leg.strike : !!(leg.action && leg.type && leg.strike && (leg.type === "Other" || leg.expiry));
    if (idKeyReady) {
      const match = findMatchingActiveLeg(leg, otherLegs);
      if (match) return { legKind: "increase-position", legKindAuto: true };
    }
    if (!hedgeEligible) return { legKind: "adjustment", legKindAuto: true };
    return { legKind: undefined, legKindAuto: undefined };
  };

  const addLeg = () => setLegs((prev) => {
    const base = { id: freshLegId(), name: "", action: "Sell", type: "CE", strike: "", premium: "", qty: "", lotSize: "", expiry: "", openedAt: Date.now(), addedViaEdit: !!lockOriginalLegs };
    const classification = lockOriginalLegs ? classifyNewLeg(base, prev) : {};
    return [...prev, { ...base, ...classification }];
  });
  const removeLeg = (id) => setLegs((prev) => prev.filter((l) => l.id !== id));
  const updateLeg = (id, field, value) => setLegs((prev) => prev.map((l) => {
    if (l.id !== id) return l;
    if (l._locked) return l; // locked legs can only change via the dedicated Close action below, never generic field edits
    const next = { ...l, [field]: value };
    if (field === "type" && (value === "FUT" || value === "Other")) next.premium = "";
    if (field === "type" && value === "Other") next.lotSize = "";
    // Changing any of the identifying fields invalidates a prior hedge/
    // adjustment answer or increase-position match — re-decide fresh,
    // synchronously, right here. A roll-replacement's classification is
    // fixed by how it was created (closing the old leg with Roll), not by
    // whatever terms end up on the new leg, so it's exempt from this.
    const reEvaluatable = l.legKindAuto && l.legKind !== "roll-replacement";
    if (reEvaluatable && ["action", "type", "strike", "expiry"].includes(field)) {
      const classification = classifyNewLeg(next, prev);
      next.legKind = classification.legKind;
      next.legKindAuto = classification.legKindAuto;
    }
    return next;
  }));
  const setLegKind = (id, kind) => setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, legKind: kind, action: kind === "hedge" ? "Buy" : l.action } : l)));

  // Closing a leg is a dedicated action, not a generic field edit. FIFO
  // lot-splitting handles both a full close and a partial one uniformly —
  // a "full" close simply requests every lot on the leg. Choosing "Roll"
  // immediately adds a smart-defaulted replacement (same action/type/lot
  // size as what's closing, since a rolled leg keeps the same market role —
  // e.g. a rolled short OTM put stays a short put), leaving strike/premium/
  // expiry blank for the new terms.
  const closeLeg = (leg, closePremium, closeType, lots) => {
    setLegs((prev) => closeLotsFIFO(prev, leg, lots, closePremium, closeType, freshLegId));
    setClosingLegId(null);
    if (closeType === "roll") {
      const baseName = (leg.name && leg.name.trim()) || `${leg.action === "Sell" ? "Short" : "Long"} ${leg.type === "CE" ? "Call" : leg.type === "PE" ? "Put" : leg.type}`;
      setLegs((prev) => [...prev, {
        id: freshLegId(), name: `${baseName} - Rolled`, action: leg.action, type: leg.type, strike: "",
        premium: "", qty: "", lotSize: leg.lotSize || "", expiry: "", openedAt: Date.now(), addedViaEdit: true,
        legKind: "roll-replacement", legKindAuto: true, rolledFromLegId: leg.id,
      }]);
    }
  };

  // Net premium and payoff reflect the CURRENT live position — closed legs
  // already had their outcome realized and settled, so they're excluded
  // here (their P/L is tracked separately via computeClosedLegsPL) rather
  // than double-counted into the position's ongoing exposure.
  const activeLegs = useMemo(() => legs.filter((l) => !l.closedAt), [legs]);
  const [strategyOverride, setStrategyOverride] = useState(null);
  const [dismissedShape, setDismissedShape] = useState(null);
  const detectedShape = useMemo(() => {
    // Shape detection only cares about the structurally relevant fields —
    // not the cosmetic "name" label, which isLegComplete also requires but
    // has no bearing on what strategy this actually is.
    const structurallyReady = (l) => {
      if (!l.strike || !l.qty) return false;
      if (l.type !== "Other" && !l.lotSize) return false;
      if ((l.type === "CE" || l.type === "PE" || l.type === "FUT") && !l.expiry) return false;
      if ((l.type === "CE" || l.type === "PE") && !l.premium) return false;
      return true;
    };
    if (!activeLegs.every(structurallyReady)) return null; // don't suggest off half-entered legs
    const shape = detectStrategyShape(activeLegs);
    return resolveDetectedStrategyLabel(shape, strategyLabel, allStrategies);
  }, [activeLegs, strategyLabel, allStrategies]);
  const showShapeSuggestion = detectedShape && detectedShape !== strategyLabel && detectedShape !== strategyOverride && detectedShape !== dismissedShape;
  const netPremium = useMemo(() => {
    return activeLegs.reduce((sum, leg) => {
      if (leg.type !== "CE" && leg.type !== "PE") return sum;
      const prem = parseFloat(leg.premium) || 0, qty = parseFloat(leg.qty) || 0;
      return sum + (leg.action === "Sell" ? 1 : -1) * prem * qty;
    }, 0);
  }, [activeLegs]);
  const payoffInfo = useMemo(() => computeStrategyPayoff(null, activeLegs), [activeLegs]);
  // A leg counts as complete only once its hedge/adjustment classification
  // is resolved too, for legs where that question actually applies.
  const legsComplete = legs.length > 0 && legs.every((l) => isLegComplete(l) && (!l.addedViaEdit || l._locked || l.closedAt || !!l.legKind));
  const closedLegsPL = useMemo(() => computeClosedLegsPL(legs), [legs]);

  const handleSave = () => {
    if (!legsComplete) return;
    onSave({ underlying, legs, closedLegsPL, strategyOverride });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div
        className="w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-6 space-y-4 tj-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Edit Strategy Legs</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>
        {lockOriginalLegs && (
          <p className="text-xs text-zinc-500 -mt-2">Existing legs are locked — use "Close this leg" to settle one, or add a new leg below if the structure itself needs to change.</p>
        )}
        {showShapeSuggestion && (
          <div className="rounded-lg border border-sky-400/40 bg-zinc-900/60 p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-300">These legs now look like a <span className="font-semibold text-sky-400">{detectedShape}</span>, not a {strategyLabel || "the current strategy"}.</p>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => setStrategyOverride(detectedShape)} className="text-xs tj-primary-bg font-semibold px-3 py-1.5 rounded-lg">Update label</button>
              <button onClick={() => setDismissedShape(detectedShape)} className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5 rounded-lg">Dismiss</button>
            </div>
          </div>
        )}
        {strategyOverride && (
          <p className="text-xs text-sky-400/80 -mt-2">Strategy will be updated to <span className="font-semibold">{strategyOverride}</span> when you save.</p>
        )}
        <LegsCard
          underlying={underlying} onUnderlyingChange={setUnderlying} legs={legs} onAdd={addLeg} onRemove={removeLeg} onUpdate={updateLeg}
          netPremium={netPremium} payoffInfo={payoffInfo} holidays={holidays} referenceDate={referenceDate}
          closingLegId={closingLegId} onStartClose={setClosingLegId} onCancelClose={() => setClosingLegId(null)} onCloseLeg={closeLeg}
          closedLegsPL={closedLegsPL} onSetLegKind={setLegKind} onOpenTimeline={() => setTimelineOpen(true)}
        />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!legsComplete} className="tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
              Done
            </button>
            <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
          </div>
          {!legsComplete && <p className="text-xs text-amber-400">Fill in every field on each leg (including expiry) before saving.</p>}
        </div>
      </div>
      {timelineOpen && <LegsTimelineModal legs={legs} onClose={() => setTimelineOpen(false)} referenceDate={referenceDate} />}
    </div>,
    getPortalTarget()
  );
}

// Shared "use a template" picker — a searchable list with a content
// preview for each, used both from ExpandableNoteField (Trade Setup and
// Trade History's plain-text notes) and from the rich note editor's
// toolbar. A dropdown doesn't hold up once there are more than a few
// templates; this shows all of them with enough preview to recognize the
// right one without opening each individually.
function TemplatePickerModal({ templates, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => (t.title || "").toLowerCase().includes(q) || blockNoteSnippet(t.content, 200).toLowerCase().includes(q));
  }, [templates, search]);

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl flex flex-col tj-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-3 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Use a Template</p>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
          </div>
          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus-within:border-amber-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">{templates.length === 0 ? "No templates yet." : "No templates match your search."}</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-amber-400/60 p-3.5 transition-colors"
              >
                <p className="text-sm font-semibold text-zinc-100 mb-1">{t.title || "Untitled"}</p>
                {blockNoteSnippet(t.content) && <p className="text-xs text-zinc-500 leading-relaxed">{blockNoteSnippet(t.content)}</p>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ExpandableNoteField({ value, onChange, placeholder, label, variant = "cell", disabled = false, templates = [] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const openEditor = () => { if (disabled) return; setDraft(value || ""); setOpen(true); };
  const closeEditor = () => { setOpen(false); setTemplatePickerOpen(false); };
  const save = () => { onChange(draft); closeEditor(); };
  const applyTemplate = (t) => {
    const text = blockNoteToPlainText(t.content);
    setDraft((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
    setTemplatePickerOpen(false);
  };

  const triggerClass = variant === "block"
    ? "w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 cursor-pointer min-h-[84px] whitespace-pre-wrap"
    : `text-xs truncate block w-full rounded ${disabled ? "text-zinc-300" : "text-zinc-100 bg-zinc-950 border border-zinc-800 hover:border-amber-400 px-1.5 py-1"}`;

  // A genuine word-limited preview for the compact table cell — CSS truncate
  // alone can still show more or less than intended depending on character
  // width, so cap it explicitly at a handful of words instead.
  const words = (value || "").trim().split(/\s+/).filter(Boolean);
  const preview = words.length > 6 ? words.slice(0, 6).join(" ") + "…" : value;
  const displayText = variant === "cell" ? preview : value;

  return (
    <>
      <Tooltip text={variant === "block" ? undefined : (disabled ? "Click Edit on this row to change notes" : (value || undefined))} wrapperClassName="block w-full">
        <div
          onClick={openEditor}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => { if (e.key === "Enter") openEditor(); }}
          className={triggerClass}
          style={variant === "cell" ? { ...FONT_MONO, cursor: disabled ? "default" : "pointer" } : undefined}
        >
          {displayText ? (
            displayText
          ) : !disabled ? (
            <span className="text-zinc-600 italic" style={{ fontStyle: "italic" }}>Add a note...</span>
          ) : null}
        </div>
      </Tooltip>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={closeEditor}>
          <div
            className="w-[70vw] max-w-[70vw] max-h-[85vh] min-w-[280px] rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 flex flex-col gap-4 tj-popover overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{label || "Note"}</p>
              <div className="flex items-center gap-3">
                {templates.length > 0 && (
                  <button onClick={() => setTemplatePickerOpen(true)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                    <IconLayoutGrid size={13} /> Use Template
                  </button>
                )}
                <button onClick={closeEditor} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
              </div>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note..."
              className="w-full h-64 min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-zinc-100 placeholder:italic placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y flex-shrink-0"
            />
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={save} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                <IconCheck size={14} /> Done
              </button>
              <button onClick={closeEditor} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {templatePickerOpen && (
        <TemplatePickerModal templates={templates} onSelect={applyTemplate} onClose={() => setTemplatePickerOpen(false)} />
      )}
    </>
  );
}

function EditableCell({ value, onChange, type = "text", numeric = false, className = "", placeholder = "", max, min, holidays, businessDaysOnly, disabled = false }) {
  if (type === "date") {
    return <CalendarPicker value={value} onChange={onChange} holidays={holidays} businessDaysOnly={businessDaysOnly} minDate={min} maxDate={max} placeholder={placeholder || "Select date"} compact disabled={disabled} />;
  }
  return (
    <input
      type={type} value={value} placeholder={placeholder} max={max} min={min} disabled={disabled}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/[^0-9.\-]/g, "") : e.target.value)}
      className={`bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 w-full disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={FONT_MONO}
    />
  );
}

// Small emoji icon button, docked inside/beside the P/L input's edge. Its
// picker opens as a fixed-position portal overlay (same pattern as
// CalendarPicker) so it floats on top of the table instead of pushing
// other rows out of place. Only ever rendered while the row is being
// edited — the read view shows no mood indicator at all.
const MOOD_PICKER_EST_WIDTH = 260;
function MoodPickerButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const meta = value ? moodMeta(value) : null;

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - MOOD_PICKER_EST_WIDTH - 8);
      setCoords({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
  };
  const openPicker = () => { updatePosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <>
      <Tooltip text={meta ? `Exit mood: ${meta.label}` : "Tag exit mood"}>
        <button
          type="button"
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openPicker())}
          className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(128,128,128,0.18)] ${!meta ? "opacity-40 grayscale" : ""}`}
        >
          {meta ? <MoodEmoji id={meta.id} size={18} /> : (
            <img src={`${TWEMOJI_CDN}1F610.svg`} alt="Tag mood" width={18} height={18} style={{ width: 18, height: 18 }} loading="lazy" />
          )}
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-2.5 flex flex-wrap gap-1.5 tj-popover"
            style={{ top: coords.top, left: coords.left, width: MOOD_PICKER_EST_WIDTH }}
          >
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(value === m.id ? null : m.id); setOpen(false); }}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
                  value === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <MoodEmoji id={m.id} size={16} /> {m.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}

const SCREENSHOTS_POPOVER_WIDTH = 260;
function TradeScreenshotsButton({ screenshots = [], onChange, tradeLabel = "trade" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const btnRef = useRef(null);
  const fileInputRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - SCREENSHOTS_POPOVER_WIDTH - 8);
      setCoords({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
  };
  const openPicker = () => { updatePosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const handleFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTradeFile(file);
      onChange([...(screenshots || []), { url, uploaded_at: new Date().toISOString() }]);
      notify("Screenshot added.");
    } catch (err) {
      notify("Couldn't upload that screenshot — please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = async (idx) => {
    const removed = screenshots[idx];
    onChange(screenshots.filter((_, i) => i !== idx));
    if (removed) deleteTradeScreenshotFiles([removed]);
  };

  return (
    <>
      <Tooltip text={screenshots.length ? `${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"}` : "Attach a chart screenshot"}>
        <button
          type="button"
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openPicker())}
          className={`relative flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(128,128,128,0.18)] ${screenshots.length ? "" : "opacity-40"}`}
        >
          <IconCamera size={16} />
          {screenshots.length > 0 && (
            <span className="absolute -top-1 -right-1 tj-primary-bg text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
              {screenshots.length}
            </span>
          )}
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-2.5 tj-popover"
            style={{ top: coords.top, left: coords.left, width: SCREENSHOTS_POPOVER_WIDTH }}
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 px-0.5" style={FONT_MONO}>Screenshots — {tradeLabel}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {screenshots.map((s, idx) => (
                <div key={s.url + idx} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-800">
                  <img
                    src={s.url}
                    alt=""
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightboxUrl(s.url)}
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconX size={10} className="text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                {uploading ? <IconLoader2 size={16} className="animate-spin" /> : <IconPlus size={16} />}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
          </div>
        </>,
        getPortalTarget(),
      )}
      {lightboxUrl && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-8" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <IconX size={18} className="text-white" />
          </button>
        </div>,
        getPortalTarget(),
      )}
    </>
  );
}

// Compact "Label: Value ▾" filter button whose menu opens as a fixed-position
// portal overlay — used for the Trade Log mood filters. Collapsed by default
// (just the current selection shows) rather than a full row of chips, and
// highlights when a real filter is active.
const DROPDOWN_MENU_EST_WIDTH = 210;
// Shared across every DropdownFilterButton instance on the page — a counter
// rather than a simple boolean, so if more than one happens to be open at
// once, closing one doesn't prematurely unlock scroll while another is
// still open.
let dropdownScrollLockCount = 0;
function lockPageScroll() {
  dropdownScrollLockCount++;
  if (dropdownScrollLockCount === 1) {
    // Locking scroll via overflow:hidden would normally make the browser's
    // own scrollbar disappear, and since its width is no longer reserved,
    // the page content shifts sideways to fill the gap — a visible jump.
    // That's handled globally instead, by the scrollbar-gutter:stable rule
    // in index.css, which keeps the gutter's space permanently reserved
    // regardless of scroll-lock state — so nothing needs compensating for
    // here. (Adding padding-right on top of that rule would double-count
    // the gutter and shift content sideways instead of preventing it.)
    document.body.style.overflow = "hidden";
  }
}
function unlockPageScroll() {
  dropdownScrollLockCount = Math.max(0, dropdownScrollLockCount - 1);
  if (dropdownScrollLockCount === 0) {
    document.body.style.overflow = "";
  }
}
// Same behavior as DropdownFilterButton, sized down for narrow contexts
// (the 288px sidebar) where four of these need to sit in a row without
// wrapping awkwardly.
function CompactFilterButton({ label, displayValue, options, onSelect, active, disabled }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const MENU_WIDTH = 180;

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
      setCoords({ top: rect.bottom + 4, left: Math.max(8, left) });
    }
  };
  const openMenu = () => { if (disabled) return; updatePosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={active && !disabled ? { borderColor: "var(--tj-primary)", backgroundColor: "color-mix(in srgb, var(--tj-primary) 12%, transparent)" } : undefined}
        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500"
          : active ? "tj-primary-text font-semibold"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
        }`}
      >
        <span className={active ? "" : "text-zinc-500"}>{label}:</span> {displayValue}
        <span className={`text-[9px] ${active ? "" : "text-zinc-500"}`}>▾</span>
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 max-h-72 overflow-y-auto tj-popover"
            style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onSelect(opt.id); setOpen(false); }}
                className={`tj-app w-full text-left flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg transition-colors ${
                  opt.selected ? "tj-primary-bg font-semibold" : "text-zinc-300"
                }`}
              >
                {opt.emoji && <MoodEmoji id={opt.id} size={14} />} {opt.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}

function DropdownFilterButton({ label, displayValue, options, onSelect, active, disabled }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - DROPDOWN_MENU_EST_WIDTH - 8);
      setCoords({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
  };
  const openMenu = () => { if (disabled) return; updatePosition(); setOpen(true); };

  // Once the menu has actually rendered, check whether it runs past the
  // bottom of the viewport — if so, scroll the page just enough to bring
  // the whole thing into view before scroll gets locked below. Without
  // this, a menu opened near the bottom of the page would have its lower
  // portion (and its own internal scrollbar) stranded off-screen with no
  // way to reach it once the page itself can no longer scroll.
  React.useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const overflow = menuRect.bottom - window.innerHeight;
    if (overflow > 0) {
      window.scrollBy(0, overflow + 40);
      updatePosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      unlockPageScroll();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={active && !disabled ? { borderColor: "var(--tj-primary)", backgroundColor: "color-mix(in srgb, var(--tj-primary) 12%, transparent)" } : undefined}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500"
          : active ? "tj-primary-text font-semibold"
          : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
        }`}
      >
        <span className={active ? "" : "text-zinc-500"}>{label}:</span> {displayValue}
        <span className={`text-[10px] ${active ? "" : "text-zinc-500"}`}>▾</span>
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 max-h-72 overflow-y-auto tj-popover"
            style={{ top: coords.top, left: coords.left, width: DROPDOWN_MENU_EST_WIDTH }}
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onSelect(opt.id); setOpen(false); }}
                className={`tj-app w-full text-left flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg transition-colors ${
                  opt.selected ? "tj-primary-bg font-semibold" : "text-zinc-300"
                }`}
              >
                {opt.emoji && <MoodEmoji id={opt.id} size={15} />} {opt.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}

// Small pill showing how many My Learnings notes link to this trade. Only
// renders when there's at least one — stays invisible otherwise so it adds
// no clutter to trades nobody has written about. Portaled to escape the
// table cell's own truncate/overflow styling, same reasoning as
// DropdownFilterButton above.
function NotesBadge({ notes, onOpenNote }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 264 - 8) });
    }
  };
  const toggle = () => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      unlockPageScroll();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  if (!notes || notes.length === 0) return null;

  return (
    <>
      <Tooltip text={`${notes.length} linked note${notes.length === 1 ? "" : "s"}`}>
        <button ref={btnRef} onClick={toggle} className="text-zinc-500 hover:tj-primary-text">
          <IconFileText size={14} />
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] w-64 rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 flex flex-col tj-popover"
            style={{ top: coords.top, left: coords.left }}
          >
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 px-2 pt-1 pb-1.5" style={FONT_MONO}>
              {notes.length} linked note{notes.length === 1 ? "" : "s"}
            </p>
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => { setOpen(false); if (onOpenNote) onOpenNote(n.id); }}
                className="w-full text-left text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg px-2 py-2 truncate transition-colors"
              >
                {n.title || "Untitled"}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}

// Search-as-you-type picker for the reminder subcategory taxonomy — a
// plain dropdown doesn't hold up once there are 100+ options, so this
// filters by group as you type and shows a severity dot per option.
const WHEEL_ITEM_H = 40;
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS;
const WHEEL_PAD = (WHEEL_H - WHEEL_ITEM_H) / 2;

// One scrollable "wheel" column — snaps to whichever row is centered after
// scrolling stops, and clicking any visible row jumps straight to it.
function TimeWheelColumn({ values, value, onChange, render }) {
  const isProgrammatic = useRef(false);
  const settleTimer = useRef(null);
  const lastWheelTime = useRef(0);
  const velocityLog = useRef([]);
  const idx = values.indexOf(value);
  const [position, setPosition] = useState(idx);
  const [snapping, setSnapping] = useState(true);
  const n = values.length;
  const wrap = (i) => ((i % n) + n) % n;

  useEffect(() => {
    if (isProgrammatic.current) return;
    setSnapping(true);
    setPosition(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const settle = (finalPos) => {
    setSnapping(true);
    const rounded = wrap(Math.round(finalPos));
    setPosition(rounded);
    velocityLog.current = [];
    if (values[rounded] !== value) { isProgrammatic.current = true; onChange(values[rounded]); requestAnimationFrame(() => { isProgrammatic.current = false; }); }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const now = performance.now();
    const dt = now - lastWheelTime.current;
    lastWheelTime.current = now;
    setSnapping(false);

    // Track recent wheel-event timing to estimate real scroll speed —
    // events arriving close together (a fast flick) move further per tick
    // than events spaced apart (a slow, deliberate nudge). A single,
    // isolated tick always moves by at least 1 rather than rounding away
    // to nothing; a rapid run of ticks ramps up to move by several at once.
    velocityLog.current.push(dt);
    if (velocityLog.current.length > 5) velocityLog.current.shift();
    const avgDt = velocityLog.current.reduce((a, b) => a + b, 0) / velocityLog.current.length;
    const speedFactor = Math.max(1, Math.min(4, 80 / Math.max(avgDt, 20)));
    const rawStep = Math.sign(e.deltaY) * speedFactor;

    // No clamping here — position is free to run past either end of the
    // range during the scroll itself, so the wheel motion stays smooth and
    // continuous through the wrap (00 minutes scrolling up keeps going
    // straight into 59, 58... rather than stopping dead at the boundary).
    setPosition((prev) => prev + rawStep);

    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      setPosition((prev) => { settle(prev); return prev; });
    }, 130);
  };

  // Takes the clicked row's offset from the current center (not an
  // absolute value) so the wheel always animates the short way around to
  // it, rather than potentially jumping all the way across the wheel if
  // "position" has wrapped several times from repeated scrolling.
  const jumpTo = (offset) => {
    setSnapping(true);
    const target = position + offset;
    setPosition(target);
    const wrappedIdx = wrap(Math.round(target));
    if (values[wrappedIdx] !== value) { isProgrammatic.current = true; onChange(values[wrappedIdx]); requestAnimationFrame(() => { isProgrammatic.current = false; }); }
  };

  const centerIndex = Math.round(position);
  const offsetPx = (position - centerIndex) * WHEEL_ITEM_H;

  // For short value arrays (AM/PM has only 2), wrapping the same 5 visible
  // slots would otherwise repeat a value 2-3 times. Process offsets in
  // order of distance from center so the closest occurrence of each
  // unique wrapped index "wins"; farther, duplicate offsets render blank
  // instead of showing the same value again.
  const keepOffset = new Set();
  const seenWrapped = new Set();
  [0, -1, 1, -2, 2].forEach((o) => {
    const w = wrap(centerIndex + o);
    if (!seenWrapped.has(w)) { seenWrapped.add(w); keepOffset.add(o); }
  });

  return (
    <div onWheel={handleWheel} style={{ height: WHEEL_H, overflow: "hidden" }} className="relative">
      <div style={{ transform: `translateY(${-offsetPx}px)`, transition: snapping ? "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)" : "none" }}>
        {[-2, -1, 0, 1, 2].map((o) => {
          const v = keepOffset.has(o) ? values[wrap(centerIndex + o)] : undefined;
          const distance = Math.abs(o);
          const isCenter = o === 0;
          return (
            <div key={o} style={{ height: WHEEL_ITEM_H }} className="flex items-center justify-center">
              {v !== undefined && (
                <button
                  type="button" onClick={() => jumpTo(o)}
                  className="w-full h-full flex items-center justify-center"
                >
                  <span
                    className="transition-all"
                    style={{
                      fontSize: isCenter ? 20 : 16, fontWeight: isCenter ? 700 : 400,
                      color: isCenter ? "#f5f5f7" : distance === 1 ? "#71717a" : "#3f3f46",
                      fontFamily: "monospace",
                    }}
                  >
                    {render ? render(v) : v}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const WHEEL_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => i);
const WHEEL_AMPM = ["AM", "PM"];

function parseReminderTime(value) {
  const match = (value || "").match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return [5, 0, "AM"];
  return [Math.min(12, Math.max(1, parseInt(match[1], 10))), Math.min(59, Math.max(0, parseInt(match[2], 10))), match[3].toUpperCase()];
}

// "H:MM AM/PM" for right now — used as the default time whenever a
// reminder form opens without an existing time to prefill from.
function currentTimeString() {
  const d = new Date();
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

function TimeWheelField({ value, onChange, error = false }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [measured, setMeasured] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [draftH, draftM, draftAP] = useMemo(() => parseReminderTime(value), [value, open]);
  const [h, setH] = useState(draftH);
  const [m, setM] = useState(draftM);
  const [ap, setAp] = useState(draftAP);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260), triggerTop: rect.top, triggerBottom: rect.bottom });
    }
  };
  const openPicker = () => {
    const [ph, pm, pap] = parseReminderTime(value);
    setH(ph); setM(pm); setAp(pap);
    setMeasured(false);
    updatePosition();
    setOpen(true);
  };

  // Renders below first as a reasonable guess, then measures its real
  // height and flips it to open above the trigger instead if it would
  // otherwise run past the bottom of the viewport.
  React.useLayoutEffect(() => {
    if (!open || !menuRef.current || !coords) return;
    const menuHeight = menuRef.current.getBoundingClientRect().height;
    const overflowBelow = coords.triggerBottom + 6 + menuHeight - window.innerHeight;
    if (overflowBelow > 0 && coords.triggerTop - 6 - menuHeight >= 0) {
      setCoords((prev) => ({ ...prev, top: prev.triggerTop - 6 - menuHeight }));
    }
    setMeasured(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coords && coords.triggerTop]);

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("resize", updatePosition);
    return () => { unlockPageScroll(); window.removeEventListener("resize", updatePosition); };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={openPicker}
        className={`w-full flex items-center justify-between gap-1.5 bg-zinc-950 border rounded-lg px-3 py-2 text-xs text-left ${error ? "border-rose-500" : "border-zinc-800"}`}
        style={FONT_MONO}
      >
        <span className={value ? "text-zinc-100" : "text-zinc-600"}>{value || currentTimeString()}</span>
        <IconClock size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl overflow-hidden tj-popover"
            style={{ width: Math.max(coords.width, 260), top: coords.top, left: coords.left, visibility: measured ? "visible" : "hidden" }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-amber-400 font-medium">Cancel</button>
              <p className="text-xs font-semibold text-zinc-200">Reminder Time</p>
              <button
                type="button"
                onClick={() => { onChange(`${h}:${String(m).padStart(2, "0")} ${ap}`); setOpen(false); }}
                className="text-xs text-amber-400 font-semibold"
              >
                Save
              </button>
            </div>
            <div className="relative px-3 py-2.5">
              <div className="absolute left-3 right-3 rounded-lg bg-zinc-800/60 pointer-events-none" style={{ top: 10 + WHEEL_PAD, height: WHEEL_ITEM_H }} />
              <div className="flex justify-center gap-6 relative">
                <TimeWheelColumn values={WHEEL_HOURS} value={h} onChange={setH} render={(v) => String(v).padStart(2, "0")} />
                <TimeWheelColumn values={WHEEL_MINUTES} value={m} onChange={setM} render={(v) => String(v).padStart(2, "0")} />
                <TimeWheelColumn values={WHEEL_AMPM} value={ap} onChange={setAp} />
              </div>
            </div>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-2.5 border-t border-zinc-800"
              >
                Clear time
              </button>
            )}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function ReminderSearchablePicker({ groups, value, onSelect, totalCount }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const q = query.trim().toLowerCase();
  const filtered = groups.map((g) => ({ ...g, items: g.items.filter(([name]) => name.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 300);
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      const desiredHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom - 14;
      const spaceAbove = rect.top - 14;
      // Prefer opening below, as long as there's reasonably enough room;
      // otherwise flip upward if that side genuinely has more space to
      // offer — matching how native pickers avoid running off-screen.
      const openUpward = spaceBelow < Math.min(desiredHeight, 160) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(desiredHeight, openUpward ? spaceAbove : spaceBelow));
      const top = openUpward ? rect.top - 6 - maxHeight : rect.bottom + 6;
      setCoords({ top, left: Math.max(8, left), width, maxHeight });
    }
  };
  const toggle = () => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      unlockPageScroll();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button" onClick={toggle}
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 text-left"
      >
        <span className="flex items-center gap-2 truncate">
          {value && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: REMINDER_SEVERITY[value[1]].dot }} />}
          <span className="truncate">{value ? value[0] : "Select a type…"}</span>
        </span>
        <IconChevronDown size={13} className="flex-shrink-0 text-zinc-500" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl flex flex-col tj-popover reminder-picker-scroll"
            style={{ width: coords.width, maxHeight: coords.maxHeight, top: coords.top, left: coords.left }}
          >
            <div className="p-2 border-b border-zinc-800 flex-shrink-0">
              <input
                autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${totalCount} types…`}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="overflow-y-auto p-1.5 reminder-picker-scroll">
              {filtered.length === 0 && <p className="text-xs text-zinc-600 p-3 text-center">No matches.</p>}
              {filtered.map((g) => (
                <div key={g.group} className="mb-2">
                  <p className="text-[9px] uppercase tracking-wide text-zinc-600 px-2 py-1" style={FONT_MONO}>{g.group}</p>
                  {g.items.map(([name, sev]) => (
                    <button
                      key={name} type="button"
                      onClick={() => { onSelect([name, sev]); setOpen(false); setQuery(""); }}
                      className="w-full flex items-center gap-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: REMINDER_SEVERITY[sev].dot }} />
                      <span className="truncate">{name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function ReminderPill({ severity, label }) {
  const s = REMINDER_SEVERITY[severity];
  return <span className={`text-[10px] uppercase tracking-wide font-semibold ${s.text} ${s.bg} px-1.5 py-0.5 rounded flex-shrink-0`} style={FONT_MONO}>{label}</span>;
}

// Yesterday/Today/Tomorrow only for those three specific days — every other
// date (whether days ago or days away) shows the real calendar date instead
// of a vague "in N days"/"N days ago", per how the reminder actually reads.
// Combines a reminder's stored date ("YYYY-MM-DD") and time ("H:MM AM/PM")
// into a real epoch-ms moment, for comparing against "now". Returns null
// for a reminder with no time set — those are day-level notes, not
// alarms with a specific moment to fire at.
function reminderCombinedEpoch(reminder) {
  if (!reminder.date || !reminder.time) return null;
  const [y, mo, d] = reminder.date.split("-").map(Number);
  const [h12, m, ap] = parseReminderTime(reminder.time);
  let h24 = h12 % 12;
  if (ap === "PM") h24 += 12;
  return new Date(y, mo - 1, d, h24, m, 0, 0).getTime();
}

// "It's time" for a freshly-triggered alarm; "N ago" for one discovered
// late (app was closed or the user wasn't logged in when it fired).
function reminderRelativeAgo(epochMs) {
  const diffMs = Date.now() - epochMs;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return null;
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function reminderDayLabel(daysUntil, isoDate) {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil === -1) return "Yesterday";
  return isoToWordDate(isoDate);
}

// "9:00 PM" -> "9 PM" (on-the-hour reads more naturally without ":00"),
// but "9:30 PM" stays as-is since the minutes actually matter there.
function reminderTimeDisplay(time) {
  if (!time) return "";
  return time.replace(/:00(\s*[AP]M)$/i, "$1");
}

function ReminderRowDisplay({ r, onDelete, onEdit }) {
  const s = REMINDER_SEVERITY[r.severity];
  const dayLabel = reminderDayLabel(r.daysUntil, r.date);
  const canEdit = onEdit && r.daysUntil !== null && r.daysUntil >= 0;
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-xl border-l-4 ${s.border} bg-zinc-900/60`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-zinc-100 font-medium truncate">{r.title}</p>
          <ReminderPill severity={r.severity} label={r.subcategory ? (r.category === "other" ? r.subcategory.charAt(0).toUpperCase() + r.subcategory.slice(1) : r.subcategory) : "Reminder"} />
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {dayLabel}{r.time ? `, ${reminderTimeDisplay(r.time)}` : ""}
        </p>
        {r.notes && (
          <p className="text-xs text-zinc-400 mt-1" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {r.notes}
          </p>
        )}
      </div>
      {canEdit && (
        <button onClick={() => onEdit(r)} className="text-zinc-600 hover:tj-primary-text flex-shrink-0">
          <IconPencil size={13} />
        </button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(r.id)} className="text-zinc-600 hover:text-rose-500 flex-shrink-0">
          <IconTrash size={13} />
        </button>
      )}
    </div>
  );
}

function RescheduleReminderPage({ reminder, onBack, onSave }) {
  const [date, setDate] = useState(reminder.date);
  const [time, setTime] = useState(reminder.time || currentTimeString());
  const [notes, setNotes] = useState(reminder.notes || "");
  const [errors, setErrors] = useState({});
  const todayIso = localISODate(Date.now());

  const handleSave = () => {
    const nextErrors = {};
    if (date < todayIso) {
      nextErrors.date = "That date has already passed — pick today or later.";
    } else if (date === todayIso && time) {
      const [h12, m, ap] = parseReminderTime(time);
      let h24 = h12 % 12;
      if (ap === "PM") h24 += 12;
      const scheduledMoment = new Date();
      scheduledMoment.setHours(h24, m, 0, 0);
      if (scheduledMoment.getTime() < Date.now()) nextErrors.time = "That time has already passed today.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      playErrorBeep();
      return;
    }
    onSave(reminder.id, { date, time, notes: notes.trim() });
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-5">
        <div>
          <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>Reschedule Reminder</p>
          <p className="text-sm text-zinc-400 mt-1">{reminder.title}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Date</label>
            <CalendarPicker value={date} onChange={(v) => { setDate(v); setErrors((p) => ({ ...p, date: null, time: null })); }} placeholder="Select date" minDate={todayIso} error={!!errors.date} />
            {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Time</label>
            <TimeWheelField value={time} onChange={(v) => { setTime(v); if (errors.time) setErrors((p) => ({ ...p, time: null })); }} error={!!errors.time} />
            {errors.time && <p className="text-xs text-rose-500 mt-1">{errors.time}</p>}
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Note</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any details you want to remember..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg py-2.5 font-semibold transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg hover:scale-[1.01] active:scale-95 transition-transform">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AddReminderPage({ onBack, onSave, effectiveGroups, reminderSeverityFor, prefill }) {
  const [category, setCategory] = useState("event");
  const eventGroups = effectiveGroups.filter((g) => g.group !== "Trade");
  const tradeGroups = effectiveGroups.filter((g) => g.group === "Trade");
  const groups = category === "event" ? eventGroups : tradeGroups;
  const [picked, setPicked] = useState(() => (groups[0] ? groups[0].items[0] : null));
  const [otherType, setOtherType] = useState("market");
  const [otherTitle, setOtherTitle] = useState("");
  const [otherSeverity, setOtherSeverity] = useState("blue");
  const [date, setDate] = useState(() => (prefill && prefill.date) || localISODate(Date.now()));
  const [time, setTime] = useState(() => (prefill && prefill.time) || currentTimeString());
  const [leadDays, setLeadDays] = useState(0);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const isOther = category === "other";
  const totalCount = eventGroups.reduce((s, g) => s + g.items.length, 0) + tradeGroups.reduce((s, g) => s + g.items.length, 0);
  const todayIso = localISODate(Date.now());

  const handleSave = () => {
    const nextErrors = {};
    if (date < todayIso) {
      nextErrors.date = "That date has already passed — pick today or later.";
    } else if (date === todayIso && time) {
      const [h12, m, ap] = parseReminderTime(time);
      let h24 = h12 % 12;
      if (ap === "PM") h24 += 12;
      const scheduledMoment = new Date();
      scheduledMoment.setHours(h24, m, 0, 0);
      if (scheduledMoment.getTime() < Date.now()) nextErrors.time = "That time has already passed today.";
    }
    if (isOther && !otherTitle.trim()) nextErrors.title = "Title can't be empty.";
    if (!isOther && !picked) nextErrors.picked = "Pick a type from the list.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      playErrorBeep();
      return;
    }
    setErrors({});
    if (isOther) {
      onSave({ title: otherTitle.trim(), category: "other", subcategory: otherType, severity: otherSeverity, date, time, leadDays, notes: notes.trim() });
    } else {
      onSave({ title: picked[0], category, subcategory: picked[0], severity: reminderSeverityFor(picked[0]), date, time, leadDays, notes: notes.trim() });
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-5">
        <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>Add Reminder</p>

        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {[["event", "Market Event"], ["trade", "Trade"], ["other", "Other"]].map(([id, label]) => (
              <button
                key={id} onClick={() => { setCategory(id); const gs = id === "event" ? eventGroups : id === "trade" ? tradeGroups : []; if (gs[0]) setPicked(gs[0].items[0]); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${category === id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isOther ? (
          <>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {[["market", "Market"], ["trade", "Trade"], ["news", "News"], ["personal", "Personal"]].map(([id, label]) => (
                  <button
                    key={id} onClick={() => setOtherType(id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${otherType === id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Title</label>
              <input
                value={otherTitle} onChange={(e) => { setOtherTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: null })); }}
                placeholder="e.g. Broker maintenance window"
                className={`w-full bg-zinc-950 border rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 ${errors.title ? "border-rose-500" : "border-zinc-800"}`}
              />
              {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">{category === "event" ? "Market Event" : "Trade"} type</label>
            <ReminderSearchablePicker groups={groups} value={picked} onSelect={(v) => { setPicked(v); if (errors.picked) setErrors((p) => ({ ...p, picked: null })); }} totalCount={totalCount} />
            {errors.picked && <p className="text-xs text-rose-500 mt-1">{errors.picked}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Date</label>
            <CalendarPicker value={date} onChange={(v) => { setDate(v); setErrors((p) => ({ ...p, date: null, time: null })); }} placeholder="Select date" minDate={todayIso} error={!!errors.date} />
            {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Time</label>
            <TimeWheelField value={time} onChange={(v) => { setTime(v); if (errors.time) setErrors((p) => ({ ...p, time: null })); }} error={!!errors.time} />
            {errors.time && <p className="text-xs text-rose-500 mt-1">{errors.time}</p>}
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Impact</label>
          {isOther ? (
            <div className="flex gap-1.5">
              {Object.entries(REMINDER_SEVERITY).map(([key, s]) => (
                <button key={key} onClick={() => setOtherSeverity(key)} className={`flex-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${otherSeverity === key ? `${s.border} ${s.bg} ${s.text} font-semibold` : "border-zinc-800 text-zinc-500"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          ) : picked ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${REMINDER_SEVERITY[reminderSeverityFor(picked[0])].border} ${REMINDER_SEVERITY[reminderSeverityFor(picked[0])].bg}`}>
              <span className={`text-xs font-semibold ${REMINDER_SEVERITY[reminderSeverityFor(picked[0])].text}`}>{REMINDER_SEVERITY[reminderSeverityFor(picked[0])].label}</span>
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No types available in this category.</p>
          )}
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Remind me in advance</label>
          <ThemedSelect
            value={leadDays}
            options={[
              { value: 0, label: "On the day" },
              { value: 1, label: "1 day before" },
              { value: 3, label: "3 days before" },
              { value: 7, label: "7 days before" },
            ]}
            onChange={(v) => setLeadDays(v)}
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Note</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any details you want to remember..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
          />
        </div>

        <button onClick={handleSave} className="w-full tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg hover:scale-[1.01] active:scale-95 transition-transform">
          Save Reminder
        </button>
      </div>
    </div>
  );
}

// A themed replacement for native <select> — browsers render <select>
// dropdowns with OS-native styling that can look jarringly out of place
// against a custom dark UI, so this renders the same portal/anchor pattern
// used elsewhere (DropdownFilterButton, ReminderSearchablePicker).
// A themed replacement for a native <select> with <optgroup> (which always
// renders with unstylable OS/browser chrome). Opens on 4 category tabs
// (Bullish/Bearish/Neutral/Other) so switching between them is a single
// click rather than scrolling through one long flat list — defaults to
// whichever category the currently-selected strategy belongs to.
function StrategyPicker({ value, allStrategies, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [measured, setMeasured] = useState(false);
  const [activeCategory, setActiveCategory] = useState(STRATEGY_CATEGORIES[0].id);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 280), triggerTop: rect.top, triggerBottom: rect.bottom });
    }
  };
  const toggle = () => {
    if (!open) {
      setMeasured(false);
      updatePosition();
      const current = (allStrategies || []).find((s) => s.label === value);
      setActiveCategory(current ? (current.category || "other") : STRATEGY_CATEGORIES[0].id);
    }
    setOpen((v) => !v);
  };

  // Same below-first-then-flip-up-if-needed approach used by ThemedSelect
  // and the other custom pickers in this app, so the page never has to
  // scroll to accommodate the menu.
  React.useLayoutEffect(() => {
    if (!open || !menuRef.current || !coords) return;
    const menuHeight = menuRef.current.getBoundingClientRect().height;
    const overflowBelow = coords.triggerBottom + 6 + menuHeight - window.innerHeight;
    if (overflowBelow > 0 && coords.triggerTop - 6 - menuHeight >= 0) {
      setCoords((prev) => ({ ...prev, top: prev.triggerTop - 6 - menuHeight }));
    }
    setMeasured(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coords && coords.triggerTop]);

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("resize", updatePosition);
    return () => { unlockPageScroll(); window.removeEventListener("resize", updatePosition); };
  }, [open]);

  const optionsInCategory = (allStrategies || []).filter((s) => (s.category || "other") === activeCategory);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={toggle}
        className="w-full flex items-center justify-between gap-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 text-left focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <span className="truncate">{value || "Select strategy"}</span>
        <IconChevronDown size={12} className="flex-shrink-0 text-zinc-500" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-2 tj-popover flex flex-col"
            style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: 360, visibility: measured ? "visible" : "hidden" }}
          >
            <div className="flex gap-1 mb-2 flex-shrink-0">
              {STRATEGY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg font-semibold transition-colors ${activeCategory === cat.id ? "tj-primary-bg" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto space-y-0.5">
              {optionsInCategory.length === 0 && <p className="text-xs text-zinc-600 px-2 py-3 text-center">No strategies in this category.</p>}
              {optionsInCategory.map((s) => (
                <button
                  key={s.id} type="button"
                  onClick={() => { onChange(s.label); setOpen(false); }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${value === s.label ? "tj-primary-bg font-semibold" : "text-zinc-200 hover:bg-zinc-800"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function ThemedSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [measured, setMeasured] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width, triggerTop: rect.top, triggerBottom: rect.bottom });
    }
  };
  const toggle = () => {
    if (!open) { setMeasured(false); updatePosition(); }
    setOpen((v) => !v);
  };

  // The menu always renders below first (a reasonable guess), then this
  // measures its real height and flips it to open upward instead if it
  // would otherwise run past the bottom of the viewport — the same
  // approach native OS pickers use, so the page itself never needs to
  // scroll to accommodate the menu.
  React.useLayoutEffect(() => {
    if (!open || !menuRef.current || !coords) return;
    const menuHeight = menuRef.current.getBoundingClientRect().height;
    const overflowBelow = coords.triggerBottom + 6 + menuHeight - window.innerHeight;
    if (overflowBelow > 0 && coords.triggerTop - 6 - menuHeight >= 0) {
      setCoords((prev) => ({ ...prev, top: prev.triggerTop - 6 - menuHeight }));
    }
    setMeasured(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coords && coords.triggerTop]);

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("resize", updatePosition);
    return () => { unlockPageScroll(); window.removeEventListener("resize", updatePosition); };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={toggle}
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 text-left"
      >
        {current ? current.label : ""}
        <IconChevronDown size={13} className="flex-shrink-0 text-zinc-500" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width, visibility: measured ? "visible" : "hidden" }}
          >
            {options.map((o) => (
              <button
                key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${value === o.value ? "tj-primary-bg font-semibold" : "text-zinc-200 hover:bg-zinc-800"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}

function ImpactSegmentedControl({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-zinc-950 border border-zinc-800 rounded-full p-0.5 flex-shrink-0">
      {Object.entries(REMINDER_SEVERITY).map(([key, sv]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
            value === key ? `${sv.bg} ${sv.text}` : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          {sv.label}
        </button>
      ))}
    </div>
  );
}

function EditCategoryGroupCard({ group, items, reminderSeverityFor, onChangeSeverity, onHide, customSet, onRemoveCustom, onAddCustom, onRenameItem, onRenameGroup, forceOpen }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeverity, setNewSeverity] = useState("blue");
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupDraft, setGroupDraft] = useState(group);
  const [editingItem, setEditingItem] = useState(null);
  const [itemDraft, setItemDraft] = useState("");

  const commitGroupRename = () => {
    setEditingGroup(false);
    if (groupDraft.trim() && groupDraft !== group) onRenameGroup(group, groupDraft.trim(), items);
    else setGroupDraft(group);
  };
  const commitItemRename = (name) => {
    setEditingItem(null);
    if (itemDraft.trim() && itemDraft !== name) onRenameItem(group, name, itemDraft.trim());
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div
        onClick={() => !editingGroup && setOpen((v) => !v)}
        onKeyDown={(e) => { if (!editingGroup && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen((v) => !v); } }}
        role="button" tabIndex={0}
        className="tj-section-toggle w-full flex items-center justify-between px-5 py-3.5 transition-colors cursor-pointer"
      >
        {editingGroup ? (
          <input
            autoFocus value={groupDraft} onChange={(e) => setGroupDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitGroupRename} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commitGroupRename(); if (e.key === "Escape") { setGroupDraft(group); setEditingGroup(false); } }}
            className="text-sm font-semibold bg-zinc-950 border border-amber-400 rounded-lg px-2 py-1 text-zinc-100 flex-1 mr-2 focus:outline-none"
          />
        ) : (
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-200 min-w-0">
            <span className="truncate">{group}</span> <span className="text-zinc-600 font-normal flex-shrink-0">({items.length})</span>
            <span
              onClick={(e) => { e.stopPropagation(); setGroupDraft(group); setEditingGroup(true); }}
              className="text-zinc-500 hover:text-amber-400 flex-shrink-0 p-0.5"
              role="button" tabIndex={0}
            >
              <IconPencil size={12} />
            </span>
          </span>
        )}
        <IconChevronDown size={15} className="text-zinc-500 transition-transform flex-shrink-0 ml-2" style={{ transform: isOpen ? "none" : "rotate(-90deg)" }} />
      </div>
      {isOpen && (
        <div className="px-5 pb-5 pt-2 space-y-2">
          {items.map(([name]) => {
            const sev = reminderSeverityFor(name);
            const s = REMINDER_SEVERITY[sev];
            const isEditingThis = editingItem === name;
            return (
              <div key={name} className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${s.border} bg-zinc-900/60`}>
                {isEditingThis ? (
                  <input
                    autoFocus value={itemDraft} onChange={(e) => setItemDraft(e.target.value)}
                    onBlur={() => commitItemRename(name)} onKeyDown={(e) => { if (e.key === "Enter") commitItemRename(name); if (e.key === "Escape") setEditingItem(null); }}
                    className="flex-1 min-w-0 bg-zinc-950 border border-amber-400 rounded-lg px-2 py-1 text-sm text-zinc-100 focus:outline-none"
                  />
                ) : (
                  <button onClick={() => { setItemDraft(name); setEditingItem(name); }} className="text-sm text-zinc-200 flex-1 min-w-0 truncate text-left hover:text-amber-400 transition-colors">
                    {name}
                  </button>
                )}
                <ImpactSegmentedControl value={sev} onChange={(v) => onChangeSeverity(name, v)} />
                <Tooltip text={customSet.has(name) ? "Remove type" : "Hide this built-in type"}>
                  <button onClick={() => (customSet.has(name) ? onRemoveCustom(name) : onHide(name))} className="text-zinc-600 hover:text-rose-500 flex-shrink-0">
                    <IconTrash size={14} />
                  </button>
                </Tooltip>
              </div>
            );
          })}
          {adding ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="New type name" onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <ImpactSegmentedControl value={newSeverity} onChange={setNewSeverity} />
              <button
                onClick={() => { if (newName.trim()) { onAddCustom(group, newName.trim(), newSeverity); setNewName(""); setAdding(false); } }}
                className="text-xs tj-primary-bg font-semibold rounded-lg px-3 py-2 flex-shrink-0"
              >
                Add
              </button>
              <button onClick={() => setAdding(false)} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"><IconX size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="text-xs tj-primary-text flex items-center gap-1 pt-1">
              <IconPlus size={12} /> Add a {group.toLowerCase()} type
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddCategoryCard({ onAddCustom }) {
  const [adding, setAdding] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [itemName, setItemName] = useState("");
  const [severity, setSeverity] = useState("blue");

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full text-sm text-zinc-400 hover:text-zinc-200 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-2xl py-3 flex items-center justify-center gap-1.5 transition-colors"
      >
        <IconPlus size={14} /> Add a new category
      </button>
    );
  }
  const canSave = groupName.trim() && itemName.trim();
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
      <p className="text-sm font-semibold text-zinc-200">New Category</p>
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Category name</label>
        <input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Commodities" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">First type in this category</label>
        <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Crude Oil Price Move" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 mb-1.5 block">Default impact</label>
        <ImpactSegmentedControl value={severity} onChange={setSeverity} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setAdding(false); setGroupName(""); setItemName(""); }} className="flex-1 text-sm text-zinc-400 hover:text-zinc-200 py-2">Cancel</button>
        <button
          disabled={!canSave}
          onClick={() => { onAddCustom(groupName.trim(), itemName.trim(), severity); setAdding(false); setGroupName(""); setItemName(""); }}
          className="flex-1 text-sm tj-primary-bg font-semibold rounded-lg py-2 disabled:opacity-40"
        >
          Create Category
        </button>
      </div>
    </div>
  );
}

function RemindersSettingsPage({ onBack, onEditWindowClick, onEditCategoriesClick }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-1">
        <p className="text-lg font-bold text-zinc-100 mb-4" style={FONT_DISPLAY}>Settings</p>

        <button onClick={onEditWindowClick} className="w-full flex items-center justify-between text-sm text-zinc-200 font-semibold hover:text-amber-400 transition-colors py-3 border-b border-zinc-800">
          Edit Reminder Window
          <IconChevronRight size={16} className="text-zinc-500" />
        </button>
        <button onClick={onEditCategoriesClick} className="w-full flex items-center justify-between text-sm text-zinc-200 font-semibold hover:text-amber-400 transition-colors py-3">
          Edit Categories
          <IconChevronRight size={16} className="text-zinc-500" />
        </button>
      </div>
    </div>
  );
}

function ReminderWindowSettingsPage({ onBack, windowDays, onChangeWindow }) {
  const options = [
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 30, label: "1 Month" },
    { value: 60, label: "2 Months" },
    { value: 90, label: "3 Months" },
  ];
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-3">
        <p className="text-lg font-bold text-zinc-100" style={FONT_DISPLAY}>Edit Reminder Window</p>
        <p className="text-xs text-zinc-500 mb-3">How far back and ahead "My Reminders" shows past and upcoming reminders. Older or farther-out reminders remain visible on the Calendar.</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o.value} onClick={() => onChangeWindow(o.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${windowDays === o.value ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditCategoriesPage({ onBack, effectiveGroups, reminderSeverityFor, onChangeSeverity, onHide, customNames, onRemoveCustom, onAddCustom, onRenameItem, onRenameGroup }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  const filtered = effectiveGroups.map((g) => ({ ...g, items: g.items.filter(([name]) => name.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0);
  const totalCount = effectiveGroups.reduce((s, g) => s + g.items.length, 0);
  const customSet = new Set(customNames);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>

      <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Edit Categories</p>

      <input
        value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${totalCount} types…`}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-500">No types match "{query}".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <EditCategoryGroupCard
              key={g.group}
              group={g.group}
              items={g.items}
              reminderSeverityFor={reminderSeverityFor}
              onChangeSeverity={onChangeSeverity}
              onHide={onHide}
              customSet={customSet}
              onRemoveCustom={onRemoveCustom}
              onAddCustom={onAddCustom}
              onRenameItem={onRenameItem}
              onRenameGroup={onRenameGroup}
              forceOpen={isSearching}
            />
          ))}
        </div>
      )}

      {!isSearching && <AddCategoryCard onAddCustom={onAddCustom} />}
    </div>
  );
}

function RemindersButton({ dueCount, onClick }) {
  return (
    <Tooltip text="My Reminders">
      <button onClick={onClick} className="relative flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold rounded-xl pl-3.5 pr-5 py-2 transition-colors hover:scale-[1.02] active:scale-95">
        <IconBellRinging size={14} />
        My Reminders
        {dueCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2" style={{ ...FONT_MONO, borderColor: "var(--tj-bg, #15152b)" }}>
            {dueCount > 9 ? "9+" : dueCount}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

// Builds a lookup of every day in the given month that has something on
// it — reminders (by severity), position expiries (from pnlEntries, both
// open and closed — this is "for future and past reminders... with my
// position expiries"), and holidays. One pass over each source per month
// render rather than per-cell, since the sources are usually much smaller
// than 42 cells.

function buildReminderDayMap(remindersWithDays, pnlEntries, holidays) {
  const map = {};
  const ensure = (iso) => (map[iso] = map[iso] || { reminders: [], expiries: [], holiday: null });
  remindersWithDays.forEach((r) => { if (r.date) ensure(r.date).reminders.push(r); });
  (pnlEntries || []).forEach((e) => { if (e.expiryDate) ensure(e.expiryDate).expiries.push(e); });
  (holidays || []).forEach((h) => { if (h.date) ensure(h.date).holiday = h; });
  return map;
}

// "9:00 PM" -> 21, "5:00 AM" -> 5. Reuses the same parser the time wheel
// picker itself uses, so this always agrees with what's actually stored.
function reminderTimeToHour24(time) {
  if (!time) return null;
  const [h12, , ap] = parseReminderTime(time);
  let hour = h12 % 12;
  if (ap === "PM") hour += 12;
  return hour;
}

function CalendarViewSwitcher({ view, setView }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-0.5 flex-shrink-0">
      {[["week", "Week"], ["month", "Month"], ["year", "Year"]].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} className={`text-xs px-3 py-2 rounded-full font-semibold transition-colors ${view === id ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CalendarNavHeader({ label, onPrev, onNext, isCurrent, backLabel, onBack, direction }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <button onClick={onPrev} className="text-zinc-500 hover:text-zinc-200 p-1 flex-shrink-0"><IconChevronLeft size={16} /></button>
      <p key={label} className={`text-base font-bold text-zinc-100 truncate text-center ${direction === "backward" ? "tj-calendar-fade-back" : "tj-calendar-fade"}`} style={{ width: 190 }}>{label}</p>
      <button onClick={onNext} className="text-zinc-500 hover:text-zinc-200 p-1 flex-shrink-0"><IconChevronRight size={16} /></button>
      {!isCurrent && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 font-semibold flex-shrink-0 ml-1 transition-colors underline underline-offset-2">
          <IconArrowLeft size={14} />
          {backLabel}
        </button>
      )}
    </div>
  );
}

function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-zinc-400" style={FONT_MONO}>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: REMINDER_SEVERITY.red.dot }} /> Major</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: REMINDER_SEVERITY.yellow.dot }} /> Mid</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: REMINDER_SEVERITY.blue.dot }} /> Minor</span>
      <span className="flex items-center gap-1.5"><IconClock size={12} /> Expiry</span>
      <span className="flex items-center gap-1.5"><IconFlag size={12} /> Holiday</span>
    </div>
  );
}

// ---------- MONTH VIEW ----------
function MonthCalendarView({ dayMap, viewYear, viewMonth, onOpenTrade, onCreateAt, onEdit }) {
  const [selectedDate, setSelectedDate] = useState(localISODate(Date.now()));
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = localISODate(Date.now());
  const cellIso = (day) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  useEffect(() => {
    // Keep the selected day sensible when navigating months — snap to the
    // 1st of the newly-viewed month unless today happens to be in it.
    const inThisMonth = selectedDate.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`);
    if (!inThisMonth) setSelectedDate(todayIso.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`) ? todayIso : cellIso(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  const selectedInfo = dayMap[selectedDate] || { reminders: [], expiries: [], holiday: null };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex justify-end mb-3"><CalendarLegend /></div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-zinc-600 mb-1" style={FONT_MONO}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDow }).map((_, i) => <div key={"pad" + i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const iso = cellIso(day);
            const info = dayMap[iso] || { reminders: [], expiries: [], holiday: null };
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDate;
            const extraMarkerCount = (info.expiries.length > 0 ? 1 : 0) + (info.holiday ? 1 : 0);
            const dotLimit = extraMarkerCount > 0 ? 2 : 3;
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(iso)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition-colors ${
                  isSelected ? "tj-primary-bg font-bold" : isToday ? "border border-amber-400 text-zinc-100" : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {day}
                {(info.reminders.length > 0 || extraMarkerCount > 0) && (
                  <div className="flex items-center gap-1">
                    {info.reminders.slice(0, dotLimit).map((r, i) => (
                      <span key={i} className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: REMINDER_SEVERITY[r.severity].dot, boxShadow: isSelected ? "0 0 0 1.5px var(--tj-primary-contrast)" : "none" }} />
                    ))}
                    {info.expiries.length > 0 && <IconClock size={12} className="flex-shrink-0" style={{ color: isSelected ? "var(--tj-primary-contrast)" : "#38bdf8" }} />}
                    {info.holiday && <IconFlag size={12} className="flex-shrink-0" style={{ color: isSelected ? "var(--tj-primary-contrast)" : "#fbbf24" }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100">{isoToMonDDYYYY(selectedDate)}</p>
          <button onClick={() => onCreateAt(selectedDate, null)} className="flex items-center gap-1 text-xs tj-primary-bg font-semibold rounded-lg px-2.5 py-1.5">
            <IconPlus size={12} /> Add
          </button>
        </div>
        {selectedInfo.holiday && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30">
            <IconFlag size={14} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm text-zinc-100">{selectedInfo.holiday.name}</span>
          </div>
        )}
        {selectedInfo.expiries.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1.5" style={FONT_MONO}>Position Expiries</p>
            <div className="space-y-1.5">
              {selectedInfo.expiries.map((e) => (
                <button key={e.id} onClick={() => onOpenTrade && onOpenTrade(e.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-sky-400/10 border border-sky-400/30 hover:bg-sky-400/20 transition-colors text-left">
                  <IconClock size={12} className="text-sky-400 flex-shrink-0" />
                  <span className="text-xs text-zinc-200 truncate flex-1">{e.underlying} {e.strategyLabel}</span>
                  {!e.exitDate && <span className="text-[9px] text-sky-400 uppercase flex-shrink-0" style={FONT_MONO}>Open</span>}
                  <IconChevronRight size={12} className="text-sky-400/60 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
        {selectedInfo.reminders.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1.5" style={FONT_MONO}>Reminders</p>
            <div className="space-y-1.5">{selectedInfo.reminders.map((r) => <ReminderRowDisplay key={r.id} r={r} onEdit={onEdit} />)}</div>
          </div>
        )}
        {!selectedInfo.holiday && selectedInfo.expiries.length === 0 && selectedInfo.reminders.length === 0 && (
          <p className="text-xs text-zinc-600 py-4 text-center">Nothing on this day. Click Add to create one.</p>
        )}
      </div>
    </div>
  );
}

// ---------- WEEK VIEW — week strip on top, active day's hours below ----------
function WeekCalendarView({ dayMap, weekStartIso, onOpenTrade, onCreateAt, onEdit }) {
  const todayIso = localISODate(Date.now());
  const [activeDay, setActiveDay] = useState(todayIso);
  const hourlyRef = useRef(null);

  const weekDays = useMemo(() => {
    const [y, m, d] = weekStartIso.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(start); dt.setDate(start.getDate() + i);
      return { iso: localISODate(dt.getTime()), dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()], day: dt.getDate() };
    });
  }, [weekStartIso]);

  useEffect(() => {
    if (!weekDays.some((d) => d.iso === activeDay)) {
      setActiveDay(weekDays.some((d) => d.iso === todayIso) ? todayIso : weekDays[0].iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays]);

  const nowHour = new Date().getHours();
  const isActiveToday = activeDay === todayIso;

  useEffect(() => {
    if (!hourlyRef.current) return;
    const targetHour = isActiveToday ? nowHour : 9;
    const row = hourlyRef.current.querySelector(`[data-hour="${targetHour}"]`);
    if (row) row.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay]);

  const activeInfo = dayMap[activeDay] || { reminders: [], expiries: [], holiday: null };
  const untimed = activeInfo.reminders.filter((r) => !r.time);
  const timed = activeInfo.reminders.filter((r) => r.time);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex justify-end mb-3"><CalendarLegend /></div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(({ iso, dow, day }) => {
            const info = dayMap[iso] || { reminders: [], expiries: [], holiday: null };
            const isToday = iso === todayIso;
            const isActive = iso === activeDay;
            const extraMarkerCount = (info.expiries.length > 0 ? 1 : 0) + (info.holiday ? 1 : 0);
            const dotLimit = extraMarkerCount > 0 ? 2 : 3;
            return (
              <button
                key={iso} onClick={() => setActiveDay(iso)}
                className={`rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition-colors ${isActive ? "tj-primary-bg" : isToday ? "border border-amber-400" : "bg-zinc-900/60 hover:bg-zinc-800"}`}
              >
                <span className={`text-[10px] uppercase ${isActive ? "opacity-90" : "text-zinc-500"}`}>{dow}</span>
                <span className={`text-lg font-bold ${isActive ? "" : isToday ? "text-amber-400" : "text-zinc-100"}`}>{day}</span>
                <div className="flex items-center gap-0.5 h-3">
                  {info.reminders.slice(0, dotLimit).map((r, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? "#fff" : REMINDER_SEVERITY[r.severity].dot }} />)}
                  {info.expiries.length > 0 && <IconClock size={10} style={{ color: isActive ? "#fff" : "#38bdf8" }} />}
                  {info.holiday && <IconFlag size={10} style={{ color: isActive ? "#fff" : "#fbbf24" }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-100">{isoToMonDDYYYY(activeDay)}</p>
          <button onClick={() => onCreateAt(activeDay, null)} className="flex items-center gap-1 text-xs tj-primary-bg font-semibold rounded-lg px-2.5 py-1.5">
            <IconPlus size={12} /> Add
          </button>
        </div>
        {activeInfo.holiday && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 mb-3">
            <IconFlag size={14} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm text-zinc-100">{activeInfo.holiday.name}</span>
          </div>
        )}
        {activeInfo.expiries.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {activeInfo.expiries.map((e) => (
              <button key={e.id} onClick={() => onOpenTrade && onOpenTrade(e.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-sky-400/10 border border-sky-400/30 hover:bg-sky-400/20 transition-colors text-left">
                <IconClock size={12} className="text-sky-400 flex-shrink-0" />
                <span className="text-xs text-zinc-200 truncate flex-1">{e.underlying} {e.strategyLabel}</span>
                {!e.exitDate && <span className="text-[9px] text-sky-400 uppercase flex-shrink-0" style={FONT_MONO}>Open</span>}
              </button>
            ))}
          </div>
        )}
        {untimed.length > 0 && (
          <div className="mb-3 pb-3 border-b border-zinc-800 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">No time set</p>
            {untimed.map((r) => <ReminderRowDisplay key={r.id} r={r} onEdit={onEdit} />)}
          </div>
        )}
        <div ref={hourlyRef} className="relative" style={{ maxHeight: 420, overflowY: "auto" }}>
          {hours.map((h) => {
            const remindersThisHour = timed.filter((r) => reminderTimeToHour24(r.time) === h);
            const isCurrentHour = isActiveToday && h === nowHour;
            return (
              <div
                key={h} data-hour={h}
                onClick={() => onCreateAt(activeDay, `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`)}
                className={`flex items-start gap-3 group cursor-pointer rounded-lg transition-colors ${isCurrentHour ? "bg-amber-400/[0.08]" : "hover:bg-zinc-900/60"}`}
                style={{ minHeight: 40 }}
              >
                <span className={`text-[10px] w-12 text-right pt-1.5 flex-shrink-0 ${isCurrentHour ? "text-amber-400 font-semibold" : "text-zinc-600"}`}>{fmtHour12(h)}</span>
                <div className="flex-1 border-t border-zinc-800/60 pt-1">
                  {remindersThisHour.map((r) => {
                    const s = REMINDER_SEVERITY[r.severity];
                    return <div key={r.id} className={`text-xs px-2.5 py-1.5 rounded-lg ${s.bg} ${s.text} inline-block mb-1 mr-1`}>{r.time && <span className="opacity-70">{reminderTimeDisplay(r.time)} </span>}{r.title}</div>;
                  })}
                  {remindersThisHour.length === 0 && (
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-600 flex items-center gap-1 transition-opacity">
                      <IconPlus size={9} /> Add at {fmtHour12(h)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- YEAR VIEW ----------
function YearCalendarView({ dayMap, viewYear, onPickMonth }) {
  const today = new Date();
  const todayIso = localISODate(Date.now());
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {MONTH_NAMES.map((name, mi) => {
        const daysInMonth = new Date(viewYear, mi + 1, 0).getDate();
        const firstDow = new Date(viewYear, mi, 1).getDay();
        const isCurrentMonth = viewYear === today.getFullYear() && mi === today.getMonth();
        let count = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const iso = `${viewYear}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const info = dayMap[iso];
          if (info) count += info.reminders.length + info.expiries.length + (info.holiday ? 1 : 0);
        }
        return (
          <button key={name} onClick={() => onPickMonth(mi)} className={`rounded-2xl border p-3 text-left transition-colors hover:border-zinc-600 ${isCurrentMonth ? "border-amber-400/60 bg-amber-400/[0.04]" : "border-zinc-800 bg-zinc-900/40"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${isCurrentMonth ? "text-amber-400" : "text-zinc-200"}`}>{name}</p>
              {count > 0 && <span className="text-[10px] text-zinc-500">{count} {count === 1 ? "reminder" : "reminders"}</span>}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDow }).map((_, i) => <div key={"p" + i} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const iso = `${viewYear}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const info = dayMap[iso];
                const hasStuff = info && (info.reminders.length > 0 || info.expiries.length > 0 || info.holiday);
                const isToday = iso === todayIso;
                return <div key={d} className={`aspect-square rounded-sm ${isToday ? "bg-amber-400" : hasStuff ? "bg-zinc-500" : "bg-zinc-800/60"}`} />;
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RemindersCalendar({ remindersWithDays, pnlEntries, holidays, onOpenTrade, onCreateAt, onEdit }) {
  const today = new Date();
  const [view, setView] = useState("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [weekStartIso, setWeekStartIso] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return localISODate(d.getTime());
  });
  const [direction, setDirection] = useState("forward");

  const dayMap = useMemo(() => buildReminderDayMap(remindersWithDays, pnlEntries, holidays), [remindersWithDays, pnlEntries, holidays]);

  const shiftWeek = (deltaWeeks) => {
    setDirection(deltaWeeks > 0 ? "forward" : "backward");
    const [y, m, d] = weekStartIso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaWeeks * 7);
    setWeekStartIso(localISODate(dt.getTime()));
  };
  const shiftMonth = (delta) => {
    setDirection(delta > 0 ? "forward" : "backward");
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
  };
  const shiftYear = (delta) => { setDirection(delta > 0 ? "forward" : "backward"); setViewYear((y) => y + delta); };

  const goToday = () => {
    // Slide in from whichever side matches how we're actually moving back
    // to the present — if the current view is ahead of today, returning
    // is a backward motion; if it's behind, returning is forward.
    const nowMs = today.getTime();
    let viewingAheadOfToday;
    if (view === "week") viewingAheadOfToday = new Date(weekStartIso).getTime() > nowMs;
    else if (view === "month") viewingAheadOfToday = viewYear * 12 + viewMonth > today.getFullYear() * 12 + today.getMonth();
    else viewingAheadOfToday = viewYear > today.getFullYear();
    setDirection(viewingAheadOfToday ? "backward" : "forward");
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth());
    const d = new Date(today); d.setDate(d.getDate() - d.getDay());
    setWeekStartIso(localISODate(d.getTime()));
  };

  const weekEndLabel = useMemo(() => {
    const [y, m, d] = weekStartIso.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return sameMonth
      ? `${MONTH_ABBR[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`
      : `${MONTH_ABBR[start.getMonth()]} ${start.getDate()} - ${MONTH_ABBR[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }, [weekStartIso]);

  const labels = { week: weekEndLabel, month: `${MONTH_NAMES[viewMonth]} ${viewYear}`, year: String(viewYear) };
  const navHandlers = {
    week: { onPrev: () => shiftWeek(-1), onNext: () => shiftWeek(1) },
    month: { onPrev: () => shiftMonth(-1), onNext: () => shiftMonth(1) },
    year: { onPrev: () => shiftYear(-1), onNext: () => shiftYear(1) },
  };
  const todayWeekStartIso = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return localISODate(d.getTime());
  }, []);
  const isCurrent = {
    week: weekStartIso === todayWeekStartIso,
    month: viewYear === today.getFullYear() && viewMonth === today.getMonth(),
    year: viewYear === today.getFullYear(),
  };
  const backLabels = { week: "Return to This Week", month: "Return to This Month", year: "Return to This Year" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <CalendarNavHeader
          label={labels[view]} onPrev={navHandlers[view].onPrev} onNext={navHandlers[view].onNext}
          isCurrent={isCurrent[view]} backLabel={backLabels[view]} onBack={goToday} direction={direction}
        />
        <CalendarViewSwitcher view={view} setView={setView} />
      </div>
      <div key={`${view}-${labels[view]}`} className={direction === "backward" ? "tj-calendar-fade-back" : "tj-calendar-fade"}>
        {view === "week" && <WeekCalendarView dayMap={dayMap} weekStartIso={weekStartIso} onOpenTrade={onOpenTrade} onCreateAt={onCreateAt} onEdit={onEdit} />}
        {view === "month" && <MonthCalendarView dayMap={dayMap} viewYear={viewYear} viewMonth={viewMonth} onOpenTrade={onOpenTrade} onCreateAt={onCreateAt} onEdit={onEdit} />}
        {view === "year" && <YearCalendarView dayMap={dayMap} viewYear={viewYear} onPickMonth={(mi) => { setDirection("forward"); setViewMonth(mi); setView("month"); }} />}
      </div>
    </div>
  );
}

function RemindersPage({ remindersWithDays, onDeleteReminder, onAddClick, onSettingsClick, pnlEntries, holidays, onOpenTrade, onCreateAt, windowDays, onEdit }) {
  const [view, setView] = useState("list"); // "list" | "calendar"
  const todayItems = remindersWithDays.filter((r) => r.daysUntil === 0);
  const upcomingItems = remindersWithDays.filter((r) => r.daysUntil !== null && r.daysUntil > 0 && r.daysUntil <= windowDays);
  const pastItems = remindersWithDays.filter((r) => r.daysUntil !== null && r.daysUntil < 0 && r.daysUntil >= -windowDays);
  const upcomingGrouped = {};
  upcomingItems.forEach((r) => {
    const key = r.daysUntil === 1 ? "Tomorrow" : `In ${r.daysUntil} days`;
    (upcomingGrouped[key] = upcomingGrouped[key] || []).push(r);
  });
  const isEmpty = todayItems.length === 0 && upcomingItems.length === 0 && pastItems.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold text-zinc-100" style={FONT_DISPLAY}>My Reminders</p>
          <p className="text-xs text-zinc-500 mt-0.5">Market events, trade reminders, and your own notes-to-self — plus expiries and holidays on the calendar.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
            <button onClick={() => setView("list")} className={`text-xs rounded-full font-semibold transition-colors flex items-center justify-center ${view === "list" ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`} style={{ height: 40, width: 88 }}>List</button>
            <button onClick={() => setView("calendar")} className={`text-xs rounded-full font-semibold transition-colors flex items-center justify-center ${view === "calendar" ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`} style={{ height: 40, width: 88 }}>Calendar</button>
          </div>
          <button onClick={onAddClick} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-xl px-3.5 flex-shrink-0" style={{ height: 40 }}>
            <IconPlus size={13} /> Add Reminder
          </button>
          <Tooltip text="Settings"><button onClick={onSettingsClick} className="text-zinc-500 hover:tj-primary-text bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40 }}><IconAdjustmentsHorizontal size={15} /></button></Tooltip>
        </div>
      </div>

      {view === "calendar" ? (
        <RemindersCalendar remindersWithDays={remindersWithDays} pnlEntries={pnlEntries} holidays={holidays} onOpenTrade={onOpenTrade} onCreateAt={onCreateAt} onEdit={onEdit} />
      ) : (
        <div className="space-y-5">
          {isEmpty && <p className="text-sm text-zinc-600 text-center py-8">No upcoming reminders. Add one to get started.</p>}
          {todayItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-amber-400 mb-2" style={FONT_MONO}>Today</p>
              <div className="space-y-1.5">{todayItems.map((r) => <ReminderRowDisplay key={r.id} r={r} onDelete={onDeleteReminder} onEdit={onEdit} />)}</div>
            </div>
          )}
          {upcomingItems.length > 0 && (
            <div className="space-y-4">
              {Object.entries(upcomingGrouped).map(([day, items]) => (
                <div key={day}>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-2" style={FONT_MONO}>{day}</p>
                  <div className="space-y-1.5">{items.map((r) => <ReminderRowDisplay key={r.id} r={r} onDelete={onDeleteReminder} onEdit={onEdit} />)}</div>
                </div>
              ))}
            </div>
          )}
          {pastItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-700 mb-2" style={FONT_MONO}>Past</p>
              <div className="space-y-1.5 opacity-60">{pastItems.map((r) => <ReminderRowDisplay key={r.id} r={r} onDelete={onDeleteReminder} onEdit={onEdit} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Dashboard banner — everything currently "due" (today, or within its own
// lead-time window), color-coded by severity. Dismissal is per-day: it
// clears itself the next day rather than being gone forever, so a
// reminder you dismissed today still resurfaces if it's still due tomorrow.
// Shared quick-pick used both per-item and for "Snooze all" — presets add
// time from right now (the standard snooze semantic), or for a single item
// hand off to the full date/time reschedule view.
function SnoozeQuickPick({ onPick, onSaveDateTime, onCancel, initialDate, initialTime }) {
  const [customizing, setCustomizing] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime || currentTimeString());
  const [errors, setErrors] = useState({});
  const todayIso = localISODate(Date.now());

  if (customizing) {
    const handleSaveClick = () => {
      const nextErrors = {};
      if (date < todayIso) {
        nextErrors.date = "That date has already passed — pick today or later.";
      } else if (date === todayIso && time) {
        const [h12, m, ap] = parseReminderTime(time);
        let h24 = h12 % 12;
        if (ap === "PM") h24 += 12;
        const scheduledMoment = new Date();
        scheduledMoment.setHours(h24, m, 0, 0);
        if (scheduledMoment.getTime() < Date.now()) nextErrors.time = "That time has already passed today.";
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        playErrorBeep();
        return;
      }
      onSaveDateTime(date, time);
    };
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 mt-2 space-y-2">
        <p className="text-xs text-zinc-500">New date &amp; time</p>
        <div>
          <CalendarPicker value={date} onChange={(v) => { setDate(v); setErrors((p) => ({ ...p, date: null, time: null })); }} placeholder="Select date" minDate={todayIso} error={!!errors.date} />
          {errors.date && <p className="text-[11px] text-rose-500 mt-1">{errors.date}</p>}
        </div>
        <div>
          <TimeWheelField value={time} onChange={(v) => { setTime(v); if (errors.time) setErrors((p) => ({ ...p, time: null })); }} error={!!errors.time} />
          {errors.time && <p className="text-[11px] text-rose-500 mt-1">{errors.time}</p>}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setCustomizing(false)} className="flex-1 text-xs text-zinc-400 py-1.5">Back</button>
          <button onClick={handleSaveClick} className="flex-1 text-xs tj-primary-bg font-semibold rounded-lg py-1.5">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 mt-2 space-y-2">
      <p className="text-xs text-zinc-500">Snooze for</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onPick(15)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">15 min</button>
        <button onClick={() => onPick(30)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">30 min</button>
        <button onClick={() => onPick(60)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">1 hour</button>
        <button onClick={() => setCustomizing(true)} className="text-xs text-zinc-200 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">Choose date &amp; time</button>
      </div>
      <button onClick={onCancel} className="w-full text-xs text-zinc-500 py-1">Cancel</button>
    </div>
  );
}

function ReminderAlarmPopup({ dueAlarms, onClose, onCloseAll, onSnoozeMinutes, onSnoozeAllMinutes, onSaveDateTime, onSaveDateTimeAll }) {
  const [snoozeOpenId, setSnoozeOpenId] = useState(null);
  const [snoozeAllOpen, setSnoozeAllOpen] = useState(false);
  const playedForIds = useRef(new Set());

  useEffect(() => {
    const ids = dueAlarms.map((r) => r.id).join(",");
    if (dueAlarms.length > 0 && ids !== [...playedForIds.current].join(",")) {
      const isNewSet = dueAlarms.some((r) => !playedForIds.current.has(r.id));
      if (isNewSet) playAlarmChime();
      playedForIds.current = new Set(dueAlarms.map((r) => r.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAlarms.map((r) => r.id).join(",")]);

  if (dueAlarms.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-start justify-center pt-12 px-4 pb-4">
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative rounded-2xl border border-zinc-800 tj-solid-bg p-6 shadow-2xl w-full overflow-y-auto" style={{ maxWidth: 480, maxHeight: "calc(100vh - 4rem)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center flex-shrink-0">
            <IconBellRinging size={20} className="text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide" style={FONT_MONO}>Reminder{dueAlarms.length > 1 ? "s" : ""}</p>
            <p className="text-sm font-bold text-zinc-100">{dueAlarms.length > 1 ? `${dueAlarms.length} reminders due` : "It's time"}</p>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {dueAlarms.map((r, i) => {
            const s = REMINDER_SEVERITY[r.severity];
            const epoch = reminderCombinedEpoch(r);
            const ago = epoch ? reminderRelativeAgo(epoch) : null;
            return (
              <div key={r.id} className={`rounded-xl border-l-4 ${s.border} bg-zinc-900/60 p-3`}>
                {dueAlarms.length > 1 && <p className="text-[10px] text-zinc-600 mb-1" style={FONT_MONO}>{i + 1} of {dueAlarms.length}</p>}
                <p className="text-sm text-zinc-100 font-semibold">{r.title}</p>
                <p className="text-xs text-zinc-500 mb-2">{ago ? ago : "Just now"}</p>
                <div className="flex gap-2">
                  <button onClick={() => setSnoozeOpenId(snoozeOpenId === r.id ? null : r.id)} className="flex-1 text-xs text-zinc-300 border border-zinc-800 rounded-lg py-1.5 font-semibold hover:bg-zinc-900">Snooze</button>
                  <button onClick={() => onClose(r)} className="flex-1 text-xs tj-primary-bg font-semibold rounded-lg py-1.5">Close</button>
                </div>
                {snoozeOpenId === r.id && (
                  <SnoozeQuickPick
                    onPick={(mins) => { onSnoozeMinutes(r, mins); setSnoozeOpenId(null); }}
                    onSaveDateTime={(date, time) => { onSaveDateTime(r, date, time); setSnoozeOpenId(null); }}
                    onCancel={() => setSnoozeOpenId(null)}
                    initialDate={r.date}
                    initialTime={r.time}
                  />
                )}
              </div>
            );
          })}
        </div>

        {dueAlarms.length > 1 && (
          <div className="pt-4 mt-1 border-t border-zinc-800">
            <div className="flex gap-2">
              <button onClick={() => setSnoozeAllOpen((v) => !v)} className="flex-1 text-xs text-zinc-300 border border-zinc-800 rounded-lg py-2 font-semibold hover:bg-zinc-900">Snooze all</button>
              <button onClick={onCloseAll} className="flex-1 text-xs tj-primary-bg font-semibold rounded-lg py-2">Close all</button>
            </div>
            {snoozeAllOpen && (
              <SnoozeQuickPick
                onPick={(mins) => { onSnoozeAllMinutes(mins); setSnoozeAllOpen(false); }}
                onSaveDateTime={(date, time) => { onSaveDateTimeAll(date, time); setSnoozeAllOpen(false); }}
                onCancel={() => setSnoozeAllOpen(false)}
                initialDate={localISODate(Date.now())}
                initialTime={currentTimeString()}
              />
            )}
          </div>
        )}
      </div>
    </div>,
    getPortalTarget()
  );
}

// Top-right toast stack for reminders entering their lead-time window.
// Each toast auto-dismisses after a few seconds and plays a soft pop sound
// the moment it appears (distinct from the alarm popup's chime).

function TodayReminderBanner({ dueReminders }) {
  const todayKey = localISODate(Date.now());
  // Keyed by reminder ID -> the scheduled-moment key it was dismissed for.
  // Editing a reminder to a new time changes its key, so a dismissed,
  // elapsed reminder that gets moved to a future time today naturally
  // reappears — no special-casing needed beyond just comparing keys.
  const [dismissedFor, setDismissedFor] = useState(() => {
    try {
      const raw = localStorage.getItem("tj-reminders-banner-dismissed");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.day === todayKey && parsed.map && typeof parsed.map === "object") return parsed.map;
      return {};
    } catch { return {}; }
  });
  const momentKey = (r) => (r.time ? String(reminderCombinedEpoch(r)) : `${r.date}-noTime`);
  const now = Date.now();
  // Elapsed (time already passed today) reminders never show, regardless
  // of dismissal state — unless editing has moved them to a future moment.
  const notElapsed = dueReminders.filter((r) => !r.time || reminderCombinedEpoch(r) >= now);
  const visibleReminders = notElapsed.filter((r) => dismissedFor[r.id] !== momentKey(r));
  if (visibleReminders.length === 0) return null;
  const dismiss = () => {
    const next = { ...dismissedFor };
    notElapsed.forEach((r) => { next[r.id] = momentKey(r); });
    setDismissedFor(next);
    try { localStorage.setItem("tj-reminders-banner-dismissed", JSON.stringify({ day: todayKey, map: next })); } catch {}
  };
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <IconClock size={16} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm text-zinc-100 font-semibold">{visibleReminders.length} reminder{visibleReminders.length === 1 ? "" : "s"} need attention</p>
        {visibleReminders.map((r) => {
          const s = REMINDER_SEVERITY[r.severity];
          const dayLabel = r.daysUntil <= 1 ? reminderDayLabel(r.daysUntil, r.date).toLowerCase() : isoToWordDate(r.date);
          return (
            <p key={r.id} className="text-xs text-zinc-400">
              <span className={`font-semibold ${s.text}`}>{r.title}</span> — {dayLabel}{r.time ? `, ${reminderTimeDisplay(r.time)}` : ""}
            </p>
          );
        })}
      </div>
      <button onClick={dismiss} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0" title="Dismiss for today"><IconX size={14} /></button>
    </div>
  );
}

// Small status glyph shown next to each leg in the Trade History Legs
// column — a quick-scan visual for what happened to that leg without
// needing to open the dialog.
function LegSymbolIcon({ symbol }) {
  if (symbol === "open") return <IconPointFilled size={9} className="text-emerald-500 flex-shrink-0" />;
  if (symbol === "rolled") return <IconArrowsExchange size={11} className="text-amber-400 flex-shrink-0" />;
  if (symbol === "partial-close") return <IconX size={10} className="text-zinc-400 flex-shrink-0" />;
  if (symbol === "hedge") return <IconPlus size={10} className="text-sky-400 flex-shrink-0" />;
  if (symbol === "adjustment") return <IconPlus size={10} className="text-yellow-400 flex-shrink-0" />;
  return null;
}

function PnlTab({
  pnlEntries, pnlLoading, selectedMonthKey, setSelectedMonthKey,
  onUpdate, pendingDeleteId, setPendingDeleteId, onDelete, onSilentDelete, onAddPast, deletingId,
  monthlyCharges, onSetMonthlyCharge,
  exportScope, setExportScope, exportMonth, setExportMonth, exportYear, setExportYear,
  exportRangeFrom, setExportRangeFrom, exportRangeTo, setExportRangeTo,
  onDownload, onViewPdf, totalCapital, onManageFunds, onRecordChange, notesByTradeId, onOpenNote,
  allStrategies, customStrategies, autoEditRowId, onAutoEditApplied, holidays,
  pendingRevealTradeId, onPendingRevealApplied, onOpenTradeLog, noteTemplates,
}) {
  const monthKeys = useMemo(() => {
    const set = new Set(pnlEntries.map((e) => monthKeyOf(e.entryDate)));
    set.add(localISODate(Date.now()).slice(0, 7));
    Object.keys(monthlyCharges || {}).forEach((k) => set.add(k));
    return Array.from(set).sort().reverse();
  }, [pnlEntries, monthlyCharges]);

  const yearKeys = useMemo(() => {
    const nowY = new Date().getFullYear();
    const set = new Set(pnlEntries.map((e) => (e.entryDate || "").slice(0, 4)));
    for (let i = 0; i < 10; i++) set.add(String(nowY - i));
    return Array.from(set).sort().reverse();
  }, [pnlEntries]);

  const lifetimePL = pnlEntries.reduce((s, e) => s + (parseFloat(e.overallPL) || 0), 0);
  const lifetimeCharges = Object.values(monthlyCharges || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const lifetimeNet = lifetimePL - lifetimeCharges;

  const rangeEntries = useMemo(() => {
    if (!exportRangeFrom && !exportRangeTo) return [];
    return pnlEntries.filter((e) => {
      const d = e.entryDate || "";
      if (exportRangeFrom && d < exportRangeFrom) return false;
      if (exportRangeTo && d > exportRangeTo) return false;
      return true;
    });
  }, [pnlEntries, exportRangeFrom, exportRangeTo]);
  const rangePL = rangeEntries.reduce((s, e) => s + (parseFloat(e.overallPL) || 0), 0);
  const rangeMonthKeys = useMemo(() => Array.from(new Set(rangeEntries.map((e) => monthKeyOf(e.entryDate)))), [rangeEntries]);
  const rangeCharges = rangeMonthKeys.reduce((s, k) => s + (parseFloat((monthlyCharges || {})[k]) || 0), 0);
  const [drafts, setDrafts] = useState({});

  const [editingRowId, setEditingRowId] = useState(null);
  const [justSettledRowId, setJustSettledRowId] = useState(null);
  const [editingCharges, setEditingCharges] = useState(false);
  const [chargesDraft, setChargesDraft] = useState("");
  const [legsDialogFor, setLegsDialogFor] = useState(null);
  useEffect(() => { setEditingCharges(false); setEditingRowId(null); setDrafts({}); }, [selectedMonthKey]);
  useEffect(() => { if (autoEditRowId) setEditingRowId(autoEditRowId); }, [autoEditRowId]);

  const startEditRow = (id) => {
    setDrafts({});
    setEditingRowId(id);
  };
  // Cancelling a row that was never actually completed and saved (i.e. a
  // fresh "Add Trade" row the user abandons partway through) removes it
  // entirely instead of leaving a blank row behind. Cancelling an edit on an
  // already-saved trade just discards the unsaved draft, keeping the trade.
  const cancelEditRow = (row) => {
    setDrafts({});
    setEditingRowId(null);
    if (pendingDeleteId === row?.id) setPendingDeleteId(null);
    if (row && !isRowEverSaved(row)) {
      (onSilentDelete || onDelete)(row.id);
    }
  };

  const getFieldValue = (row, field) => {
    const d = drafts[row.id];
    if (d && field in d) return d[field];
    return row[field] ?? "";
  };

  const setDraftField = (rowId, field, value) => {
    setDrafts((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), [field]: value } }));
  };

  const isRowDirty = (row) => {
    const d = drafts[row.id];
    if (!d) return false;
    return Object.keys(d).some((f) => (d[f] ?? "") !== (row[f] ?? ""));
  };

  const REQUIRED_PNL_FIELDS = ["entryDate", "underlying", "strategyLabel"];
  const hasRealLegs = (legs) => (legs || []).some((l) => l.strike || l.premium);
  const isRowComplete = (row) => REQUIRED_PNL_FIELDS.every((f) => String(getFieldValue(row, f) ?? "").trim() !== "") && hasRealLegs(getFieldValue(row, "legs"));
  // Uses the row's true committed state (not drafts) — this is what decides
  // whether cancelling should delete the row or just discard unsaved edits.
  const isRowEverSaved = (row) => REQUIRED_PNL_FIELDS.every((f) => String(row[f] ?? "").trim() !== "") && hasRealLegs(row.legs);

  const FIELD_LABELS = { entryDate: "Trade date", underlying: "Underlying", strategyLabel: "Strategy", exitDate: "Exit date", overallPL: "P/L" };
  const DATE_FIELDS = ["entryDate", "exitDate"];
  const formatFieldValue = (f, v) => {
    if (!v) return v;
    if (f === "overallPL") return fmtINRsigned(parseFloat(v) || 0);
    if (DATE_FIELDS.includes(f)) return isoToDMY(v);
    return v;
  };

  const saveRow = (row) => {
    const d = drafts[row.id];
    if (!d) return;
    if (!isRowComplete(row)) return;
    const wasAlreadySaved = isRowEverSaved(row); // row's committed state, before this save
    const fieldChanges = [];
    let legsChangeRecord = null;
    Object.keys(d).forEach((f) => {
      const oldVal = row[f] ?? "";
      const newVal = d[f] ?? "";
      if (oldVal !== newVal) {
        onUpdate(row.id, f, d[f]);
        if (f === "notes") {
          // Notes get their own dedicated change-record type, same
          // suppression logic as every other field: only a genuine edit to
          // an already-saved trade's existing note counts as a "change" —
          // filling in a note for the first time is not.
          if (wasAlreadySaved && String(oldVal).trim() !== "" && onRecordChange) {
            onRecordChange(row.id, { type: "notes" });
          }
          return;
        }
        if (f === "legsSummary") {
          // Legs get their own dedicated change-log entry format (a
          // before/after description), not the generic field-diff format
          // — same suppression logic though: only a real change on an
          // already-saved trade counts, never the initial fill-in.
          if (wasAlreadySaved && String(oldVal).trim() !== "") {
            legsChangeRecord = { type: "legs", from: oldVal, to: newVal, legEvents: buildLegChangeEvents(row.legs, d.legs) };
          }
          return;
        }
        // Suppressing "changed from blank" only makes sense for the
        // initial completing save (filling in required fields for the
        // first time isn't a "change"). Once the row is already a real,
        // saved trade, filling in a previously-empty field — exit date
        // and P/L are entered after the fact — is genuinely new
        // information and belongs in the change log/notification.
        const wasBlankButShouldStillCount = wasAlreadySaved && String(oldVal).trim() === "";
        if ((String(oldVal).trim() !== "" || wasBlankButShouldStillCount) && FIELD_LABELS[f]) {
          fieldChanges.push({ field: FIELD_LABELS[f], from: formatFieldValue(f, oldVal) || "(blank)", to: formatFieldValue(f, newVal) });
        }
      }
    });
    if (d.entryDate && d.entryDate !== row.entryDate) setSelectedMonthKey(monthKeyOf(d.entryDate));
    if (fieldChanges.length > 0 && onRecordChange) onRecordChange(row.id, { type: "fields", changes: fieldChanges });
    if (legsChangeRecord && onRecordChange) onRecordChange(row.id, legsChangeRecord);

    const finalUnderlying = getFieldValue(row, "underlying") || row.underlying || "trade";
    const finalEntryDate = getFieldValue(row, "entryDate") || row.entryDate;
    if (!wasAlreadySaved) {
      // First time this row's required fields have all been filled in —
      // this is the actual "trade added" moment, not when the blank
      // placeholder row was first created via the Add Trade dialog. It's
      // about to move from being pinned at the top into its real
      // date-sorted position — flag it to briefly highlight there.
      setJustSettledRowId(row.id);
      setTimeout(() => setJustSettledRowId((cur) => (cur === row.id ? null : cur)), 1400);
      notify(finalEntryDate === localISODate(Date.now())
        ? `New trade added for ${finalUnderlying}.`
        : `Trade added for ${finalUnderlying} for ${isoToDMY(finalEntryDate)}.`);
      // Release the auto-edit/pin-to-top trigger now that its one-time
      // purpose (getting a brand new row filled in) is fulfilled — without
      // this, a stale reference to this now-saved row would re-open edit
      // mode on it the next time this tab remounts (e.g. navigating away
      // and back), even though nothing is actually still incomplete.
      if (row.id === autoEditRowId && onAutoEditApplied) onAutoEditApplied();
    } else if (fieldChanges.length > 0 || legsChangeRecord) {
      const parts = fieldChanges.map((c) => `${c.field}: ${c.from} → ${c.to}`);
      if (legsChangeRecord) parts.push(`Legs: ${legsChangeRecord.from} → ${legsChangeRecord.to}`);
      notify(`Trade for ${finalUnderlying} updated — ${parts.join(", ")}`);
    }

    setDrafts({});
    setEditingRowId(null);
    if (pendingDeleteId === row.id) setPendingDeleteId(null);
  };

  const handleLegsSave = ({ underlying, legs, closedLegsPL, strategyOverride }) => {
    const row = legsDialogFor;
    if (!row) return;
    const { legsDesc, premiumDesc } = legsToParts(legs);
    const netPrem = computeNetPremiumSigned(legs);
    setDraftField(row.id, "legs", legs);
    setDraftField(row.id, "legsSummary", legsDesc);
    setDraftField(row.id, "premiumSummary", premiumDesc);
    setDraftField(row.id, "netPremium", netPrem);
    setDraftField(row.id, "expiryDate", nearestLegExpiry(legs));
    if (underlying && underlying !== getFieldValue(row, "underlying")) setDraftField(row.id, "underlying", underlying);
    if (strategyOverride) setDraftField(row.id, "strategyLabel", strategyOverride);
    // P/L updates in real time as legs close — reflecting whatever's been
    // realized so far, even with other legs still open — rather than
    // waiting for the very last leg. It stays a normal editable field
    // throughout (not locked), so this is just a helpful running default.
    const anyLegClosed = legs.some((l) => l.closedAt);
    if (anyLegClosed) setDraftField(row.id, "overallPL", String(closedLegsPL));
    setLegsDialogFor(null);
  };
  const getInitialLegsForRow = (row) => {
    const draftAwareLegs = getFieldValue(row, "legs");
    if (draftAwareLegs && draftAwareLegs.length > 0) return draftAwareLegs;
    const currentStrategyLabel = getFieldValue(row, "strategyLabel");
    if (!currentStrategyLabel) return [];
    const matched = (allStrategies || []).find((s) => s.label === currentStrategyLabel);
    if (!matched) return [];
    return legsFromTemplate(matched.id, customStrategies);
  };

  const rangeNet = rangePL - rangeCharges;
  const [pnlDownloadDialogOpen, setPnlDownloadDialogOpen] = useState(false);
  const [customDownloadScope, setCustomDownloadScope] = useState(null); // { scoped, scopeLabel, base } | null
  const [historyViewMode, setHistoryViewMode] = useState(() => {
    try { return localStorage.getItem("tj-history-view-mode") === "all" ? "all" : "month"; } catch { return "month"; }
  }); // "month" | "all"
  useEffect(() => {
    try { localStorage.setItem("tj-history-view-mode", historyViewMode); } catch {}
  }, [historyViewMode]);
  const [revealFlashTradeId, setRevealFlashTradeId] = useState(null);
  useEffect(() => {
    if (!pendingRevealTradeId) return;
    setHistoryViewMode("all");
    setHistoryFilterUnderlying(null);
    setHistoryFilterStrategy(null);
    setHistoryFilterOutcome(null);
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-trade-id="${pendingRevealTradeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setRevealFlashTradeId(pendingRevealTradeId);
        setTimeout(() => setRevealFlashTradeId(null), 1100);
      }
      if (onPendingRevealApplied) onPendingRevealApplied();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRevealTradeId]);
  const [historyFilterUnderlying, setHistoryFilterUnderlying] = useState(null);
  const [historyFilterStrategy, setHistoryFilterStrategy] = useState(null);
  const [historyFilterOutcome, setHistoryFilterOutcome] = useState(null); // "win" | "loss" | null

  const monthRows = pnlEntries.filter((e) => monthKeyOf(e.entryDate) === selectedMonthKey)
    .slice().sort(compareTradesNewestFirst);
  const pinnedIdx = monthRows.findIndex((r) => r.id === autoEditRowId && !isRowEverSaved(r));
  if (pinnedIdx > 0) {
    const [pinned] = monthRows.splice(pinnedIdx, 1);
    monthRows.unshift(pinned);
  }
  const monthPL = monthRows.reduce((s, e) => s + (parseFloat(e.overallPL) || 0), 0);
  const monthCharges = parseFloat(monthlyCharges[selectedMonthKey]) || 0;
  const monthNet = monthPL - monthCharges;

  const historyUnderlyingOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => e.underlying).filter(Boolean))).sort(), [pnlEntries]);
  const historyStrategyOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => e.strategyLabel).filter(Boolean))).sort(), [pnlEntries]);
  const historyFiltersActive = !!(historyFilterUnderlying || historyFilterStrategy || historyFilterOutcome);
  const clearHistoryFilters = () => {
    setHistoryFilterUnderlying(null); setHistoryFilterStrategy(null); setHistoryFilterOutcome(null);
  };
  const allFilteredRows = useMemo(() => {
    return pnlEntries.filter((e) => {
      if (historyFilterUnderlying && e.underlying !== historyFilterUnderlying) return false;
      if (historyFilterStrategy && e.strategyLabel !== historyFilterStrategy) return false;
      if (historyFilterOutcome) {
        const pl = parseFloat(e.overallPL) || 0;
        if (historyFilterOutcome === "win" && pl <= 0) return false;
        if (historyFilterOutcome === "loss" && pl >= 0) return false;
      }
      return true;
    }).sort(compareTradesNewestFirst);
  }, [pnlEntries, historyFilterUnderlying, historyFilterStrategy, historyFilterOutcome]);

  const displayRows = historyViewMode === "all" ? allFilteredRows : monthRows;

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "linear-gradient(to bottom right, color-mix(in srgb, var(--tj-primary) 10%, transparent), var(--tj-panel2), var(--tj-panel))" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-xs uppercase tracking-widest text-zinc-400 flex items-center gap-2" style={FONT_MONO}>
            <IconCurrencyRupee size={13} /> Lifetime Summary — All Trades
          </p>
          <button onClick={onManageFunds} className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 tj-primary-text font-semibold rounded-lg px-3 py-1.5 hover:scale-105 active:scale-95 transition-transform">
            <IconCurrencyRupee size={12} /> Manage Funds
          </button>
        </div>
        <div className="mb-4 pb-4 border-b border-zinc-800">
          <p className="text-xs text-zinc-500">Total Capital</p>
          <p className={`text-2xl font-bold ${totalCapital >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{fmtINRsigned(totalCapital)}</p>
          <p className="text-[11px] text-zinc-600 mt-1">Funds added/withdrawn, plus P/L from trades marked to count, minus charges.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500">Gross P/L</p>
            <p className={`text-lg font-bold ${lifetimePL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{fmtINRsigned(lifetimePL)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Charges Paid</p>
            <p className="text-lg font-bold text-amber-400" style={FONT_MONO}>{fmtINR(lifetimeCharges)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Net P/L</p>
            <p className={`text-lg font-bold ${lifetimeNet >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{fmtINRsigned(lifetimeNet)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Viewing</p>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
              <button
                onClick={() => setHistoryViewMode("month")}
                className={`text-[11px] px-3 py-1 rounded-full font-semibold transition-colors ${historyViewMode === "month" ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                By Month
              </button>
              <button
                onClick={() => setHistoryViewMode("all")}
                className={`text-[11px] px-3 py-1 rounded-full font-semibold transition-colors ${historyViewMode === "all" ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                All Trades
              </button>
            </div>
          </div>
          {historyViewMode === "month" ? (
            <div className="flex gap-2">
              <div className="w-44"><MonthPicker value={selectedMonthKey} onChange={setSelectedMonthKey} /></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {historyUnderlyingOptions.length > 0 && (
                  <DropdownFilterButton
                    label="Underlying" active={!!historyFilterUnderlying}
                    displayValue={historyFilterUnderlying || "Any"}
                    options={[{ id: "any", label: "Any", selected: !historyFilterUnderlying }, ...historyUnderlyingOptions.map((u) => ({ id: u, label: u, selected: historyFilterUnderlying === u }))]}
                    onSelect={(id) => setHistoryFilterUnderlying(id === "any" ? null : id)}
                  />
                )}
                {historyStrategyOptions.length > 0 && (
                  <DropdownFilterButton
                    label="Strategy" active={!!historyFilterStrategy}
                    displayValue={historyFilterStrategy || "Any"}
                    options={[{ id: "any", label: "Any", selected: !historyFilterStrategy }, ...historyStrategyOptions.map((s) => ({ id: s, label: s, selected: historyFilterStrategy === s }))]}
                    onSelect={(id) => setHistoryFilterStrategy(id === "any" ? null : id)}
                  />
                )}
                <DropdownFilterButton
                  label="Outcome" active={!!historyFilterOutcome}
                  displayValue={historyFilterOutcome === "win" ? "Wins" : historyFilterOutcome === "loss" ? "Losses" : "Any"}
                  options={[
                    { id: "any", label: "Any", selected: !historyFilterOutcome },
                    { id: "win", label: "Wins", selected: historyFilterOutcome === "win" },
                    { id: "loss", label: "Losses", selected: historyFilterOutcome === "loss" },
                  ]}
                  onSelect={(id) => setHistoryFilterOutcome(id === "any" ? null : id)}
                />
                {historyFiltersActive && (
                  <button onClick={clearHistoryFilters} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 flex items-center gap-1">
                    <IconX size={11} /> Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {historyViewMode === "all" && historyFiltersActive && (
            <button
              onClick={() => {
                const label = `${allFilteredRows.length} selected trade${allFilteredRows.length === 1 ? "" : "s"}`;
                setCustomDownloadScope({ scoped: allFilteredRows, scopeLabel: label, base: `pnl-selected-${localISODate(Date.now())}` });
                setPnlDownloadDialogOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 tj-primary-text font-semibold rounded-xl px-4 py-2.5 hover:scale-[1.03] active:scale-95 transition-transform"
            >
              <IconDownload size={13} /> Download Selected Data
            </button>
          )}
          <button onClick={onAddPast} className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 tj-primary-text font-semibold rounded-xl px-4 py-2.5 hover:scale-[1.03] active:scale-95 transition-transform">
            <IconPlus size={13} /> Add Trade
          </button>
          <button onClick={onOpenTradeLog} className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl px-4 py-2.5 hover:scale-[1.03] active:scale-95 transition-transform">
            <IconBook size={13} /> Trade Log
          </button>
        </div>
      </div>

      {pnlLoading ? (
        <p className="text-xs text-zinc-500">Loading P&L ledger...</p>
      ) : (
        <div className="overflow-auto max-h-[640px] rounded-2xl border border-zinc-800">
          <table className="w-full text-xs border-separate border-spacing-0 table-fixed min-w-[1080px]">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 text-left">
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-32">Trade Date</th>
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-24">Underlying</th>
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-28">Strategy</th>
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-64">
                  <span className="flex items-center gap-1.5">
                    Strategy Legs
                    <InfoIcon text={
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5"><IconPointFilled size={9} className="text-emerald-500 flex-shrink-0" /> Open</p>
                        <p className="flex items-center gap-1.5"><IconArrowsExchange size={11} className="text-amber-400 flex-shrink-0" /> Rolled into a new leg</p>
                        <p className="flex items-center gap-1.5"><IconX size={10} className="text-zinc-400 flex-shrink-0" /> Partial close</p>
                        <p className="flex items-center gap-1.5"><IconPlus size={10} className="text-sky-400 flex-shrink-0" /> Added as a hedge</p>
                        <p className="flex items-center gap-1.5"><IconPlus size={10} className="text-yellow-400 flex-shrink-0" /> Added as an adjustment</p>
                        <p className="text-zinc-500">Hover any leg for its full open/close timeline.</p>
                      </div>
                    } />
                  </span>
                </th>
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-32">Exit Date</th>
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-28">P/L (₹)</th>
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-24">Note</th>
                <th className="sticky top-0 z-10 tj-solid-bg px-3 py-2.5 font-medium whitespace-nowrap w-28"></th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr><td colSpan="8" className="p-6 text-center text-zinc-600">
                  {historyViewMode === "all" ? (historyFiltersActive ? "No trades match the selected filters." : "No trades logged yet.") : `No trades logged for ${monthLabel(selectedMonthKey)} yet.`}
                </td></tr>
              )}
              {displayRows.map((e) => {
                const pl = parseFloat(e.overallPL) || 0;
                const dirty = isRowDirty(e);
                const isEditing = editingRowId === e.id;
                const cell = (field, formatted, mono = true) => isEditing ? null : (
                  <div className={`text-xs truncate ${field === "overallPL" ? (pl >= 0 ? "text-[#04B488]" : "text-[#F15E3B]") : "text-zinc-300"}`} style={mono ? FONT_MONO : undefined}>
                    {formatted || <span className="text-zinc-600">—</span>}
                  </div>
                );
                const onDateChange = (field, v) => setDraftField(e.id, field, v);

                const today = localISODate(Date.now());
                const effectiveExpiry = nearestLegExpiry(e.legs);
                const missingExit = !e.exitDate;
                const missingPL = !e.overallPL;
                const expiryPassed = !!(effectiveExpiry && effectiveExpiry < today);
                const expiryFuture = !!(effectiveExpiry && effectiveExpiry >= today);
                const hasWarning = (missingExit || missingPL) && expiryPassed;
                const isOpenPosition = (missingExit || missingPL) && expiryFuture;
                const missingList = [missingExit && "Exit Date", missingPL && "P/L"].filter(Boolean).join(", ");
                const exitMaxDate = effectiveExpiry && effectiveExpiry < today ? effectiveExpiry : today;
                const rowStatusClass = hasWarning
                  ? "bg-rose-500/10 border-l-2 border-l-rose-500"
                  : isOpenPosition
                    ? "bg-emerald-500/10 border-l-2 border-l-emerald-500"
                    : "";

                const draftLegsForDisplay = getFieldValue(e, "legs");
                const rowAllLegsClosed = !!(draftLegsForDisplay && draftLegsForDisplay.length > 0 && draftLegsForDisplay.every((l) => l.closedAt));
                const draftLegsSummaryForDisplay = getFieldValue(e, "legsSummary");
                const legLineParts = draftLegsForDisplay && draftLegsForDisplay.length > 0
                  ? (() => {
                      const activeLegs = draftLegsForDisplay.filter((l) => !l.closedAt);
                      const closedLegs = draftLegsForDisplay.filter((l) => l.closedAt);
                      const activeGroups = groupLegsByPosition(activeLegs);
                      const activeParts = activeGroups.map((g) => {
                        if (g.legs.length === 1) {
                          const l = g.legs[0];
                          return { action: (l.action || "").toUpperCase(), text: formatLegLine(l, getFieldValue(e, "underlying")), symbol: classifyLegSymbol(l), closed: false, leg: l, batchLegs: null };
                        }
                        const totalQty = g.legs.reduce((s, l) => s + (parseFloat(l.qty) || 0), 0);
                        const avgPremium = totalQty > 0 ? g.legs.reduce((s, l) => s + (parseFloat(l.premium) || 0) * (parseFloat(l.qty) || 0), 0) / totalQty : 0;
                        const combinedLeg = { ...g.legs[0], qty: String(totalQty), premium: avgPremium.toFixed(2) };
                        return { action: (combinedLeg.action || "").toUpperCase(), text: formatLegLine(combinedLeg, getFieldValue(e, "underlying")) + ` (avg, ${g.legs.length} batches)`, symbol: "open", closed: false, leg: combinedLeg, batchLegs: g.legs };
                      });
                      const closedParts = closedLegs.map((l) => ({
                        action: (l.action || "").toUpperCase(), text: formatLegLine(l, getFieldValue(e, "underlying")),
                        symbol: classifyLegSymbol(l), closed: true, leg: l, batchLegs: null,
                      }));
                      return [...activeParts, ...closedParts];
                    })()
                  : (draftLegsSummaryForDisplay ? draftLegsSummaryForDisplay.split(",").map((s) => s.trim()).filter(Boolean).map((t) => ({ action: t.split(" ")[0], text: t, symbol: null, closed: false, leg: null, batchLegs: null })) : []);
                const legLineNode = (l, i) => {
                  const rest = l.text.slice(l.action.length);
                  const actionColor = l.action === "BUY" ? "text-blue-400" : l.action === "SELL" ? "text-rose-600" : "text-zinc-300";
                  // Open/Partial-close symbols stop being shown once the whole
                  // trade has settled — they're only meaningful while the
                  // position is still live. Rolled/Hedge stay, since those
                  // remain informative about the trade's history either way.
                  const showSymbol = l.symbol && !(rowAllLegsClosed && (l.symbol === "open" || l.symbol === "partial-close"));
                  const legPL = l.leg ? computeLegPL(l.leg) : null;
                  const tooltipContent = l.batchLegs ? (
                    <div className="space-y-1">
                      <p className="text-zinc-100 font-semibold">{l.text.replace(/ \(avg.*\)$/, "")}</p>
                      <p className="text-zinc-500">{l.batchLegs.length} batches:</p>
                      {l.batchLegs.map((b, bi) => (
                        <p key={bi}>&middot; {b.qty} lot{parseFloat(b.qty) === 1 ? "" : "s"} at {fmt2dp(b.premium)}, opened {fmtDateDMY(b.openedAt)}{b.legKind === "increase-position" ? " (increased)" : b.partialCloseOfLegId ? " (remaining after partial close)" : ""}</p>
                      ))}
                    </div>
                  ) : l.leg ? (
                    <div className="space-y-1">
                      <p className="text-zinc-100 font-semibold">{l.text}</p>
                      {l.leg.openedAt && <p>Opened {fmtDateDMY(l.leg.openedAt)} at {fmt2dp(l.leg.premium)}</p>}
                      {l.leg.closedAt && (
                        <p>
                          {l.leg.closeType === "partial" ? "Partially closed" : l.leg.closeType === "roll" ? "Rolled" : "Closed"} {fmtDateDMY(l.leg.closedAt)} at {fmt2dp(l.leg.closePremium)}
                          {l.leg.closeType === "partial" ? ` (${l.leg.qty} lot${parseFloat(l.leg.qty) === 1 ? "" : "s"} of the original position)` : ""}
                        </p>
                      )}
                      {legPL !== null && <p className={legPL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}>Leg P/L: {legPL >= 0 ? "+" : ""}{fmtINR(legPL)}</p>}
                    </div>
                  ) : null;
                  const lineNode = (
                    <span className="flex items-center gap-1 truncate">
                      <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 11 }}>
                        {showSymbol && <LegSymbolIcon symbol={l.symbol} />}
                      </span>
                      <span>
                        <span className={`${actionColor} font-bold`}>{l.action}</span>
                        <span className="text-zinc-300">{rest}</span>
                      </span>
                    </span>
                  );
                  return tooltipContent ? (
                    <Tooltip key={i} text={tooltipContent} wrapperClassName="block truncate">{lineNode}</Tooltip>
                  ) : (
                    <span key={i} className="block truncate">{lineNode}</span>
                  );
                };

                const rowWasEverSaved = isRowEverSaved(e);
                const draftExpiryDate = getFieldValue(e, "expiryDate");
                const entryDateMax = draftExpiryDate && draftExpiryDate < localISODate(Date.now()) ? draftExpiryDate : localISODate(Date.now());
                return (
                  <tr key={e.id} data-trade-id={e.id} className={`border-t border-zinc-800 align-middle ${deletingId === e.id ? "tj-row-exit" : "tj-row-enter"} ${e.id === justSettledRowId ? "tj-row-settle" : ""} ${revealFlashTradeId === e.id ? "tj-reveal-flash" : ""} ${isEditing ? "bg-amber-500/5" : rowStatusClass}`}>
                    <td className="px-3 py-2 w-32">
                      {isEditing ? (
                        rowWasEverSaved ? (
                          <div className="text-xs text-zinc-400 px-2 py-1.5">{getFieldValue(e, "entryDate") ? isoToDMY(getFieldValue(e, "entryDate")) : "—"}</div>
                        ) : (
                          <EditableCell type="date" value={getFieldValue(e, "entryDate")} max={entryDateMax} holidays={holidays} businessDaysOnly onChange={(v) => onDateChange("entryDate", v)} />
                        )
                      ) : cell("entryDate", e.entryDate ? isoToDMY(e.entryDate) : "")}
                    </td>
                    <td className="px-3 py-2 w-24">
                      {isEditing ? (
                        rowWasEverSaved ? (
                          <div className="text-xs text-zinc-400 px-2 py-1.5">{getFieldValue(e, "underlying") || "—"}</div>
                        ) : (
                          <EditableCell value={getFieldValue(e, "underlying")} onChange={(v) => setDraftField(e.id, "underlying", v.toUpperCase())} placeholder="NIFTY" />
                        )
                      ) : cell("underlying", e.underlying)}
                    </td>
                    <td className="px-3 py-2 w-28">
                      {isEditing ? (
                        <StrategyPicker
                          value={getFieldValue(e, "strategyLabel")}
                          allStrategies={allStrategies}
                          onChange={(v) => setDraftField(e.id, "strategyLabel", v)}
                        />
                      ) : <Tooltip text={e.strategyLabel || undefined} wrapperClassName="block w-full">{cell("strategyLabel", e.strategyLabel)}</Tooltip>}
                    </td>
                    <td className="px-3 py-2 w-64">
                      {isEditing ? (
                        <button
                          onClick={() => setLegsDialogFor({ ...e, entryDate: getFieldValue(e, "entryDate"), underlying: getFieldValue(e, "underlying"), strategyLabel: getFieldValue(e, "strategyLabel"), legs: getInitialLegsForRow(e), _wasEverSaved: rowWasEverSaved, _committedLegIds: new Set((e.legs || []).map((l) => l.id)) })}
                          className="w-full text-left bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200 hover:border-amber-400 transition-colors"
                        >
                          {legLineParts.length > 0 ? (
                            <span className="space-y-0.5 block" style={FONT_MONO}>
                              {legLineParts.map((l, i) => legLineNode(l, i))}
                            </span>
                          ) : (
                            <span className="text-zinc-500">Click to add legs</span>
                          )}
                        </button>
                      ) : legLineParts.length > 0 ? (
                        <div className="text-xs leading-relaxed" style={FONT_MONO}>
                          {legLineParts.map((l, i) => legLineNode(l, i))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-600">No legs yet</div>
                      )}
                    </td>
                    <td className="px-3 py-2 w-32">
                      {isEditing ? (() => {
                        const rowLegs = getFieldValue(e, "legs") || [];
                        const exitDateLocked = rowLegs.length > 0 && !rowLegs.every((l) => l.closedAt);
                        const dateField = <EditableCell type="date" value={getFieldValue(e, "exitDate")} min={getFieldValue(e, "entryDate") || undefined} max={exitMaxDate} holidays={holidays} businessDaysOnly onChange={(v) => setDraftField(e.id, "exitDate", v)} disabled={exitDateLocked} />;
                        return exitDateLocked ? <Tooltip text="Close all legs before setting an exit date." wrapperClassName="block w-full">{dateField}</Tooltip> : dateField;
                      })() : cell("exitDate", e.exitDate ? isoToDMY(e.exitDate) : "")}
                    </td>
                    <td className="px-3 py-2 w-28">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <EditableCell value={getFieldValue(e, "overallPL")} numeric onChange={(v) => setDraftField(e.id, "overallPL", v)} placeholder="0" className={pl >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"} />
                          <MoodPickerButton value={getFieldValue(e, "exitMood")} onChange={(v) => setDraftField(e.id, "exitMood", v)} />
                          <TradeScreenshotsButton screenshots={getFieldValue(e, "screenshots") || []} onChange={(v) => setDraftField(e.id, "screenshots", v)} tradeLabel={e.underlying || "trade"} />
                          </div>
                      ) : cell("overallPL", e.overallPL ? fmtINRsigned(pl) : "")}
                    </td>
                    <td className="px-3 py-2 w-24">
                      <ExpandableNoteField
                        value={getFieldValue(e, "notes") || ""}
                        onChange={(v) => setDraftField(e.id, "notes", v)}
                        placeholder="Note"
                        label={`Note — ${e.underlying || "trade"}`}
                        variant="cell"
                        disabled={!isEditing}
                        templates={noteTemplates}
                      />
                    </td>
                    <td className="px-3 py-2 w-28 whitespace-nowrap align-middle">
                      <div className="flex items-center justify-start gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              {dirty && (
                                <Tooltip text={!isRowComplete(e) ? "Fill in Entry Date, Underlying, Strategy, and at least one leg before saving" : "Save"}>
                                  <button
                                    onClick={() => saveRow(e)}
                                    disabled={!isRowComplete(e)}
                                    className="flex items-center text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed p-1 rounded"
                                  >
                                    <IconDeviceFloppy size={12} />
                                  </button>
                                </Tooltip>
                              )}
                              <Tooltip text="Stop editing">
                                <button onClick={() => cancelEditRow(e)} className="text-zinc-500 hover:text-zinc-300">
                                  <IconX size={14} />
                                </button>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip text="Edit row">
                              <button onClick={() => startEditRow(e.id)} className="text-zinc-500 hover:tj-primary-text">
                                <IconPencil size={14} />
                              </button>
                            </Tooltip>
                          )}
                          <NotesBadge notes={notesByTradeId[e.id]} onOpenNote={onOpenNote} />
                          {isEditing && (
                            pendingDeleteId === e.id ? (
                              <span className="flex items-center gap-1">
                                <Tooltip text="Confirm delete">
                                  <button onClick={() => onDelete(e.id)} disabled={deletingId === e.id} className="flex items-center text-rose-950 bg-rose-400 hover:bg-rose-300 disabled:opacity-50 p-1 rounded">
                                    <IconCheck size={12} strokeWidth={3} />
                                  </button>
                                </Tooltip>
                                <Tooltip text="Cancel">
                                  <button onClick={() => setPendingDeleteId(null)} className="text-zinc-500 hover:text-zinc-300">
                                    <IconX size={14} />
                                  </button>
                                </Tooltip>
                              </span>
                            ) : (
                              <Tooltip text="Delete row">
                                <button onClick={() => setPendingDeleteId(e.id)} className="text-zinc-600 hover:text-rose-600">
                                  <IconTrash size={14} />
                                </button>
                              </Tooltip>
                            )
                          )}
                        </div>
                        <div className="w-3.5 flex items-center justify-center flex-shrink-0">
                          {hasWarning && (
                            <Tooltip text={`Expiry has passed — missing: ${missingList}`}>
                              <span className="text-rose-600">
                                <IconAlertTriangle size={14} />
                              </span>
                            </Tooltip>
                          )}
                          {isOpenPosition && (
                            <Tooltip text={`Open position — missing: ${missingList} (expiry hasn't passed yet)`}>
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {historyViewMode === "month" ? (
              monthRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-zinc-700 bg-zinc-900/60 font-semibold">
                    <td className="p-3" colSpan="5">Month Gross P/L — {monthLabel(selectedMonthKey)}</td>
                    <td className={`p-3 whitespace-nowrap ${monthPL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{fmtINRsigned(monthPL)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )
            ) : (
              displayRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-zinc-700 bg-zinc-900/60 font-semibold">
                    <td className="p-3" colSpan="5">{historyFiltersActive ? "Filtered" : "All Trades"} Gross P/L — {displayRows.length} trade{displayRows.length === 1 ? "" : "s"}</td>
                    <td className={`p-3 whitespace-nowrap ${displayRows.reduce((s, e) => s + (parseFloat(e.overallPL) || 0), 0) >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>
                      {fmtINRsigned(displayRows.reduce((s, e) => s + (parseFloat(e.overallPL) || 0), 0))}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )
            )}
          </table>
        </div>
      )}

      {historyViewMode === "month" && (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-500">Charges paid this month (₹) — {monthLabel(selectedMonthKey)}</span>
            {editingCharges ? (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text" inputMode="numeric" value={chargesDraft} placeholder="0" autoFocus
                    onChange={(e) => setChargesDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 w-40"
                    style={FONT_MONO}
                  />
                  <button
                    onClick={() => { onSetMonthlyCharge(selectedMonthKey, chargesDraft); setEditingCharges(false); notify(`${fmtINR(parseFloat(chargesDraft) || 0)} in charges saved for ${monthLabel(selectedMonthKey)}.`); }}
                    disabled={(parseFloat(chargesDraft) || 0) > totalCapital}
                    className="flex items-center gap-1 text-[10px] font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-2 rounded"
                  >
                    <IconDeviceFloppy size={11} /> Save
                  </button>
                  <Tooltip text="Cancel">
                    <button onClick={() => setEditingCharges(false)} className="text-zinc-500 hover:text-zinc-300">
                      <IconX size={16} />
                    </button>
                  </Tooltip>
                </div>
                {(parseFloat(chargesDraft) || 0) > totalCapital && (
                  <p className="text-xs text-rose-400">Charges can't exceed your total capital ({fmtINR(totalCapital)}).</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-zinc-100" style={FONT_MONO}>{monthlyCharges[selectedMonthKey] ? fmtINR(parseFloat(monthlyCharges[selectedMonthKey])) : "—"}</span>
                <Tooltip text="Edit charges">
                  <button
                    onClick={() => { setChargesDraft(monthlyCharges[selectedMonthKey] || ""); setEditingCharges(true); }}
                    className="text-zinc-500 hover:tj-primary-text"
                  >
                    <IconPencil size={13} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500">Total Trades — {monthLabel(selectedMonthKey)}</p>
            <p className="text-base font-bold text-zinc-100" style={FONT_MONO}>{monthRows.length}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Month Net P/L</p>
            <p className={`text-base font-bold ${monthNet >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{fmtINRsigned(monthNet)}</p>
          </div>
        </div>
      </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3" style={FONT_MONO}>Download P&L report</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setExportScope("month")} className={`text-xs px-3 py-1.5 rounded-full border ${exportScope === "month" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>By Month</button>
          <button onClick={() => setExportScope("year")} className={`text-xs px-3 py-1.5 rounded-full border ${exportScope === "year" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>By Year</button>
          <button onClick={() => setExportScope("range")} className={`text-xs px-3 py-1.5 rounded-full border ${exportScope === "range" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>Select Dates</button>
          <button onClick={() => setExportScope("all")} className={`text-xs px-3 py-1.5 rounded-full border ${exportScope === "all" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>Entire History</button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {exportScope === "month" && (
            <label className="text-xs text-zinc-500">Month
              <div className="mt-1"><MonthPicker value={exportMonth} onChange={setExportMonth} /></div>
            </label>
          )}
          {exportScope === "year" && (
            <label className="text-xs text-zinc-500">Year
              <div className="mt-1"><YearPicker value={exportYear} onChange={setExportYear} years={yearKeys} /></div>
            </label>
          )}
          {exportScope === "range" && (
            <>
              <label className="text-xs text-zinc-500">From
                <div className="mt-1"><CalendarPicker value={exportRangeFrom} onChange={setExportRangeFrom} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
              </label>
              <label className="text-xs text-zinc-500">To
                <div className="mt-1"><CalendarPicker value={exportRangeTo} onChange={setExportRangeTo} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
              </label>
            </>
          )}
          <button onClick={() => setPnlDownloadDialogOpen(true)} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-4 py-2.5 hover:scale-[1.03] active:scale-95 transition-transform">
            <IconDownload size={13} /> Download
          </button>
        </div>
        {exportScope === "range" && (exportRangeFrom || exportRangeTo) && (
          <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-zinc-500">Range Gross P/L</p>
              <p className={`text-sm font-bold ${rangePL >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{fmtINRsigned(rangePL)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Charges (full months touched)</p>
              <p className="text-sm font-bold text-amber-400" style={FONT_MONO}>{fmtINR(rangeCharges)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Range Net P/L</p>
              <p className={`text-sm font-bold ${rangeNet >= 0 ? "text-[#04B488]" : "text-[#F15E3B]"}`} style={FONT_MONO}>{fmtINRsigned(rangeNet)}</p>
            </div>
          </div>
        )}
      </div>

      {pnlDownloadDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade"
          onClick={() => { setPnlDownloadDialogOpen(false); setCustomDownloadScope(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Download P&L Report</p>
              <button onClick={() => { setPnlDownloadDialogOpen(false); setCustomDownloadScope(null); }} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <p className="text-xs text-zinc-600">
              {customDownloadScope ? `Choose a file format for ${customDownloadScope.scopeLabel}.` : "Choose a file format for the selected scope."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onViewPdf(customDownloadScope || undefined); setPnlDownloadDialogOpen(false); setCustomDownloadScope(null); }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center border border-zinc-700"
              >
                .PDF
              </button>
              <button
                onClick={() => { onDownload(customDownloadScope || undefined); setPnlDownloadDialogOpen(false); setCustomDownloadScope(null); }}
                className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center"
              >
                .MD
              </button>
            </div>
            <button onClick={() => { setPnlDownloadDialogOpen(false); setCustomDownloadScope(null); }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {legsDialogFor && (
        <LegsEditDialog
          initialUnderlying={legsDialogFor.underlying || ""}
          initialLegs={legsDialogFor.legs || []}
          referenceDate={legsDialogFor.entryDate || undefined}
          strategyLabel={legsDialogFor.strategyLabel || ""}
          allStrategies={allStrategies}
          onSave={handleLegsSave}
          onClose={() => setLegsDialogFor(null)}
          holidays={holidays}
          lockOriginalLegs={!!legsDialogFor._wasEverSaved}
          committedLegIds={legsDialogFor._committedLegIds || new Set()}
        />
      )}
    </div>
  );
}

/* ============== My Learnings (folder tree + full-page notes, resources) ============== */

function TagInput({ tags, onChange, allTags, recentTags = [] }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const addTag = (raw) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) return;
    if (!tags.includes(t)) onChange([...tags, t]);
    setDraft("");
    setOpen(false);
  };
  const removeTag = (t) => onChange(tags.filter((x) => x !== t));

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return recentTags.filter((t) => !tags.includes(t)).slice(0, 6);
    return allTags.filter((t) => t.includes(q) && !tags.includes(t)).slice(0, 6);
  }, [draft, allTags, tags, recentTags]);
  const suggestionsAreRecent = !draft.trim();

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current && inputRef.current.focus()}
        className="w-full flex flex-wrap items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 cursor-text focus-within:border-amber-400"
      >
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full tj-primary-bg font-semibold flex-shrink-0">
            <IconTag size={9} /> {t}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(t); }} className="hover:opacity-70"><IconX size={10} /></button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(draft); }
            else if (e.key === "Backspace" && !draft && tags.length > 0) removeTag(tags[tags.length - 1]);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={tags.length === 0 ? "Add a tag and press Enter..." : ""}
          autoComplete="off"
          className="flex-1 min-w-[80px] bg-transparent text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none py-0.5"
          style={{ outline: "none", boxShadow: "none" }}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-800 tj-solid-bg shadow-2xl p-1 tj-popover">
          {suggestionsAreRecent && (
            <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide px-2.5 pt-1 pb-1">Recently used</p>
          )}
          {suggestions.map((s) => (
            <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addTag(s)} className="w-full text-left text-xs px-2.5 py-1.5 rounded-md tj-row-hover text-zinc-300 flex items-center gap-1.5">
              <IconTag size={10} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// A lightweight searchable combobox for linking a note to one specific
// existing trade. Trade counts here are modest (a handful a month), so a
// simple client-side filter over pnlEntries is plenty.
function TradeLinkPicker({ pnlEntries, value, onChange }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMood, setFilterMood] = useState(null);
  const [filterUnderlying, setFilterUnderlying] = useState(null);
  const [filterStrategy, setFilterStrategy] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);
  const selected = pnlEntries.find((e) => e.id === value) || null;

  const underlyingOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => e.underlying).filter(Boolean))).sort(), [pnlEntries]);
  const strategyOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => e.strategyLabel).filter(Boolean))).sort(), [pnlEntries]);
  const monthOptions = useMemo(() => Array.from(new Set(pnlEntries.map((e) => monthKeyOf(e.entryDate)).filter(Boolean))).sort().reverse(), [pnlEntries]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pnlEntries.filter((e) => {
      if (q) {
        const hay = `${e.underlying || ""} ${e.strategyLabel || ""} ${e.entryDate || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterUnderlying && e.underlying !== filterUnderlying) return false;
      if (filterStrategy && e.strategyLabel !== filterStrategy) return false;
      if (filterMonth && monthKeyOf(e.entryDate) !== filterMonth) return false;
      if (filterMood && e.exitMood !== filterMood) return false;
      return true;
    }).sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));
  }, [query, pnlEntries, filterUnderlying, filterStrategy, filterMonth, filterMood]);

  const filtersActive = !!(filterMood || filterUnderlying || filterStrategy || filterMonth);
  const clearFilters = () => { setFilterMood(null); setFilterUnderlying(null); setFilterStrategy(null); setFilterMonth(null); };
  const closeModal = () => { setModalOpen(false); setQuery(""); clearFilters(); };

  if (selected) {
    return (
      <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
        <IconLink size={12} className="text-zinc-500 flex-shrink-0" />
        <span className="flex-1 truncate">{selected.underlying || "—"} — {selected.strategyLabel || "Trade"} · {fmtDateDMY(selected.entryDate)}</span>
        <button type="button" onClick={() => onChange("")} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"><IconX size={12} /></button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-colors text-left"
      >
        <IconSearch size={12} className="flex-shrink-0" /> Search a trade...
      </button>
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={closeModal}>
          <div className="tj-app w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 flex flex-col gap-4 tj-popover" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-zinc-200">Link to a trade</p>
              <button onClick={closeModal} className="text-zinc-500 hover:text-zinc-300"><IconX size={16} /></button>
            </div>
            <div className="relative flex-shrink-0">
              <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search underlying, strategy, date..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <DropdownFilterButton
                label="Mood" active={!!filterMood}
                displayValue={filterMood ? <span className="flex items-center gap-1"><MoodEmoji id={filterMood} size={14} /> {moodMeta(filterMood)?.label}</span> : "Any"}
                options={[{ id: "any", label: "Any", selected: !filterMood }, ...MOOD_OPTIONS.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji, selected: filterMood === m.id }))]}
                onSelect={(id) => setFilterMood(id === "any" ? null : id)}
              />
              {underlyingOptions.length > 0 && (
                <DropdownFilterButton
                  label="Underlying" active={!!filterUnderlying}
                  displayValue={filterUnderlying || "Any"}
                  options={[{ id: "any", label: "Any", selected: !filterUnderlying }, ...underlyingOptions.map((u) => ({ id: u, label: u, selected: filterUnderlying === u }))]}
                  onSelect={(id) => setFilterUnderlying(id === "any" ? null : id)}
                />
              )}
              {strategyOptions.length > 0 && (
                <DropdownFilterButton
                  label="Strategy" active={!!filterStrategy}
                  displayValue={filterStrategy || "Any"}
                  options={[{ id: "any", label: "Any", selected: !filterStrategy }, ...strategyOptions.map((s) => ({ id: s, label: s, selected: filterStrategy === s }))]}
                  onSelect={(id) => setFilterStrategy(id === "any" ? null : id)}
                />
              )}
              {monthOptions.length > 0 && (
                <DropdownFilterButton
                  label="Month" active={!!filterMonth}
                  displayValue={filterMonth ? monthLabel(filterMonth) : "Any"}
                  options={[{ id: "any", label: "Any", selected: !filterMonth }, ...monthOptions.map((m) => ({ id: m, label: monthLabel(m), selected: filterMonth === m }))]}
                  onSelect={(id) => setFilterMonth(id === "any" ? null : id)}
                />
              )}
              {filtersActive && (
                <button onClick={clearFilters} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 flex items-center gap-1">
                  <IconX size={11} /> Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1" style={{ minHeight: 120 }}>
              {results.length === 0 ? (
                <p className="text-xs text-zinc-600 px-2 py-4 text-center">No matching trades.</p>
              ) : results.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { onChange(e.id); closeModal(); }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg tj-row-hover text-zinc-300 flex items-center justify-between gap-2"
                >
                  <span><span className="font-semibold">{e.underlying || "—"}</span> — {e.strategyLabel || "Trade"}</span>
                  <span className="flex items-center gap-1.5 flex-shrink-0 text-zinc-500">
                    {e.exitMood && <MoodEmoji id={e.exitMood} size={13} />}
                    <span style={FONT_MONO}>{fmtDateDMY(e.entryDate)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        getPortalTarget()
      )}
    </>
  );
}
// Create/edit dialog — resources only now (Markdown notes are written
// directly in the full-page NoteMainPane, not a modal). A resource is a
// simple saved link: name, URL, an optional plain-text note, and tags —
// deliberately lighter than a note, with no folder/trade linking, since
// it's meant to be a quick bookmark, not something you organize a
// knowledge base around.
// A template needs the same rich-text editing (and images) as a regular
// note, unlike a resource's plain-text description — so this reuses
// BlockNoteNoteEditor directly rather than ResourceEditorDialog's plain
// textarea.
function TemplateFullScreenEditor({ template, onUpdate, onDelete, onBack }) {
  const [title, setTitle] = useState(template.title);
  const [content, setContent] = useState(template.content);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "pending" | "saving"
  const [pendingDelete, setPendingDelete] = useState(false);
  const titleRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) { titleRef.current.focus(); titleRef.current.select(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = async () => {
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    setSaveStatus("saving");
    try {
      await onUpdate(template.id, payload);
      setSaveStatus("saved");
    } catch (err) {
      notify("Couldn't save that change — please try again.", "error");
      setSaveStatus("pending");
    }
  };
  const scheduleSave = (partial) => {
    pendingPayloadRef.current = { ...(pendingPayloadRef.current || {}), ...partial };
    setSaveStatus("pending");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 700);
  };
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); flushSave(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitle = (v) => { setTitle(v); scheduleSave({ title: v }); };
  const handleContent = (v) => { setContent(v); scheduleSave({ content: v }); };
  const handleDelete = async () => {
    try {
      // handleDeleteTemplate (passed in as onDelete) already shows its own
      // notification internally — it doesn't return a value for this to
      // act on, so no separate notify() here (that would either silently
      // never fire, or double up if it were "fixed" to fire).
      await onDelete(template.id);
      onBack();
    } catch (err) { /* onDelete already toasts on failure */ }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto">
      <div className="w-full py-6">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onBack} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <IconArrowLeft size={13} /> Back to Templates
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-600" style={FONT_MONO}>
                {saveStatus === "saving" ? "Saving…" : saveStatus === "pending" ? "Unsaved changes" : "Saved"}
              </span>
              {pendingDelete ? (
                <span className="flex items-center gap-1.5">
                  <Tooltip text="Confirm delete"><button onClick={handleDelete} className="text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={13} strokeWidth={3} /></button></Tooltip>
                  <Tooltip text="Cancel"><button onClick={() => setPendingDelete(false)} className="text-zinc-500 hover:text-zinc-300"><IconX size={15} /></button></Tooltip>
                </span>
              ) : (
                <Tooltip text="Delete"><button onClick={() => setPendingDelete(true)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={15} /></button></Tooltip>
              )}
            </div>
          </div>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => handleTitle(e.target.value)}
            placeholder="Template title"
            className="w-full bg-transparent border-none outline-none text-3xl font-bold text-zinc-100 placeholder-zinc-600"
            style={FONT_DISPLAY}
          />
        </div>
        <div className="mt-6 px-1">
          <BlockNoteNoteEditor initialValue={content} onChange={handleContent} />
        </div>
      </div>
    </div>
  );
}

function ResourceEditorDialog({ initial, allTags, recentTags, onSave, onClose }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || "");
  const [resourceUrl, setResourceUrl] = useState(initial?.resourceUrl || "");
  const [content, setContent] = useState(initial?.content || "");
  const [tags, setTags] = useState(initial?.tags || []);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && resourceUrl.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), resourceUrl: resourceUrl.trim(), content, tags, isResource: true });
      onClose();
    } catch (err) {
      notify(`Couldn't save — ${err?.message || "please try again"}.`, "error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="tj-app w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 sm:p-6 flex flex-col gap-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2" style={FONT_DISPLAY}>
            <IconBooks size={16} /> {isEdit ? "Edit" : "New"} Resource
          </p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. NSE FII/DII Data" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">URL</label>
          <input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" style={FONT_MONO} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Note (optional)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's this link for..." className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500 flex items-center gap-1"><IconTag size={11} /> Tags</label>
          <TagInput tags={tags} onChange={setTags} allTags={allTags} recentTags={recentTags} />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={!canSave || saving} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-40">
            <IconDeviceFloppy size={14} /> {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>,
    getPortalTarget()
  );
}

// The full-page note editor — always-open, no Save button. Every field
// autosaves 700ms after the last edit. Remounting on note.id change (via
// the `key` prop the caller passes) is what resets all local state when
// switching notes — see the caller in MyLearningsTab.
// A thin, hand-rolled wrapper around the core @toast-ui/editor package —
// deliberately NOT using the official @toast-ui/react-editor wrapper,
// which pins a React 17 peer dependency (this app is on React 18) and
// hasn't been updated to match. The core library is plain JS with no
// React dependency at all, so wrapping it imperatively via refs is both
// safer and gives full control over the lifecycle. This component is
// intentionally uncontrolled after mount (uses .getMarkdown()/an
// internal instance, not a value prop) — safe here because the caller
// always remounts a fresh instance per note via `key={note.id}`, so it
// never needs to react to an externally-changed value mid-life.
// A thin, lazy-loaded wrapper around BlockNote (@blocknote/core +
// @blocknote/react + @blocknote/mantine's default UI). Unlike the
// previous editor, no custom formatting plugins are needed at all —
// BlockNote's own selection toolbar already has text color, background
// (highlight) color, bold/italic/underline/strike, and heading levels
// (used in place of arbitrary font sizes — the same approach Notion
// itself uses) built in.
//
// Module loading happens in two stages because useCreateBlockNote is a
// React hook — it can't be called conditionally. The outer component
// only loads the modules; a separate inner component (mounted once
// loading finishes) is the one that actually calls the hook.
const BLOCKNOTE_THEME = {
  colors: {
    editor: { text: "var(--tj-text1)", background: "transparent" },
    menu: { text: "var(--tj-text1)", background: "var(--tj-panel-solid)" },
    tooltip: { text: "var(--tj-text1)", background: "var(--tj-panel-solid)" },
    hovered: { text: "var(--tj-text1)", background: "rgba(128,128,128,0.12)" },
    selected: { text: "var(--tj-primary-contrast)", background: "var(--tj-primary)" },
    disabled: { text: "var(--tj-text4)", background: "var(--tj-panel2)" },
    shadow: "var(--tj-shadow)",
    border: "var(--tj-border)",
    sideMenu: "var(--tj-text4)",
    highlights: {
      gray: { text: "#9b9a97", background: "#ebeced" },
      brown: { text: "#64473a", background: "#e9e5e3" },
      red: { text: "#e03e3e", background: "#fbe4e4" },
      orange: { text: "#d9730d", background: "#faebdd" },
      yellow: { text: "#dfab01", background: "#fbf3db" },
      green: { text: "#4d6461", background: "#ddedea" },
      blue: { text: "#0b6e99", background: "#ddebf1" },
      purple: { text: "#6940a5", background: "#eae4f2" },
      pink: { text: "#ad1a72", background: "#f4dfeb" },
    },
  },
  borderRadius: 8,
  fontFamily: "var(--tj-font-body)",
};

function BlockNoteEditorInner({ mods, initialValue, onChange, onEditorReady }) {
  const { useCreateBlockNote, BlockNoteView } = mods;
  const initialBlocksRef = useRef(null);
  if (initialBlocksRef.current === null) {
    const parsed = parseNoteBlocks(initialValue);
    initialBlocksRef.current = parsed.length > 0 ? parsed : undefined; // undefined lets BlockNote create its own default empty block
  }

  const editor = useCreateBlockNote({
    initialContent: initialBlocksRef.current,
    uploadFile: async (file) => {
      try {
        return await uploadNoteFile(file);
      } catch (err) {
        // Falls back to the old behavior (embedded base64) if Storage isn't
        // set up yet or the upload fails for any other reason — inserting
        // a file (image, PDF, spreadsheet, anything) should never just break.
        notify("Couldn't upload to Storage — embedding the file directly instead.", "error");
        return readFileAsDataUrl(file);
      }
    },
  });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const unsub = editor.onChange(() => {
      onChangeRef.current && onChangeRef.current(JSON.stringify(editor.document));
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [editor]);

  useEffect(() => {
    if (onEditorReady) onEditorReady(editor);
  }, [editor]);

  return <BlockNoteView editor={editor} theme={BLOCKNOTE_THEME} />;
}

function BlockNoteNoteEditor({ initialValue, onChange, onEditorReady }) {
  const [mods, setMods] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@blocknote/react"),
      import("@blocknote/mantine"),
      import("@blocknote/mantine/style.css"),
    ]).then(([react, mantine]) => {
      if (cancelled) return;
      setMods({ useCreateBlockNote: react.useCreateBlockNote, BlockNoteView: mantine.BlockNoteView });
    }).catch(() => { /* stays on the loading placeholder */ });
    return () => { cancelled = true; };
  }, []);

  if (!mods) {
    return <div className="flex items-center justify-center h-full text-xs text-zinc-600">Loading editor…</div>;
  }
  return <BlockNoteEditorInner mods={mods} initialValue={initialValue} onChange={onChange} onEditorReady={onEditorReady} />;
}

function NoteMainPane({ note, folderPath, allTags, recentTags, pnlEntries, onUpdate, onDelete, onDownloadPdf, autoFocusTitle, templates = [] }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags || []);
  const [linkedTradeId, setLinkedTradeId] = useState(note.linkedTradeId || "");
  const [linkedUnderlying, setLinkedUnderlying] = useState(note.linkedUnderlying || "");
  const [linkedStrategy, setLinkedStrategy] = useState(note.linkedStrategy || "");
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "pending" | "saving"
  const [pendingDelete, setPendingDelete] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const titleRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (autoFocusTitle && titleRef.current) { titleRef.current.focus(); titleRef.current.select(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = async () => {
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    setSaveStatus("saving");
    try {
      await onUpdate(note.id, payload);
      setSaveStatus("saved");
    } catch (err) {
      notify("Couldn't save that change — please try again.", "error");
      setSaveStatus("pending");
    }
  };

  const scheduleSave = (partial) => {
    pendingPayloadRef.current = { ...(pendingPayloadRef.current || {}), ...partial };
    setSaveStatus("pending");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 700);
  };

  // Flush on unmount (which — because the caller keys this component by
  // note.id — happens exactly when switching to a different note, or
  // navigating away) so the last few keystrokes are never lost.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingPayloadRef.current) onUpdate(note.id, pendingPayloadRef.current).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitle = (v) => { setTitle(v); scheduleSave({ title: v }); };
  const handleContent = (v) => { setContent(v || ""); scheduleSave({ content: v || "" }); };
  const handleTags = (v) => { setTags(v); scheduleSave({ tags: v }); };
  const handleTrade = (v) => {
    setLinkedTradeId(v);
    const trade = v ? pnlEntries.find((e) => e.id === v) : null;
    const newUnderlying = trade ? (trade.underlying || "") : "";
    const newStrategy = trade ? (trade.strategyLabel || "") : "";
    setLinkedUnderlying(newUnderlying);
    setLinkedStrategy(newStrategy);
    scheduleSave({ linkedTradeId: v, linkedUnderlying: newUnderlying, linkedStrategy: newStrategy });
  };

  const linkedTradeLabelText = (() => {
    if (!linkedTradeId) return null;
    const e = pnlEntries.find((x) => x.id === linkedTradeId);
    return e ? `${e.underlying || "—"} — ${e.strategyLabel || "Trade"} · ${fmtDateDMY(e.entryDate)}` : null;
  })();

  const handleDelete = async () => {
    try {
      await onDelete(note.id, `"${title || "Untitled"}" deleted.`);
    } catch (err) { /* onDelete already toasts on failure */ }
  };

  // Inserts the template's blocks right after wherever the cursor
  // currently is — not at the start or end of the note — so picking up
  // mid-way through writing (e.g. 30 lines in) drops the template exactly
  // where the cursor was left, not somewhere else in the document.
  const applyTemplateAtCursor = (template) => {
    const editor = editorRef.current;
    const blocks = parseNoteBlocks(template.content);
    setTemplatePickerOpen(false);
    if (!editor || blocks.length === 0) return;
    try {
      const referenceBlock = editor.getTextCursorPosition().block;
      editor.insertBlocks(blocks, referenceBlock, "after");
    } catch (err) {
      const doc = editor.document;
      const lastBlock = doc[doc.length - 1];
      if (lastBlock) editor.insertBlocks(blocks, lastBlock, "after");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      <div className="w-full py-6">
        <div className="px-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="Untitled"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-3xl font-bold text-zinc-100 placeholder-zinc-600"
              style={FONT_DISPLAY}
            />
            <div className="flex items-center gap-3 flex-shrink-0 pt-2">
              {templates.length > 0 && (
                <Tooltip text="Use a template">
                  <button onClick={() => setTemplatePickerOpen(true)} className="text-zinc-500 hover:tj-primary-text"><IconLayoutGrid size={15} /></button>
                </Tooltip>
              )}
              <Tooltip text="Download .pdf">
                <button onClick={() => onDownloadPdf({ id: note.id, title, content, tags, isResource: false, linkedTradeId, linkedUnderlying, linkedStrategy })} className="text-zinc-500 hover:tj-primary-text"><IconDownload size={15} /></button>
              </Tooltip>
              {pendingDelete ? (
                <span className="flex items-center gap-1.5">
                  <Tooltip text="Confirm delete">
                    <button onClick={handleDelete} className="flex items-center text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={12} strokeWidth={3} /></button>
                  </Tooltip>
                  <Tooltip text="Cancel">
                    <button onClick={() => setPendingDelete(false)} className="text-zinc-500 hover:text-zinc-300"><IconX size={14} /></button>
                  </Tooltip>
                </span>
              ) : (
                <Tooltip text="Delete">
                  <button onClick={() => setPendingDelete(true)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={15} /></button>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500 flex-wrap">
            {folderPath && <span>{folderPath}</span>}
            {folderPath && <span>·</span>}
            <span style={FONT_MONO}>{note.updatedAt ? fmtDateDMY(note.updatedAt) : ""}</span>
            <span>·</span>
            <span className={saveStatus === "saved" ? "text-emerald-600" : "text-amber-500"}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "pending" ? "Unsaved changes…" : "Saved"}
            </span>
          </div>
        </div>

        <div className="mt-6 px-1">
          <BlockNoteNoteEditor initialValue={content} onChange={handleContent} onEditorReady={(editor) => { editorRef.current = editor; }} />
        </div>

        {/* Metadata footer — tags and trade link live below the editor,
            not above it, so the writing surface is what you see first
            when a note opens. Stacked in one column: Tags first, Link to
            a trade below it. */}
        <div className="mt-8 pt-5 px-4 sm:px-6 border-t border-zinc-800/70 space-y-3">
          <div className="space-y-1 w-1/2">
            <label className="text-[11px] text-zinc-500 h-4 flex items-center gap-1"><IconTag size={10} /> Tags</label>
            <TagInput tags={tags} onChange={handleTags} allTags={allTags} recentTags={recentTags} />
          </div>
          <div className="space-y-1 w-1/2">
            <label className="text-[11px] text-zinc-500 h-4 flex items-center gap-1"><IconLink size={10} /> Link to a trade</label>
            <TradeLinkPicker pnlEntries={pnlEntries} value={linkedTradeId} onChange={handleTrade} />
          </div>
        </div>
      </div>
      {templatePickerOpen && (
        <TemplatePickerModal templates={templates} onSelect={applyTemplateAtCursor} onClose={() => setTemplatePickerOpen(false)} />
      )}
    </div>
  );
}

function LearningsRail({ view, onChange }) {
  const items = [
    { id: "notes", icon: IconBulb, label: "Notes" },
    { id: "search", icon: IconSearch, label: "Search" },
    { id: "tags", icon: IconTag, label: "Tags" },
    { id: "starred", icon: IconStar, label: "Starred" },
    { id: "templates", icon: IconLayoutGrid, label: "Templates" },
    { id: "resources", icon: IconBooks, label: "Resources" },
  ];
  return (
    <div className="w-14 flex-shrink-0 border-r border-zinc-800 flex flex-col items-center pt-[4.5px] pb-4 gap-1.5">
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.id;
        return (
          <Tooltip key={it.id} text={it.label}>
            <button
              onClick={() => onChange(it.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-200 tj-row-hover"}`}
            >
              <Icon size={17} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

// A single "⋮" trigger consolidating every per-row action (matching the
// reference pattern: one menu, everything listed under it, destructive
// actions colored) instead of a row of separate hover icons. Folders get
// New note / New subfolder / Rename / Delete; notes get Move to folder /
// Delete. The same popover switches between a "main" list, a "move to
// folder" sub-list, and an inline delete confirmation, rather than
// spawning separate floating menus for each.
function RowMenu({ mode, folders, currentFolderId, onNewNote, onNewFolder, onRename, onDelete, onMove, onDuplicate, starred, onToggleStar, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("main"); // "main" | "move" | "confirmDelete"
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  const openMenu = (e) => {
    e.stopPropagation();
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.right - 192 });
    setView("main");
    setOpen(true);
    if (onOpenChange) onOpenChange(true);
  };
  const close = () => {
    setOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  const pathFor = (id) => {
    const parts = [];
    let cur = folders.find((f) => f.id === id);
    while (cur) { parts.unshift(cur.name); cur = folders.find((f) => f.id === cur.parentId); }
    return parts.join(" / ");
  };
  // When moving a folder, it — and everything already inside it — can't be
  // a valid destination: dropping a folder into its own subfolder would
  // create a cycle with no way back up to it.
  const excludedFolderIds = useMemo(() => {
    if (mode !== "folder") return new Set();
    const ids = new Set([currentFolderId]);
    let grew = true;
    while (grew) {
      grew = false;
      folders.forEach((f) => { if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
    }
    return ids;
  }, [mode, currentFolderId, folders]);
  const moveOptions = [
    { id: "", label: "Uncategorized" },
    ...folders.filter((f) => !excludedFolderIds.has(f.id)).map((f) => ({ id: f.id, label: pathFor(f.id) })),
  ].filter((o) => o.id !== currentFolderId);
  const moveLabel = mode === "folder" ? "Move folder to…" : "Move file to…";

  return (
    <>
      <button ref={btnRef} type="button" onClick={openMenu} className="opacity-60 hover:opacity-100 active:scale-95 px-0.5">
        <IconDotsVertical size={13} />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={close} />
          <div
            className="tj-app fixed z-[61] w-56 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
            style={{ top: coords.top, left: Math.max(8, coords.left) }}
            onClick={(e) => e.stopPropagation()}
          >
            {view === "main" && (
              <>
                {mode === "folder" && (
                  <>
                    <button onClick={() => { close(); onNewNote(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconFilePlus size={15} className="flex-shrink-0" /> New note</button>
                    <button onClick={() => { close(); onNewFolder(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconFolderPlus size={15} className="flex-shrink-0" /> New subfolder</button>
                    <button onClick={() => { close(); onRename(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconPencil size={14} className="flex-shrink-0" /> Rename</button>
                  </>
                )}
                {mode === "note" && (
                  <>
                    <button onClick={() => { close(); onToggleStar(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5">
                      {starred ? <IconStarFilled size={14} className="flex-shrink-0 text-amber-400" /> : <IconStar size={14} className="flex-shrink-0" />} {starred ? "Unstar" : "Star"}
                    </button>
                    <button onClick={() => { close(); onDuplicate(); }} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconCopy size={14} className="flex-shrink-0" /> Duplicate</button>
                  </>
                )}
                <button onClick={() => setView("move")} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2.5"><IconFolderSymlink size={15} className="flex-shrink-0" /> {moveLabel}</button>
                <div className="my-1.5 border-t border-zinc-800" />
                <button onClick={() => setView("confirmDelete")} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-rose-400 flex items-center gap-2.5"><IconTrash size={15} className="flex-shrink-0" /> Delete</button>
              </>
            )}
            {view === "move" && (
              <>
                <button onClick={() => setView("main")} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-400 flex items-center gap-1.5 mb-1"><IconChevronLeft size={14} className="flex-shrink-0" /> Back</button>
                {moveOptions.map((o) => (
                  <button
                    key={o.id || "none"}
                    onClick={() => { close(); onMove(o.id); }}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover flex items-center gap-2 ${currentFolderId === o.id ? "tj-primary-text font-semibold" : "text-zinc-300"}`}
                  >
                    <IconFolder size={14} className="flex-shrink-0" /> <span className="truncate">{o.label}</span>
                  </button>
                ))}
              </>
            )}
            {view === "confirmDelete" && (
              <div className="p-2">
                <p className="text-xs text-zinc-300 px-1 pb-3 leading-relaxed">
                  {mode === "folder" ? "Delete this folder? Notes inside will be unfiled, not deleted." : "Delete this note?"}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { close(); onDelete(); }} className="flex-1 text-sm font-semibold bg-rose-500 hover:bg-rose-400 text-rose-950 rounded-lg py-2">Delete</button>
                  <button onClick={() => setView("main")} className="flex-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}

function MyLearningsTab({
  notes, notesLoading, folders, onAdd, onUpdate, onDelete, onBulkDeleteNotes, onMoveNote,
  onAddFolder, onRenameFolder, onDeleteFolder, onMoveFolder, onDuplicateNote, onToggleStar,
  pnlEntries, onDownloadPdf, navHeight, pendingOpenNoteId, onPendingOpenNoteApplied,
}) {
  const [railView, setRailView] = useState("notes"); // "notes" | "search" | "tags" | "resources"
  const [selectedNoteId, setSelectedNoteId] = useState(() => {
    try { return localStorage.getItem("tj-active-tab") || null; } catch { return null; }
  });
  const [openTabIds, setOpenTabIds] = useState(() => {
    try {
      const raw = localStorage.getItem("tj-open-tabs");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("tj-open-tabs", JSON.stringify(openTabIds)); } catch {}
  }, [openTabIds]);
  useEffect(() => {
    try {
      if (selectedNoteId) localStorage.setItem("tj-active-tab", selectedNoteId);
      else localStorage.removeItem("tj-active-tab");
    } catch {}
  }, [selectedNoteId]);
  // Once notes have actually loaded, drop any restored tab IDs that no
  // longer correspond to a real note (e.g. deleted from another session
  // while these tabs were saved).
  useEffect(() => {
    if (notesLoading) return;
    setOpenTabIds((prev) => {
      const stillValid = prev.filter((id) => notes.some((n) => n.id === id));
      return stillValid.length === prev.length ? prev : stillValid;
    });
    setSelectedNoteId((prev) => (prev && !notes.some((n) => n.id === prev) ? null : prev));
  }, [notesLoading, notes]);
  const [tabListOpen, setTabListOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("tj-sidebar-collapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("tj-sidebar-collapsed", sidebarCollapsed ? "1" : "0"); } catch {}
  }, [sidebarCollapsed]);

  // --- Tab drag-to-reorder (long-press initiated, same pattern as the sidebar) ---
  const [tabDragState, setTabDragState] = useState(null); // { id } while a tab is actively being dragged
  const [tabDropIndex, setTabDropIndex] = useState(null); // index it would land at if dropped now
  const tabDragStateRef = useRef(null);
  const tabDropIndexRef = useRef(null);
  const tabDragStartPosRef = useRef(null);
  const tabLongPressTimerRef = useRef(null);
  const tabJustDraggedRef = useRef(false);

  const updateTabDropIndexFromPoint = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    const tabEl = el ? el.closest("[data-tab-id]") : null;
    if (!tabEl) return;
    const hoveredId = tabEl.getAttribute("data-tab-id");
    const hoveredIdx = openTabIds.indexOf(hoveredId);
    if (hoveredIdx === -1) return;
    const rect = tabEl.getBoundingClientRect();
    const isLeftHalf = clientX - rect.left < rect.width / 2;
    const targetIdx = isLeftHalf ? hoveredIdx : hoveredIdx + 1;
    if (tabDropIndexRef.current !== targetIdx) {
      tabDropIndexRef.current = targetIdx;
      setTabDropIndex(targetIdx);
    }
  };

  const finalizeTabDrop = () => {
    const dragging = tabDragStateRef.current;
    const dropIdx = tabDropIndexRef.current;
    if (dragging && dropIdx !== null) {
      setOpenTabIds((prev) => {
        const fromIdx = prev.indexOf(dragging.id);
        if (fromIdx === -1) return prev;
        const withoutDragged = prev.filter((id) => id !== dragging.id);
        // Adjust the target index to account for the removal shifting
        // everything after the dragged tab's original position left by one.
        let insertAt = dropIdx;
        if (fromIdx < dropIdx) insertAt -= 1;
        insertAt = Math.max(0, Math.min(withoutDragged.length, insertAt));
        const next = [...withoutDragged];
        next.splice(insertAt, 0, dragging.id);
        return next;
      });
    }
    tabDragStateRef.current = null;
    tabDropIndexRef.current = null;
    setTabDragState(null);
    setTabDropIndex(null);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (tabDragStartPosRef.current && !tabDragStateRef.current) {
        const dx = e.clientX - tabDragStartPosRef.current.x;
        const dy = e.clientY - tabDragStartPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_MOVE_CANCEL_PX) {
          clearTimeout(tabLongPressTimerRef.current);
          tabDragStartPosRef.current = null;
        }
        return;
      }
      if (!tabDragStateRef.current) return;
      updateTabDropIndexFromPoint(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      clearTimeout(tabLongPressTimerRef.current);
      tabDragStartPosRef.current = null;
      if (tabDragStateRef.current) {
        tabJustDraggedRef.current = true;
        finalizeTabDrop();
        setTimeout(() => { tabJustDraggedRef.current = false; }, 0);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [openTabIds]);

  const handleTabMouseDown = (e, tid) => {
    if (e.button !== 0) return;
    tabDragStartPosRef.current = { x: e.clientX, y: e.clientY };
    clearTimeout(tabLongPressTimerRef.current);
    tabLongPressTimerRef.current = setTimeout(() => {
      tabDragStateRef.current = { id: tid };
      setTabDragState({ id: tid });
    }, DRAG_LONG_PRESS_MS);
  };

  const tabListBtnRef = useRef(null);

  // --- Sidebar multi-select (notes + folders) ---
  const [selectedItems, setSelectedItems] = useState(new Set()); // Set of "note:id" / "folder:id"
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const moveMenuBtnRef = useRef(null);
  const lastClickedItemRef = useRef(null);
  const clearSelection = () => setSelectedItems(new Set());


  const toggleItemSelection = (type, id) => {
    const key = `${type}:${id}`;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    lastClickedItemRef.current = { type, id };
  };

  const [autoFocusNoteId, setAutoFocusNoteId] = useState(null);
  const [expanded, setExpanded] = useState(new Set()); // folder ids expanded in the tree
  const [revealFlashId, setRevealFlashId] = useState(null);
  const collapseAllFolders = () => setExpanded(new Set());
  const expandAllFolders = () => setExpanded(new Set(folders.map((f) => f.id)));
  const allFoldersExpanded = folders.length > 0 && folders.every((f) => expanded.has(f.id));
  const toggleAllFolders = () => { if (allFoldersExpanded) collapseAllFolders(); else expandAllFolders(); };
  const revealCurrentNote = (targetId) => {
    const noteId = targetId || selectedNoteId;
    if (!noteId) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setSelectedNoteId(noteId);
    setRailView("notes");
    // Walk up the folder-parent chain from the note's own folder to the
    // root, collecting every ancestor so the whole path unfolds at once.
    const ancestorIds = [];
    let curFolderId = note.folderId;
    while (curFolderId) {
      ancestorIds.push(curFolderId);
      const f = folders.find((x) => x.id === curFolderId);
      curFolderId = f ? f.parentId : null;
    }
    if (ancestorIds.length > 0) {
      setExpanded((prev) => new Set([...prev, ...ancestorIds]));
    }
    // Give the expand animation time to settle (250ms transition) before
    // scrolling, so the row's final position is used, not a mid-transition one.
    setTimeout(() => {
      const el = document.querySelector(`[data-drag-type="note"][data-drag-id="${note.id}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRevealFlashId(note.id);
        setTimeout(() => setRevealFlashId(null), 1100);
      }
    }, ancestorIds.length > 0 ? 300 : 0);
  };
  useEffect(() => {
    if (!pendingOpenNoteId) return;
    revealCurrentNote(pendingOpenNoteId);
    if (onPendingOpenNoteApplied) onPendingOpenNoteApplied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpenNoteId]);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [noteFilterUnderlying, setNoteFilterUnderlying] = useState(null);
  const [noteFilterStrategy, setNoteFilterStrategy] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [resourceEditorFor, setResourceEditorFor] = useState(null);
  const [pendingDeleteResourceId, setPendingDeleteResourceId] = useState(null);
  const [templateEditorFor, setTemplateEditorFor] = useState(null);
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState(null);

  const learningNotes = useMemo(() => notes.filter((n) => !n.isResource && !n.isTemplate), [notes]);

  // --- Drag-to-reorder (long-press initiated) ---
  const DRAG_LONG_PRESS_MS = 350;
  const DRAG_MOVE_CANCEL_PX = 6;
  const HOVER_EXPAND_MS = 550;
  const LEAVE_ALL_ROWS_DEBOUNCE_MS = 150;
  const [dragState, setDragState] = useState(null); // { type, id } once a drag is actually active
  const [dropIndicator, setDropIndicator] = useState(null);
  // dropIndicator: { kind: "line", parentId, beforeId, y, x, width }
  //             or { kind: "into", folderId, folderName, y, x, width }
  const dragStateRef = useRef(null);
  const dropIndicatorRef = useRef(null);
  const dragStartPosRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const hoverExpandTimerRef = useRef(null);
  const leaveAllRowsTimerRef = useRef(null);
  const lastHoverFolderIdRef = useRef(null);
  const autoExpandedRef = useRef(new Set());
  const justDraggedRef = useRef(false); // suppresses the click that mouseup would otherwise fire

  const isDescendantFolder = (candidateId, ancestorId) => {
    let cur = folders.find((f) => f.id === candidateId);
    while (cur && cur.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = folders.find((f) => f.id === cur.parentId);
    }
    return false;
  };

  const collapseAutoExpanded = (exceptFolderId) => {
    autoExpandedRef.current.forEach((fid) => {
      if (fid === exceptFolderId || (exceptFolderId && isDescendantFolder(exceptFolderId, fid))) return;
      setExpanded((prev) => { if (!prev.has(fid)) return prev; const next = new Set(prev); next.delete(fid); return next; });
      autoExpandedRef.current.delete(fid);
    });
  };

  const updateDropIndicatorFromPoint = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    const rowEl = el ? el.closest("[data-drag-type]") : null;
    if (!rowEl) {
      // Left every row's own box — but this also fires transiently when the
      // pointer passes through the small margin gap between two stacked
      // rows during fast movement, which isn't a genuine "left the tree"
      // event. Debounce briefly; a real exit will still collapse shortly
      // after, but a momentary gap between rows won't.
      clearTimeout(hoverExpandTimerRef.current);
      dropIndicatorRef.current = null;
      setDropIndicator(null);
      clearTimeout(leaveAllRowsTimerRef.current);
      leaveAllRowsTimerRef.current = setTimeout(() => {
        collapseAutoExpanded(null);
        lastHoverFolderIdRef.current = null;
      }, LEAVE_ALL_ROWS_DEBOUNCE_MS);
      return;
    }
    clearTimeout(leaveAllRowsTimerRef.current);
    const rowType = rowEl.getAttribute("data-drag-type");
    const rowId = rowEl.getAttribute("data-drag-id");
    const rowParentId = rowEl.getAttribute("data-drag-parent") || null;
    const dragging = dragStateRef.current;
    if (!dragging) return;
    // Never allow dropping a folder into itself or one of its own descendants.
    if (dragging.type === "folder") {
      if (rowId === dragging.id) { return; }
      if (rowType === "folder" && isDescendantFolder(rowId, dragging.id)) { return; }
    }

    const rect = rowEl.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const fraction = relativeY / rect.height;
    const isFolder = rowType === "folder";

    // Folders: top 25% = insert before, bottom 25% = insert after,
    // middle 50% = move into this folder. Notes: simple top/bottom half.
    let zone;
    if (isFolder) {
      zone = fraction < 0.25 ? "before" : fraction > 0.75 ? "after" : "into";
    } else {
      zone = fraction < 0.5 ? "before" : "after";
    }

    // Walks up from a row's own folder context (itself, if it's a folder,
    // then its ancestors) checking whether any of them is currently
    // auto-expanded — i.e. whether this row is still somewhere "inside
    // the family" of a folder we opened for this drag. Traversing deeper
    // into a subfolder should never collapse its own ancestors.
    const isWithinAutoExpandedFamily = () => {
      let cur = isFolder ? rowId : rowParentId;
      while (cur) {
        if (autoExpandedRef.current.has(cur)) return true;
        const f = folders.find((x) => x.id === cur);
        cur = f ? f.parentId : null;
      }
      return false;
    };

    if (isFolder && zone === "into") {
      if (lastHoverFolderIdRef.current !== rowId) {
        collapseAutoExpanded(rowId);
        lastHoverFolderIdRef.current = rowId;
        clearTimeout(hoverExpandTimerRef.current);
        if (!expanded.has(rowId)) {
          hoverExpandTimerRef.current = setTimeout(() => {
            setExpanded((prev) => new Set(prev).add(rowId));
            autoExpandedRef.current.add(rowId);
          }, HOVER_EXPAND_MS);
        }
      }
      const folderObj = folders.find((f) => f.id === rowId);
      const next = { kind: "into", folderId: rowId, folderName: folderObj ? folderObj.name : "", y: rect.top, x: rect.left, width: rect.width };
      dropIndicatorRef.current = next;
      setDropIndicator(next);
      return;
    }

    // Reorder-line zones. Only collapse the auto-expanded chain if this
    // row is genuinely outside it — hovering a line zone that's still
    // within an already-open subfolder (e.g. its top/bottom edge) must
    // not close the ancestor that made it visible in the first place.
    if (lastHoverFolderIdRef.current && !isWithinAutoExpandedFamily()) {
      collapseAutoExpanded(null);
      lastHoverFolderIdRef.current = null;
      clearTimeout(hoverExpandTimerRef.current);
    }
    const beforeId = zone === "before" ? rowId : null;
    const afterId = zone === "after" ? rowId : null;
    const lineY = zone === "before" ? rect.top : rect.bottom;
    const next = { kind: "line", parentId: rowParentId, beforeId, afterId, y: lineY, x: rect.left, width: rect.width };
    dropIndicatorRef.current = next;
    setDropIndicator(next);
  };

  const finalizeDrop = async () => {
    const dragging = dragStateRef.current;
    const indicator = dropIndicatorRef.current;
    let committedFolderId = null;
    if (dragging && indicator) {
      if (indicator.kind === "into") {
        committedFolderId = indicator.folderId;
        if (dragging.type === "note") {
          const siblingNotes = learningNotes.filter((n) => n.folderId === indicator.folderId && n.id !== dragging.id).sort(sortByOrder);
          const topOrder = siblingNotes.length > 0 ? (siblingNotes[0].sortOrder ?? Date.now() / 1000) + 1000 : Date.now() / 1000;
          await onUpdate(dragging.id, { folderId: indicator.folderId, sortOrder: topOrder });
        } else {
          const siblingFolders = folders.filter((f) => f.parentId === indicator.folderId && f.id !== dragging.id).sort(sortByOrder);
          const topOrder = siblingFolders.length > 0 ? (siblingFolders[0].sortOrder ?? Date.now() / 1000) + 1000 : Date.now() / 1000;
          await onMoveFolder(dragging.id, indicator.folderId, topOrder);
        }
      } else if (indicator.kind === "line") {
        const siblings = dragging.type === "note"
          ? learningNotes.filter((n) => n.folderId === (indicator.parentId || null) && n.id !== dragging.id).sort(sortByOrder)
          : folders.filter((f) => f.parentId === (indicator.parentId || null) && f.id !== dragging.id).sort(sortByOrder);
        const refIdx = siblings.findIndex((s) => s.id === (indicator.beforeId || indicator.afterId));
        let newOrder;
        if (indicator.beforeId) {
          const ref = siblings[refIdx];
          const prevItem = siblings[refIdx - 1];
          newOrder = prevItem ? ((ref.sortOrder ?? 0) + (prevItem.sortOrder ?? 0)) / 2 : (ref.sortOrder ?? 0) + 1000;
        } else {
          const ref = siblings[refIdx];
          const nextItem = siblings[refIdx + 1];
          newOrder = nextItem ? ((ref.sortOrder ?? 0) + (nextItem.sortOrder ?? 0)) / 2 : (ref.sortOrder ?? 0) - 1000;
        }
        committedFolderId = indicator.parentId || null;
        if (dragging.type === "note") {
          const currentNote = learningNotes.find((n) => n.id === dragging.id);
          const parentChanged = currentNote && currentNote.folderId !== (indicator.parentId || null);
          await onUpdate(dragging.id, parentChanged ? { folderId: indicator.parentId || null, sortOrder: newOrder } : { sortOrder: newOrder });
        } else {
          await onMoveFolder(dragging.id, indicator.parentId || null, newOrder);
        }
      }
    }
    collapseAutoExpanded(committedFolderId);
    autoExpandedRef.current = new Set();
    dragStateRef.current = null;
    dropIndicatorRef.current = null;
    lastHoverFolderIdRef.current = null;
    clearTimeout(hoverExpandTimerRef.current);
    clearTimeout(leaveAllRowsTimerRef.current);
    setDragState(null);
    setDropIndicator(null);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (dragStartPosRef.current && !dragStateRef.current) {
        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_MOVE_CANCEL_PX) {
          clearTimeout(longPressTimerRef.current);
          dragStartPosRef.current = null;
        }
        return;
      }
      if (!dragStateRef.current) return;
      updateDropIndicatorFromPoint(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      clearTimeout(longPressTimerRef.current);
      dragStartPosRef.current = null;
      if (dragStateRef.current) {
        justDraggedRef.current = true;
        finalizeDrop();
        setTimeout(() => { justDraggedRef.current = false; }, 0);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [folders, learningNotes, expanded]);

  const handleRowMouseDown = (e, type, id) => {
    if (e.button !== 0) return;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      dragStateRef.current = { type, id };
      setDragState({ type, id });
    }, DRAG_LONG_PRESS_MS);
  };
  const resources = useMemo(() => notes.filter((n) => n.isResource), [notes]);
  const templates = useMemo(() => notes.filter((n) => n.isTemplate), [notes]);
  const selectedNote = learningNotes.find((n) => n.id === selectedNoteId) || null;

  const allTags = useMemo(() => {
    const s = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [notes]);

  const recentTags = useMemo(() => {
    const sorted = [...notes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    const seen = new Set();
    const ordered = [];
    sorted.forEach((n) => (n.tags || []).forEach((t) => { if (!seen.has(t)) { seen.add(t); ordered.push(t); } }));
    return ordered.slice(0, 8);
  }, [notes]);

  const folderPathFor = (folderId) => {
    if (!folderId) return "";
    const parts = [];
    let cur = folders.find((f) => f.id === folderId);
    while (cur) { parts.unshift(cur.name); cur = folders.find((f) => f.id === cur.parentId); }
    return parts.join(" / ");
  };

  const toggleExpand = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const [recentlyViewedIds, setRecentlyViewedIds] = useState(() => {
    try {
      const raw = localStorage.getItem("tj-recently-viewed");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const recordNoteView = (id) => {
    setRecentlyViewedIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 15);
      try { localStorage.setItem("tj-recently-viewed", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const selectNote = (id, autoFocus = false) => {
    setSelectedNoteId(id);
    setAutoFocusNoteId(autoFocus ? id : null);
    if (id) {
      setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      recordNoteView(id);
    }
  };
  const closeTab = (id) => {
    setOpenTabIds((prev) => {
      const idx = prev.indexOf(id);
      const next = prev.filter((tid) => tid !== id);
      if (selectedNoteId === id) {
        // Prefer the tab that takes the closed one's place, falling back to
        // the one before it, falling back to nothing — matching how most
        // tabbed interfaces pick the next active tab.
        const newActive = next[idx] ?? next[idx - 1] ?? null;
        setSelectedNoteId(newActive);
        setAutoFocusNoteId(null);
      }
      return next;
    });
  };

  const handleCreateNote = async (folderId) => {
    const created = await onAdd({ title: "", content: "", tags: [], isResource: false, folderId: folderId || null });
    if (folderId) setExpanded((prev) => new Set(prev).add(folderId));
    selectNote(created.id, true);
  };

  const handleCreateFolder = async (parentId) => {
    const created = await onAddFolder(parentId || null);
    if (!created) return;
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    setRenamingFolderId(created.id);
    setRenameDraft(created.name);
  };

  const commitRename = async (id) => {
    await onRenameFolder(id, renameDraft);
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = async (id) => {
    // Notes inside the deleted folder (or any of its subfolders) are
    // unfiled server-side, never deleted — if the currently-open note was
    // one of them it just stays open, now showing as Uncategorized.
    await onDeleteFolder(id);
  };

  // --- Bulk actions on the sidebar multi-selection ---
  const folderDescendantsAndSelf = (folderId) => {
    const ids = new Set([folderId]);
    let grew = true;
    while (grew) {
      grew = false;
      folders.forEach((f) => { if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
    }
    return ids;
  };
  const selectedItemsList = Array.from(selectedItems).map((key) => {
    const [type, id] = key.split(":");
    return { type, id };
  });
  const selectionHasOnlyNotes = selectedItemsList.length > 0 && selectedItemsList.every((i) => i.type === "note");
  const bulkMoveExcludedIds = () => {
    const excluded = new Set();
    selectedItemsList.forEach(({ type, id }) => {
      if (type === "folder") folderDescendantsAndSelf(id).forEach((fid) => excluded.add(fid));
    });
    return excluded;
  };
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const bulkDelete = async () => {
    const noteIds = [];
    for (const { type, id } of selectedItemsList) {
      if (type === "note") {
        noteIds.push(id);
        closeTab(id);
      } else {
        await handleDeleteFolder(id);
      }
    }
    if (noteIds.length > 0) onBulkDeleteNotes(noteIds);
    clearSelection();
    setBulkDeleteConfirmOpen(false);
  };
  const bulkDuplicate = async () => {
    const duplicatedTitles = [];
    for (const { type, id } of selectedItemsList) {
      if (type !== "note") continue;
      const note = learningNotes.find((n) => n.id === id);
      if (note) {
        const created = await onDuplicateNote(note);
        if (created) duplicatedTitles.push(note.title || "Untitled");
      }
    }
    clearSelection();
    if (duplicatedTitles.length === 1) {
      notify(`"${duplicatedTitles[0]}" duplicated.`);
    } else if (duplicatedTitles.length > 1) {
      notify(`${duplicatedTitles.length} notes duplicated.`);
    }
  };
  const bulkMove = async (targetFolderId) => {
    let movedNoteCount = 0;
    for (const { type, id } of selectedItemsList) {
      if (type === "note") { await onMoveNote(id, targetFolderId); movedNoteCount++; }
      else await onMoveFolder(id, targetFolderId);
    }
    clearSelection();
    setMoveMenuOpen(false);
    if (movedNoteCount === 1) {
      notify("1 note moved.");
    } else if (movedNoteCount > 1) {
      notify(`${movedNoteCount} notes moved.`);
    }
  };
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    if (dragState || tabDragState) {
      const styleEl = document.createElement("style");
      styleEl.textContent = "* { cursor: grabbing !important; }";
      document.head.appendChild(styleEl);
      return () => { document.head.removeChild(styleEl); };
    }
  }, [dragState, tabDragState]);

  // --- Notes tree ---
  const renderNoteLeaf = (n, depth) => {
    const menuOpenHere = openMenuRowId === n.id;
    const isSelected = selectedNoteId === n.id;
    const key = `note:${n.id}`;
    const isMultiSelected = selectedItems.has(key);
    const isBeingDragged = dragState && dragState.type === "note" && dragState.id === n.id;
    return (
      <div
        key={n.id}
        data-drag-type="note"
        data-drag-id={n.id}
        data-drag-parent={n.folderId || ""}
        className={`group flex items-center gap-1.5 pr-1.5 py-1.5 cursor-pointer text-xs w-full mb-1 select-none ${isSelected ? "tj-primary-bg font-semibold" : "tj-row-hover tj-note-text"} ${revealFlashId === n.id ? "tj-reveal-flash" : ""}`}
        style={{
          paddingLeft: 8 + depth * 16,
          backgroundColor: !isSelected && menuOpenHere ? "rgba(128,128,128,0.15)" : undefined,
          borderRadius: "var(--tj-radius-sm)",
          boxShadow: isMultiSelected ? "inset 0 0 0 1.5px var(--tj-primary)" : undefined,
          opacity: isBeingDragged ? 0.4 : 1,
        }}
        onMouseDown={(e) => handleRowMouseDown(e, "note", n.id)}
        onClick={(e) => { if (justDraggedRef.current) return; onRowClick(e, "note", n.id, () => selectNote(n.id)); }}
      >
        <IconFileText size={12} className="flex-shrink-0 opacity-70" />
        <span className="truncate flex-1">{n.title || "Untitled"}</span>
        <span className={`${menuOpenHere ? "flex" : "hidden group-hover:flex"} items-center flex-shrink-0`} onClick={(e) => e.stopPropagation()}>
          <RowMenu
            mode="note"
            folders={folders}
            currentFolderId={n.folderId || ""}
            starred={n.starred}
            onMove={(fid) => onMoveNote(n.id, fid)}
            onDuplicate={async () => { const created = await onDuplicateNote(n); if (created) notify(`"${n.title || "Untitled"}" duplicated.`); }}
            onToggleStar={() => onToggleStar(n)}
            onDelete={async () => {
              const title = n.title || "Untitled";
              await onDelete(n.id, `"${title}" deleted.`);
              closeTab(n.id);
            }}
            onOpenChange={(isOpen) => setOpenMenuRowId(isOpen ? n.id : null)}
          />
        </span>
      </div>
    );
  };

  const renderFolder = (folder, depth) => {
    const isExpanded = expanded.has(folder.id);
    const menuOpenHere = openMenuRowId === `folder:${folder.id}`;
    const childFolders = folders.filter((f) => f.parentId === folder.id).sort(sortByOrder);
    const childNotes = learningNotes.filter((n) => n.folderId === folder.id).sort(sortByOrder);
    const key = `folder:${folder.id}`;
    const isMultiSelected = selectedItems.has(key);
    const isBeingDragged = dragState && dragState.type === "folder" && dragState.id === folder.id;
    const isDropTarget = dropIndicator && dropIndicator.kind === "into" && dropIndicator.folderId === folder.id;
    return (
      <div key={folder.id}>
        <div
          data-drag-type="folder"
          data-drag-id={folder.id}
          data-drag-parent={folder.parentId || ""}
          className="group flex items-center gap-1 pr-1.5 py-1.5 tj-row-hover cursor-pointer text-xs tj-folder-text w-full mb-1 select-none"
          style={{
            paddingLeft: 4 + depth * 16,
            backgroundColor: menuOpenHere ? "rgba(128,128,128,0.15)" : undefined,
            borderRadius: "var(--tj-radius-sm)",
            boxShadow: isMultiSelected ? "inset 0 0 0 1.5px var(--tj-primary)" : isDropTarget ? "inset 0 0 0 1.5px var(--tj-primary)" : undefined,
            opacity: isBeingDragged ? 0.4 : 1,
          }}
          onMouseDown={(e) => handleRowMouseDown(e, "folder", folder.id)}
          onClick={(e) => { if (justDraggedRef.current) return; onRowClick(e, "folder", folder.id, () => toggleExpand(folder.id)); }}
        >
          {isExpanded ? <IconChevronDown size={12} className="flex-shrink-0 text-zinc-500" /> : <IconChevronRight size={12} className="flex-shrink-0 text-zinc-500" />}
          <IconFolder size={12} className="flex-shrink-0 opacity-80" />
          {renamingFolderId === folder.id ? (
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(folder.id); if (e.key === "Escape") setRenamingFolderId(null); }}
              onBlur={() => commitRename(folder.id)}
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          ) : (
            <span className="truncate flex-1 font-semibold">{folder.name}</span>
          )}
          <span className={`${menuOpenHere ? "flex" : "hidden group-hover:flex"} items-center flex-shrink-0`} onClick={(e) => e.stopPropagation()}>
            <RowMenu
              mode="folder"
              folders={folders}
              currentFolderId={folder.id}
              onNewNote={() => handleCreateNote(folder.id)}
              onNewFolder={() => handleCreateFolder(folder.id)}
              onRename={() => { setRenamingFolderId(folder.id); setRenameDraft(folder.name); }}
              onMove={(fid) => onMoveFolder(folder.id, fid)}
              onDelete={() => handleDeleteFolder(folder.id)}
              onOpenChange={(isOpen) => setOpenMenuRowId(isOpen ? `folder:${folder.id}` : null)}
            />
          </span>
        </div>
        <div
          className="w-full relative"
          style={{
            maxHeight: isExpanded ? 4000 : 0,
            opacity: isExpanded ? 1 : 0,
            overflow: isExpanded ? "visible" : "hidden",
            transition: "max-height 0.25s ease, opacity 0.2s ease",
            isolation: "isolate",
          }}
        >
          {isExpanded && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: 4 + depth * 16 + 5.5, width: 1, backgroundColor: "var(--tj-border, rgba(255,255,255,0.15))", zIndex: -1 }}
            />
          )}
          {childFolders.map((f) => renderFolder(f, depth + 1))}
          {childNotes.map((n) => renderNoteLeaf(n, depth + 1))}
        </div>
      </div>
    );
  };

  // Default order is newest-first (sortOrder is seeded from creation time
  // and never touched again except by an explicit drag-reorder), so this
  // one comparator drives every list in the tree.
  const sortByOrder = (a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
  const rootFolders = folders.filter((f) => !f.parentId).sort(sortByOrder);
  const rootNotes = learningNotes.filter((n) => !n.folderId).sort(sortByOrder);

  // Flattens the currently-visible tree (respecting expand/collapse state)
  // in the exact order it renders, so shift-click can select a contiguous
  // range the way the user actually sees it.
  const flattenVisibleTree = () => {
    const result = [];
    const visitFolder = (folder) => {
      result.push({ type: "folder", id: folder.id });
      if (expanded.has(folder.id)) {
        const childFolders = folders.filter((f) => f.parentId === folder.id).sort(sortByOrder);
        const childNotes = learningNotes.filter((n) => n.folderId === folder.id).sort(sortByOrder);
        childFolders.forEach(visitFolder);
        childNotes.forEach((n) => result.push({ type: "note", id: n.id }));
      }
    };
    rootFolders.forEach(visitFolder);
    rootNotes.forEach((n) => result.push({ type: "note", id: n.id }));
    return result;
  };

  // Combined click handler for both note and folder rows: plain click
  // clears any active selection and performs the row's normal action
  // (open note / toggle folder); ctrl/cmd-click toggles just that row in
  // or out of the selection; shift-click selects the contiguous range
  // from the last-clicked row to this one.
  const onRowClick = (e, type, id, normalAction) => {
    if (e.shiftKey && lastClickedItemRef.current) {
      e.preventDefault();
      const flat = flattenVisibleTree();
      const startIdx = flat.findIndex((r) => r.type === lastClickedItemRef.current.type && r.id === lastClickedItemRef.current.id);
      const endIdx = flat.findIndex((r) => r.type === type && r.id === id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const range = flat.slice(from, to + 1).map((r) => `${r.type}:${r.id}`);
        setSelectedItems((prev) => new Set([...prev, ...range]));
      }
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      toggleItemSelection(type, id);
      return;
    }
    if (selectedItems.size > 0) clearSelection();
    lastClickedItemRef.current = { type, id };
    normalAction();
  };

  // --- Search / Tags flat lists ---
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return learningNotes.filter((n) => {
      if (q) {
        const hay = `${n.title} ${n.content} ${(n.tags || []).join(" ")} ${n.linkedUnderlying || ""} ${n.linkedStrategy || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (noteFilterUnderlying && n.linkedUnderlying !== noteFilterUnderlying) return false;
      if (noteFilterStrategy && n.linkedStrategy !== noteFilterStrategy) return false;
      return true;
    }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [searchQuery, learningNotes, noteFilterUnderlying, noteFilterStrategy]);

  const noteFiltersActive = !!(noteFilterUnderlying || noteFilterStrategy);
  const noteSearchActive = !!searchQuery.trim() || noteFiltersActive;

  const noteUnderlyingOptions = useMemo(() => {
    return Array.from(new Set(learningNotes.map((n) => n.linkedUnderlying).filter(Boolean))).sort();
  }, [learningNotes]);
  const noteStrategyOptions = useMemo(() => {
    return Array.from(new Set(learningNotes.map((n) => n.linkedStrategy).filter(Boolean))).sort();
  }, [learningNotes]);
  const clearNoteFilters = () => {
    setNoteFilterUnderlying(null); setNoteFilterStrategy(null);
  };

  const recentlyViewedNotes = useMemo(() => {
    return recentlyViewedIds.map((id) => learningNotes.find((n) => n.id === id)).filter(Boolean);
  }, [recentlyViewedIds, learningNotes]);

  const tagCounts = useMemo(() => {
    const counts = {};
    learningNotes.forEach((n) => (n.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }, [learningNotes]);

  const tagResults = useMemo(() => {
    if (!activeTag) return [];
    return learningNotes.filter((n) => (n.tags || []).includes(activeTag)).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [activeTag, learningNotes]);

  const starredResults = useMemo(() => {
    return learningNotes.filter((n) => n.starred).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [learningNotes]);

  const renderFlatNoteRow = (n) => {
    const isActive = selectedNoteId === n.id;
    return (
      <div
        key={n.id}
        onClick={() => selectNote(n.id)}
        className={`w-full text-left px-2.5 py-2 text-xs cursor-pointer ${isActive ? "tj-primary-bg font-semibold" : "tj-row-hover tj-note-text"}`}
        style={{ borderRadius: "var(--tj-radius-sm)" }}
      >
        <p className="truncate font-semibold">{n.title || "Untitled"}</p>
        {n.content && (
          <p
            className="truncate text-[11px] mt-0.5"
            style={isActive ? { color: "var(--tj-primary-contrast)", opacity: 0.75 } : { color: "var(--tj-text4, #71717a)", opacity: 0.85 }}
          >
            {blockNoteSnippet(n.content, 10)}
          </p>
        )}
      </div>
    );
  };

  // --- Resources ---
  const handleDeleteResource = async (id) => {
    const r = resources.find((x) => x.id === id);
    await onDelete(id, `"${r ? (r.title || "Untitled") : "Untitled"}" deleted.`);
    setPendingDeleteResourceId(null);
  };
  const handleDeleteTemplate = async (id) => {
    const t = templates.find((x) => x.id === id);
    await onDelete(id, `"${t ? (t.title || "Untitled") : "Untitled"}" deleted.`);
    setPendingDeleteTemplateId(null);
  };
  const handleUseTemplate = async (template) => {
    const created = await onAdd({ title: "", content: template.content || "", tags: [], isResource: false, folderId: null });
    setRailView("notes");
    selectNote(created.id, true);
  };
  const handleCreateTemplate = async () => {
    const created = await onAdd({ title: "", content: "", tags: [], isResource: false, isTemplate: true, folderId: null });
    setTemplateEditorFor(created);
    setRailView("templateEditor");
  };

  return (
    <div className="flex tj-learnings-scope" style={{ height: `calc(100vh - ${navHeight}px)`, minHeight: 560 }}>
      <style>{`
        /* A hover-only background for tree/dropdown rows. Plain Tailwind
           "hover:bg-zinc-800" classes don't work here — this app has a
           global theme rule ([class*="bg-zinc-800"]) that matches the raw
           class *string*, not real :hover state, so a "hover:bg-zinc-800"
           class gets painted permanently regardless of whether the mouse
           is actually over it. This class sidesteps that entirely. */
        .tj-row-hover:hover { background-color: rgba(128,128,128,0.10); }
      `}</style>
      <LearningsRail view={railView} onChange={setRailView} />

      {railView === "templates" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2" style={FONT_DISPLAY}><IconLayoutGrid size={15} /> Templates</p>
            <button onClick={handleCreateTemplate} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
              <IconPlus size={13} /> New
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-xs text-zinc-500">No templates yet. Save a note's structure here to reuse it quickly next time.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 min-w-0">
                      <IconLayoutGrid size={13} className="flex-shrink-0 text-zinc-500" />
                      <span className="truncate">{t.title || "Untitled"}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Tooltip text="Edit"><button onClick={() => { setTemplateEditorFor(t); setRailView("templateEditor"); }} className="text-zinc-500 hover:tj-primary-text"><IconPencil size={13} /></button></Tooltip>
                      {pendingDeleteTemplateId === t.id ? (
                        <span className="flex items-center gap-1">
                          <Tooltip text="Confirm delete"><button onClick={() => handleDeleteTemplate(t.id)} className="text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={11} strokeWidth={3} /></button></Tooltip>
                          <Tooltip text="Cancel"><button onClick={() => setPendingDeleteTemplateId(null)} className="text-zinc-500 hover:text-zinc-300"><IconX size={13} /></button></Tooltip>
                        </span>
                      ) : (
                        <Tooltip text="Delete"><button onClick={() => setPendingDeleteTemplateId(t.id)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={13} /></button></Tooltip>
                      )}
                    </div>
                  </div>
                  {blockNoteSnippet(t.content) && <p className="text-xs text-zinc-400 leading-relaxed">{blockNoteSnippet(t.content)}</p>}
                  <div className="flex-1" />
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/70">
                    <button onClick={() => handleUseTemplate(t)} className="flex items-center gap-1 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
                      <IconPlus size={11} /> Use Template
                    </button>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0" style={FONT_MONO}>{t.updatedAt ? fmtDateDMY(t.updatedAt) : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : railView === "templateEditor" && templateEditorFor ? (
        <TemplateFullScreenEditor
          template={templateEditorFor}
          onUpdate={onUpdate}
          onDelete={handleDeleteTemplate}
          onBack={() => { setRailView("templates"); setTemplateEditorFor(null); }}
        />
      ) : railView === "resources" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2" style={FONT_DISPLAY}><IconBooks size={15} /> Resources</p>
            <button onClick={() => setResourceEditorFor({})} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
              <IconPlus size={13} /> New
            </button>
          </div>
          {resources.length === 0 ? (
            <p className="text-xs text-zinc-500">No saved resources yet. Add a link you check often.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.map((r) => (
                <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 min-w-0">
                      <IconBooks size={13} className="flex-shrink-0 text-zinc-500" />
                      <span className="truncate">{r.title || "Untitled"}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.resourceUrl && (
                        <Tooltip text="Open link">
                          <a href={r.resourceUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:tj-primary-text"><IconExternalLink size={13} /></a>
                        </Tooltip>
                      )}
                      <Tooltip text="Edit"><button onClick={() => setResourceEditorFor(r)} className="text-zinc-500 hover:tj-primary-text"><IconPencil size={13} /></button></Tooltip>
                      {pendingDeleteResourceId === r.id ? (
                        <span className="flex items-center gap-1">
                          <Tooltip text="Confirm delete"><button onClick={() => handleDeleteResource(r.id)} className="text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={11} strokeWidth={3} /></button></Tooltip>
                          <Tooltip text="Cancel"><button onClick={() => setPendingDeleteResourceId(null)} className="text-zinc-500 hover:text-zinc-300"><IconX size={13} /></button></Tooltip>
                        </span>
                      ) : (
                        <Tooltip text="Delete"><button onClick={() => setPendingDeleteResourceId(r.id)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={13} /></button></Tooltip>
                      )}
                    </div>
                  </div>
                  {r.content && <p className="text-xs text-zinc-400 leading-relaxed">{r.content}</p>}
                  {r.resourceUrl && <p className="text-[11px] text-zinc-600 truncate" style={FONT_MONO}>{r.resourceUrl}</p>}
                  <div className="flex-1" />
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/70">
                    <div className="flex flex-wrap gap-1">
                      {(r.tags || []).map((t) => (
                        <span key={t} className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><IconTag size={8} /> {t}</span>
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0" style={FONT_MONO}>{r.updatedAt ? fmtDateDMY(r.updatedAt) : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {resourceEditorFor !== null && (
            <ResourceEditorDialog
              initial={resourceEditorFor.id ? resourceEditorFor : null}
              allTags={allTags}
              recentTags={recentTags}
              onSave={async (payload) => {
                if (resourceEditorFor.id) { await onUpdate(resourceEditorFor.id, payload); }
                else { await onAdd(payload); }
              }}
              onClose={() => setResourceEditorFor(null)}
            />
          )}
        </div>
      ) : (
        <>
          <div
            className="flex-shrink-0 relative"
            style={{ width: sidebarCollapsed ? 0 : 288, transition: "width 0.25s ease" }}
          >
          <div className="h-full overflow-hidden" style={{ width: "100%" }}>
          <div className="w-72 h-full border-r border-zinc-800 flex flex-col overflow-hidden">
            {railView === "notes" && (
              <>
                <div className="flex-shrink-0 flex items-center justify-between px-3 border-b border-zinc-800/70" style={{ height: 49, backgroundColor: "var(--tj-panel)" }}>
                  {selectedItems.size > 0 ? (
                    <>
                      <p className="text-xs font-semibold tj-primary-text">{selectedItems.size} selected</p>
                      <div className="flex items-center gap-1">
                        <Tooltip text="Move to…">
                          <button ref={moveMenuBtnRef} onClick={() => setMoveMenuOpen((v) => !v)} className="text-zinc-400 hover:tj-primary-text p-1">
                            <IconFolderSymlink size={15} />
                          </button>
                        </Tooltip>
                        {selectionHasOnlyNotes && (
                          <Tooltip text="Duplicate">
                            <button onClick={bulkDuplicate} className="text-zinc-400 hover:tj-primary-text p-1"><IconCopy size={15} /></button>
                          </Tooltip>
                        )}
                        <Tooltip text="Delete">
                          <button onClick={() => setBulkDeleteConfirmOpen(true)} className="text-rose-400 hover:text-rose-300 p-1"><IconTrash size={15} /></button>
                        </Tooltip>
                        <Tooltip text="Clear selection">
                          <button onClick={clearSelection} className="text-zinc-500 hover:text-zinc-300 p-1"><IconX size={15} /></button>
                        </Tooltip>
                      </div>
                      {moveMenuOpen && createPortal(
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setMoveMenuOpen(false)} />
                          <div
                            className="tj-app fixed z-[61] w-56 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
                            style={(() => {
                              const r = moveMenuBtnRef.current ? moveMenuBtnRef.current.getBoundingClientRect() : { bottom: 0, left: 0 };
                              return { top: r.bottom + 4, left: r.left };
                            })()}
                          >
                            <button onClick={() => bulkMove(null)} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2">
                              <IconFolder size={14} className="flex-shrink-0" /> Uncategorized
                            </button>
                            {folders.filter((f) => !bulkMoveExcludedIds().has(f.id)).map((f) => (
                              <button key={f.id} onClick={() => bulkMove(f.id)} className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-zinc-300 flex items-center gap-2">
                                <IconFolder size={14} className="flex-shrink-0" /> <span className="truncate">{f.name}</span>
                              </button>
                            ))}
                          </div>
                        </>,
                        getPortalTarget()
                      )}
                      {bulkDeleteConfirmOpen && createPortal(
                        <>
                          <div className="fixed inset-0 z-[9998] bg-black/60" onClick={() => setBulkDeleteConfirmOpen(false)} />
                          <div className="tj-app fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-2xl border border-zinc-800 tj-solid-bg shadow-2xl p-5 tj-popover">
                            <p className="text-sm text-zinc-200 mb-1 font-semibold">Delete {selectedItems.size} item{selectedItems.size === 1 ? "" : "s"}?</p>
                            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Notes inside any selected folders will be unfiled, not deleted.</p>
                            <div className="flex gap-2">
                              <button onClick={bulkDelete} className="flex-1 text-sm font-semibold bg-rose-500 hover:bg-rose-400 text-rose-950 rounded-lg py-2">Delete</button>
                              <button onClick={() => setBulkDeleteConfirmOpen(false)} className="flex-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2">Cancel</button>
                            </div>
                          </div>
                        </>,
                        getPortalTarget()
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">My Learnings</p>
                      <div className="flex items-center gap-2">
                        <Tooltip text="Locate current file"><button onClick={revealCurrentNote} disabled={!selectedNoteId} className={`text-zinc-500 hover:tj-primary-text ${!selectedNoteId ? "opacity-30 cursor-not-allowed" : ""}`}><IconCrosshair size={14} /></button></Tooltip>
                        <Tooltip text={allFoldersExpanded ? "Collapse all" : "Expand all"}>
                          <button onClick={toggleAllFolders} className="text-zinc-500 hover:tj-primary-text">
                            {allFoldersExpanded ? <IconChevronsUp size={14} /> : <IconChevronsDown size={14} />}
                          </button>
                        </Tooltip>
                        <Tooltip text="New folder"><button onClick={() => handleCreateFolder(null)} className="text-zinc-500 hover:tj-primary-text"><IconFolderPlus size={14} /></button></Tooltip>
                        <Tooltip text="New note"><button onClick={() => handleCreateNote(null)} className="text-zinc-500 hover:tj-primary-text"><IconFilePlus size={14} /></button></Tooltip>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto py-2 pl-2 pr-2 no-scrollbar">
                  {notesLoading ? (
                    <p className="text-xs text-zinc-500 px-3">Loading...</p>
                  ) : rootFolders.length === 0 && rootNotes.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-3">No notes yet. Use the icons above to start one.</p>
                  ) : (
                    <>
                      {rootFolders.map((f) => renderFolder(f, 0))}
                      {rootNotes.map((n) => renderNoteLeaf(n, 0))}
                    </>
                  )}
                </div>
              </>
            )}

            {railView === "search" && (
              <>
                <div className="flex-shrink-0 p-3 border-b border-zinc-800/70 space-y-2">
                  <div className="relative">
                    <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notes..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                      >
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {noteUnderlyingOptions.length > 0 && (
                      <CompactFilterButton
                        label="Underlying" active={!!noteFilterUnderlying}
                        displayValue={noteFilterUnderlying || "Any"}
                        options={[{ id: "any", label: "Any", selected: !noteFilterUnderlying }, ...noteUnderlyingOptions.map((u) => ({ id: u, label: u, selected: noteFilterUnderlying === u }))]}
                        onSelect={(id) => setNoteFilterUnderlying(id === "any" ? null : id)}
                      />
                    )}
                    {noteStrategyOptions.length > 0 && (
                      <CompactFilterButton
                        label="Strategy" active={!!noteFilterStrategy}
                        displayValue={noteFilterStrategy || "Any"}
                        options={[{ id: "any", label: "Any", selected: !noteFilterStrategy }, ...noteStrategyOptions.map((s) => ({ id: s, label: s, selected: noteFilterStrategy === s }))]}
                        onSelect={(id) => setNoteFilterStrategy(id === "any" ? null : id)}
                      />
                    )}
                    {noteFiltersActive && (
                      <button onClick={clearNoteFilters} className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 flex items-center gap-1">
                        <IconX size={10} /> Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {!noteSearchActive ? (
                    recentlyViewedNotes.length === 0 ? (
                      <p className="text-xs text-zinc-500 px-1.5">Start typing to search titles, tags, and content — or use the filters above.</p>
                    ) : (
                      <>
                        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide px-1.5 pt-1 pb-1.5">Recently viewed</p>
                        {recentlyViewedNotes.map(renderFlatNoteRow)}
                      </>
                    )
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-1.5">No notes match your search.</p>
                  ) : searchResults.map(renderFlatNoteRow)}
                </div>
              </>
            )}

            {railView === "tags" && (
              <>
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-zinc-800/70">
                  {activeTag && (
                    <button onClick={() => setActiveTag(null)} className="text-zinc-500 hover:text-zinc-300"><IconChevronLeft size={14} /></button>
                  )}
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{activeTag ? `#${activeTag}` : "Tags"}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {!activeTag ? (
                    Object.keys(tagCounts).length === 0 ? (
                      <p className="text-xs text-zinc-500 px-1.5">No tags yet.</p>
                    ) : Object.entries(tagCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([t, count]) => (
                      <button key={t} onClick={() => setActiveTag(t)} className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-zinc-300 tj-row-hover">
                        <span className="flex items-center gap-1.5"><IconTag size={11} /> {t}</span>
                        <span className="text-zinc-600">{count}</span>
                      </button>
                    ))
                  ) : (
                    tagResults.length === 0 ? (
                      <p className="text-xs text-zinc-500 px-1.5">No notes with this tag.</p>
                    ) : tagResults.map(renderFlatNoteRow)
                  )}
                </div>
              </>
            )}
            {railView === "starred" && (
              <>
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-zinc-800/70">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Starred</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {starredResults.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-1.5">No starred notes yet — star a note to pin it here.</p>
                  ) : starredResults.map(renderFlatNoteRow)}
                </div>
              </>
            )}
          </div>
          </div>
          <div className="absolute z-10" style={{ top: "50%", right: -12, transform: "translateY(-50%)" }}>
            <Tooltip text={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="w-6 h-6 rounded-full flex items-center justify-center tj-primary-bg shadow-lg hover:scale-110 active:scale-95 transition-transform"
              >
                {sidebarCollapsed ? <IconChevronRight size={13} /> : <IconChevronLeft size={13} />}
              </button>
            </Tooltip>
          </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {openTabIds.length > 0 && (
              <div className="flex-shrink-0 flex items-stretch border-b border-zinc-800/70" style={{ height: 49, backgroundColor: "var(--tj-panel)" }}>
                <div className="flex items-stretch overflow-x-auto flex-1 min-w-0 relative" style={{ scrollbarWidth: "none" }}>
                  {openTabIds.map((tid, idx) => {
                    const tabNote = learningNotes.find((n) => n.id === tid);
                    if (!tabNote) return null;
                    const isActive = tid === selectedNoteId;
                    const isBeingDragged = tabDragState && tabDragState.id === tid;
                    return (
                      <div
                        key={tid}
                        data-tab-id={tid}
                        onMouseDown={(e) => handleTabMouseDown(e, tid)}
                        onClick={() => { if (tabJustDraggedRef.current) return; selectNote(tid); }}
                        className={`group flex items-center gap-1.5 px-3 py-3 text-xs cursor-pointer border-b-2 select-none ${idx > 0 ? "border-l border-l-zinc-800/70" : ""} ${isActive ? "tj-primary-text font-semibold" : "border-b-transparent text-zinc-500 hover:text-zinc-300"}`}
                        style={{
                          borderBottomColor: isActive ? "var(--tj-primary)" : undefined,
                          backgroundColor: isActive ? "var(--tj-panel2)" : undefined,
                          flex: "0 1 240px",
                          minWidth: 0,
                          opacity: isBeingDragged ? 0.4 : 1,
                        }}
                      >
                        <span className="truncate flex-1">{tabNote.title || "Untitled"}</span>
                        <button onClick={(e) => { e.stopPropagation(); closeTab(tid); }} className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-100">
                          <IconX size={12} />
                        </button>
                      </div>
                    );
                  })}
                  {tabDragState && tabDropIndex !== null && (() => {
                    const container = document.querySelector(`[data-tab-id="${tabDragState.id}"]`)?.parentElement;
                    if (!container) return null;
                    const tabEls = Array.from(container.querySelectorAll("[data-tab-id]"));
                    const targetEl = tabEls[tabDropIndex];
                    const containerRect = container.getBoundingClientRect();
                    const left = targetEl
                      ? targetEl.getBoundingClientRect().left - containerRect.left + container.scrollLeft
                      : (tabEls[tabEls.length - 1]?.getBoundingClientRect().right - containerRect.left + container.scrollLeft) || 0;
                    return (
                      <div
                        className="absolute top-0 pointer-events-none"
                        style={{ left: left - 1, width: 2, height: 49, backgroundColor: "var(--tj-primary)", borderRadius: 2, zIndex: 10 }}
                      />
                    );
                  })()}
                </div>
                <button
                  onClick={() => handleCreateNote(null)}
                  className="flex-shrink-0 px-2.5 flex items-center justify-center text-zinc-500 hover:text-zinc-200 border-l border-zinc-800/70"
                  title="New note"
                >
                  <IconPlus size={14} />
                </button>
                <button
                  ref={tabListBtnRef}
                  onClick={() => setTabListOpen((v) => !v)}
                  className="flex-shrink-0 px-2.5 flex items-center justify-center text-zinc-500 hover:text-zinc-200 border-l border-zinc-800/70"
                  title="Open tabs"
                >
                  <IconChevronDown size={14} />
                </button>
                {tabListOpen && createPortal(
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setTabListOpen(false)} />
                    <div
                      className="tj-app fixed z-[61] w-64 max-h-96 overflow-y-auto rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
                      style={(() => {
                        const r = tabListBtnRef.current ? tabListBtnRef.current.getBoundingClientRect() : { bottom: 0, right: 0 };
                        return { top: r.bottom + 4, left: Math.max(8, r.right - 256) };
                      })()}
                    >
                      <button
                        onClick={() => { setOpenTabIds([]); setSelectedNoteId(null); setTabListOpen(false); }}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg tj-row-hover text-rose-400 flex items-center gap-2.5"
                      >
                        <IconX size={14} className="flex-shrink-0" /> Close all
                      </button>
                      <div className="my-1.5 border-t border-zinc-800" />
                      {openTabIds.map((tid) => {
                        const tabNote = learningNotes.find((n) => n.id === tid);
                        if (!tabNote) return null;
                        const isActive = tid === selectedNoteId;
                        return (
                          <div
                            key={tid}
                            onClick={() => { selectNote(tid); setTabListOpen(false); }}
                            className={`group w-full text-left text-sm px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2.5 ${isActive ? "tj-primary-bg font-semibold" : "tj-row-hover text-zinc-300"}`}
                          >
                            <IconFileText size={13} className="flex-shrink-0 opacity-70" />
                            <span className="truncate flex-1">{tabNote.title || "Untitled"}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); closeTab(tid); }}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:text-zinc-100"
                            >
                              <IconX size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>,
                  getPortalTarget()
                )}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
            {selectedNote ? (
              <NoteMainPane
                key={selectedNote.id}
                note={selectedNote}
                folderPath={folderPathFor(selectedNote.folderId)}
                allTags={allTags}
                recentTags={recentTags}
                pnlEntries={pnlEntries}
                onUpdate={onUpdate}
                onDelete={async (id, message) => { const ok = await onDelete(id, message); closeTab(id); return ok; }}
                onDownloadPdf={onDownloadPdf}
                autoFocusTitle={autoFocusNoteId === selectedNote.id}
                templates={templates}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <IconBulb size={28} className="text-zinc-700" />
                <p className="text-sm text-zinc-500">Select a note, or start a new one.</p>
                <button onClick={() => handleCreateNote(null)} className="flex items-center gap-1.5 text-xs tj-primary-bg font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
                  <IconFilePlus size={13} /> New Note
                </button>
              </div>
            )}
          </div>
          </div>
        </>
      )}
      {dropIndicator && createPortal(
        dropIndicator.kind === "line" ? (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{ top: dropIndicator.y - 1, left: dropIndicator.x, width: dropIndicator.width, height: 2, backgroundColor: "var(--tj-primary)", borderRadius: 2 }}
          />
        ) : (
          <div
            className="fixed z-[9999] pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tj-solid-bg border"
            style={{ top: dropIndicator.y + 4, left: dropIndicator.x + 12, borderColor: "var(--tj-primary)", color: "var(--tj-primary)" }}
          >
            <IconFolderSymlink size={13} /> Move to “{dropIndicator.folderName}”
          </div>
        ),
        getPortalTarget()
      )}
    </div>
  );
}

/* ============== Main ============== */
function PreTradeChecklist({ session, pinRecord, onPinChanged, securityQuestions, onSecurityQuestionsChanged, deletionCancelledNotice, onDismissDeletionNotice, pinUnlocked }) {
  const [mode, setMode] = useState("trade");
  const VALID_TOP_TABS = ["home", "checklist", "setup", "pnl", "log", "learn", "holidays", "profile", "docs"];
  const [topTab, setTopTab] = useState(() => {
    try {
      const stored = localStorage.getItem("tj-last-tab");
      return VALID_TOP_TABS.includes(stored) ? stored : "home";
    } catch (e) { return "home"; }
  });
  useEffect(() => {
    try { localStorage.setItem("tj-last-tab", topTab); } catch (e) { /* best effort */ }
  }, [topTab]);

  // Browsers restore the previous scroll offset on reload by default, which
  // is exactly what was carrying a scrolled-down position across a fresh
  // login. Taking manual control means every load starts at the top unless
  // this component explicitly says otherwise. Checked on every animation
  // frame (not just a few fixed checkpoints) for a generous window after
  // mount, since dashboard data can take longer to finish loading than any
  // fixed set of checkpoints would anticipate — this reacts to however long
  // it actually takes instead of guessing at specific millisecond offsets.
  // Re-triggered when the PIN gate actually unlocks (not just at this
  // component's initial mount, which happens earlier while still hidden
  // behind the PIN overlay) — that's the moment the dashboard genuinely
  // becomes visible, and confirmed via testing to be when a stray scroll
  // offset otherwise sneaks in.
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    let active = true;
    const startTime = Date.now();
    const WATCH_MS = 8000;

    // The moment there's any sign of the user actually trying to scroll,
    // back off immediately and never touch scroll position again for this
    // watch cycle — otherwise the auto-correction (which runs every frame)
    // undoes a real scroll attempt within ~16ms, making the page feel
    // frozen even though the drift-correction itself is only meant to
    // catch layout shifts the user had no part in.
    const stopOnUserIntent = () => { active = false; };
    const scrollKeys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
    const onKeyDown = (e) => { if (scrollKeys.has(e.key)) stopOnUserIntent(); };
    window.addEventListener("wheel", stopOnUserIntent, { passive: true });
    window.addEventListener("touchstart", stopOnUserIntent, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    function frameLoop() {
      if (!active) return;
      const elapsed = Date.now() - startTime;
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      if (y !== 0) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      if (elapsed < WATCH_MS) requestAnimationFrame(frameLoop);
    }
    requestAnimationFrame(frameLoop);
    return () => {
      active = false;
      window.removeEventListener("wheel", stopOnUserIntent);
      window.removeEventListener("touchstart", stopOnUserIntent);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pinUnlocked]);

  // Switching tabs is a client-side state change, not a real page
  // navigation — the browser has no built-in reason to reset scroll
  // position the way it would for an actual new page, so a tab that's
  // never been scrolled inherits whatever offset the previous tab was left
  // at. Every tab switch starts fresh at the top instead.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [topTab]);

  // Navbar hides on scroll down, reappears on any scroll up (even a tiny
  // amount) — the small threshold on the "down" direction avoids it
  // flickering away on sub-pixel scroll jitter, but "up" reacts immediately
  // so the nav is never more than a scroll-tick away when the user wants it.
  const [navHidden, setNavHidden] = useState(false);
  const [navHeight, setNavHeight] = useState(168);
  const navResizeObserverRef = useRef(null);

  // The My Learnings tab needs to know the nav's real rendered height to
  // fill exactly the remaining viewport space. This MUST be a callback
  // ref, not a plain useRef + useEffect(..., []) — the nav is gated
  // behind `!appDataReady ? <AppLoadingScreen/> : (...)`, so on first
  // mount (while data is still loading) the nav div doesn't exist yet.
  // A plain ref/effect combo fires once, sees a null ref, and never
  // retries once the nav actually appears — which is exactly why the
  // previous version stayed stuck at the 168 fallback forever, as seen
  // directly in the rendered `calc(-168px + 100vh)` output. A callback
  // ref is invoked by React precisely when the node attaches (or
  // detaches), no matter when that happens in a conditional tree.
  const navRef = useCallback((el) => {
    if (navResizeObserverRef.current) {
      navResizeObserverRef.current.disconnect();
      navResizeObserverRef.current = null;
    }
    if (!el) return;
    const update = () => setNavHeight(el.offsetHeight || 168);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    navResizeObserverRef.current = ro;
  }, []);
  const lastScrollYRef = useRef(0);
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollYRef.current;
      if (y <= 0) {
        setNavHidden(false);
      } else if (delta > 4) {
        setNavHidden(true);
      } else if (delta < 0) {
        setNavHidden(false);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [customStrategies, setCustomStrategies] = useState([]);
  const [checklistOverrides, setChecklistOverrides] = useState({ itemOverrides: {}, deletedItemIds: [], customItems: {}, customSections: [], sectionTitleOverrides: {} });
  const [checklistOverridesLoading, setChecklistOverridesLoading] = useState(true);
  const [strategyType, setStrategyType] = useState("");
  const [strategyCategory, setStrategyCategory] = useState(null);
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [editingStratId, setEditingStratId] = useState(null);
  const [showManageStrategies, setShowManageStrategies] = useState(false);
  const [pendingDeleteStratId, setPendingDeleteStratId] = useState(null);
  const [underlying, setUnderlying] = useState("");
  const [legs, setLegs] = useState([]);
  const [checked, setChecked] = useState({});
  // Trade Day / No-Trade Day toggle transition behavior: when the user is
  // already on Market Read (the tab shared by both modes), only the
  // progress-bar-plus-tab-bar region needs to collapse/expand — Market
  // Read itself never re-animates since it's already visible either way.
  // When on a different tab, No-Trade Day forces the view over to Market
  // Read instead (since that's all it shows), so that transition uses a
  // horizontal slide-in for the incoming content and skips animating the
  // now-irrelevant collapse of the tab bar entirely.
  const [region2Animated, setRegion2Animated] = useState(true);
  const [specialSlideActive, setSpecialSlideActive] = useState(false);
  const [capital, setCapital] = useState("");
  const [plannedLoss, setPlannedLoss] = useState("");
  const [customRiskPct, setCustomRiskPct] = useState("");
  const [targetRiskPct, setTargetRiskPct] = useState(2);
  const [targetRiskLoading, setTargetRiskLoading] = useState(true);
  const [editingTargetRisk, setEditingTargetRisk] = useState(false);
  const [targetRiskDraft, setTargetRiskDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [entryMood, setEntryMood] = useState(null);
  const [entryMoodNote, setEntryMoodNote] = useState("");
  const [entryMoodNoteOpen, setEntryMoodNoteOpen] = useState(false);
  const [entryMoodNoteDraft, setEntryMoodNoteDraft] = useState("");
  const expiryDate = useMemo(() => nearestLegExpiry(legs), [legs]);
  const [dataReads, setDataReads] = useState({});
  const [activeTab, setActiveTab] = useState("data");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [incompleteChecklistDialogOpen, setIncompleteChecklistDialogOpen] = useState(false);
  const [checklistManagerOpen, setChecklistManagerOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [moodFilterPoint, setMoodFilterPoint] = useState(null); // null | "entry" | "exit"
  const [moodFilterMood, setMoodFilterMood] = useState(null); // null (Any) | mood id
  const [moodFilterRefine, setMoodFilterRefine] = useState(null); // null (Any) | "same" | "changed"
  const [pendingDeleteTs, setPendingDeleteTs] = useState(null);
  const [entryDownloadFor, setEntryDownloadFor] = useState(null);
  const [logRangeCustomOpen, setLogRangeCustomOpen] = useState(false);

  const [pnlEntries, setPnlEntries] = useState([]);
  const [pnlLoading, setPnlLoading] = useState(true);
  const [monthlyCharges, setMonthlyCharges] = useState({});
  const [monthlyChargesLoading, setMonthlyChargesLoading] = useState(true);
  const [capitalBase, setCapitalBase] = useState(0);
  const [capitalBaseLoading, setCapitalBaseLoading] = useState(true);
  const [fundTransactions, setFundTransactions] = useState([]);
  const [fundTransactionsLoading, setFundTransactionsLoading] = useState(true);
  const [manageFundsDialogOpen, setManageFundsDialogOpen] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [learningNotes, setLearningNotes] = useState([]);
  const noteTemplates = useMemo(() => learningNotes.filter((n) => n.isTemplate), [learningNotes]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [reminderSeverityOverrides, setReminderSeverityOverrides] = useState({});
  const [reminderHiddenSubcategories, setReminderHiddenSubcategories] = useState([]);
  const [reminderCustomSubcategories, setReminderCustomSubcategories] = useState([]); // [{ group, name, severity }]
  const [reminderListWindowDays, setReminderListWindowDays] = useState(14);
  const [noteFolders, setNoteFolders] = useState([]);
  const notesByTradeId = useMemo(() => {
    const map = {};
    learningNotes.forEach((n) => {
      if (!n.linkedTradeId) return;
      (map[n.linkedTradeId] = map[n.linkedTradeId] || []).push(n);
    });
    return map;
  }, [learningNotes]);
  const [pendingOpenNoteId, setPendingOpenNoteId] = useState(null);
  const openNoteFromTrade = (noteId) => {
    setTopTab("learn");
    setPendingOpenNoteId(noteId);
  };
  const [pendingRevealTradeId, setPendingRevealTradeId] = useState(null);
  const openTradeFromReminder = (tradeId) => {
    setTopTab("pnl");
    setPendingRevealTradeId(tradeId);
  };
  const [reminderPrefill, setReminderPrefill] = useState(null);
  const createReminderAt = (date, time) => {
    setReminderPrefill({ date, time: time || null });
    setTopTab("addReminder");
  };
  const [reminderAlarmDismissed, setReminderAlarmDismissed] = useState({}); // { [id]: dismissedForEpochMs }
  const [reminderAlarmDismissedLoaded, setReminderAlarmDismissedLoaded] = useState(false);
  const [dueAlarms, setDueAlarms] = useState([]);
  const [reschedulingReminder, setReschedulingReminder] = useState(null);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({ name: "", nickname: "", email: "", avatarType: null, avatarValue: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [homePrefsLoading, setHomePrefsLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => localISODate(Date.now()).slice(0, 7));
  const [pnlPendingDeleteId, setPnlPendingDeleteId] = useState(null);
  const [deletingHistoryTs, setDeletingHistoryTs] = useState(null);
  const [deletingPnlId, setDeletingPnlId] = useState(null);
  const [addTradeDialogOpen, setAddTradeDialogOpen] = useState(false);
  const [addTradeDialogClosing, setAddTradeDialogClosing] = useState(false);
  const [addTradeDate, setAddTradeDate] = useState(() => localISODate(Date.now()));
  const [addTradeAffectsCapital, setAddTradeAffectsCapital] = useState(null);
  const [addTradeMoodStepTs, setAddTradeMoodStepTs] = useState(null); // non-null once the trade's saved, for a today-dated trade only — holds the log entry's ts so a picked mood can be saved onto it
  const [addTradeSelectedMood, setAddTradeSelectedMood] = useState(null);
  const [newTradeIdToEdit, setNewTradeIdToEdit] = useState(null);
  const [pnlExportScope, setPnlExportScope] = useState("month");
  const [pnlExportMonth, setPnlExportMonth] = useState(() => localISODate(Date.now()).slice(0, 7));
  const [pnlExportYear, setPnlExportYear] = useState(() => String(new Date().getFullYear()));
  const [pnlExportRangeFrom, setPnlExportRangeFrom] = useState("");
  const [pnlExportRangeTo, setPnlExportRangeTo] = useState("");
  const { themeId, setThemeId, colorMode, setColorMode, themeReady } = useThemeSettings();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarMenuCoords, setAvatarMenuCoords] = useState(null);
  const avatarBtnRef = useRef(null);
  const [previousTopTab, setPreviousTopTab] = useState("setup");
  const [historyPage, setHistoryPage] = useState(1);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadDialogClosing, setDownloadDialogClosing] = useState(false);
  const [downloadTypes, setDownloadTypes] = useState({ observation: true, trade: true, funds_added: true, funds_withdrawn: true });

  const allStrategies = useMemo(() => [...DEFAULT_STRATEGIES, ...customStrategies], [customStrategies]);
  const strategiesInCategory = useMemo(
    () => allStrategies.filter((s) => (s.category || "other") === strategyCategory),
    [allStrategies, strategyCategory]
  );
  const strategyLabelLookup = (id) => { const s = allStrategies.find((x) => x.id === id); return s ? s.label : (id || "Trade"); };
  const currentStrategy = allStrategies.find((s) => s.id === strategyType) || null;
  const profile = currentStrategy ? currentStrategy.profile : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await dbTable.selectAll("checklist_history", "ts");
        if (!cancelled) setHistory(rows.map(historyRowToJs));
      } catch (err) { if (!cancelled) setHistory([]); }
      finally { if (!cancelled) setHistoryLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("custom-strategies");
        if (!cancelled) { const parsed = res && res.value ? JSON.parse(res.value) : []; setCustomStrategies(Array.isArray(parsed) ? parsed : []); }
      } catch (err) { /* no custom strategies yet */ }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("trades", "entry_date");
        if (!cancelled) setPnlEntries(rows.map(tradeRowToJs));
      } catch (err) { if (!cancelled) setPnlEntries([]); }
      finally { if (!cancelled) setPnlLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("pnl-monthly-charges");
        if (!cancelled) { const parsed = res && res.value ? JSON.parse(res.value) : {}; setMonthlyCharges(parsed && typeof parsed === "object" ? parsed : {}); }
      } catch (err) { if (!cancelled) setMonthlyCharges({}); }
      finally { if (!cancelled) setMonthlyChargesLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("target-risk-pct");
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (typeof parsed === "number" && !Number.isNaN(parsed) && parsed > 0) setTargetRiskPct(parsed);
        }
      } catch (err) { /* default target stays */ }
      finally { if (!cancelled) setTargetRiskLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("checklist-config");
        if (!cancelled) {
          const parsed = res && res.value ? JSON.parse(res.value) : null;
          if (parsed && typeof parsed === "object") {
            setChecklistOverrides({
              itemOverrides: parsed.itemOverrides || {},
              deletedItemIds: parsed.deletedItemIds || [],
              customItems: parsed.customItems || {},
              customSections: parsed.customSections || [],
              sectionTitleOverrides: parsed.sectionTitleOverrides || {},
            });
          }
        }
      } catch (err) { /* defaults stay */ }
      finally { if (!cancelled) setChecklistOverridesLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("capital-base");
        if (!cancelled) { const parsed = res && res.value ? JSON.parse(res.value) : 0; setCapitalBase(typeof parsed === "number" && !Number.isNaN(parsed) ? parsed : 0); }
      } catch (err) { if (!cancelled) setCapitalBase(0); }
      finally { if (!cancelled) setCapitalBaseLoading(false); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("fund_transactions", "date");
        if (!cancelled) setFundTransactions(rows.map(fundTxRowToJs));
      } catch (err) { if (!cancelled) setFundTransactions([]); }
      finally { if (!cancelled) setFundTransactionsLoading(false); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("notes", "updated_at");
        if (!cancelled) setLearningNotes(rows.map(noteRowToJs));
      } catch (err) { if (!cancelled) setLearningNotes([]); }
      finally { if (!cancelled) setNotesLoading(false); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("reminders", "reminder_date");
        if (!cancelled) setReminders(rows.map(reminderRowToJs));
      } catch (err) { if (!cancelled) setReminders([]); }
      finally { if (!cancelled) setRemindersLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-severity-overrides");
        const parsed = res && res.value ? JSON.parse(res.value) : {};
        if (!cancelled) setReminderSeverityOverrides(parsed && typeof parsed === "object" ? parsed : {});
      } catch (err) { if (!cancelled) setReminderSeverityOverrides({}); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-hidden-subcategories");
        const parsed = res && res.value ? JSON.parse(res.value) : [];
        if (!cancelled) setReminderHiddenSubcategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) { if (!cancelled) setReminderHiddenSubcategories([]); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-custom-subcategories");
        const parsed = res && res.value ? JSON.parse(res.value) : [];
        if (!cancelled) setReminderCustomSubcategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) { if (!cancelled) setReminderCustomSubcategories([]); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-list-window-days");
        const parsed = res && res.value ? parseInt(res.value, 10) : 14;
        if (!cancelled) setReminderListWindowDays(Number.isFinite(parsed) ? parsed : 14);
      } catch (err) { if (!cancelled) setReminderListWindowDays(14); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-alarm-dismissed");
        const parsed = res && res.value ? JSON.parse(res.value) : {};
        if (!cancelled) setReminderAlarmDismissed(parsed && typeof parsed === "object" ? parsed : {});
      } catch (err) { if (!cancelled) setReminderAlarmDismissed({}); }
      finally { if (!cancelled) setReminderAlarmDismissedLoaded(true); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("note_folders", "created_at");
        if (!cancelled) setNoteFolders(rows.map(folderRowToJs));
      } catch (err) { if (!cancelled) setNoteFolders([]); }
      finally { if (!cancelled) setFoldersLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.getShared(SHARED_HOLIDAYS_KEY);
        const parsed = res && res.value ? JSON.parse(res.value) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!cancelled) setHolidays(parsed);
        } else if (isAdminSession(session)) {
          // Nobody has seeded the shared calendar yet — the admin's own
          // client does it once, here, so every other user's next load
          // finds a populated record instead of an empty one.
          try {
            await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(DEFAULT_HOLIDAYS_2026));
            if (!cancelled) setHolidays(DEFAULT_HOLIDAYS_2026);
          } catch (seedErr) {
            console.error("Failed to seed shared holiday calendar:", seedErr);
            notify(`Couldn't set up the shared holiday calendar — ${seedErr?.message || "check console for details"}.`, "error");
            if (!cancelled) setHolidays([]);
          }
        } else if (!cancelled) {
          setHolidays([]);
        }
      } catch (err) {
        console.error("Failed to read shared holiday calendar:", err);
        if (isAdminSession(session)) notify(`Couldn't read the shared holiday calendar — ${err?.message || "check console for details"}.`, "error");
        if (!cancelled) setHolidays([]);
      }
      finally { if (!cancelled) setHolidaysLoading(false); }
    })();
    checkForHolidayLogUpdates();
    (async () => {
      const googleEmail = session?.user?.email || "";
      const googleName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "";
      const googlePhoto = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || "";
      // Start from the Google session immediately — this is what shows if the
      // saved-profile read below fails for any reason (including before the
      // per-user migration has been run), rather than leaving the profile blank.
      let next = { name: googleName, nickname: "", email: googleEmail, avatarType: googlePhoto ? "custom" : null, avatarValue: googlePhoto };
      try {
        const res = await dbStorage.get("profile");
        const parsed = res && res.value ? JSON.parse(res.value) : null;
        if (parsed) {
          // A profile has been explicitly saved before — respect it exactly
          // as saved, including a deliberate "removed my photo" or "cleared
          // my name" choice. Only email still always tracks the Google
          // account, since it's the actual login identity, not a preference.
          next = {
            name: parsed.name,
            nickname: parsed.nickname || "",
            email: googleEmail || parsed.email || "",
            avatarType: parsed.avatarType,
            avatarValue: parsed.avatarValue,
          };
        }
        // else: no profile has ever been saved (first-ever login) — `next`
        // stays as the Google-session defaults set above.
      } catch (err) { /* fall back to the Google-session values already in `next` */ }
      if (!cancelled) setUserProfile(next);
      if (!cancelled) setProfileLoading(false);
    })();
    (async () => {
      try {
        const res = await dbStorage.get("home-prefs");
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && typeof parsed.journeyOpen === "boolean") setJourneyOpen(parsed.journeyOpen);
          if (parsed && typeof parsed.deepDiveOpen === "boolean") setDeepDiveOpen(parsed.deepDiveOpen);
        }
      } catch (err) { /* defaults (collapsed) stay */ }
      finally { if (!cancelled) setHomePrefsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Users who keep the app open for a while (rather than reloading) still
  // get told about holiday-calendar edits made by the admin in the
  // meantime — same check as on load, just re-run periodically.
  useEffect(() => {
    const interval = setInterval(() => { checkForHolidayLogUpdates(); }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Tracks which trade ids have been edited since the last save — populated
  // by updatePnlEntry, which knows exactly which row changed but has no
  // save trigger of its own (it's called from many different table cells).
  // Only these specific rows get upserted, not the whole trade history.
  const dirtyPnlIdsRef = useRef(new Set());
  useEffect(() => {
    if (pnlLoading) return;
    const t = setTimeout(() => {
      const dirtyIds = dirtyPnlIdsRef.current;
      if (dirtyIds.size === 0) return;
      const rowsToSave = pnlEntries.filter((e) => dirtyIds.has(e.id)).map((e) => tradeJsToRow(e, currentUserId));
      dirtyPnlIdsRef.current = new Set();
      if (rowsToSave.length > 0) dbTable.upsert("trades", rowsToSave).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [pnlEntries, pnlLoading]);

  useEffect(() => {
    if (monthlyChargesLoading) return;
    const t = setTimeout(() => { dbStorage.set("pnl-monthly-charges", JSON.stringify(monthlyCharges)).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [monthlyCharges, monthlyChargesLoading]);

  useEffect(() => {
    if (capitalBaseLoading) return;
    const t = setTimeout(() => { dbStorage.set("capital-base", JSON.stringify(capitalBase)).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [capitalBase, capitalBaseLoading]);

  // No fund-transactions auto-save effect — every mutation (add, delete,
  // clear-all) is already a discrete operation with a known row, handled
  // directly at its own call site instead of via a generic whole-array save.

  useEffect(() => {
    if (profileLoading) return;
    const t = setTimeout(() => { dbStorage.set("profile", JSON.stringify(userProfile)).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [userProfile, profileLoading]);

  useEffect(() => {
    if (homePrefsLoading) return;
    const t = setTimeout(() => { dbStorage.set("home-prefs", JSON.stringify({ journeyOpen, deepDiveOpen })).catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [journeyOpen, deepDiveOpen, homePrefsLoading]);

  useEffect(() => {
    if (!themeReady) return;
    const t = setTimeout(() => {
      dbStorage.set("theme-settings", JSON.stringify({ themeId, colorMode })).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [themeId, colorMode, themeReady]);

  useEffect(() => {
    if (checklistOverridesLoading) return;
    const t = setTimeout(() => {
      dbStorage.set("checklist-config", JSON.stringify(checklistOverrides)).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [checklistOverrides, checklistOverridesLoading]);

  useEffect(() => { setHistoryPage(1); }, [rangeFrom, rangeTo]);

  useEffect(() => { if (mode === "no_trade" && topTab === "setup") setTopTab("checklist"); }, [mode, topTab]);
  useEffect(() => { if (mode === "no_trade") setActiveTab("data"); }, [mode]);
  useEffect(() => { if (mode === "no_trade") setChecklistManagerOpen(false); }, [mode]);
  useEffect(() => { setLegs(legsFromTemplate(strategyType, customStrategies)); }, [strategyType]);

  const capitalAffectingPL = useMemo(
    () => pnlEntries.reduce((s, e) => (e.affectsCapital !== false ? s + (parseFloat(e.overallPL) || 0) : s), 0),
    [pnlEntries]
  );
  const lifetimeChargesTotal = useMemo(
    () => Object.values(monthlyCharges || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [monthlyCharges]
  );
  const totalCapital = capitalBase + capitalAffectingPL - lifetimeChargesTotal;

  // The Risk Calculator's capital field defaults to (and keeps refreshing
  // from) the real total capital — but only while it hasn't been manually
  // edited away from that default. Once you type your own number in (to test
  // a separate "what if" amount), it's left alone and never written back to
  // total capital — the two are one-way linked (default only), not synced.
  const [lastAutoCapital, setLastAutoCapital] = useState(null);
  useEffect(() => {
    if (capitalBaseLoading || fundTransactionsLoading || pnlLoading || monthlyChargesLoading) return;
    const rounded = totalCapital ? totalCapital.toFixed(2) : "";
    setCapital((prev) => (prev === "" || prev === lastAutoCapital ? rounded : prev));
    setLastAutoCapital(rounded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCapital, capitalBaseLoading, fundTransactionsLoading, pnlLoading, monthlyChargesLoading]);

  const capNum = parseFloat(capital) || 0;
  const lossNum = parseFloat(plannedLoss) || 0;
  const pct = capNum > 0 && lossNum > 0 ? (lossNum / capNum) * 100 : null;
  const riskEdgePct = targetRiskPct * 1.5;
  const pctColor = pct === null ? "text-zinc-500" : pct <= targetRiskPct ? "text-[#04B488]" : pct <= riskEdgePct ? "text-amber-400" : "text-[#F15E3B]";
  const pctVerdict = pct === null ? "Enter capital and planned loss to check" : pct <= targetRiskPct ? `Within target — ${targetRiskPct}% or less of capital` : pct <= riskEdgePct ? `At the edge — ${targetRiskPct}% to ${riskEdgePct}% of capital` : `Oversized — reduce or skip, over ${riskEdgePct}% of capital`;

  const saveTargetRiskPct = async (pctVal) => {
    const clamped = Math.max(0.1, Math.min(20, pctVal));
    setTargetRiskPct(clamped);
    try { await dbStorage.set("target-risk-pct", JSON.stringify(clamped)); } catch (err) { /* best effort */ }
    notify(`Target risk set to ${clamped}%.`);
  };

  const applyRiskPct = (pctVal) => {
    if (!capNum || !pctVal) return;
    const clamped = Math.min(pctVal, 20);
    setPlannedLoss((capNum * (clamped / 100)).toFixed(2));
  };

  const activeRiskPct = pct === null ? null : [1, 2, 3].find((p) => Math.abs(pct - p) < 0.05) || null;

  const netPremium = useMemo(() => {
    return legs.reduce((sum, leg) => {
      if (leg.type !== "CE" && leg.type !== "PE") return sum;
      const prem = parseFloat(leg.premium) || 0, qty = parseFloat(leg.qty) || 0;
      return sum + (leg.action === "Sell" ? 1 : -1) * prem * qty;
    }, 0);
  }, [legs]);
  const payoffInfo = useMemo(() => computeStrategyPayoff(profile, legs), [profile, legs]);

  const sections = useMemo(() => buildEffectiveSections(checklistOverrides), [checklistOverrides]);

  const applicableItemsFor = (prof, stratId) => {
    const all = sections.flatMap((s) => s.items);
    return all.filter((i) => {
      if (i.applies === "all") return true;
      if (i.appliesBy === "id") return i.applies.includes(stratId);
      return i.applies.includes(prof);
    });
  };
  const applicableItems = useMemo(() => applicableItemsFor(profile, strategyType), [profile, strategyType, sections]);
  const totalApplicable = applicableItems.length;
  const totalChecked = applicableItems.filter((i) => checked[i.id]).length;
  const criticalApplicable = applicableItems.filter((i) => i.critical);
  const missingCritical = criticalApplicable.filter((i) => !checked[i.id]);
  const readyToTrade = criticalApplicable.length > 0 && missingCritical.length === 0;
  const legsComplete = legs.length > 0 && legs.every(isLegComplete);

  const itemToSection = useMemo(() => {
    const map = {};
    sections.forEach((s) => s.items.forEach((i) => { map[i.id] = s.id; }));
    return map;
  }, [sections]);

  const scoredRows = useMemo(() => DATA_ROWS.filter((r) => dataReads[r.id] !== undefined).map((r) => (r.contrarian ? -dataReads[r.id] : dataReads[r.id])), [dataReads]);
  const marketAvg = scoredRows.length ? scoredRows.reduce((a, b) => a + b, 0) / scoredRows.length : null;
  const marketVerdict = getVerdict(marketAvg);

  const progressPct = mode === "no_trade"
    ? (DATA_ROWS.length ? Math.round(Object.keys(dataReads).length / DATA_ROWS.length * 100) : 0)
    : (totalApplicable > 0 ? Math.round(totalChecked / totalApplicable * 100) : 0);

  const tabs = useMemo(() => {
    const dataTab = { id: "data", num: null, label: "Market Read", badge: `${Object.keys(dataReads).length}/${DATA_ROWS.length}`, warn: false };
    const sectionTabs = sections.map((s) => {
      const applic = applicableItemsFor(profile, strategyType).filter((i) => s.items.includes(i));
      const cnt = applic.filter((i) => checked[i.id]).length;
      const warn = applic.some((i) => i.critical && !checked[i.id]);
      return { id: s.id, num: s.num, label: s.title, badge: `${cnt}/${applic.length}`, warn };
    });
    return [dataTab, ...sectionTabs];
  }, [profile, strategyType, checked, dataReads, sections]);

  const activeSection = activeTab !== "data" ? sections.find((s) => s.id === activeTab) : null;

  const handleModeToggle = (newMode) => {
    if (newMode === mode) return;
    const wasOnMarketRead = activeTab === "data";
    setRegion2Animated(wasOnMarketRead);
    if (!wasOnMarketRead) {
      setSpecialSlideActive(true);
      setActiveTab("data");
    }
    setMode(newMode);
  };

  // One-shot flag — clears itself shortly after the forced switch to
  // Market Read so a subsequent, ordinary tab click goes back to the
  // normal tj-slide-in rather than replaying the special left-slide.
  useEffect(() => {
    if (!specialSlideActive) return;
    const t = setTimeout(() => setSpecialSlideActive(false), 500);
    return () => clearTimeout(t);
  }, [activeTab, specialSlideActive]);

  // Locked in via useMemo (dependency on activeTab only, not
  // specialSlideActive) so this content instance's animation choice never
  // changes mid-lifecycle. Without this, specialSlideActive resetting to
  // false a moment later would flip the CSS class on the *same already-
  // mounted* element — and browsers restart a CSS animation whenever its
  // animation-name changes, even without a DOM remount, causing the new
  // class's from-state (opacity: 0) to flash briefly over content that had
  // already fully animated in.
  const contentUsesSpecialSlide = useMemo(() => specialSlideActive, [activeTab]);

  const toggleItem = useCallback((id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] })), []);
  const toggleAllInSection = useCallback((ids, value) => setChecked((prev) => { const next = { ...prev }; ids.forEach((id) => { next[id] = value; }); return next; }), []);
  const setDataRow = useCallback((id, value) => setDataReads((prev) => {
    if (prev[id] === value) {
      const next = { ...prev };
      delete next[id];
      return next;
    }
    return { ...prev, [id]: value };
  }), []);
  const addLeg = useCallback(() => setLegs((prev) => [...prev, { id: freshLegId(), name: "", action: "Sell", type: "CE", strike: "", premium: "", qty: "", lotSize: "", expiry: "", openedAt: Date.now() }]), []);
  const removeLeg = useCallback((id) => setLegs((prev) => prev.filter((l) => l.id !== id)), []);
  const updateLeg = useCallback((id, field, value) => setLegs((prev) => prev.map((l) => {
    if (l.id !== id) return l;
    const next = { ...l, [field]: value };
    if (field === "type" && (value === "FUT" || value === "Other")) next.premium = "";
    if (field === "type" && value === "Other") next.lotSize = "";
    return next;
  })), []);

  const resetTradeSetup = () => {
    setChecked({});
    setNotes("");
    setScreenshots([]);
    setPlannedLoss("");
    setStrategyType("");
    setStrategyCategory(null);
    setLegs([]);
    setUnderlying("");
    setEntryMood(null);
    setEntryMoodNote("");
    setEntryMoodNoteOpen(false);
    setEntryMoodNoteDraft("");
    // Data Read (the 11-point market context) is intentionally left alone —
    // it doesn't change much through the day, so it carries over to the next
    // check instead of forcing a refill. Still fully editable if it needs updating.
  };

  const startNewCheck = () => {
    if (mode === "no_trade") { setNotes(""); setEntryMood(null); setEntryMoodNote(""); setEntryMoodNoteOpen(false); setEntryMoodNoteDraft(""); return; }
    resetTradeSetup();
  };

  const addCustomStrategy = async (values) => {
    if (!values.name.trim()) { playErrorBeep(); return; }
    const existingIds = allStrategies.map((s) => s.id);
    const id = makeUniqueId(slugify(values.name), existingIds);
    const entry = { id, label: values.name.trim(), profile: values.profile, category: values.category, legTemplate: values.legTemplate };
    const next = [...customStrategies, entry];
    setCustomStrategies(next);
    setStrategyCategory(values.category);
    setStrategyType(id);
    setShowAddStrategy(false);
    try { await dbStorage.set("custom-strategies", JSON.stringify(next)); } catch (e) { /* best effort */ }
    notify(`Strategy added — ${entry.label}.`);
  };

  const editCustomStrategy = async (id, values) => {
    const next = customStrategies.map((s) => (s.id === id ? { ...s, label: values.name.trim(), profile: values.profile, category: values.category, legTemplate: values.legTemplate } : s));
    setCustomStrategies(next);
    if (strategyType === id) {
      if (values.category !== strategyCategory) setStrategyCategory(values.category);
      setLegs(legsFromTemplate(id, next));
    }
    try { await dbStorage.set("custom-strategies", JSON.stringify(next)); } catch (e) { /* best effort */ }
    notify(`Strategy updated — ${values.name.trim()}.`);
  };

  const deleteCustomStrategy = async (id) => {
    const target = customStrategies.find((s) => s.id === id);
    const next = customStrategies.filter((s) => s.id !== id);
    setCustomStrategies(next);
    if (strategyType === id) {
      const opts = [...DEFAULT_STRATEGIES, ...next].filter((s) => (s.category || "other") === strategyCategory);
      setStrategyType(opts.length > 0 ? opts[0].id : DEFAULT_STRATEGIES[0].id);
    }
    try { await dbStorage.set("custom-strategies", JSON.stringify(next)); } catch (e) { /* best effort */ }
    notify(`Strategy deleted — ${target ? target.label : ""}.`);
  };

  // ---- Checklist item management (create / edit / delete checklist points) ----
  const addChecklistItem = (sectionId, values) => {
    const existingIds = sections.flatMap((s) => s.items.map((i) => i.id));
    const id = freshChecklistItemId(existingIds);
    const newItem = {
      id,
      label: values.label.trim(),
      sub: values.sub ? values.sub.trim() : "",
      critical: !!values.critical,
      applies: values.applies === "all" ? "all" : values.applies,
    };
    setChecklistOverrides((prev) => ({
      ...prev,
      customItems: { ...prev.customItems, [sectionId]: [...(prev.customItems[sectionId] || []), newItem] },
    }));
    notify(`Checklist item added — ${newItem.label}.`);
  };

  const editChecklistItem = (item, sectionId, values) => {
    const updated = {
      label: values.label.trim(),
      sub: values.sub ? values.sub.trim() : "",
      critical: !!values.critical,
      applies: values.applies === "all" ? "all" : values.applies,
    };
    setChecklistOverrides((prev) => {
      const isCustom = (prev.customItems[sectionId] || []).some((i) => i.id === item.id);
      if (isCustom) {
        return {
          ...prev,
          customItems: {
            ...prev.customItems,
            [sectionId]: prev.customItems[sectionId].map((i) => (i.id === item.id ? { ...i, ...updated } : i)),
          },
        };
      }
      return { ...prev, itemOverrides: { ...prev.itemOverrides, [item.id]: updated } };
    });
    notify(`Checklist item updated — ${values.label.trim()}.`);
  };

  const deleteChecklistItem = (item, sectionId) => {
    setChecklistOverrides((prev) => {
      const isCustom = (prev.customItems[sectionId] || []).some((i) => i.id === item.id);
      if (isCustom) {
        return {
          ...prev,
          customItems: { ...prev.customItems, [sectionId]: prev.customItems[sectionId].filter((i) => i.id !== item.id) },
        };
      }
      return { ...prev, deletedItemIds: [...prev.deletedItemIds, item.id] };
    });
    // Also clear any saved checked-state for this item so it can't linger as a
    // "checked" entry for an item that no longer exists.
    setChecked((prev) => {
      if (!(item.id in prev)) return prev;
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    notify(`Checklist item deleted — ${item.label}.`);
  };

  const editChecklistSectionTitle = (sectionId, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const isDefaultSection = DEFAULT_SECTION_DEFS.some((s) => s.id === sectionId);
    if (isDefaultSection) {
      setChecklistOverrides((prev) => ({ ...prev, sectionTitleOverrides: { ...prev.sectionTitleOverrides, [sectionId]: trimmed } }));
    } else {
      setChecklistOverrides((prev) => ({
        ...prev,
        customSections: prev.customSections.map((s) => (s.id === sectionId ? { ...s, title: trimmed } : s)),
      }));
    }
    notify(`Checklist section renamed — ${trimmed}.`);
  };

  const addChecklistSection = (title) => {
    if (!title.trim()) return;
    const existingIds = [...DEFAULT_SECTION_DEFS.map((s) => s.id), ...checklistOverrides.customSections.map((s) => s.id)];
    const id = makeUniqueId(slugify(title), existingIds);
    setChecklistOverrides((prev) => ({ ...prev, customSections: [...prev.customSections, { id, title: title.trim() }] }));
    notify(`Checklist section added — ${title.trim()}.`);
  };

  const deleteChecklistSection = (sectionId) => {
    const targetTitle = (checklistOverrides.customSections.find((s) => s.id === sectionId) || {}).title || "";
    let removedItemIds = [];
    setChecklistOverrides((prev) => {
      const nextCustomItems = { ...prev.customItems };
      removedItemIds = (nextCustomItems[sectionId] || []).map((i) => i.id);
      delete nextCustomItems[sectionId];
      return {
        ...prev,
        customSections: prev.customSections.filter((s) => s.id !== sectionId),
        customItems: nextCustomItems,
      };
    });
    setChecked((prev) => {
      if (removedItemIds.length === 0) return prev;
      const next = { ...prev };
      removedItemIds.forEach((id) => delete next[id]);
      return next;
    });
    if (activeTab === sectionId) setActiveTab("data");
    notify(`Checklist section deleted — ${targetTitle}.`);
  };

  const handleSaveClick = () => {
    if (mode === "trade" && !readyToTrade) {
      setIncompleteChecklistDialogOpen(true);
      return;
    }
    saveCheck();
  };

  const saveCheck = async () => {
    if (mode === "trade" && (!currentStrategy || !underlying.trim() || !legsComplete)) { playErrorBeep(); return; }
    setSaveStatus("saving");
    const nowTs = Date.now();
    const daysSnap = mode === "trade" && expiryDate ? daysUntil(expiryDate) : null;
    const sharedPnlId = mode === "trade" ? freshPnlId() : null;
    const entry = {
      ts: nowTs,
      dateLabel: fmtDateTimeDMY(nowTs),
      entryDate: localISODate(nowTs),
      mode,
      strategyType: mode === "trade" ? strategyType : null,
      underlying: mode === "trade" ? underlying : null,
      capital: mode === "trade" ? capNum : null,
      plannedLoss: mode === "trade" ? lossNum : null,
      pct: mode === "trade" ? pct : null,
      totalChecked: mode === "trade" ? totalChecked : null,
      totalApplicable: mode === "trade" ? totalApplicable : null,
      ready: mode === "trade" ? readyToTrade : null,
      expiryDate: mode === "trade" ? (expiryDate || null) : null,
      daysToExpirySnapshot: daysSnap,
      legs: mode === "trade" ? legs.filter((l) => l.name || l.strike || l.premium) : null,
      marketRead: marketVerdict.label,
      dataPointsFilled: Object.keys(dataReads).length,
      dataReadsSnapshot: { ...dataReads },
      notes,
      pnlId: sharedPnlId,
      entryMood: entryMood || null,
      entryMoodNote: entryMoodNote || "",
    };
    try {
      let pnlEntry = null;
      if (mode === "trade") {
        const { legsDesc, premiumDesc } = legsToParts(legs);
        const filledLegs = legs.filter((l) => l.name || l.strike || l.premium);
        pnlEntry = {
          id: sharedPnlId,
          entryDate: localISODate(nowTs),
          exitDate: "",
          underlying: underlying,
          strategyLabel: currentStrategy ? currentStrategy.label : "",
          legsSummary: legsDesc,
          premiumSummary: premiumDesc,
          legs: filledLegs,
          netPremium: computeNetPremiumSigned(filledLegs),
          expiryDate: expiryDate || "",
          overallPL: "",
          notes: notes,
          affectsCapital: true,
          screenshots: screenshots,
        };
        // The trade row must exist before the history row that references
        // it via pnl_id (a real foreign key) — insert order matters here in
        // a way it never did with the old blob-based storage.
        await dbTable.insert("trades", tradeJsToRow(pnlEntry, currentUserId));
      }
      await dbTable.insert("checklist_history", historyJsToRow(entry, currentUserId));
      setHistory((prev) => [entry, ...prev]);
      if (pnlEntry) {
        setPnlEntries((prev) => [pnlEntry, ...prev]);
        setSelectedMonthKey(monthKeyOf(pnlEntry.entryDate));
        resetTradeSetup();
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2200);
      notify(mode === "trade" ? `Trade check saved — ${underlying || "trade"}.` : "Market read saved.");
    } catch (err) { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const deleteEntry = async (ts) => {
    const target = history.find((h) => h.ts === ts);
    const next = history.filter((h) => h.ts !== ts);
    setHistory(next);
    setPendingDeleteTs(null);

    // Deleting a "Funds Added"/"Withdrawal" log entry also reverses the actual
    // fund transaction it represents, so capital and the log never drift apart.
    if (target && (target.mode === "funds_added" || target.mode === "funds_withdrawn") && target.fundTxId) {
      setFundTransactions((prev) => prev.filter((t) => t.id !== target.fundTxId));
      setCapitalBase((prev) => Math.max(0, prev + (target.mode === "funds_added" ? -target.amount : target.amount)));
      try { await dbTable.deleteById("fund_transactions", target.fundTxId); } catch (e) { /* best effort */ }
    }

    try { await dbTable.deleteWhere("checklist_history", "ts", ts); } catch (e) { /* best effort */ }
    notify(`Log entry deleted — ${target ? isoToShortDate(target.entryDate || localISODate(target.ts)) : ""}.`);
  };

  const confirmDeleteEntry = (ts) => {
    setDeletingHistoryTs(ts);
    setTimeout(() => { deleteEntry(ts); setDeletingHistoryTs(null); }, 320);
  };

  const addFundTransaction = async (type, amount, date, notes) => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    if (type === "withdrawal" && amt > capitalBase) return; // never let capital go negative
    const txId = "fundtx_" + Date.now();
    const tx = { id: txId, date, type, amount: amt };
    const newCapitalBase = capitalBase + (type === "deposit" ? amt : -amt);
    const capitalAfter = newCapitalBase + capitalAffectingPL - lifetimeChargesTotal;

    const logTs = Date.now();
    const logEntry = {
      ts: logTs,
      dateLabel: isoToWordDate(date) + ", " + fmtTimeOnly(logTs),
      entryDate: date,
      mode: type === "deposit" ? "funds_added" : "funds_withdrawn",
      fundTxId: txId,
      amount: amt,
      capitalAfter,
      notes: notes || "",
    };
    try {
      // The fund transaction row must exist before the history row that
      // references it via fund_tx_id (a real foreign key).
      await dbTable.insert("fund_transactions", fundTxJsToRow(tx, currentUserId));
      await dbTable.insert("checklist_history", historyJsToRow(logEntry, currentUserId));
      setFundTransactions((prev) => [tx, ...prev]);
      setCapitalBase(newCapitalBase);
      setHistory((prev) => [logEntry, ...prev]);
      notify(type === "deposit" ? `${fmtINR(amt)} added to capital.` : `${fmtINR(amt)} withdrawn from capital.`);
    } catch (e) {
      notify(`Couldn't save that ${type === "deposit" ? "deposit" : "withdrawal"} — please try again.`, "error");
    }
  };

  // Any log entry linked to a P&L row (via pnlId) — whether it's a full
  // checklist "trade" or a quick/past trade — gets its legs, exit date,
  // overall P/L, and net premium pulled LIVE from that row, so edits made
  // later in the P&L table always show up in the log and its exports. Notes
  // and checklist-specific fields (capital, planned loss, market read, etc.)
  // stay as their own original snapshot for full-checklist trades.
  const resolvePastTradeDisplay = (h) => {
    if (!h.pnlId) return h;
    const linked = pnlEntries.find((e) => e.id === h.pnlId);
    if (!linked) return h;
    if (h.mode === "past_trade") {
      return {
        ...h,
        underlying: linked.underlying || null,
        strategyLabel: linked.strategyLabel || null,
        notes: h.notes || linked.notes || "",
        expiryDate: linked.expiryDate || null,
        exitDate: linked.exitDate || null,
        legsSummary: linked.legsSummary || "",
        premiumSummary: linked.premiumSummary || "",
        overallPL: linked.overallPL || "",
        legs: linked.legs || [],
        netPremium: linked.netPremium,
        capital: totalCapital || null,
        exitMood: linked.exitMood || null,
        exitMoodNote: linked.exitMoodNote || null,
      };
    }
    return {
      ...h,
      legs: (linked.legs && linked.legs.length > 0) ? linked.legs : h.legs,
      netPremium: linked.netPremium,
      expiryDate: linked.expiryDate || h.expiryDate,
      exitDate: linked.exitDate || null,
      overallPL: linked.overallPL || "",
      exitMood: linked.exitMood || null,
      exitMoodNote: linked.exitMoodNote || null,
    };
  };

  const getEntryFilenameBase = (h, enriched) => {
    const dateStr = h.entryDate || localISODate(h.ts);
    const category = logCategoryName(h);
    if (category === "trade" && enriched.underlying) {
      return `trade_${enriched.underlying.toLowerCase()}_${dateStr}`;
    }
    return `${category}_log_${dateStr}`;
  };

  const openLogAsPdf = async (h) => {
    const enriched = resolvePastTradeDisplay(h);
    const filenameBase = getEntryFilenameBase(h, enriched);
    try {
      const doc = await buildLogDetailPDF(enriched, strategyLabelLookup);
      doc.save(`${filenameBase}.pdf`);
      notify(`Log entry downloaded — ${enriched.underlying ? enriched.underlying + ", " : ""}${isoToDMY(enriched.entryDate || localISODate(h.ts))}.`);
    } catch (err) {
      notify("Couldn't generate the PDF — please try again.", "error");
    }
  };

  const downloadLogEntryAsMarkdown = (h) => {
    const enriched = resolvePastTradeDisplay(h);
    const filenameBase = getEntryFilenameBase(h, enriched);
    const md = buildMarkdownFromHistory([enriched], h.dateLabel, strategyLabelLookup);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Log entry downloaded — ${enriched.underlying ? enriched.underlying + ", " : ""}${isoToDMY(enriched.entryDate || localISODate(h.ts))}.`);
  };

  const updatePnlEntry = useCallback((id, field, value) => {
    dirtyPnlIdsRef.current.add(id);
    setPnlEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const recordTradeChange = async (pnlId, changeDescriptor) => {
    const idx = history.findIndex((h) => h.pnlId === pnlId);
    if (idx === -1) return;
    const target = history[idx];
    const nowTs = Date.now();
    const changeEntry = { ts: nowTs, ...changeDescriptor };
    const nextChanges = [...(target.changes || []), changeEntry];
    setHistory((prev) => prev.map((h, i) => (i === idx ? { ...h, changes: nextChanges } : h)));
    try { await dbTable.updateWhere("checklist_history", "ts", target.ts, { changes: nextChanges }); } catch (e) { /* best effort */ }
  };

  // When a holiday lands on a Tuesday, any already-saved trade with a leg
  // expiring that day shifts back to the previous trading day (Monday) — the
  // same rule the expiry picker applies going forward. Each shifted leg is
  // tagged with which holiday caused it (holidayShift: {holidayId, from}), so
  // if that holiday is later edited to a different date or deleted entirely,
  // the shift can be reverted precisely — without touching a leg the user
  // deliberately set to Monday themselves for unrelated reasons.
  const applyHolidayReconciliation = async (holidayId, newDateISO) => {
    let mondayISO = null;
    if (newDateISO) {
      const [y, m, d] = newDateISO.split("-").map(Number);
      if (new Date(y, m - 1, d).getDay() === 2) {
        const monday = new Date(y, m - 1, d);
        monday.setDate(monday.getDate() - 1);
        mondayISO = localISODate(monday.getTime());
      }
    }

    let historyNext = history;
    const changedTrades = [];
    const changedHistoryEntries = [];

    const nextEntries = pnlEntries.map((entry) => {
      if (!entry.legs || entry.legs.length === 0) return entry;
      let legsChanged = false;
      const newLegs = entry.legs.map((leg) => {
        // This leg was previously auto-shifted by this exact holiday — undo
        // it (and re-shift immediately if the holiday's new date still lands
        // on this leg's original expiry).
        if (leg.holidayShift && leg.holidayShift.holidayId === holidayId) {
          legsChanged = true;
          const original = leg.holidayShift.from;
          const { holidayShift, ...rest } = leg;
          if (mondayISO && original === newDateISO) {
            return { ...rest, expiry: mondayISO, holidayShift: { holidayId, from: newDateISO } };
          }
          return { ...rest, expiry: original };
        }
        // This leg's expiry matches a newly added/moved holiday and isn't
        // already tracked — apply a fresh forward shift.
        if (mondayISO && leg.expiry === newDateISO && !leg.holidayShift) {
          legsChanged = true;
          return { ...leg, expiry: mondayISO, holidayShift: { holidayId, from: newDateISO } };
        }
        return leg;
      });
      if (!legsChanged) return entry;

      const { legsDesc, premiumDesc } = legsToParts(newLegs);
      const newExpiryDate = nearestLegExpiry(newLegs);
      const updatedEntry = { ...entry, legs: newLegs, legsSummary: legsDesc, premiumSummary: premiumDesc, expiryDate: newExpiryDate };
      changedTrades.push(updatedEntry);

      const idx = historyNext.findIndex((h) => h.pnlId === entry.id);
      if (idx !== -1) {
        if (historyNext === history) historyNext = [...history];
        const target = historyNext[idx];
        const changeEntry = {
          ts: Date.now(),
          type: "fields",
          changes: [{ field: "Leg expiry", from: "previous value", to: "updated — holiday calendar changed" }],
        };
        const updatedHistoryEntry = { ...target, changes: [...(target.changes || []), changeEntry] };
        historyNext[idx] = updatedHistoryEntry;
        changedHistoryEntries.push(updatedHistoryEntry);
      }

      return updatedEntry;
    });

    if (changedTrades.length > 0) {
      setPnlEntries(nextEntries);
      try { await dbTable.upsert("trades", changedTrades.map((e) => tradeJsToRow(e, currentUserId))); } catch (e) { /* best effort */ }
    }
    if (changedHistoryEntries.length > 0) {
      setHistory(historyNext);
      try {
        await dbTable.upsertOnConflict("checklist_history", changedHistoryEntries.map((h) => historyJsToRow(h, currentUserId)), "user_id,ts");
      } catch (e) { /* best effort */ }
    }
  };

  // Gathers every category of user data into one JSON file and triggers a
  // browser download — a backup, not a formatted report (that's what the
  // PDF/MD exports are for). Deliberately excludes profile, PIN, theme, and
  // holidays: those are configuration you set up fresh per install, not
  // data you'd need to recover.
  const downloadFullBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      pnlEntries,
      checklistHistory: history,
      fundTransactions,
      customStrategies,
      learningNotes,
      noteFolders,
      monthlyCharges,
      capitalBase,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `comet-backup-${localISODate(Date.now())}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("Backup downloaded.");
  };

  // Wipes whichever categories are selected in the checklist. Each
  // category is independent — theme, holidays, and the profile itself are
  // never touched here, since those are configuration, not user data.
  const clearSelectedData = async (scope) => {
    const jobs = [];
    if (scope.trading) {
      setPnlEntries([]);
      setHistory([]);
      setFundTransactions([]);
      setCapitalBase(0);
      setMonthlyCharges({});
      dirtyPnlIdsRef.current = new Set();
      jobs.push(
        dbTable.deleteAllForUser("trades"),
        dbTable.deleteAllForUser("checklist_history"),
        dbTable.deleteAllForUser("fund_transactions"),
        dbStorage.set("capital-base", JSON.stringify(0)),
        dbStorage.set("pnl-monthly-charges", JSON.stringify({})),
        deleteAllTradeStorageFilesForUser(),
      );
    }
    if (scope.strategies) {
      setCustomStrategies([]);
      jobs.push(dbStorage.set("custom-strategies", JSON.stringify([])));
    }
    if (scope.learnings) {
      setLearningNotes([]);
      setNoteFolders([]);
      try {
        localStorage.removeItem("tj-open-tabs");
        localStorage.removeItem("tj-active-tab");
        localStorage.removeItem("tj-recently-viewed");
      } catch {}
      jobs.push(dbTable.deleteAllForUser("notes"), dbTable.deleteAllForUser("note_folders"), deleteAllNoteStorageFilesForUser());
    }
    if (scope.reminders) {
      setReminders([]);
      setReminderSeverityOverrides({});
      setReminderHiddenSubcategories([]);
      setReminderCustomSubcategories([]);
      setReminderAlarmDismissed({});
      jobs.push(
        dbTable.deleteAllForUser("reminders"),
        dbStorage.set("reminder-severity-overrides", JSON.stringify({})),
        dbStorage.set("reminder-hidden-subcategories", JSON.stringify([])),
        dbStorage.set("reminder-custom-subcategories", JSON.stringify([])),
        dbStorage.set("reminder-alarm-dismissed", JSON.stringify({})),
      );
    }
    try {
      await Promise.all(jobs);
    } catch (e) { /* best effort */ }
    notify("Selected data cleared.");
  };

  const deleteMyAccount = async () => {
    try { await dbStorage.set("account-deletion-requested-at", JSON.stringify(Date.now())); } catch (e) { /* best effort */ }
    notify("Account scheduled for deletion in 7 days.");
    sessionStorage.removeItem("tj-pin-unlocked");
    await supabase.auth.signOut();
  };

  const appendHolidayLogEntry = async (message) => {
    try {
      const res = await dbStorage.getShared(SHARED_HOLIDAY_LOG_KEY);
      const existing = res && res.value ? JSON.parse(res.value) : [];
      const entry = { id: `hlog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, message, createdAt: Date.now() };
      const next = [entry, ...(Array.isArray(existing) ? existing : [])].slice(0, 30);
      await dbStorage.setShared(SHARED_HOLIDAY_LOG_KEY, JSON.stringify(next));
      // The admin already got a direct notify() call above for their own
      // edit — advance their own marker past it so the generic "notify me
      // about anything new in the shared log" check doesn't fire again for
      // the same change.
      await dbStorage.set("holiday-log-last-seen", JSON.stringify(entry.createdAt));
    } catch (err) {
      // The holiday change itself already succeeded — but if this part
      // fails silently, other users never learn about the change at all,
      // with nothing in the UI to explain why. Surface it visibly instead.
      console.error("Failed to log holiday change:", err);
      notify(`Holiday saved, but other users won't be notified — ${err?.message || "check console for details"}.`, "error");
    }
  };

  const saveHoliday = async (holiday, isEdit) => {
    if (!isAdminSession(session)) return;
    const next = isEdit ? holidays.map((h) => (h.id === holiday.id ? holiday : h)) : [holiday, ...holidays];
    try {
      await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to save holiday:", err);
      notify(`Couldn't save that holiday — ${err?.message || "check console for details"}.`, "error");
      return;
    }
    setHolidays(next);
    await applyHolidayReconciliation(holiday.id, holiday.date);
    const message = `${isEdit ? "Holiday updated" : "Holiday added"} — ${holiday.name}, ${isoToShortDate(holiday.date)}.`;
    notify(message);
    await appendHolidayLogEntry(message);
  };

  const deleteHoliday = async (id) => {
    if (!isAdminSession(session)) return;
    const target = holidays.find((h) => h.id === id);
    if (target && parseInt(target.date.slice(0, 4), 10) < new Date().getFullYear()) return; // archived — read-only
    const next = holidays.filter((h) => h.id !== id);
    try {
      await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to delete holiday:", err);
      notify(`Couldn't delete that holiday — ${err?.message || "check console for details"}.`, "error");
      return;
    }
    setHolidays(next);
    await applyHolidayReconciliation(id, null); // null date -> pure revert, no forward shift
    const message = `Holiday deleted — ${target ? target.name : ""}.`;
    notify(message);
    await appendHolidayLogEntry(message);
  };

  const saveProfile = (nextProfile) => {
    setUserProfile(nextProfile);
  };

  const deletePnlEntry = async (id, silent) => {
    const targetIndex = pnlEntries.findIndex((e) => e.id === id);
    const target = pnlEntries[targetIndex];
    setPnlEntries((prev) => prev.filter((e) => e.id !== id));
    setPnlPendingDeleteId(null);
    dirtyPnlIdsRef.current.delete(id); // no longer relevant if a pending edit hadn't saved yet

    // Also remove the Trade Log entry linked to this trade (regular trade
    // checklist saves and backfilled past trades both carry a matching
    // pnlId), so a deleted trade doesn't leave an orphaned log entry behind.
    const linkedIndex = history.findIndex((h) => h.pnlId === id);
    const linked = linkedIndex === -1 ? null : history[linkedIndex];
    if (linked) setHistory((prev) => prev.filter((h) => h.pnlId !== id));

    const performDelete = async () => {
      if (linked) { try { await dbTable.deleteWhere("checklist_history", "pnl_id", id); } catch (e) { /* best effort */ } }
      try { await dbTable.deleteById("trades", id); } catch (e) { /* best effort */ }
      if (target && target.screenshots) deleteTradeScreenshotFiles(target.screenshots);
    };

    if (silent) {
      // Abandoning a never-saved draft row — there's nothing real to undo,
      // and the row never existed in the DB to begin with, so delete
      // (of the in-memory row only) happens immediately, same as before.
      await performDelete();
      return;
    }

    const restoreLocal = () => {
      if (target) setPnlEntries((prev) => { const next = [...prev]; next.splice(Math.min(targetIndex, next.length), 0, target); return next; });
      if (linked) setHistory((prev) => { const next = [...prev]; next.splice(Math.min(linkedIndex, next.length), 0, linked); return next; });
    };
    deleteWithUndo({
      message: `Trade deleted — ${target && target.underlying ? target.underlying + ", " : ""}${target ? isoToShortDate(target.entryDate) : ""}.`,
      performDelete,
      restoreLocal,
    });
  };
  const confirmDeletePnlEntry = (id) => {
    setDeletingPnlId(id);
    setTimeout(() => { deletePnlEntry(id); setDeletingPnlId(null); }, 320);
  };
  const setMonthlyCharge = useCallback((monthKey, value) => setMonthlyCharges((prev) => ({ ...prev, [monthKey]: value })), []);
  const isNonBusinessDayISO = (iso, holidayList) => {
    if (!iso) return false;
    return isWeekendISO(iso) || (holidayList || []).some((h) => h.date === iso);
  };

  const openAddTradeDialog = () => {
    const today = localISODate(Date.now());
    // Don't default to today if today itself isn't a valid trade date (a
    // weekend or holiday) — silently prefilling an invalid date is exactly
    // how a Saturday could slip through if the user just clicks straight
    // through without noticing. Leave it blank instead, forcing a
    // conscious pick from the (already weekend/holiday-blocked) calendar.
    setAddTradeDate(isNonBusinessDayISO(today, holidays) ? "" : today);
    setAddTradeAffectsCapital(null);
    setAddTradeDialogClosing(false);
    setAddTradeDialogOpen(true);
  };

  const closeAddTradeDialog = () => {
    setAddTradeDialogClosing(true);
    setTimeout(() => {
      setAddTradeDialogOpen(false);
      setAddTradeDialogClosing(false);
      setAddTradeMoodStepTs(null);
      setAddTradeSelectedMood(null);
    }, 180);
  };

  const confirmAddTrade = async () => {
    if (!addTradeDate || isNonBusinessDayISO(addTradeDate, holidays)) return; // defensive guard — the button itself is disabled for this case
    const date = addTradeDate;
    const isPastDate = date < localISODate(Date.now());
    const sharedId = freshPnlId();
    const newEntry = {
      id: sharedId,
      entryDate: date,
      exitDate: "",
      underlying: "",
      strategyLabel: "",
      legsSummary: "",
      premiumSummary: "",
      expiryDate: "",
      overallPL: "",
      notes: "",
      affectsCapital: isPastDate ? addTradeAffectsCapital : true,
    };

    // Always log this trade so it shows up in the Trade Log, positioned by its
    // actual trade date. It's tagged internally the same way regardless of
    // date — the log list and exports decide whether to show it as "Past
    // Trade" or just "Trade" based on whether that date is actually in the
    // past, so a trade added for today correctly reads as "Trade", not "Past
    // Trade". Linked to the P&L row above via pnlId, so the log always
    // reflects whatever underlying/strategy/notes you later fill in on that row.
    const logTs = Date.now();
    const logEntry = {
      ts: logTs,
      dateLabel: isoToWordDate(date) + ", " + fmtTimeOnly(logTs),
      entryDate: date,
      mode: "past_trade",
      pnlId: sharedId,
      strategyType: null,
      underlying: null,
      capital: null,
      plannedLoss: null,
      pct: null,
      totalChecked: null,
      totalApplicable: null,
      ready: null,
      expiryDate: null,
      daysToExpirySnapshot: null,
      legs: null,
      marketRead: null,
      dataPointsFilled: 0,
      dataReadsSnapshot: {},
      notes: "",
    };
    try {
      // The trade row must exist before the history row that references it
      // via pnl_id (a real foreign key).
      await dbTable.insert("trades", tradeJsToRow(newEntry, currentUserId));
      await dbTable.insert("checklist_history", historyJsToRow(logEntry, currentUserId));
      setPnlEntries((prev) => [newEntry, ...prev]);
      setSelectedMonthKey(monthKeyOf(date));
      setNewTradeIdToEdit(sharedId);
      setHistory((prev) => [logEntry, ...prev]);
    } catch (e) {
      notify("Couldn't add that trade — please try again.", "error");
      return;
    }
    if (date === localISODate(Date.now())) {
      setAddTradeMoodStepTs(logTs);
    } else {
      closeAddTradeDialog();
    }
  };

  const saveAddTradeMood = async () => {
    const ts = addTradeMoodStepTs;
    const mood = addTradeSelectedMood;
    if (!ts || !mood) { closeAddTradeDialog(); return; }
    setHistory((prev) => prev.map((h) => (h.ts === ts ? { ...h, entryMood: mood } : h)));
    try { await dbTable.updateWhere("checklist_history", "ts", ts, { entry_mood: mood }); } catch (e) { /* best effort */ }
    closeAddTradeDialog();
  };
  const skipAddTradeMood = () => closeAddTradeDialog();

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const da = a.entryDate || localISODate(a.ts);
      const db = b.entryDate || localISODate(b.ts);
      if (da !== db) return da < db ? 1 : -1; // newest trade date first
      return (b.ts || 0) - (a.ts || 0); // same-day: most recently saved first
    });
  }, [history]);

  const passesMoodFilter = (h) => {
    if (!moodFilterPoint) return true;
    const displayH = h.pnlId ? resolvePastTradeDisplay(h) : h;
    const entryVal = h.entryMood || null;
    const exitVal = displayH.exitMood || null;
    const primaryVal = moodFilterPoint === "entry" ? entryVal : exitVal;
    const otherVal = moodFilterPoint === "entry" ? exitVal : entryVal;
    if (!moodFilterMood) return primaryVal !== null; // point picked, mood still "Any" — just require something tagged there
    if (primaryVal !== moodFilterMood) return false;
    if (moodFilterRefine === "same") return otherVal !== null && otherVal === primaryVal;
    if (moodFilterRefine === "changed") return otherVal !== null && otherVal !== primaryVal;
    return true;
  };

  const getFilteredHistory = () => {
    const byDate = (!rangeFrom && !rangeTo) ? sortedHistory : sortedHistory.filter((h) => {
      const d = h.entryDate || localISODate(h.ts);
      if (rangeFrom && d < rangeFrom) return false;
      if (rangeTo && d > rangeTo) return false;
      return true;
    });
    return byDate.filter(passesMoodFilter);
  };
  const filtered = getFilteredHistory();

  const openDownloadDialog = () => { setDownloadDialogClosing(false); setDownloadDialogOpen(true); };
  const closeDownloadDialog = () => {
    setDownloadDialogClosing(true);
    setTimeout(() => { setDownloadDialogOpen(false); setDownloadDialogClosing(false); }, 180);
  };
  const toggleDownloadType = useCallback((type) => setDownloadTypes((prev) => ({ ...prev, [type]: !prev[type] })), []);

  const filterEntriesByTypes = (entries, types) => entries.filter((h) => {
    if (h.mode === "no_trade") return types.observation;
    if (h.mode === "past_trade") return types.trade;
    if (h.mode === "funds_added") return types.funds_added;
    if (h.mode === "funds_withdrawn") return types.funds_withdrawn;
    return types.trade;
  });

  const getLogRangeLabel = () => {
    const isAllTime = !rangeFrom && !rangeTo;
    let rangeLabel, datePart;
    if (isAllTime) { rangeLabel = "All time"; datePart = "alltime"; }
    else if (rangeFrom && rangeTo && rangeFrom !== rangeTo) { rangeLabel = `${rangeFrom} to ${rangeTo}`; datePart = `${rangeFrom}_to_${rangeTo}`; }
    else { const single = rangeFrom || rangeTo; rangeLabel = single; datePart = single; }

    const typeKeys = Object.keys(downloadTypes);
    const selectedTypes = typeKeys.filter((k) => downloadTypes[k]);
    const allTypesSelected = selectedTypes.length === typeKeys.length;

    let base;
    if (isAllTime && allTypesSelected) {
      base = `all_logs_${localISODate(Date.now())}`;
    } else if (selectedTypes.length === 1) {
      const nameMap = { observation: "observation", trade: "trade", funds_added: "funds_added", funds_withdrawn: "withdrawal" };
      base = `${nameMap[selectedTypes[0]] || "logs"}_log_${datePart}`;
    } else {
      base = `logs_${datePart}`;
    }
    return { rangeLabel, base };
  };

  const getScopedDownloadEntries = () => filterEntriesByTypes(filtered, downloadTypes).map(resolvePastTradeDisplay);

  const confirmDownload = () => {
    const scoped = getScopedDownloadEntries();
    const { rangeLabel, base } = getLogRangeLabel();
    const md = buildMarkdownFromHistory(scoped, rangeLabel, strategyLabelLookup);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${base}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeDownloadDialog();
    notify(`Trade Log downloaded — ${rangeLabel}.`);
  };

  const confirmDownloadPdf = async () => {
    const scoped = getScopedDownloadEntries();
    const { rangeLabel, base } = getLogRangeLabel();
    try {
      const doc = await buildLogsDetailPDF(scoped, rangeLabel, strategyLabelLookup);
      doc.save(`${base}.pdf`);
      closeDownloadDialog();
      notify(`Trade Log downloaded — ${rangeLabel}.`);
    } catch (err) {
      notify("Couldn't generate the PDF — please try again.", "error");
    }
  };

  const getPnlExportScope = () => {
    if (pnlExportScope === "month") {
      return {
        scoped: pnlEntries.filter((e) => monthKeyOf(e.entryDate) === pnlExportMonth),
        scopeLabel: monthLabel(pnlExportMonth),
        base: `pnl-${pnlExportMonth}`,
      };
    }
    if (pnlExportScope === "year") {
      return {
        scoped: pnlEntries.filter((e) => (e.entryDate || "").slice(0, 4) === pnlExportYear),
        scopeLabel: pnlExportYear,
        base: `pnl-${pnlExportYear}`,
      };
    }
    if (pnlExportScope === "range") {
      const scoped = pnlEntries.filter((e) => {
        const d = e.entryDate || "";
        if (pnlExportRangeFrom && d < pnlExportRangeFrom) return false;
        if (pnlExportRangeTo && d > pnlExportRangeTo) return false;
        return true;
      });
      let scopeLabel, base;
      if (!pnlExportRangeFrom && !pnlExportRangeTo) { scopeLabel = "All time"; base = `pnl-all-${localISODate(Date.now())}`; }
      else if (pnlExportRangeFrom && pnlExportRangeTo && pnlExportRangeFrom !== pnlExportRangeTo) { scopeLabel = `${isoToShortDate(pnlExportRangeFrom)} to ${isoToShortDate(pnlExportRangeTo)}`; base = `pnl-${pnlExportRangeFrom}_to_${pnlExportRangeTo}`; }
      else { const single = pnlExportRangeFrom || pnlExportRangeTo; scopeLabel = isoToShortDate(single); base = `pnl-${single}`; }
      return { scoped, scopeLabel, base };
    }
    return { scoped: pnlEntries, scopeLabel: "All time", base: `pnl-all-${localISODate(Date.now())}` };
  };

  const downloadPnlMarkdown = (override) => {
    const { scoped, scopeLabel, base } = override || getPnlExportScope();
    const md = buildPnlMarkdown(scoped, scopeLabel, monthlyCharges, totalCapital);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${base}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`P&L report downloaded — ${override ? scopeLabel : (pnlExportScope === "range" ? "from " : "") + scopeLabel}.`);
  };

  const viewPnlAsPdf = async (override) => {
    const { scoped, scopeLabel, base } = override || getPnlExportScope();
    try {
      const doc = await buildPnlDetailPDF(scoped, scopeLabel, monthlyCharges, totalCapital);
      doc.save(`${base}.pdf`);
      notify(`P&L report downloaded — ${override ? scopeLabel : (pnlExportScope === "range" ? "from " : "") + scopeLabel}.`);
    } catch (err) {
      notify("Couldn't generate the PDF — please try again.", "error");
    }
  };

  // --- My Learnings: notes + resources + folders CRUD ---
  // addNote/updateNote intentionally do NOT toast on every call — the main
  // note pane autosaves on every edit (see NoteMainPane), and a toast per
  // keystroke-debounce would be noise. Call sites that represent a single
  // explicit user action (the Resource dialog's Save button, moving a
  // note to a folder) toast for themselves after awaiting these.
  const addNote = async (payload) => {
    const sortOrder = Date.now() / 1000;
    const note = { id: freshNoteId(), folderId: null, ...payload, sortOrder };
    await dbTable.insert("notes", noteJsToRow(note, currentUserId));
    const full = { ...note, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    setLearningNotes((prev) => [full, ...prev]);
    return full;
  };
  const updateNote = async (id, payload) => {
    const existing = learningNotes.find((n) => n.id === id);
    const updated = { ...existing, ...payload, id };
    await dbTable.upsert("notes", noteJsToRow(updated, currentUserId));
    setLearningNotes((prev) => prev.map((n) => (n.id === id ? { ...updated, updatedAt: new Date().toISOString() } : n)));
  };
  // Removes a note from local state immediately without showing any
  // notification of its own — the actual DB delete + storage cleanup is
  // returned as performDelete for the caller to schedule, and restoreLocal
  // to undo it. Used directly by bulkDelete, which needs to combine many
  // notes into a single "N notes deleted" undo toast rather than firing
  // one per note; deleteNote below is the single-item public wrapper.
  const removeNoteOptimistic = (id) => {
    const note = learningNotes.find((n) => n.id === id);
    setLearningNotes((prev) => prev.filter((n) => n.id !== id));
    return {
      note,
      performDelete: async () => {
        try {
          await dbTable.deleteById("notes", id);
          if (note) deleteNoteStorageFiles(note.content);
        } catch (err) { /* best effort */ }
      },
      restoreLocal: () => { if (note) setLearningNotes((prev) => [...prev, note]); },
    };
  };
  const deleteNote = async (id, message) => {
    const { note, performDelete, restoreLocal } = removeNoteOptimistic(id);
    deleteWithUndo({
      message: message || `"${note ? (note.title || "Untitled") : "Untitled"}" deleted.`,
      performDelete,
      restoreLocal,
    });
    return true;
  };
  // Combines several notes' worth of removeNoteOptimistic into exactly one
  // undo toast — used for bulk selection, where showing one toast per note
  // deleted would be noisy and where a single "undo" should restore all of
  // them together, not just the last one.
  const bulkDeleteNotes = (ids) => {
    const entries = ids.map((id) => removeNoteOptimistic(id)).filter((e) => e.note);
    if (entries.length === 0) return;
    const message = entries.length === 1
      ? `"${entries[0].note.title || "Untitled"}" deleted.`
      : `${entries.length} notes deleted.`;
    deleteWithUndo({
      message,
      performDelete: async () => { await Promise.all(entries.map((e) => e.performDelete())); },
      restoreLocal: () => { entries.forEach((e) => e.restoreLocal()); },
    });
  };

  // Effective severity for a subcategory — a per-user override if one has
  // been set via Edit Categories, otherwise the built-in default. Never
  // touches the taxonomy itself, just how it's colored for this user.
  const reminderSeverityFor = (subcategory) => reminderSeverityOverrides[subcategory] || reminderBuiltInSeverity(subcategory);

  const setReminderCategorySeverity = async (subcategory, severity) => {
    const next = { ...reminderSeverityOverrides, [subcategory]: severity };
    setReminderSeverityOverrides(next);
    try { await dbStorage.set("reminder-severity-overrides", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };

  // The taxonomy actually shown in the app: built-in groups with any
  // user-hidden items removed, plus the user's own custom additions
  // appended to their group (or a new group, if it doesn't exist yet).
  // Severity always resolves through reminderSeverityFor, so an override
  // applies whether the type is built-in or custom.
  const reminderEffectiveGroups = useMemo(() => {
    const hidden = new Set(reminderHiddenSubcategories);
    const base = [...REMINDER_EVENT_GROUPS, ...REMINDER_TRADE_GROUPS].map((g) => ({ group: g.group, items: g.items.filter(([name]) => !hidden.has(name)) }));
    reminderCustomSubcategories.forEach(({ group, name }) => {
      let target = base.find((g) => g.group === group);
      if (!target) { target = { group, items: [] }; base.push(target); }
      target.items.push([name, reminderSeverityFor(name)]);
    });
    return base.filter((g) => g.items.length > 0);
  }, [reminderHiddenSubcategories, reminderCustomSubcategories, reminderSeverityOverrides]);

  const hideReminderSubcategory = async (name) => {
    const next = [...reminderHiddenSubcategories, name];
    setReminderHiddenSubcategories(next);
    try { await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };
  const addCustomReminderSubcategory = async (group, name, severity) => {
    const next = [...reminderCustomSubcategories, { group, name, severity }];
    setReminderCustomSubcategories(next);
    try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
    if (severity) await setReminderCategorySeverity(name, severity);
  };
  const removeCustomReminderSubcategory = async (name) => {
    const next = reminderCustomSubcategories.filter((c) => c.name !== name);
    setReminderCustomSubcategories(next);
    try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };

  const setReminderListWindow = async (days) => {
    setReminderListWindowDays(days);
    try { await dbStorage.set("reminder-list-window-days", String(days)); } catch (err) { /* best effort */ }
  };

  // Renaming a built-in item or group has no dedicated data model — it's
  // implemented by hiding the original name(s) and re-adding under the new
  // name(s) with the same severity, reusing the hide/custom-add mechanisms
  // that already exist. A rename of a custom (already user-added) item just
  // updates its entry directly rather than hide+re-add, since there's
  // nothing built-in to hide.
  const renameReminderItem = async (group, oldName, newName) => {
    if (!newName.trim() || newName === oldName) return;
    const isCustom = reminderCustomSubcategories.some((c) => c.name === oldName);
    const severity = reminderSeverityFor(oldName);
    if (isCustom) {
      const nextCustom = reminderCustomSubcategories.map((c) => (c.name === oldName ? { ...c, name: newName } : c));
      setReminderCustomSubcategories(nextCustom);
      try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom)); } catch (err) { /* best effort */ }
    } else {
      const nextHidden = [...reminderHiddenSubcategories, oldName];
      const nextCustom = [...reminderCustomSubcategories, { group, name: newName, severity }];
      setReminderHiddenSubcategories(nextHidden);
      setReminderCustomSubcategories(nextCustom);
      try {
        await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(nextHidden));
        await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom));
      } catch (err) { /* best effort */ }
    }
    if (severity) await setReminderCategorySeverity(newName, severity);
  };

  const renameReminderGroup = async (oldGroup, newGroup, itemsInGroup) => {
    if (!newGroup.trim() || newGroup === oldGroup) return;
    const builtInNames = itemsInGroup.filter(([name]) => !reminderCustomSubcategories.some((c) => c.name === name)).map(([name]) => name);
    const nextHidden = [...reminderHiddenSubcategories, ...builtInNames];
    const nextCustom = [
      ...reminderCustomSubcategories.map((c) => (c.group === oldGroup ? { ...c, group: newGroup } : c)),
      ...itemsInGroup.filter(([name]) => builtInNames.includes(name)).map(([name, sev]) => ({ group: newGroup, name, severity: reminderSeverityFor(name) })),
    ];
    setReminderHiddenSubcategories(nextHidden);
    setReminderCustomSubcategories(nextCustom);
    try {
      await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(nextHidden));
      await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom));
    } catch (err) { /* best effort */ }
  };

  const addReminder = async (payload) => {
    const reminder = { id: freshReminderId(), leadDays: 0, ...payload };
    try {
      await dbTable.insert("reminders", reminderJsToRow(reminder, currentUserId));
      setReminders((prev) => [...prev, reminder]);
      notify(`Reminder added — ${reminder.title}.`);
      return reminder;
    } catch (err) {
      notify("Couldn't add the reminder — please try again.", "error");
      return null;
    }
  };
  const updateReminder = async (id, payload) => {
    const existing = reminders.find((r) => r.id === id);
    if (!existing) return;
    const updated = { ...existing, ...payload, id };
    try {
      await dbTable.upsert("reminders", reminderJsToRow(updated, currentUserId));
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      notify("Couldn't update the reminder — please try again.", "error");
    }
  };
  const deleteReminder = async (id) => {
    const targetIndex = reminders.findIndex((r) => r.id === id);
    const reminder = reminders[targetIndex];
    setReminders((prev) => prev.filter((r) => r.id !== id));
    deleteWithUndo({
      message: `Reminder deleted — ${reminder ? reminder.title : ""}.`,
      performDelete: async () => { try { await dbTable.deleteById("reminders", id); } catch (err) { /* best effort */ } },
      restoreLocal: () => { if (reminder) setReminders((prev) => { const next = [...prev]; next.splice(Math.min(targetIndex, next.length), 0, reminder); return next; }); },
    });
    return true;
  };

  const remindersWithDays = useMemo(() => {
    const todayIso = localISODate(Date.now());
    const [ty, tm, td] = todayIso.split("-").map(Number);
    const todayMs = new Date(ty, tm - 1, td).getTime();
    return reminders.map((r) => {
      if (!r.date) return { ...r, daysUntil: null };
      const [y, m, d] = r.date.split("-").map(Number);
      const daysUntil = Math.round((new Date(y, m - 1, d).getTime() - todayMs) / 86400000);
      return { ...r, daysUntil };
    }).sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
  }, [reminders]);

  // "Due" means today, or within its own lead time window (e.g. a reminder
  // set for 3 days before shows starting 3 days out and stays visible
  // through the day itself) — this is what the badge count and the
  // dashboard banner both key off.
  const dueReminders = useMemo(
    () => remindersWithDays.filter((r) => r.daysUntil !== null && r.daysUntil >= 0 && r.daysUntil <= (r.leadDays || 0)),
    [remindersWithDays]
  );

  // Periodic check: fires the alarm popup for any reminder whose exact
  // date+time has arrived and hasn't been dismissed for that specific
  // moment yet (rescheduling naturally clears an old dismissal, since the
  // new moment won't match what was recorded).
  useEffect(() => {
    if (!reminderAlarmDismissedLoaded) return; // avoid checking against a not-yet-loaded {} that would look like "nothing dismissed"
    const checkAlarms = () => {
      const now = Date.now();
      const due = remindersWithDays.filter((r) => {
        const epoch = reminderCombinedEpoch(r);
        if (epoch === null || epoch > now) return false;
        return reminderAlarmDismissed[r.id] !== epoch;
      });
      setDueAlarms(due);
    };
    checkAlarms();
    const interval = setInterval(checkAlarms, 20000);
    return () => clearInterval(interval);
  }, [remindersWithDays, reminderAlarmDismissed, reminderAlarmDismissedLoaded]);

  const persistAlarmDismissed = async (next) => {
    setReminderAlarmDismissed(next);
    try { await dbStorage.set("reminder-alarm-dismissed", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };
  const dismissAlarm = (reminder) => {
    const epoch = reminderCombinedEpoch(reminder);
    persistAlarmDismissed({ ...reminderAlarmDismissed, [reminder.id]: epoch });
  };
  const handleAlarmClose = (reminder) => dismissAlarm(reminder);
  const handleAlarmCloseAll = () => {
    const next = { ...reminderAlarmDismissed };
    dueAlarms.forEach((r) => { next[r.id] = reminderCombinedEpoch(r); });
    persistAlarmDismissed(next);
  };
  const handleAlarmSnoozeMinutes = async (reminder, mins) => {
    const target = new Date(Date.now() + mins * 60000);
    const newDate = localISODate(target.getTime());
    const h24 = target.getHours();
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const newTime = `${h12}:${String(target.getMinutes()).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
    await updateReminder(reminder.id, { date: newDate, time: newTime });
    dismissAlarm(reminder);
  };
  const handleAlarmSnoozeAllMinutes = (mins) => { dueAlarms.forEach((r) => handleAlarmSnoozeMinutes(r, mins)); };
  const handleAlarmSaveDateTime = async (reminder, date, time) => {
    await updateReminder(reminder.id, { date, time });
    dismissAlarm(reminder);
  };
  const handleAlarmSaveDateTimeAll = (date, time) => { dueAlarms.forEach((r) => handleAlarmSaveDateTime(r, date, time)); };

  const moveNoteToFolder = async (noteId, folderId) => {
    try {
      await updateNote(noteId, { folderId: folderId || null });
    } catch (err) { /* best effort */ }
  };
  // A folder's full descendant set (its subfolders, their subfolders, etc.)
  // — used to keep a folder from being moved into itself or into one of its
  // own children, which would otherwise create an unreachable cycle.
  const folderDescendantIds = (folderId) => {
    const ids = new Set();
    let grew = true;
    while (grew) {
      grew = false;
      noteFolders.forEach((f) => { if (f.parentId && (f.parentId === folderId || ids.has(f.parentId)) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
    }
    return ids;
  };
  const moveFolderToFolder = async (folderId, newParentId, newSortOrder) => {
    if (newParentId === folderId || folderDescendantIds(folderId).has(newParentId)) {
      return;
    }
    const existing = noteFolders.find((f) => f.id === folderId);
    if (!existing) return;
    const updated = { ...existing, parentId: newParentId || null, sortOrder: typeof newSortOrder === "number" ? newSortOrder : existing.sortOrder };
    setNoteFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
    try {
      await dbTable.upsert("note_folders", folderJsToRow(updated, currentUserId));
    } catch (err) {
      setNoteFolders((prev) => prev.map((f) => (f.id === folderId ? existing : f)));
    }
  };
  const duplicateNote = async (note) => {
    try {
      const copy = {
        title: note.title ? `${note.title} (copy)` : "",
        content: note.content || "",
        tags: note.tags || [],
        folderId: note.folderId || null,
        isResource: note.isResource || false,
        resourceUrl: note.resourceUrl || "",
        linkedTradeId: note.linkedTradeId || "",
        linkedUnderlying: note.linkedUnderlying || "",
        linkedStrategy: note.linkedStrategy || "",
        starred: note.starred || false,
      };
      const created = await addNote(copy);
      return created;
    } catch (err) {
      return null;
    }
  };
  const toggleNoteStarred = async (note) => {
    try {
      await updateNote(note.id, { starred: !note.starred });
    } catch (err) { /* best effort */ }
  };
  const noteLinkedTradeLabel = (note) => {
    if (!note.linkedTradeId) return null;
    const e = pnlEntries.find((x) => x.id === note.linkedTradeId);
    return e ? `${e.underlying || "—"} — ${e.strategyLabel || "Trade"} · ${fmtDateDMY(e.entryDate)}` : null;
  };
  const downloadNoteAsPdf = async (note) => {
    try {
      const doc = await buildNotePDF(note, noteLinkedTradeLabel(note));
      doc.save(`${slugify(note.title || "note")}.pdf`);
    } catch (err) { /* best effort */ }
  };

  // --- My Learnings: folders CRUD ---
  // Folders can be created (optionally nested) and renamed and deleted from
  // the UI. Reparenting an existing folder into a different parent isn't
  // exposed in this pass — only create-time nesting is — to keep the tree
  const addFolder = async (parentId = null) => {
    const folder = { id: freshFolderId(), name: "New Folder", parentId: parentId || null, sortOrder: Date.now() / 1000 };
    try {
      await dbTable.insert("note_folders", folderJsToRow(folder, currentUserId));
      const full = { ...folder, createdAt: new Date().toISOString() };
      setNoteFolders((prev) => [...prev, full]);
      return full;
    } catch (err) {
      return null;
    }
  };
  const renameFolder = async (id, name) => {
    const trimmed = (name || "").trim() || "Untitled Folder";
    const existing = noteFolders.find((f) => f.id === id);
    if (!existing) return;
    setNoteFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
    try {
      await dbTable.upsert("note_folders", folderJsToRow({ ...existing, name: trimmed }, currentUserId));
    } catch (err) { /* best effort */ }
  };
  const deleteFolder = async (id) => {
    const folder = noteFolders.find((f) => f.id === id);
    // Mirror the DB's own cascade locally: deleting a folder deletes its
    // subfolders too (a subfolder is meaningless without its parent),
    // but every note that was inside any of them is unfiled, never deleted.
    const toRemove = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      noteFolders.forEach((f) => { if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f.id)) { toRemove.add(f.id); grew = true; } });
    }
    const removedFolders = noteFolders.filter((f) => toRemove.has(f.id));
    const unfiledNotes = learningNotes.filter((n) => toRemove.has(n.folderId)).map((n) => ({ id: n.id, folderId: n.folderId }));

    setNoteFolders((prev) => prev.filter((f) => !toRemove.has(f.id)));
    setLearningNotes((prev) => prev.map((n) => (toRemove.has(n.folderId) ? { ...n, folderId: null } : n)));

    deleteWithUndo({
      message: `"${folder ? (folder.name || "Untitled Folder") : "Folder"}" deleted.`,
      performDelete: async () => {
        try { await Promise.all(removedFolders.map((f) => dbTable.deleteById("note_folders", f.id))); } catch (err) { /* best effort */ }
      },
      restoreLocal: () => {
        setNoteFolders((prev) => [...prev, ...removedFolders]);
        setLearningNotes((prev) => prev.map((n) => {
          const match = unfiledNotes.find((u) => u.id === n.id);
          return match ? { ...n, folderId: match.folderId } : n;
        }));
      },
    });
  };

  const setPresetToday = () => { const t = localISODate(Date.now()); setRangeFrom(t); setRangeTo(t); };
  const setPresetWeek = () => { const to = localISODate(Date.now()); const fd = new Date(); fd.setDate(fd.getDate() - 6); setRangeFrom(localISODate(fd.getTime())); setRangeTo(to); };
  const setPresetMonth = () => { const to = localISODate(Date.now()); const fd = new Date(); fd.setDate(fd.getDate() - 29); setRangeFrom(localISODate(fd.getTime())); setRangeTo(to); };
  const setPresetAll = () => { setRangeFrom(""); setRangeTo(""); };

  const activeRangePreset = useMemo(() => {
    const todayStr = localISODate(Date.now());
    if (rangeFrom === "" && rangeTo === "") return "all";
    if (rangeFrom === todayStr && rangeTo === todayStr) return "today";
    const wfd = new Date(); wfd.setDate(wfd.getDate() - 6);
    if (rangeFrom === localISODate(wfd.getTime()) && rangeTo === todayStr) return "week";
    const mfd = new Date(); mfd.setDate(mfd.getDate() - 29);
    if (rangeFrom === localISODate(mfd.getTime()) && rangeTo === todayStr) return "month";
    return null;
  }, [rangeFrom, rangeTo]);

  const statusColor = mode === "no_trade" ? "zinc" : readyToTrade ? "emerald" : missingCritical.length <= 2 ? "amber" : "rose";
  const statusColorMap = {
    emerald: { dot: "bg-emerald-400", glow: "bg-emerald-400", text: "text-emerald-600", ring: "ring-emerald-400/30", bar: "bg-emerald-400" },
    amber: { dot: "bg-amber-400", glow: "bg-amber-400", text: "text-amber-400", ring: "ring-amber-400/30", bar: "bg-amber-400" },
    rose: { dot: "bg-rose-400", glow: "bg-rose-400", text: "text-rose-600", ring: "ring-rose-400/30", bar: "bg-rose-400" },
    zinc: { dot: "bg-zinc-400", glow: "bg-zinc-400", text: "text-zinc-400", ring: "ring-zinc-600/30", bar: "bg-zinc-500" },
  };
  const sc = statusColorMap[statusColor];

  const baseTh = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const effectiveMode = colorMode || baseTh.defaultMode;
  const th = effectiveMode === baseTh.defaultMode ? baseTh : { ...baseTh, ...baseTh.alt };

  useEffect(() => {
    // html/body have no background of their own — only the inner .tj-app
    // div does. That's fine at rest, but during any animation that grows
    // the page's height (like expanding a collapsible section), the
    // browser can briefly show the page's true white default background
    // in the newly-expanding area before .tj-app's own background catches
    // up. Giving the real document background a matching color/gradient
    // removes that flash entirely, for any theme.
    document.body.style.background = th.bg;
    return () => { document.body.style.background = ""; };
  }, [th.bg]);

  const pageSize = 10;
  const totalHistoryPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(historyPage, totalHistoryPages);
  const pagedHistory = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  // Every one of these previously only gated a save-effect (preventing a
  // premature write before the real data arrived) with no visual feedback
  // at all — meaning the app would briefly flash defaults (₹0 capital,
  // sections snapping from collapsed to expanded, a blank profile name)
  // on every load before quietly correcting itself a moment later.
  const appDataReady = themeReady && !checklistOverridesLoading && !historyLoading && !pnlLoading &&
    !monthlyChargesLoading && !capitalBaseLoading && !fundTransactionsLoading &&
    !holidaysLoading && !profileLoading && !homePrefsLoading && !notesLoading && !foldersLoading;

  const tradeLogSection = (
          <div key="log" className="tj-fade space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-200" style={FONT_DISPLAY}>Trade Log</p>
              <button onClick={() => setTopTab("pnl")} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                <IconArrowLeft size={13} /> Back to Trade History
              </button>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Download Logs</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => { setPresetToday(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "today" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Today</button>
                <button onClick={() => { setPresetWeek(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "week" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Last 7 days</button>
                <button onClick={() => { setPresetMonth(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "month" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Last 30 days</button>
                <button onClick={() => setLogRangeCustomOpen(true)} className={`text-xs px-2.5 py-1 rounded-full border ${logRangeCustomOpen ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Select Dates</button>
                <button onClick={() => { setPresetAll(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "all" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>All time</button>
              </div>
              {logRangeCustomOpen && (
                <div className="flex flex-wrap items-end gap-2.5">
                  <label className="text-xs text-zinc-500">From
                    <div className="mt-1"><CalendarPicker value={rangeFrom} onChange={setRangeFrom} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
                  </label>
                  <label className="text-xs text-zinc-500">To
                    <div className="mt-1"><CalendarPicker value={rangeTo} onChange={setRangeTo} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
                  </label>
                </div>
              )}
              <button onClick={openDownloadDialog} disabled={filtered.length === 0} className="flex items-center gap-1.5 text-xs tj-primary-bg disabled:opacity-40 font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
                <IconDownload size={12} /> Download
              </button>
              <p className="text-xs text-zinc-600">{filtered.length} {filtered.length === 1 ? "entry" : "entries"} in range</p>

              <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap gap-2">
                <DropdownFilterButton
                  label="Mindset" active={!!moodFilterPoint}
                  displayValue={moodFilterPoint ? (moodFilterPoint === "entry" ? "Entry" : "Exit") : "All"}
                  options={[
                    { id: "all", label: "All", selected: !moodFilterPoint },
                    { id: "entry", label: "Entry", selected: moodFilterPoint === "entry" },
                    { id: "exit", label: "Exit", selected: moodFilterPoint === "exit" },
                  ]}
                  onSelect={(id) => {
                    setMoodFilterPoint(id === "all" ? null : id);
                    setMoodFilterMood(null);
                    setMoodFilterRefine(null);
                  }}
                />
                <DropdownFilterButton
                  label="Mood" active={!!moodFilterMood} disabled={!moodFilterPoint}
                  displayValue={moodFilterMood ? <span className="flex items-center gap-1"><MoodEmoji id={moodFilterMood} size={14} /> {moodMeta(moodFilterMood).label}</span> : "Any"}
                  options={[
                    { id: "any", label: "Any", selected: !moodFilterMood },
                    ...MOOD_OPTIONS.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji, selected: moodFilterMood === m.id })),
                  ]}
                  onSelect={(id) => { setMoodFilterMood(id === "any" ? null : id); setMoodFilterRefine(null); }}
                />
                <DropdownFilterButton
                  label="Compare" active={!!moodFilterRefine} disabled={!moodFilterPoint || !moodFilterMood}
                  displayValue={moodFilterRefine === "same" ? "Same Mood" : moodFilterRefine === "changed" ? "Mood Changed" : "Any"}
                  options={[
                    { id: "any", label: "Any", selected: !moodFilterRefine },
                    { id: "same", label: "Same Mood (Entry = Exit)", selected: moodFilterRefine === "same" },
                    { id: "changed", label: "Mood Changed (Entry ≠ Exit)", selected: moodFilterRefine === "changed" },
                  ]}
                  onSelect={(id) => setMoodFilterRefine(id === "any" ? null : id)}
                />
                {(moodFilterPoint || moodFilterMood || moodFilterRefine) && (
                  <button
                    type="button"
                    onClick={() => { setMoodFilterPoint(null); setMoodFilterMood(null); setMoodFilterRefine(null); }}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 transition-colors"
                  >
                    <IconX size={12} /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {historyLoading ? (
              <p className="text-xs text-zinc-500">Loading log...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-zinc-500">No trades logged yet. Complete a check and save it to start the log.</p>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
                {pagedHistory.map((h) => {
                  const displayH = h.pnlId ? resolvePastTradeDisplay(h) : h;
                  return (
                  <div key={h.ts} className={`flex items-center justify-between gap-3 py-2.5 border-b border-zinc-800/70 last:border-0 ${deletingHistoryTs === h.ts ? "tj-row-exit" : "tj-row-enter"}`}>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate">
                        {h.mode === "no_trade" ? "No-Trade Day" : h.mode === "past_trade" ? pastTradeTitle(displayH) : h.mode === "funds_added" ? `Funds Added${h.amount ? " — " + fmtINR(h.amount) : ""}` : h.mode === "funds_withdrawn" ? `Withdrawal${h.amount ? " — " + fmtINR(h.amount) : ""}` : `${h.underlying ? h.underlying + " — " : ""}${strategyLabelLookup(h.strategyType)}`}
                      </p>
                      <p className="text-xs text-zinc-600" style={FONT_MONO}>{h.dateLabel}{h.marketRead ? ` · ${h.marketRead}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {(h.entryMood || displayH.exitMood) && (
                        <Tooltip text={`${h.entryMood ? "Entry: " + moodMeta(h.entryMood).label : ""}${h.entryMood && displayH.exitMood ? " · " : ""}${displayH.exitMood ? "Exit: " + moodMeta(displayH.exitMood).label : ""}`}>
                          <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-full flex-shrink-0">
                            {h.entryMood && <MoodEmoji id={h.entryMood} size={16} />}
                            {h.entryMood && displayH.exitMood && <span className="text-zinc-600 text-[10px]">→</span>}
                            {displayH.exitMood && <MoodEmoji id={displayH.exitMood} size={16} />}
                          </span>
                        </Tooltip>
                      )}
                      {h.mode === "no_trade" || h.mode === "funds_added" || h.mode === "funds_withdrawn" || h.mode === "past_trade" || h.ready ? (
                        <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${h.mode === "no_trade" ? "text-zinc-300 bg-zinc-700/30" : h.mode === "funds_added" ? "text-emerald-600 bg-emerald-400/10" : h.mode === "funds_withdrawn" ? "text-rose-600 bg-rose-400/10" : "text-emerald-600 bg-emerald-400/10"}`} style={FONT_MONO}>
                          {h.mode === "no_trade" ? "Observation" : h.mode === "funds_added" ? "Funds Added" : h.mode === "funds_withdrawn" ? "Withdrawal" : "Trade"}
                        </span>
                      ) : null}
                      <Tooltip text="Download">
                        <button onClick={() => setEntryDownloadFor(h)} className="text-zinc-600 hover:tj-primary-text flex-shrink-0 hover:scale-110 transition-transform">
                          <IconDownload size={14} />
                        </button>
                      </Tooltip>
                      {pendingDeleteTs === h.ts ? (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => confirmDeleteEntry(h.ts)} disabled={deletingHistoryTs === h.ts} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 disabled:opacity-50 px-2 py-1 rounded">Confirm</button>
                          <button onClick={() => setPendingDeleteTs(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                        </span>
                      ) : (
                        <Tooltip text="Delete entry">
                          <button onClick={() => setPendingDeleteTs(h.ts)} className="text-zinc-600 hover:text-rose-600 flex-shrink-0">
                            <IconTrash size={14} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  );
                })}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={clampedPage <= 1} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 px-2 py-1">
                      <IconChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-xs text-zinc-500" style={FONT_MONO}>Page {clampedPage} of {totalHistoryPages}</span>
                    <button onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))} disabled={clampedPage >= totalHistoryPages} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 px-2 py-1">
                      Next <IconChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
  );

  return (
    <div
      className={`tj-app min-h-screen tj-theme-${th.id} tj-mode-${effectiveMode}`}
      style={{
        "--tj-primary": th.primary,
        "--tj-primary-contrast": th.primaryContrast,
        "--tj-secondary": th.secondary,
        "--tj-accent": th.accent,
        "--tj-bg": th.bg,
        "--tj-panel": th.panel,
        "--tj-panel2": th.panel2,
        "--tj-panel-solid": th.panelSolid || th.panel2,
        "--tj-border": th.border,
        "--tj-border-soft": th.borderSoft,
        "--tj-text1": th.text1,
        "--tj-text2": th.text2,
        "--tj-text3": th.text3,
        "--tj-text4": th.text4,
        "--tj-text5": th.text5,
        "--tj-radius-sm": th.radiusSm,
        "--tj-radius-md": th.radiusMd,
        "--tj-radius-lg": th.radiusLg,
        "--tj-shadow": th.shadow,
        "--tj-dur": th.transDur,
        "--tj-ease": th.transEase,
        "--tj-font-display": th.fontDisplay,
        "--tj-font-body": th.fontBody,
        "--tj-blur": th.blur,
        background: th.bg,
        color: th.text1,
        fontFamily: th.fontBody,
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <style>{themeGlobalCss(th)}</style>
      {th.id === "crt" && <div className="tj-app-bg-overlay"></div>}
      <style>{THEME_PRIMARY_CSS}</style>
      {!appDataReady ? (
        <AppLoadingScreen />
      ) : (
        <>
      <ToastStack />
      <div
        ref={navRef}
        className="tj-navbar sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 relative transition-transform duration-300 ease-out"
        style={{ willChange: "transform", transform: navHidden ? "translateY(-100%)" : "translateY(0)" }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3.5">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button onClick={() => setTopTab("home")} className="tj-logo-btn flex items-center flex-shrink-0" aria-label="Comet Trading Journal — Dashboard">
              <img src={logo} alt="Comet Trading Journal" className="h-12 w-auto transition-transform duration-150" />
            </button>

            <div className="flex items-center justify-center overflow-x-auto no-scrollbar py-3 -my-1.5 min-w-0">
              {[
                { id: "home", label: "Dashboard", icon: IconLayoutDashboard },
                { id: "checklist", label: "Checklist", icon: IconChecklist },
                { id: "setup", label: "Trade Setup", icon: IconAdjustmentsHorizontal, animated: true },
                { id: "pnl", label: "Trade History", icon: IconCurrencyRupee },
                { id: "learn", label: "My Learnings", icon: IconBulb, last: true },
              ].map((t) => {
                const visible = t.id !== "setup" || mode === "trade";
                const tabButton = (
                  <button
                    key={t.id}
                    onClick={() => setTopTab(t.id)}
                    className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap ${
                      topTab === t.id ? "tj-primary-bg" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    <t.icon size={15} className="flex-shrink-0" />
                    <span className="hidden md:inline">{t.label}</span>
                  </button>
                );
                if (!t.animated) return <div key={t.id} className={`flex-shrink-0 ${t.last ? "" : "mr-2"}`}>{tabButton}</div>;
                return (
                  <div
                    key={t.id}
                    className="flex-shrink-0"
                    style={{
                      transition: "max-width 750ms ease-out, opacity 750ms ease-out, transform 750ms ease-out, margin-right 750ms ease-out",
                      maxWidth: visible ? "220px" : "0px",
                      marginRight: visible ? "8px" : "0px",
                      opacity: visible ? 1 : 0,
                      transform: visible ? "scale(1)" : "scale(0.6)",
                      overflow: visible ? "visible" : "hidden",
                    }}
                  >
                    {tabButton}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {baseTh.alt && (
                <Tooltip text={effectiveMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                  <button
                    onClick={() => setColorMode(effectiveMode === "dark" ? "light" : "dark")}
                    className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center tj-primary-text hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
                  >
                    {effectiveMode === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}
                  </button>
                </Tooltip>
              )}
              <NotificationBell />
              <Tooltip text="Profile">
                <button
                  ref={avatarBtnRef}
                  onClick={() => {
                    if (!avatarMenuOpen && avatarBtnRef.current) {
                      const rect = avatarBtnRef.current.getBoundingClientRect();
                      setAvatarMenuCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
                    setAvatarMenuOpen((v) => !v);
                  }}
                  className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 overflow-hidden flex items-center justify-center flex-shrink-0 hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
                >
                  {userProfile.avatarType === "custom" && userProfile.avatarValue ? (
                    <img src={userProfile.avatarValue} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarSVG preset={DEFAULT_AVATAR} size={32} animate={false} />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>

          {avatarMenuOpen && avatarMenuCoords && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setAvatarMenuOpen(false)} />
              <div
                className="tj-popover fixed z-[9999] w-56 rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-2 space-y-1"
                style={{ top: avatarMenuCoords.top, right: avatarMenuCoords.right }}
              >
                <button
                  onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" ? previousTopTab : topTab); setTopTab("profile"); setAvatarMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconSettings size={15} className="text-zinc-500 flex-shrink-0" /> Settings
                </button>
                <button
                  onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" ? previousTopTab : topTab); setTopTab("holidays"); setAvatarMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconFlag size={15} className="text-zinc-500 flex-shrink-0" /> Holiday Calendar
                </button>
                <button
                  onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" || topTab === "docs" ? previousTopTab : topTab); setTopTab("docs"); setAvatarMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconBook size={15} className="text-zinc-500 flex-shrink-0" /> Docs
                </button>
                <div className="h-px bg-zinc-800 my-1"></div>
                <button
                  onClick={() => { setAvatarMenuOpen(false); sessionStorage.removeItem("tj-pin-unlocked"); supabase.auth.signOut(); }}
                  className="w-full flex items-center gap-2.5 text-sm text-rose-400 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconLock size={15} className="flex-shrink-0" /> Sign Out
                </button>
              </div>
            </>,
            getPortalTarget()
          )}
        </div>
      </div>

      {topTab !== "learn" && (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 space-y-7">
        {deletionCancelledNotice && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3">
            <p className="text-sm text-emerald-500">Welcome back — your account deletion request has been cancelled. Your data is safe.</p>
            <button onClick={onDismissDeletionNotice} className="text-emerald-600 hover:text-emerald-400 flex-shrink-0">
              <IconX size={16} />
            </button>
          </div>
        )}
        {(topTab === "profile" || topTab === "holidays" || topTab === "reminders" || topTab === "docs") && (
          <button
            onClick={() => setTopTab(previousTopTab)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <IconChevronLeft size={16} /> Back
          </button>
        )}

        {topTab === "home" && (
          <div key="home" className="tj-fade">
            <HomePage
              userProfile={userProfile} totalCapital={totalCapital} pnlEntries={pnlEntries} history={history}
              journeyOpen={journeyOpen} setJourneyOpen={setJourneyOpen} deepDiveOpen={deepDiveOpen} setDeepDiveOpen={setDeepDiveOpen}
              dueReminders={dueReminders} onOpenReminders={() => { setPreviousTopTab(topTab); setTopTab("reminders"); }}
            />
          </div>
        )}

        {topTab === "reminders" && (
          <div key="reminders" className="tj-fade">
            <RemindersPage
              remindersWithDays={remindersWithDays}
              onDeleteReminder={deleteReminder}
              onAddClick={() => { setReminderPrefill(null); setTopTab("addReminder"); }}
              onSettingsClick={() => setTopTab("reminderSettings")}
              pnlEntries={pnlEntries}
              holidays={holidays}
              onOpenTrade={openTradeFromReminder}
              onCreateAt={createReminderAt}
              windowDays={reminderListWindowDays}
              onEdit={(reminder) => { setReschedulingReminder(reminder); setTopTab("rescheduleReminder"); }}
            />
          </div>
        )}

        {topTab === "addReminder" && (
          <div key="addReminder" className="tj-fade">
            <AddReminderPage
              onBack={() => { setReminderPrefill(null); setTopTab("reminders"); }}
              onSave={async (payload) => { const r = await addReminder(payload); if (r) { setReminderPrefill(null); setTopTab("reminders"); } }}
              effectiveGroups={reminderEffectiveGroups}
              reminderSeverityFor={reminderSeverityFor}
              prefill={reminderPrefill}
            />
          </div>
        )}

        {topTab === "rescheduleReminder" && reschedulingReminder && (
          <div key="rescheduleReminder" className="tj-fade">
            <RescheduleReminderPage
              reminder={reschedulingReminder}
              onBack={() => { setReschedulingReminder(null); setTopTab("reminders"); }}
              onSave={async (id, payload) => { await updateReminder(id, payload); notify(`Reminder rescheduled — ${reschedulingReminder.title}.`); setReschedulingReminder(null); setTopTab("reminders"); }}
            />
          </div>
        )}

        {topTab === "reminderSettings" && (
          <div key="reminderSettings" className="tj-fade">
            <RemindersSettingsPage
              onBack={() => setTopTab("reminders")}
              onEditWindowClick={() => setTopTab("reminderWindowSettings")}
              onEditCategoriesClick={() => setTopTab("editCategories")}
            />
          </div>
        )}

        {topTab === "reminderWindowSettings" && (
          <div key="reminderWindowSettings" className="tj-fade">
            <ReminderWindowSettingsPage
              onBack={() => setTopTab("reminderSettings")}
              windowDays={reminderListWindowDays}
              onChangeWindow={setReminderListWindow}
            />
          </div>
        )}

        {topTab === "editCategories" && (
          <div key="editCategories" className="tj-fade">
            <EditCategoriesPage
              onBack={() => setTopTab("reminderSettings")}
              effectiveGroups={reminderEffectiveGroups}
              reminderSeverityFor={reminderSeverityFor}
              onChangeSeverity={setReminderCategorySeverity}
              onHide={hideReminderSubcategory}
              customNames={reminderCustomSubcategories.map((c) => c.name)}
              onRemoveCustom={removeCustomReminderSubcategory}
              onAddCustom={addCustomReminderSubcategory}
              onRenameItem={renameReminderItem}
              onRenameGroup={renameReminderGroup}
            />
          </div>
        )}

        {topTab === "profile" && (
          <div key="profile" className="tj-fade">
            <SettingsPage
              profile={userProfile} onSaveProfile={saveProfile} onClearData={clearSelectedData} onDownloadBackup={downloadFullBackup} hasCustomStrategies={customStrategies.length > 0} themeId={themeId} onSaveTheme={setThemeId}
              pinRecord={pinRecord} onPinChanged={onPinChanged} onDeleteAccount={deleteMyAccount}
              securityQuestions={securityQuestions} onSecurityQuestionsChanged={onSecurityQuestionsChanged}
            />
          </div>
        )}

        {topTab === "holidays" && (
          <div key="holidays" className="tj-fade">
            <HolidayCalendarPage holidays={holidays} onSave={saveHoliday} onDelete={deleteHoliday} isAdmin={isAdminSession(session)} />
          </div>
        )}

        {topTab === "docs" && (
          <div key="docs" className="tj-fade">
            <DocsPage />
          </div>
        )}

        {topTab === "setup" && mode === "trade" && (
          <div key="setup" className="tj-fade space-y-7">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Strategy</p>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {STRATEGY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setStrategyCategory(cat.id);
                      const opts = allStrategies.filter((s) => (s.category || "other") === cat.id);
                      if (opts.length > 0 && !opts.some((s) => s.id === strategyType)) setStrategyType(opts[0].id);
                    }}
                    className={`text-xs px-3.5 py-1.5 rounded-full border ${strategyCategory === cat.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="" disabled>{strategyCategory ? "Select a strategy" : "Pick an outlook above first"}</option>
                {strategiesInCategory.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={() => setShowAddStrategy(true)} className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
                  <IconPlus size={13} /> Add your own strategy
                </button>
                {customStrategies.length > 0 && (
                  <button onClick={() => setShowManageStrategies((v) => !v)} className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 tj-primary-text font-semibold rounded-lg px-2.5 py-1 hover:scale-105 active:scale-95 transition-transform">
                    <IconSettings2 size={13} /> Manage your strategies
                  </button>
                )}
              </div>

              {showAddStrategy && (
                <CustomStrategyDialog
                  initial={{ category: strategyCategory }}
                  isEdit={false}
                  onSave={addCustomStrategy}
                  onClose={() => setShowAddStrategy(false)}
                />
              )}

              {showManageStrategies && customStrategies.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-zinc-500">Your custom strategies</p>
                  {customStrategies.map((s) => (
                    <div key={s.id}>
                      {editingStratId === s.id && (
                        <CustomStrategyDialog
                          initial={{ label: s.label, category: s.category || "other", profile: s.profile, legTemplate: s.legTemplate }}
                          isEdit={true}
                          onSave={(values) => { editCustomStrategy(s.id, values); setEditingStratId(null); }}
                          onClose={() => setEditingStratId(null)}
                        />
                      )}
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-200 truncate">{s.label}</p>
                          <p className="text-[10px] text-zinc-600">{(STRATEGY_CATEGORIES.find((c) => c.id === (s.category || "other")) || {}).label || "Other"}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Tooltip text="Edit">
                            <button onClick={() => setEditingStratId(s.id)} className="text-zinc-500 hover:text-zinc-200">
                              <IconPencil size={13} />
                            </button>
                          </Tooltip>
                          {pendingDeleteStratId === s.id ? (
                            <span className="flex items-center gap-1">
                              <button onClick={() => { deleteCustomStrategy(s.id); setPendingDeleteStratId(null); }} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 px-2 py-1 rounded">Confirm</button>
                              <button onClick={() => setPendingDeleteStratId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                            </span>
                          ) : (
                            <Tooltip text="Delete">
                              <button onClick={() => setPendingDeleteStratId(s.id)} className="text-zinc-500 hover:text-rose-600">
                                <IconTrash size={13} />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <LegsCard underlying={underlying} onUnderlyingChange={setUnderlying} legs={legs} onAdd={addLeg} onRemove={removeLeg} onUpdate={updateLeg} netPremium={netPremium} payoffInfo={payoffInfo} holidays={holidays} />

            <DaysToExpiryWidget profile={profile} strategyLabel={currentStrategy ? currentStrategy.label : "your strategy"} legs={legs} underlying={underlying} />

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2" style={FONT_MONO}>
                  <IconCalculator size={13} /> Risk Calculator
                </p>
                {editingTargetRisk ? (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="text" inputMode="decimal" value={targetRiskDraft} autoFocus
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          const num = parseFloat(raw);
                          if (raw === "") { setTargetRiskDraft(""); return; }
                          setTargetRiskDraft(!Number.isNaN(num) && num > 20 ? "20" : raw);
                        }}
                        placeholder="e.g. 2"
                        className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-5 py-1 text-xs text-zinc-100 placeholder-zinc-600 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                        style={FONT_MONO}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500" style={FONT_MONO}>%</span>
                    </div>
                    <button
                      onClick={() => { const v = parseFloat(targetRiskDraft); if (v > 0) saveTargetRiskPct(v); setEditingTargetRisk(false); }}
                      disabled={!(parseFloat(targetRiskDraft) > 0)}
                      className="text-xs px-2.5 py-1 rounded-full tj-primary-bg disabled:opacity-40 font-semibold"
                    >
                      Save
                    </button>
                    <Tooltip text="Cancel">
                      <button onClick={() => setEditingTargetRisk(false)} className="text-zinc-500 hover:text-zinc-300"><IconX size={14} /></button>
                    </Tooltip>
                  </div>
                ) : (
                  <Tooltip text="Set your target risk percentage">
                    <button
                      onClick={() => { setTargetRiskDraft(String(targetRiskPct)); setEditingTargetRisk(true); }}
                      className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-300 px-2.5 py-1 rounded-full transition-colors"
                    >
                      <IconTarget size={11} /> Target: {targetRiskPct}%
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 items-stretch">
                <label className="flex flex-col">
                  <span className="text-xs text-zinc-500">Total capital (₹) <span className="text-zinc-600">— defaults from P/L statement, editable here for a separate amount</span></span>
                  <input type="text" inputMode="numeric" placeholder="e.g. 300000" value={capital} onChange={(e) => setCapital(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="mt-auto pt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" style={FONT_MONO} />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-zinc-500">Planned max loss (₹)</span>
                  <input type="text" inputMode="numeric" placeholder="e.g. 6800" value={plannedLoss} onChange={(e) => setPlannedLoss(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="mt-auto pt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" style={FONT_MONO} />
                </label>
              </div>
              <div className="mt-3.5 flex items-center justify-between flex-wrap gap-2">
                <span className={`text-sm font-semibold ${pctColor}`} style={FONT_MONO}>
                  {pct === null ? "—" : `${pct.toFixed(2)}%`} <span className="font-normal text-zinc-500">of capital</span>
                </span>
                <span className={`text-xs ${pctColor}`}>{pctVerdict}</span>
              </div>
              <div className="mt-3.5 pt-3.5 border-t border-zinc-800 space-y-2">
                <p className="text-xs text-zinc-500">Set planned max loss as % of capital</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => applyRiskPct(1)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 1 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>1% · {fmtINR(capNum * 0.01)}</button>
                  <button onClick={() => applyRiskPct(2)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 2 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>2% · {fmtINR(capNum * 0.02)}</button>
                  <button onClick={() => applyRiskPct(3)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 3 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>3% · {fmtINR(capNum * 0.03)}</button>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="text" inputMode="decimal" value={customRiskPct}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          const num = parseFloat(raw);
                          if (raw === "") { setCustomRiskPct(""); return; }
                          setCustomRiskPct(!Number.isNaN(num) && num > 20 ? "20" : raw);
                        }}
                        placeholder="e.g. 1.5"
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                        style={FONT_MONO}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500" style={FONT_MONO}>%</span>
                    </div>
                    <button
                      onClick={() => applyRiskPct(parseFloat(customRiskPct) || 0)}
                      disabled={!capNum || !customRiskPct}
                      className="text-xs px-3 py-1.5 rounded-full tj-primary-bg disabled:opacity-40 font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-600">Max 20%.</p>
              </div>
            </div>
          </div>
        )}

        {topTab === "checklist" && (
          <div key="checklist" className="tj-fade space-y-7">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>
                {checklistManagerOpen ? "Manage Checklist" : "Pre-Trade Checklist"}
              </p>
              {!checklistManagerOpen && (
                <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-full p-1 text-sm">
                  <button onClick={() => handleModeToggle("trade")} className={`px-4 py-2 rounded-full transition-colors ${mode === "trade" ? "tj-primary-bg font-semibold" : "text-zinc-400"}`}>Trade Day</button>
                  <button onClick={() => handleModeToggle("no_trade")} className={`px-4 py-2 rounded-full transition-colors ${mode === "no_trade" ? "bg-zinc-200 text-zinc-950 font-semibold" : "text-zinc-400"}`}>No-Trade Day</button>
                </div>
              )}
            </div>

            {!checklistManagerOpen && (
              <CollapsibleRegion open={mode === "trade"} animated={region2Animated} duration={750}>
                <div className="space-y-4 p-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className={`inline-flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 ring-1 ${sc.ring}`}>
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        {!readyToTrade && <span className={`animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full ${sc.glow} opacity-60`}></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sc.dot}`}></span>
                      </span>
                      <span className={`text-xs font-bold tracking-wide ${sc.text}`} style={FONT_MONO}>
                        {readyToTrade ? "ARMED" : `${missingCritical.length} CRITICAL CHECKS PENDING`}
                      </span>
                    </div>
                    <button
                      onClick={() => setChecklistManagerOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                    >
                      <IconSettings2 size={13} /> Manage Checklist
                    </button>
                  </div>
                  <div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${sc.bar} rounded-full transition-all duration-300`} style={{ width: `${progressPct}%` }}></div>
                    </div>
                    <div className="mt-4 mb-4">
                      <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
                    </div>
                  </div>
                </div>
              </CollapsibleRegion>
            )}

            {checklistManagerOpen && (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setChecklistManagerOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform"
                >
                  <IconSettings2 size={13} /> Back to Checklist
                </button>
              </div>
            )}

            {checklistManagerOpen ? (
              <ChecklistManagerTab
                sections={sections}
                onAddItem={addChecklistItem}
                onEditItem={editChecklistItem}
                onDeleteItem={deleteChecklistItem}
                onAddSection={addChecklistSection}
                onDeleteSection={deleteChecklistSection}
                onEditSection={editChecklistSectionTitle}
              />
            ) : (
              <div key={activeTab} className={activeTab === "data" && contentUsesSpecialSlide ? "" : "tj-slide-in"}>
                {activeTab === "data" ? (
                  <DataInterpretationSection dataReads={dataReads} onSetRow={setDataRow} avg={marketAvg} verdict={marketVerdict} staggerIn={contentUsesSpecialSlide} />
                ) : activeSection ? (
                  <ChecklistTabPanel section={activeSection} profile={profile} strategyId={strategyType} checked={checked} onToggle={toggleItem} onToggleAll={toggleAllInSection} />
                ) : null}
              </div>
            )}
          </div>
        )}

        {topTab === "pnl" && (
          <div key="pnl" className="tj-fade">
          <PnlTab
            pnlEntries={pnlEntries} pnlLoading={pnlLoading}
            selectedMonthKey={selectedMonthKey} setSelectedMonthKey={setSelectedMonthKey}
            onUpdate={updatePnlEntry} pendingDeleteId={pnlPendingDeleteId} setPendingDeleteId={setPnlPendingDeleteId} onDelete={confirmDeletePnlEntry} onSilentDelete={(id) => deletePnlEntry(id, true)} deletingId={deletingPnlId}
            onAddPast={openAddTradeDialog}
            monthlyCharges={monthlyCharges} onSetMonthlyCharge={setMonthlyCharge}
            exportScope={pnlExportScope} setExportScope={setPnlExportScope}
            exportMonth={pnlExportMonth} setExportMonth={setPnlExportMonth}
            exportYear={pnlExportYear} setExportYear={setPnlExportYear}
            exportRangeFrom={pnlExportRangeFrom} setExportRangeFrom={setPnlExportRangeFrom}
            exportRangeTo={pnlExportRangeTo} setExportRangeTo={setPnlExportRangeTo}
            onDownload={downloadPnlMarkdown}
            onViewPdf={viewPnlAsPdf}
            totalCapital={totalCapital}
            onManageFunds={() => setManageFundsDialogOpen(true)}
            onRecordChange={recordTradeChange}
            notesByTradeId={notesByTradeId}
            onOpenNote={openNoteFromTrade}
            pendingRevealTradeId={pendingRevealTradeId}
            onPendingRevealApplied={() => setPendingRevealTradeId(null)}
            allStrategies={allStrategies}
            customStrategies={customStrategies}
            autoEditRowId={newTradeIdToEdit}
            onAutoEditApplied={() => setNewTradeIdToEdit(null)}
            holidays={holidays}
            onOpenTradeLog={() => setTopTab("log")}
            noteTemplates={noteTemplates}
          />
          </div>
        )}

        {topTab === "log" && tradeLogSection}

        {topTab !== "pnl" && topTab !== "log" && topTab !== "learn" && topTab !== "profile" && topTab !== "holidays" && topTab !== "home" && (
          <>
            {topTab === "checklist" && mode === "trade" && !readyToTrade && missingCritical.length > 0 && (
              <div className="tj-fade rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-rose-300 mb-3">
                  <IconAlertTriangle size={16} /> Not armed yet — {missingCritical.length} critical {missingCritical.length === 1 ? "check" : "checks"} left
                </p>
                <div className="space-y-2">
                  {missingCritical.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => { setTopTab("checklist"); setActiveTab(itemToSection[i.id]); }}
                      className="w-full flex items-center gap-2.5 text-left text-sm text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg px-3.5 py-2.5 transition-colors"
                    >
                      <IconFlag size={13} className="text-rose-600 flex-shrink-0" />
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {topTab === "checklist" && mode === "trade" && (
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                <button
                  onClick={() => setTopTab("setup")}
                  disabled={!readyToTrade}
                  className="flex items-center gap-2 tj-primary-bg font-semibold text-sm px-6 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <IconAdjustmentsHorizontal size={15} /> Continue to Trade Setup
                </button>
                {!readyToTrade && <p className="text-xs text-zinc-600">Finish the critical checks above to continue.</p>}
              </div>
            )}

            {(topTab === "setup" || (topTab === "checklist" && mode === "no_trade")) && (
              <>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Notes — directional view & reasoning</p>
                  <ExpandableNoteField
                    value={notes}
                    onChange={setNotes}
                    placeholder="What's the read today, and why? Write it before checking the chain."
                    label="Notes — directional view & reasoning"
                    variant="block"
                    templates={noteTemplates}
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Chart screenshots</p>
                  <div className="flex items-center gap-2">
                    <TradeScreenshotsButton screenshots={screenshots} onChange={setScreenshots} tradeLabel={underlying || "this trade"} />
                    <p className="text-xs text-zinc-600">{screenshots.length ? `${screenshots.length} attached` : "Attach the setup you're looking at"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>How are you feeling right now?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEntryMood((prev) => (prev === m.id ? null : m.id))}
                        className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border transition-colors ${
                          entryMood === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        <MoodEmoji id={m.id} size={16} /> {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    {entryMoodNoteOpen ? (
                      <div className="space-y-2">
                        <input
                          type="text" value={entryMoodNoteDraft} onChange={(e) => setEntryMoodNoteDraft(e.target.value)} autoFocus
                          placeholder="What triggered this?"
                          className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEntryMoodNote(entryMoodNoteDraft); setEntryMoodNoteOpen(false); }} className="flex items-center gap-1 text-xs tj-primary-bg font-semibold px-3 py-1.5 rounded-lg hover:scale-[1.02] active:scale-95 transition-transform">
                            <IconDeviceFloppy size={12} /> Save
                          </button>
                          <button type="button" onClick={() => setEntryMoodNoteOpen(false)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setEntryMoodNoteDraft(entryMoodNote); setEntryMoodNoteOpen(true); }} className="text-xs text-zinc-500 hover:text-zinc-300 underline decoration-dotted">
                        {entryMoodNote ? "Edit note on what triggered this" : "+ Add a note on what triggered this"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={handleSaveClick} disabled={saveStatus === "saving" || (mode === "trade" && (!currentStrategy || !underlying.trim() || !legsComplete))} className="flex items-center gap-2 tj-primary-bg font-semibold text-sm px-5 py-3 rounded-xl disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                    <IconDeviceFloppy size={15} />
                    {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Couldn't save — retry" : mode === "no_trade" ? "Save Market Read" : "Save This Check"}
                  </button>
                  <button onClick={startNewCheck} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    <IconRotate size={15} /> {mode === "no_trade" ? "Clear Notes" : "Start New Trade Check"}
                  </button>
                  {mode === "trade" && !currentStrategy && <span className="text-xs text-amber-400">Pick a strategy above before saving.</span>}
                  {mode === "trade" && currentStrategy && !underlying.trim() && <span className="text-xs text-amber-400">Enter the underlying above before saving.</span>}
                  {mode === "trade" && currentStrategy && underlying.trim() && !legsComplete && <span className="text-xs text-amber-400">Fill in every field on each leg before saving.</span>}
                </div>
              </>
            )}

          </>
        )}


      </div>
      )}

      {topTab === "learn" && (
        <div className="max-w-[1600px] mx-auto">
          <MyLearningsTab
            notes={learningNotes}
            notesLoading={notesLoading}
            folders={noteFolders}
            onAdd={addNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onBulkDeleteNotes={bulkDeleteNotes}
            onMoveNote={moveNoteToFolder}
            onAddFolder={addFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMoveFolder={moveFolderToFolder}
            onDuplicateNote={duplicateNote}
            onToggleStar={toggleNoteStarred}
            pnlEntries={pnlEntries}
            onDownloadPdf={downloadNoteAsPdf}
            navHeight={navHeight}
            pendingOpenNoteId={pendingOpenNoteId}
            onPendingOpenNoteApplied={() => setPendingOpenNoteId(null)}
          />
        </div>
      )}

      {manageFundsDialogOpen && (
        <ManageFundsDialog
          currentCapital={capitalBase}
          onAddFunds={(amt, date, notes) => addFundTransaction("deposit", amt, date, notes)}
          onWithdrawFunds={(amt, date, notes) => addFundTransaction("withdrawal", amt, date, notes)}
          onClose={() => setManageFundsDialogOpen(false)}
        />
      )}

      {incompleteChecklistDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={() => setIncompleteChecklistDialogOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-amber-900 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-400" style={FONT_DISPLAY}>Checklist not complete</p>
            </div>
            <p className="text-xs text-zinc-400">
              You haven't finished the pre-trade checklist yet ({missingCritical.length} item{missingCritical.length === 1 ? "" : "s"} pending). Do you want to proceed and save anyway, or go fill it in first?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setIncompleteChecklistDialogOpen(false); saveCheck(); }}
                className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg hover:scale-[1.02] active:scale-95 transition-transform"
              >
                Proceed and Save Anyway
              </button>
              <button
                onClick={() => { setIncompleteChecklistDialogOpen(false); setTopTab("checklist"); }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                Take Me to the Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {addTradeDialogOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 ${addTradeDialogClosing ? "tj-backdrop-out" : "tj-fade"}`}
          onClick={addTradeMoodStepTs ? undefined : closeAddTradeDialog}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 ${addTradeDialogClosing ? "tj-dialog-out" : "tj-popover"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {addTradeMoodStepTs ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Trade Added</p>
                  <button onClick={skipAddTradeMood} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>How are you feeling right now?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAddTradeSelectedMood((prev) => (prev === m.id ? null : m.id))}
                        className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border transition-colors ${
                          addTradeSelectedMood === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        <MoodEmoji id={m.id} size={16} /> {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAddTradeMood} disabled={!addTradeSelectedMood} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Save
                  </button>
                  <button onClick={skipAddTradeMood} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                    Skip
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Add Trade</p>
                  <button onClick={closeAddTradeDialog} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
                </div>
                <label className="block">
                  <span className="text-xs text-zinc-500">Trade date</span>
                  <div className="mt-1">
                    <CalendarPicker value={addTradeDate} onChange={setAddTradeDate} holidays={holidays} businessDaysOnly maxDate={localISODate(Date.now())} placeholder="Select date" />
                  </div>
                  {!addTradeDate && (
                    <p className="text-xs text-amber-400 mt-1.5">Today isn't a trading day pick another date to continue.</p>
                  )}
                </label>
                <p className="text-xs text-zinc-600">
                  A blank, editable row will be added to {addTradeDate ? monthLabel(monthKeyOf(addTradeDate)) : "the selected month"}&apos;s table. Pick a date in the current month to add it here, or any other date to jump straight to that month.
                </p>
                {addTradeDate && addTradeDate < localISODate(Date.now()) && (
                  <div>
                    {addTradeAffectsCapital === null ? (
                      <>
                        <p className="text-xs text-zinc-500 mb-1.5">Should this trade affect your total capital?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setAddTradeAffectsCapital(true)} className="flex-1 text-xs px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600">Yes</button>
                          <button onClick={() => setAddTradeAffectsCapital(false)} className="flex-1 text-xs px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600">No</button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-600">
                        {addTradeAffectsCapital ? "This trade will count toward your total capital." : "This trade will not affect your total capital."}{" "}
                        <button onClick={() => setAddTradeAffectsCapital(null)} className="tj-primary-text underline underline-offset-2">Change</button>
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={confirmAddTrade} disabled={!addTradeDate} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Add Trade
                  </button>
                  <button onClick={closeAddTradeDialog} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {downloadDialogOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 ${downloadDialogClosing ? "tj-backdrop-out" : "tj-fade"}`}
          onClick={closeDownloadDialog}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 ${downloadDialogClosing ? "tj-dialog-out" : "tj-popover"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Download Log</p>
              <button onClick={closeDownloadDialog} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <p className="text-xs text-zinc-600">
              Choose which entries to include for the selected date range ({filtered.length} {filtered.length === 1 ? "entry" : "entries"} total).
            </p>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.observation} onChange={() => toggleDownloadType("observation")} className="w-4 h-4 accent-amber-400" />
                Observation data
              </label>
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.trade} onChange={() => toggleDownloadType("trade")} className="w-4 h-4 accent-amber-400" />
                Trade data
              </label>
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.funds_added} onChange={() => toggleDownloadType("funds_added")} className="w-4 h-4 accent-amber-400" />
                Funds added
              </label>
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.funds_withdrawn} onChange={() => toggleDownloadType("funds_withdrawn")} className="w-4 h-4 accent-amber-400" />
                Withdrawals
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={confirmDownloadPdf}
                  disabled={!downloadTypes.observation && !downloadTypes.trade && !downloadTypes.funds_added && !downloadTypes.funds_withdrawn}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center border border-zinc-700"
                >
                  .PDF
                </button>
                <button
                  onClick={confirmDownload}
                  disabled={!downloadTypes.observation && !downloadTypes.trade && !downloadTypes.funds_added && !downloadTypes.funds_withdrawn}
                  className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center"
                >
                  .MD
                </button>
              </div>
              <button onClick={closeDownloadDialog} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {entryDownloadFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade"
          onClick={() => setEntryDownloadFor(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Download Entry</p>
              <button onClick={() => setEntryDownloadFor(null)} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <p className="text-xs text-zinc-600">Choose a file format for this log entry.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { openLogAsPdf(entryDownloadFor); setEntryDownloadFor(null); }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center border border-zinc-700"
              >
                .PDF
              </button>
              <button
                onClick={() => { downloadLogEntryAsMarkdown(entryDownloadFor); setEntryDownloadFor(null); }}
                className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center"
              >
                .MD
              </button>
            </div>
            <button onClick={() => setEntryDownloadFor(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}
        </>
      )}
      <ReminderAlarmPopup
        dueAlarms={dueAlarms}
        onClose={handleAlarmClose}
        onCloseAll={handleAlarmCloseAll}
        onSnoozeMinutes={handleAlarmSnoozeMinutes}
        onSnoozeAllMinutes={handleAlarmSnoozeAllMinutes}
        onSaveDateTime={handleAlarmSaveDateTime}
        onSaveDateTimeAll={handleAlarmSaveDateTimeAll}
      />
    </div>
  );
}

function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="flex-shrink-0">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}

function PinDigitInput({ value, onChange, onComplete, autoFocus, error }) {
  const inputRefs = useRef([]);

  const handleChange = (idx, raw) => {
    const clean = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = clean;
    onChange(next);
    if (clean && idx < 3) inputRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-14 h-14 text-center text-2xl font-bold bg-zinc-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-zinc-100 ${error ? "border-rose-500" : "border-zinc-700"}`}
        />
      ))}
    </div>
  );
}

function PinDialogShell({ children }) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-7 text-center tj-popover">
        <img src={logo} alt="Comet Trading Journal" className="h-14 w-auto mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}

function PinSetupScreen({ onComplete, existingUser, hasExistingSecurityQuestions }) {
  const [step, setStep] = useState(1); // 1=choose pin, 2=confirm pin, 3=pick questions, 4=answer questions
  const [firstPin, setFirstPin] = useState("");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPinRecord, setSavedPinRecord] = useState(null);
  const [fiveQuestions, setFiveQuestions] = useState(() => pickRandomQuestions(5));
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [answers, setAnswers] = useState({});

  const handleFirstComplete = (pin) => {
    setFirstPin(pin);
    setDigits(["", "", "", ""]);
    setError("");
    setStep(2);
  };

  const handleConfirmComplete = async (pin) => {
    if (pin !== firstPin) {
      setError("PINs didn't match — let's try again.");
      setDigits(["", "", "", ""]);
      setFirstPin("");
      setStep(1);
      return;
    }
    setSaving(true);
    const record = await createPinRecord(pin);
    if (hasExistingSecurityQuestions) {
      // Preserve existing security questions untouched — the user already
      // proved they know the answers (that's how they got here), so there's
      // no reason to force them to set up new ones right now.
      try { await dbStorage.set("security-pin", JSON.stringify(record)); } catch (err) { /* best effort */ }
      sessionStorage.setItem("tj-pin-unlocked", "1");
      setSaving(false);
      onComplete(record); // second arg omitted — tells the parent "questions unchanged"
      return;
    }
    setSaving(false);
    setSavedPinRecord(record);
    setStep(3);
  };

  const toggleQuestion = (id) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(id)) return prev.filter((q) => q !== id);
      if (prev.length >= 2) return prev; // max 2 — deselect one first
      return [...prev, id];
    });
  };

  const refreshQuestions = () => {
    setFiveQuestions(pickRandomQuestions(5));
    setSelectedQuestionIds([]);
  };

  const finishSetup = async () => {
    setSaving(true);
    try { await dbStorage.set("security-pin", JSON.stringify(savedPinRecord)); } catch (err) { /* best effort */ }
    const questionRecords = await Promise.all(
      selectedQuestionIds.map(async (qid) => {
        const record = await createPinRecord(normalizeAnswer(answers[qid] || ""));
        return { questionId: qid, salt: record.salt, hash: record.hash };
      })
    );
    const newSecurityQuestions = { answers: questionRecords };
    try { await dbStorage.set("security-questions", JSON.stringify(newSecurityQuestions)); } catch (err) { /* best effort */ }
    sessionStorage.setItem("tj-pin-unlocked", "1");
    setSaving(false);
    onComplete(savedPinRecord, newSecurityQuestions);
  };

  const skipSecurityQuestions = async () => {
    setSaving(true);
    try { await dbStorage.set("security-pin", JSON.stringify(savedPinRecord)); } catch (err) { /* best effort */ }
    sessionStorage.setItem("tj-pin-unlocked", "1");
    setSaving(false);
    onComplete(savedPinRecord); // second arg omitted — no security questions set up
  };

  const bothAnswered = selectedQuestionIds.length === 2 && selectedQuestionIds.every((qid) => (answers[qid] || "").trim().length > 0);

  if (step === 3) {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Choose 2 Security Questions
        </div>
        <div className="flex items-center justify-between gap-2 mb-6">
          <p className="text-sm text-zinc-500 text-left">These let you reset your PIN later if you forget it. Pick any 2 of these 5.</p>
          <Tooltip text="Get a new set of questions">
            <button onClick={refreshQuestions} className="flex-shrink-0 p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <IconRotate size={15} />
            </button>
          </Tooltip>
        </div>
        <div className="space-y-2 text-left">
          {fiveQuestions.map((q) => {
            const selected = selectedQuestionIds.includes(q.id);
            return (
              <button
                key={q.id} onClick={() => toggleQuestion(q.id)}
                className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${
                  selected ? "border-amber-400 bg-amber-400/10 text-zinc-100" : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span className={`w-4 h-4 rounded flex-shrink-0 border ${selected ? "bg-amber-400 border-amber-400" : "border-zinc-600"}`}>
                  {selected && <IconCheck size={13} strokeWidth={3} className="text-zinc-950" />}
                </span>
                {q.text}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setStep(4)}
          disabled={selectedQuestionIds.length !== 2}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          Continue ({selectedQuestionIds.length}/2 selected)
        </button>
        <button onClick={() => setStep(5)} className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-3">
          Set up later
        </button>
      </PinDialogShell>
    );
  }

  if (step === 5) {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-3" style={FONT_DISPLAY}>
          <IconShield size={22} className="text-amber-400" />
          Security Questions Skipped
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Setting up security questions lets you reset your PIN if you ever forget it. You can set them up anytime from Settings → Security Questions.
        </p>
        <button
          onClick={skipSecurityQuestions}
          disabled={saving}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-60 font-semibold text-sm px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {saving ? "Finishing up…" : "Okay"}
        </button>
      </PinDialogShell>
    );
  }

  if (step === 4) {
    const chosen = fiveQuestions.filter((q) => selectedQuestionIds.includes(q.id));
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Answer Your Questions
        </div>
        <p className="text-sm text-zinc-500 mb-6">Answers aren't case-sensitive. Make sure you'll remember exactly what you type.</p>
        <div className="space-y-4 text-left">
          {chosen.map((q) => (
            <label key={q.id} className="block">
              <span className="text-xs text-zinc-500">{q.text}</span>
              <input
                type="text" value={answers[q.id] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
          ))}
        </div>
        <button
          onClick={finishSetup} disabled={!bothAnswered || saving}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {saving ? "Saving..." : "Finish Setup"}
        </button>
        <button onClick={() => setStep(3)} className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 underline">
          Back to question selection
        </button>
      </PinDialogShell>
    );
  }

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-amber-400" />
        Set Up a Security PIN
      </div>
      <p className="text-sm text-zinc-500 mb-8">
        {existingUser
          ? "Add a PIN to keep your journal locked when you're not using it."
          : "Choose a 4-digit PIN to lock your journal."}
        {step === 2 && " Re-enter it to confirm."}
      </p>
      <PinDigitInput key={step} value={digits} onChange={setDigits} onComplete={step === 1 ? handleFirstComplete : handleConfirmComplete} autoFocus error={!!error} />
      {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}
      {saving && <p className="text-xs text-zinc-500 mt-4">Saving...</p>}
    </PinDialogShell>
  );
}

function PinLockedOutScreen({ until, onSignOutReset, onExpired }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= until) { onExpired(); return; }
      forceTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  const remainingMs = Math.max(0, until - Date.now());
  const totalSec = Math.ceil(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const countdown = `${h}:${pad2(m)}:${pad2(s)}`;

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-rose-500" />
        Account Blocked
      </div>
      <p className="text-sm text-zinc-500 mb-2">Too many incorrect attempts. Try again in:</p>
      <p className="text-3xl font-bold text-rose-500 mb-6" style={FONT_MONO}>{countdown}</p>
      <div className="pointer-events-none opacity-40">
        <PinDigitInput value={["", "", "", ""]} onChange={() => {}} onComplete={() => {}} autoFocus={false} />
      </div>
      <button onClick={onSignOutReset} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl mt-6 transition-colors">
        Logout
      </button>
    </PinDialogShell>
  );
}

function PinLockScreen({ pinRecord, securityQuestions, onUnlock, onSignOutReset, onPinCleared, onLockout, greetingName }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [view, setView] = useState("pin"); // pin | forgot-options | security-questions
  const [qaAnswers, setQaAnswers] = useState({});
  const [qaError, setQaError] = useState("");
  const [qaChecking, setQaChecking] = useState(false);
  const [qaAttempts, setQaAttempts] = useState(0);

  const handleComplete = async (pin) => {
    setChecking(true);
    const ok = await verifyPin(pin, pinRecord);
    setChecking(false);
    if (ok) {
      sessionStorage.setItem("tj-pin-unlocked", "1");
      onUnlock();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setDigits(["", "", "", ""]);
    if (nextAttempts >= 5) {
      const until = Date.now() + 2 * 60 * 60 * 1000;
      try { await dbStorage.set("pin-lockout-until", JSON.stringify(until)); } catch (err) { /* best effort */ }
      onLockout(until);
      return;
    }
    setError(`Incorrect PIN. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? "" : "s"} left.`);
  };

  const hasSecurityQuestions = securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2;
  const qaLockedOut = qaAttempts >= 5;

  const verifyQuestions = async () => {
    setQaChecking(true);
    setQaError("");
    let allCorrect = true;
    for (const rec of securityQuestions.answers) {
      const given = normalizeAnswer(qaAnswers[rec.questionId] || "");
      const ok = await verifyPin(given, rec);
      if (!ok) { allCorrect = false; break; }
    }
    setQaChecking(false);
    if (allCorrect) { onPinCleared(); return; }
    const nextAttempts = qaAttempts + 1;
    setQaAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      const until = Date.now() + 2 * 60 * 60 * 1000;
      try { await dbStorage.set("pin-lockout-until", JSON.stringify(until)); } catch (err) { /* best effort */ }
      onLockout(until);
      return;
    }
    setQaError(`One or both answers didn't match. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? "" : "s"} left.`);
  };

  if (view === "forgot-options") {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Reset Your PIN
        </div>
        <p className="text-sm text-zinc-500 mb-8">Choose how you'd like to verify it's really you.</p>
        <div className="space-y-3">
          {hasSecurityQuestions && (
            <button onClick={() => setView("security-questions")} className="w-full bg-amber-400 text-zinc-950 font-semibold text-sm px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
              Answer Security Questions
            </button>
          )}
          <button onClick={onSignOutReset} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl transition-colors">
            Logout
          </button>
        </div>
        <button onClick={() => setView("pin")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-8 underline">
          Back to Enter PIN
        </button>
      </PinDialogShell>
    );
  }

  if (view === "security-questions") {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Answer Your Security Questions
        </div>
        <p className="text-sm text-zinc-500 mb-6">Answer both correctly to set up a new PIN.</p>
        <div className="space-y-4 text-left">
          {securityQuestions.answers.map((rec) => {
            const q = SECURITY_QUESTIONS.find((sq) => sq.id === rec.questionId);
            return (
              <label key={rec.questionId} className="block">
                <span className="text-xs text-zinc-500">{q ? q.text : "Question"}</span>
                <input
                  type="text" disabled={qaLockedOut} value={qaAnswers[rec.questionId] || ""}
                  onChange={(e) => setQaAnswers((prev) => ({ ...prev, [rec.questionId]: e.target.value }))}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </label>
            );
          })}
        </div>
        {qaError && <p className="text-xs text-rose-400 mt-4">{qaError}</p>}
        <button
          onClick={verifyQuestions} disabled={qaChecking || qaLockedOut}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {qaChecking ? "Checking..." : "Verify & Reset PIN"}
        </button>
        <button onClick={() => setView("forgot-options")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 underline">
          Back
        </button>
      </PinDialogShell>
    );
  }

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-amber-400" />
        Enter Your PIN
      </div>
      <p className="text-sm text-zinc-500 mb-8">{greetingName ? `Welcome back, ${greetingName}` : "Welcome back"} — enter your PIN to continue.</p>
      <PinDigitInput key={attempts} value={digits} onChange={setDigits} onComplete={handleComplete} autoFocus error={!!error} />
      {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}
      {checking && <p className="text-xs text-zinc-500 mt-4">Checking...</p>}
      <button onClick={() => setView("forgot-options")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-8 underline">
        Forgot your PIN?
      </button>
    </PinDialogShell>
  );
}

function PinConfirmDialog({ pinRecord, title, message, onConfirm, onClose }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleComplete = async (pin) => {
    setChecking(true);
    const ok = await verifyPin(pin, pinRecord);
    setChecking(false);
    if (ok) { onConfirm(); return; }
    setAttempts((a) => a + 1);
    setDigits(["", "", "", ""]);
    setError("Incorrect PIN. Try again.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500">{message}</p>
        <PinDigitInput key={attempts} value={digits} onChange={setDigits} onComplete={handleComplete} autoFocus error={!!error} />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {checking && <p className="text-xs text-zinc-500">Checking...</p>}
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300 underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ToastStack() {
  const [toasts, setToasts] = useState([]);

  const dismissToast = (id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250);
  };

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notification) => {
      const duration = notification.duration || 2000;
      setToasts((prev) => [...prev, { ...notification, closing: false, duration }]);
      setTimeout(() => dismissToast(notification.id), duration);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-20 right-4 sm:right-8 z-[10002] flex flex-col gap-2 w-72 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`relative overflow-hidden rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl px-3.5 py-3 pr-8 pointer-events-auto ${t.closing ? "tj-toast-out" : "tj-toast-in"}`}
        >
          <p className="text-xs text-zinc-200 leading-relaxed">{t.message}</p>
          {t.onUndo && !t.closing && (
            <button
              type="button"
              onClick={() => { t.onUndo(); dismissToast(t.id); }}
              className="mt-1.5 text-xs font-semibold tj-primary-text hover:underline"
            >
              Undo
            </button>
          )}
          <button type="button" onClick={() => dismissToast(t.id)} className="tj-toast-close absolute top-2 right-2 text-zinc-500">
            <IconX size={13} />
          </button>
          {!t.closing && <div className="absolute bottom-0 left-0 h-0.5 bg-rose-500" style={{ animation: `tj-toast-countdown ${t.duration}ms linear forwards` }}></div>}
        </div>
      ))}
    </div>,
    getPortalTarget()
  );
}

function NotificationBell() {
  const [history, setHistory] = useState([]);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [, forceTick] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [clearingCount, setClearingCount] = useState(0);
  const btnRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [historyRes, seenRes] = await Promise.all([
          dbStorage.get("notification-history"),
          dbStorage.get("notification-last-seen"),
        ]);
        const parsedHistory = historyRes && historyRes.value ? JSON.parse(historyRes.value) : null;
        const parsedSeenAt = seenRes && seenRes.value ? JSON.parse(seenRes.value) : 0;
        if (!cancelled) {
          const loadedHistory = Array.isArray(parsedHistory) ? parsedHistory : [];
          setLastSeenAt(parsedSeenAt || 0);
          // Merge with whatever's already in state instead of replacing it
          // outright — a live notification may have already arrived (and
          // been added via the subscription below) while this load was
          // still in flight, and a blind overwrite here would silently
          // discard it from the UI even though it's correctly persisted.
          setHistory((prev) => {
            const merged = [...prev];
            const existingIds = new Set(prev.map((n) => n.id));
            loadedHistory.forEach((n) => { if (!existingIds.has(n.id)) merged.push(n); });
            merged.sort((a, b) => b.createdAt - a.createdAt);
            return merged.slice(0, 20);
          });
        }
      } catch (err) { /* best effort — start from empty history */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notification) => {
      setHistory((prev) => (prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev].slice(0, 20)));
    });
    return unsubscribe;
  }, []);

  // Derived from history + lastSeenAt rather than tracked as its own piece
  // of state — a separately-updated counter is exactly what raced against
  // the async load above. Computed fresh from the two things it actually
  // depends on, it can't drift out of sync with either.
  const unreadCount = useMemo(() => history.filter((n) => n.createdAt > lastSeenAt).length, [history, lastSeenAt]);

  // Persistence for new entries is handled centrally inside notify() itself
  // now (see its definition) — this component only needs to load the
  // initial history and reflect live updates in the UI while mounted.

  // Clears one notification at a time, starting from the oldest (bottom of
  // the list, rendered last) and working up to the newest (top, rendered
  // first) — matching the same right-slide-out the toasts use — then closes
  // the dropdown once the last one has finished.
  const clearHistory = () => {
    if (history.length === 0 || isClearing) return;
    const total = history.length;
    const stagger = 70;
    const animDuration = 250;
    setIsClearing(true);
    for (let i = 1; i <= total; i++) {
      setTimeout(() => setClearingCount(i), (i - 1) * stagger);
    }
    setTimeout(() => {
      setHistory([]);
      setIsClearing(false);
      setClearingCount(0);
      setOpen(false);
      clearPersistedNotifications();
    }, (total - 1) * stagger + animDuration);
  };

  // Keep "Xs ago" / "X min ago" accurate while the dropdown is actually open.
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(true);
    const now = Date.now();
    setLastSeenAt(now);
    dbStorage.set("notification-last-seen", JSON.stringify(now)).catch(() => {});
  };

  return (
    <>
      <Tooltip text="Notifications">
        <button
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openDropdown())}
          className="relative w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center flex-shrink-0 hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
        >
          <IconBell size={15} className="text-zinc-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center" style={FONT_MONO}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="tj-popover fixed z-[9999] w-80 max-h-96 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-2 flex flex-col"
            style={{ top: coords.top, right: coords.right }}
          >
            <div className="flex items-center justify-between px-2 py-1.5 flex-shrink-0">
              <span className="text-xs font-semibold text-zinc-300">Notifications</span>
              {history.length > 0 && !isClearing && (
                <button onClick={clearHistory} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">Clear</button>
              )}
            </div>
            <div className="overflow-y-auto overflow-x-hidden">
            {history.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">No notifications yet.</p>
            ) : (
              <div className="space-y-1">
                {history.map((n, index) => {
                  const positionFromBottom = history.length - 1 - index;
                  const isExiting = isClearing && positionFromBottom < clearingCount;
                  return (
                    <div key={n.id} className={`px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors ${isExiting ? "tj-toast-out" : ""}`}>
                      <p className="text-xs text-zinc-200">{n.message}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5" style={FONT_MONO}>{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}

function LoginPage({ forceReauth }) {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    setError("");
    setSigningIn(true);
    const queryParams = forceReauth
      ? { prompt: "login select_account", max_age: "0" }
      : { prompt: "select_account" };
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname + window.location.search, queryParams },
    });
    if (err) { setError(err.message || "Couldn't start Google sign-in. Please try again."); setSigningIn(false); }
    // On success the browser navigates away to Google, so no further state change is needed here.
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4" style={FONT_DISPLAY}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-2">
          <img src={logo} alt="" className="h-20 w-auto mb-1" />
          <div className="text-xl text-zinc-50" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Comet Trading Journal</div>
        </div>
        <p className="text-center text-sm text-zinc-500 mb-8" style={FONT_MONO}>A pre-trade discipline layer for options sellers and buyers.</p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-400 mb-5 text-center">
            {forceReauth ? "For security, please sign in again to confirm it's you before resetting your PIN." : "Sign in to access your journal."}
          </p>
          <button
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 disabled:opacity-60 text-zinc-800 font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
          >
            <GoogleLogo />
            {signingIn ? "Redirecting..." : "Sign in with Google"}
          </button>
          {error && <p className="text-xs text-rose-400 mt-3 text-center">{error}</p>}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6" style={FONT_MONO}>Your journal is private to your account.</p>
      </div>
    </div>
  );
}

// Supabase's OAuth 2.1 Server authenticates the user itself, then redirects
// here with an authorization_id — it deliberately doesn't host its own
// consent UI, so this app has to. Confirmed against this project's own
// installed @supabase/auth-js type definitions (not just doc examples)
// before writing this: getAuthorizationDetails can return either
// authorization details (show the screen below) or an already-consented
// redirect (skip straight through), and approveAuthorization/
// denyAuthorization redirect the browser automatically by default.
function OAuthConsentPage({ authorizationId }) {
  const [status, setStatus] = useState("loading"); // "loading" | "consent" | "processing" | "error"
  const [details, setDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Uses the same shared useThemeSettings load as PreTradeChecklist, so
  // this one-off page matches whichever theme the user actually has
  // selected instead of a hardcoded look.
  const { themeId, colorMode } = useThemeSettings();
  const baseTh = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const effectiveMode = colorMode || baseTh.defaultMode;
  const th = effectiveMode === baseTh.defaultMode ? baseTh : { ...baseTh, ...baseTh.alt };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message || "Couldn't load this connection request.");
        setStatus("error");
        return;
      }
      if (data && "redirect_url" in data) {
        window.location.href = data.redirect_url; // already consented before — no screen needed
        return;
      }
      setDetails(data);
      setStatus("consent");
    })();
    return () => { cancelled = true; };
  }, [authorizationId]);

  const handleApprove = async () => {
    setStatus("processing");
    const { error } = await supabase.auth.oauth.approveAuthorization(authorizationId);
    if (error) {
      setErrorMsg(error.message || "Couldn't approve this request — please try again.");
      setStatus("error");
    }
    // On success the SDK redirects the browser itself — nothing further to do here.
  };

  const handleDeny = async () => {
    setStatus("processing");
    const { error } = await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (error) {
      setErrorMsg(error.message || "Couldn't deny this request — please try again.");
      setStatus("error");
    }
  };

  const scopes = (details?.scope || "").split(/\s+/).filter(Boolean);

  return (
    <div
      className={`tj-app min-h-screen tj-theme-${th.id} tj-mode-${effectiveMode} flex items-center justify-center px-4`}
      style={{
        "--tj-primary": th.primary,
        "--tj-primary-contrast": th.primaryContrast,
        "--tj-secondary": th.secondary,
        "--tj-accent": th.accent,
        "--tj-bg": th.bg,
        "--tj-panel": th.panel,
        "--tj-panel2": th.panel2,
        "--tj-panel-solid": th.panelSolid || th.panel2,
        "--tj-border": th.border,
        "--tj-border-soft": th.borderSoft,
        "--tj-text1": th.text1,
        "--tj-text2": th.text2,
        "--tj-text3": th.text3,
        "--tj-text4": th.text4,
        "--tj-text5": th.text5,
        "--tj-radius-sm": th.radiusSm,
        "--tj-radius-md": th.radiusMd,
        "--tj-radius-lg": th.radiusLg,
        "--tj-shadow": th.shadow,
        "--tj-dur": th.transDur,
        "--tj-ease": th.transEase,
        "--tj-font-display": th.fontDisplay,
        "--tj-font-body": th.fontBody,
        "--tj-blur": th.blur,
        background: th.bg,
        color: th.text1,
        fontFamily: th.fontBody,
      }}
    >
      <style>{themeGlobalCss(th)}</style>
      {th.id === "crt" && <div className="tj-app-bg-overlay"></div>}
      <style>{THEME_PRIMARY_CSS}</style>
      <div className="w-full max-w-sm rounded-2xl border tj-solid-bg p-6 space-y-5" style={{ borderColor: "var(--tj-border)" }}>
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ ...FONT_MONO, color: "var(--tj-text4)" }}>Comet Trading Journal</p>
          <p className="text-lg font-semibold" style={{ ...FONT_DISPLAY, color: "var(--tj-text1)" }}>Connection Request</p>
        </div>

        {status === "loading" && (
          <p className="text-sm text-center" style={{ color: "var(--tj-text3)" }}>Loading request details...</p>
        )}

        {status === "error" && (
          <>
            <p className="text-sm text-rose-400 text-center">{errorMsg}</p>
            <p className="text-xs text-center" style={{ color: "var(--tj-text4)" }}>You can close this window and try connecting again.</p>
          </>
        )}

        {status === "processing" && (
          <p className="text-sm text-center" style={{ color: "var(--tj-text3)" }}>Working...</p>
        )}

        {status === "consent" && details && (
          <>
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--tj-border)", background: "var(--tj-panel)" }}>
              <div className="flex items-center gap-3">
                {details.client?.logo_uri ? (
                  <img src={details.client.logo_uri} alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "var(--tj-panel2)" }} />
                )}
                <p className="text-sm font-semibold truncate" style={{ color: "var(--tj-text1)" }}>{details.client?.name || "This application"}</p>
              </div>
              <p className="text-xs" style={{ color: "var(--tj-text4)" }}>wants to access your Comet Trading Journal data as <span style={{ color: "var(--tj-text2)" }}>{details.user?.email}</span>.</p>
              {scopes.length > 0 && (
                <div className="pt-1 border-t space-y-1" style={{ borderColor: "var(--tj-border-soft)" }}>
                  <p className="text-[10px] uppercase tracking-widest" style={{ ...FONT_MONO, color: "var(--tj-text5)" }}>Requested access</p>
                  {scopes.map((s) => (
                    <p key={s} className="text-xs" style={{ color: "var(--tj-text4)" }}>&bull; {s}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleApprove} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
                Allow
              </button>
              <button onClick={handleDeny} className="text-sm px-4 py-2.5 rounded-lg flex-1" style={{ background: "var(--tj-panel2)", color: "var(--tj-text2)" }}>
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [pinGate, setPinGate] = useState("checking"); // checking | needs-setup | needs-entry | locked-out | unlocked
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [pinRecord, setPinRecord] = useState(null);
  const [securityQuestions, setSecurityQuestions] = useState(null);
  const [greetingName, setGreetingName] = useState("");
  const [forceGoogleReauth, setForceGoogleReauth] = useState(false);
  const [deletionCancelledNotice, setDeletionCancelledNotice] = useState(false);
  const [pendingAuthorizationId] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("authorization_id");
    if (fromUrl) {
      try { sessionStorage.setItem("pending-oauth-authorization-id", fromUrl); } catch (e) { /* best effort */ }
      return fromUrl;
    }
    try { return sessionStorage.getItem("pending-oauth-authorization-id"); } catch (e) { return null; }
  });

  const forceSignOutStale = () => {
    sessionStorage.removeItem("tj-pin-unlocked");
    localStorage.removeItem("tj-last-active");
    supabase.auth.signOut();
  };

  const evaluatePinGate = async (currentSession) => {
    dbStorage.setUserId(currentSession.user.id);
    setGreetingName(currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name || "");

    // Account deletion is a 7-day grace-period soft-delete, enforced
    // lazily: nothing runs in the background while the user is away, and
    // that's by design — if they never log in again, their data simply
    // stays as-is indefinitely. This check, run at the next login attempt,
    // is the only place the deletion actually happens. If it's been 7+
    // days since they requested deletion, wipe everything now and sign
    // them out; logging in again after that is indistinguishable from a
    // brand new account, since there's nothing left of the old one.
    try {
      const res = await dbStorage.get("account-deletion-requested-at");
      const requestedAt = res && res.value ? JSON.parse(res.value) : null;
      if (requestedAt) {
        if (Date.now() - requestedAt >= SEVEN_DAYS_MS) {
          try { await deleteAllUserData(); } catch (err) { /* best effort */ }
          forceSignOutStale();
          return;
        } else {
          await dbStorage.delete("account-deletion-requested-at");
          setDeletionCancelledNotice(true);
        }
      }
    } catch (err) { /* don't block normal login over this check failing */ }

    // A 2-hour lockout triggered by 5 failed security-question attempts —
    // stored in the database (not just component state) so it survives
    // page reloads and can't be sidestepped by simply refreshing.
    try {
      const lockRes = await dbStorage.get("pin-lockout-until");
      const until = lockRes && lockRes.value ? JSON.parse(lockRes.value) : null;
      if (until) {
        if (Date.now() < until) {
          setLockoutUntil(until);
          setPinGate("locked-out");
          return;
        } else {
          await dbStorage.delete("pin-lockout-until");
        }
      }
    } catch (err) { /* don't block normal login over this check failing */ }

    // A PIN reset was requested (via "Forgot your PIN?") and the user has
    // just proven their identity again via a fresh Google sign-in — now
    // it's safe to actually clear the old PIN and let them choose a new one.
    // Stored in the database (not sessionStorage) so this reliably survives
    // the full sign-out -> Google redirect -> sign-back-in round trip,
    // regardless of browser tab behavior during that redirect.
    try {
      const pendingRes = await dbStorage.get("pin-reset-pending");
      if (pendingRes && pendingRes.value && JSON.parse(pendingRes.value) === true) {
        await dbStorage.delete("pin-reset-pending");
        try { await dbStorage.delete("security-pin"); } catch (err) { /* fall through to setup regardless */ }
        setPinRecord(null);
        setPinGate("needs-setup");
        return;
      }
    } catch (err) { /* fall through to normal pin gate logic if this check fails */ }

    // This reload was triggered by our own idle-timeout, not a fresh tab —
    // skip the "closed for 3h+" check below entirely, since we already know
    // this was a continuously-open tab, and go straight to re-locking it.
    const isIdleTriggeredReload = sessionStorage.getItem("tj-idle-reload-flag");
    if (isIdleTriggeredReload) sessionStorage.removeItem("tj-idle-reload-flag");

    if (!isIdleTriggeredReload) {
      const lastActive = parseInt(localStorage.getItem("tj-last-active") || "0", 10);
      const elapsed = Date.now() - lastActive;
      if (lastActive > 0 && elapsed > THREE_HOURS_MS) {
        // The app was closed (not signed out) for more than 3 hours — treat
        // this like a stale session and require a fresh Google sign-in.
        forceSignOutStale();
        return;
      }
    }

    let record = null;
    try {
      const res = await dbStorage.get("security-pin");
      record = res && res.value ? JSON.parse(res.value) : null;
    } catch (err) { /* treat as no PIN set yet */ }
    setPinRecord(record);

    try {
      const qRes = await dbStorage.get("security-questions");
      setSecurityQuestions(qRes && qRes.value ? JSON.parse(qRes.value) : null);
    } catch (err) { setSecurityQuestions(null); }

    if (!record) { setPinGate("needs-setup"); return; }

    // A PIN exists. If this exact tab session already unlocked it (and
    // hasn't been closed since — sessionStorage clears on tab close), skip
    // straight through. Otherwise, require the PIN again.
    if (sessionStorage.getItem("tj-pin-unlocked") === "1") setPinGate("unlocked");
    else setPinGate("needs-entry");
  };

  useEffect(() => {
    let cancelled = false;
    // A fresh OAuth sign-in redirect lands back here with ?code=... in the
    // URL, and Supabase is asynchronously exchanging it for a session right
    // as this effect runs. Treat that window specially — a getSession()
    // error here is far more likely to be a transient race with that
    // in-flight exchange than a genuinely stale, dangling token, so the
    // aggressive storage-clearing below must not run in that case.
    const oauthCallbackInProgress = window.location.search.includes("code=");
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error && !oauthCallbackInProgress && (error.code === "session_not_found" || (error.message || "").includes("session_id claim"))) {
        // A leftover access token from an earlier session that was already
        // revoked server-side (e.g. by a prior sign-out or forced logout)
        // — the token itself hasn't expired yet, but the session it points
        // to no longer exists. Clear it so this resolves to a clean,
        // logged-out state instead of getting stuck here.
        try {
          Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") && k.endsWith("-auth-token")) localStorage.removeItem(k); });
        } catch (e) { /* best effort */ }
        setSession(null);
        return;
      }
      setSession(data.session);
      if (data.session) { setForceGoogleReauth(false); evaluatePinGate(data.session); }
      else setPinGate("checking");
    }).catch(() => { if (!cancelled) setSession(null); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      dbStorage.setUserId(newSession ? newSession.user.id : null);
      if (event === "SIGNED_IN") {
        // A genuine, active sign-in (as opposed to the page simply
        // restoring an already-logged-in session on load) should always
        // land on the dashboard, not wherever the user happened to be
        // when they last signed out.
        try { localStorage.setItem("tj-last-tab", "home"); } catch (e) { /* best effort */ }
      }
      setSession(newSession);
      if (newSession) { setForceGoogleReauth(false); evaluatePinGate(newSession); }
      else setPinGate("checking");
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While unlocked: track activity, and auto-lock after 3 hours of none.
  useEffect(() => {
    if (pinGate !== "unlocked") return;
    const markActive = () => localStorage.setItem("tj-last-active", String(Date.now()));
    markActive();
    let lastMark = Date.now();
    const throttledMark = () => {
      const now = Date.now();
      if (now - lastMark > 30000) { lastMark = now; markActive(); }
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, throttledMark, { passive: true }));

    const idleCheck = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem("tj-last-active") || "0", 10);
      if (Date.now() - lastActive > THREE_HOURS_MS) {
        sessionStorage.setItem("tj-idle-reload-flag", "1");
        sessionStorage.removeItem("tj-pin-unlocked");
        window.location.reload();
      }
    }, 60000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, throttledMark));
      clearInterval(idleCheck);
    };
  }, [pinGate]);

  const handleSignOutReset = async () => {
    try { await dbStorage.set("pin-reset-pending", JSON.stringify(true)); } catch (err) { /* best effort */ }
    setForceGoogleReauth(true);
    forceSignOutStale();
  };

  const handlePinChangedFromSettings = async (record) => {
    try { await dbStorage.set("security-pin", JSON.stringify(record)); } catch (err) { /* best effort */ }
    setPinRecord(record);
  };

  const handleSecurityQuestionsChangedFromSettings = async (record) => {
    try { await dbStorage.set("security-questions", JSON.stringify(record)); } catch (err) { /* best effort */ }
    setSecurityQuestions(record);
  };

  if (session === undefined) return <AppLoadingScreen />;
  if (session === null) return <LoginPage forceReauth={forceGoogleReauth} />;
  if (pinGate === "checking") return <AppLoadingScreen />;

  const pinOverlayActive = pinGate === "needs-setup" || pinGate === "needs-entry" || pinGate === "locked-out";

  if (pinGate === "unlocked" && pendingAuthorizationId) {
    try { sessionStorage.removeItem("pending-oauth-authorization-id"); } catch (e) { /* best effort */ }
    return <OAuthConsentPage authorizationId={pendingAuthorizationId} />;
  }

  return (
    <>
      <div className={pinOverlayActive ? "tj-blur-locked" : ""}>
        <PreTradeChecklist
          session={session} pinRecord={pinRecord} onPinChanged={handlePinChangedFromSettings}
          securityQuestions={securityQuestions} onSecurityQuestionsChanged={handleSecurityQuestionsChangedFromSettings}
          deletionCancelledNotice={deletionCancelledNotice} onDismissDeletionNotice={() => setDeletionCancelledNotice(false)}
          pinUnlocked={pinGate === "unlocked"}
        />
      </div>
      {pinGate === "needs-setup" && (
        <PinSetupScreen
          existingUser={!!pinRecord}
          hasExistingSecurityQuestions={!!(securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2)}
          onComplete={(newPinRecord, newSecurityQuestions) => {
            setPinRecord(newPinRecord);
            if (newSecurityQuestions !== undefined) setSecurityQuestions(newSecurityQuestions);
            setPinGate("unlocked");
          }}
        />
      )}
      {pinGate === "locked-out" && (
        <PinLockedOutScreen
          until={lockoutUntil} onSignOutReset={handleSignOutReset}
          onExpired={() => { setLockoutUntil(null); setPinGate("needs-entry"); }}
        />
      )}
      {pinGate === "needs-entry" && (
        <PinLockScreen
          pinRecord={pinRecord} securityQuestions={securityQuestions} greetingName={greetingName}
          onUnlock={() => setPinGate("unlocked")} onSignOutReset={handleSignOutReset}
          onLockout={(until) => { setLockoutUntil(until); setPinGate("locked-out"); }}
          onPinCleared={async () => {
            try { await dbStorage.delete("security-pin"); } catch (err) { /* best effort */ }
            setPinRecord(null);
            setPinGate("needs-setup");
          }}
        />
      )}
    </>
  );
}
