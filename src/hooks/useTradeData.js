import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { dbTable, dbStorage, currentUserId, deleteTradeScreenshotFiles } from "../lib/supabaseClient.js";
import { notify, deleteWithUndo } from "../lib/notifications.js";
import { tradeRowToJs, tradeJsToRow, fundTxRowToJs, fundTxJsToRow, historyRowToJs, historyJsToRow } from "../lib/rowMappers.js";
import { freshPnlId } from "../lib/exportEngine.js";
import {
  localISODate, isoToShortDate, isoToWordDate, fmtTimeOnly, monthKeyOf, monthLabel, isWeekendISO,
} from "../lib/dateUtils.js";
import { fmtINR } from "../lib/format.js";
import { buildMarkdownFromHistory, buildPnlMarkdown, buildPnlDetailPDF, buildLogDetailPDF, buildLogsDetailPDF, logCategoryName } from "../lib/exportEngine.js";

// Trade History + Trade Log: the P&L ledger (pnlEntries), the checklist/log
// timeline (history — every trade check, no-trade observation, and funds
// deposit/withdrawal, since they all render in the same Trade Log list),
// funds & monthly charges, and every export/download/Add-Trade flow that
// reads or writes them. Kept as one hook (not split further) because a
// trade and its log entry are created and deleted together via a real
// foreign key (pnlId) — splitting pnlEntries from history would mean two
// hooks constantly reaching into each other's setters for routine writes.
export function useTradeData({ getHolidays, strategyLabelLookup }) {
  const [pnlEntries, setPnlEntries] = useState([]);
  const [pnlLoading, setPnlLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [monthlyCharges, setMonthlyCharges] = useState({});
  const [monthlyChargesLoading, setMonthlyChargesLoading] = useState(true);
  const [capitalBase, setCapitalBase] = useState(0);
  const [capitalBaseLoading, setCapitalBaseLoading] = useState(true);
  const [fundTransactions, setFundTransactions] = useState([]);
  const [fundTransactionsLoading, setFundTransactionsLoading] = useState(true);
  const [manageFundsDialogOpen, setManageFundsDialogOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => localISODate(Date.now()).slice(0, 7));
  const [pnlPendingDeleteId, setPnlPendingDeleteId] = useState(null);
  const [deletingHistoryTs, setDeletingHistoryTs] = useState(null);
  const [deletingPnlId, setDeletingPnlId] = useState(null);
  const [pendingRevealTradeId, setPendingRevealTradeId] = useState(null);
  const [pendingDeleteTs, setPendingDeleteTs] = useState(null);
  const [entryDownloadFor, setEntryDownloadFor] = useState(null);
  const [logRangeCustomOpen, setLogRangeCustomOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [moodFilterPoint, setMoodFilterPoint] = useState(null); // null | "entry" | "exit"
  const [moodFilterMood, setMoodFilterMood] = useState(null); // null (Any) | mood id
  const [moodFilterRefine, setMoodFilterRefine] = useState(null); // null (Any) | "same" | "changed"
  const [historyPage, setHistoryPage] = useState(1);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadDialogClosing, setDownloadDialogClosing] = useState(false);
  const [downloadTypes, setDownloadTypes] = useState({ observation: true, trade: true, funds_added: true, funds_withdrawn: true });

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
    return () => { cancelled = true; };
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

  useEffect(() => { setHistoryPage(1); }, [rangeFrom, rangeTo]);

  const capitalAffectingPL = useMemo(
    () => pnlEntries.reduce((s, e) => (e.affectsCapital !== false ? s + (parseFloat(e.overallPL) || 0) : s), 0),
    [pnlEntries]
  );
  const lifetimeChargesTotal = useMemo(
    () => Object.values(monthlyCharges || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [monthlyCharges]
  );
  const totalCapital = capitalBase + capitalAffectingPL - lifetimeChargesTotal;

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

  const setMonthlyCharge = useCallback((monthKey, value) => setMonthlyCharges((prev) => ({ ...prev, [monthKey]: value })), []);

  // For the shell's "clear my data" flow, which wipes trading data wholesale
  // rather than through the normal per-row edit path — nothing pending
  // should get upserted after the underlying rows have just been deleted.
  const clearDirtyPnlIds = () => { dirtyPnlIdsRef.current = new Set(); };

  const isNonBusinessDayISO = (iso, holidayList) => {
    if (!iso) return false;
    return isWeekendISO(iso) || (holidayList || []).some((h) => h.date === iso);
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

  const addFundTransaction = async (type, amount, date, notesText) => {
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
      notes: notesText || "",
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
  const resolvePastTradeDisplay = (h, totalCapitalForDisplay) => {
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
        capital: totalCapitalForDisplay ?? null,
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

  const openLogAsPdf = async (h, totalCapitalForDisplay) => {
    const enriched = resolvePastTradeDisplay(h, totalCapitalForDisplay);
    const filenameBase = getEntryFilenameBase(h, enriched);
    try {
      const doc = await buildLogDetailPDF(enriched, strategyLabelLookup);
      doc.save(`${filenameBase}.pdf`);
      notify(`Log entry downloaded — ${enriched.underlying ? enriched.underlying + ", " : ""}${isoToShortDate(enriched.entryDate || localISODate(h.ts))}.`);
    } catch (err) {
      notify("Couldn't generate the PDF — please try again.", "error");
    }
  };

  const downloadLogEntryAsMarkdown = (h, totalCapitalForDisplay) => {
    const enriched = resolvePastTradeDisplay(h, totalCapitalForDisplay);
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
    notify(`Log entry downloaded — ${enriched.underlying ? enriched.underlying + ", " : ""}${isoToShortDate(enriched.entryDate || localISODate(h.ts))}.`);
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

  const openAddTradeDialog = () => {
    const today = localISODate(Date.now());
    // Don't default to today if today itself isn't a valid trade date (a
    // weekend or holiday) — silently prefilling an invalid date is exactly
    // how a Saturday could slip through if the user just clicks straight
    // through without noticing. Leave it blank instead, forcing a
    // conscious pick from the (already weekend/holiday-blocked) calendar.
    setAddTradeDate(isNonBusinessDayISO(today, getHolidays()) ? "" : today);
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
    if (!addTradeDate || isNonBusinessDayISO(addTradeDate, getHolidays())) return; // defensive guard — the button itself is disabled for this case
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

  const getScopedDownloadEntries = () => filterEntriesByTypes(filtered, downloadTypes).map((h) => resolvePastTradeDisplay(h));

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

  const pageSize = 10;
  const totalHistoryPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(historyPage, totalHistoryPages);
  const pagedHistory = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  return {
    pnlEntries, setPnlEntries, pnlLoading, history, setHistory, historyLoading,
    monthlyCharges, setMonthlyCharges, monthlyChargesLoading, capitalBase, setCapitalBase, capitalBaseLoading,
    fundTransactions, setFundTransactions, fundTransactionsLoading, manageFundsDialogOpen, setManageFundsDialogOpen,
    selectedMonthKey, setSelectedMonthKey, pnlPendingDeleteId, setPnlPendingDeleteId,
    deletingHistoryTs, deletingPnlId, pendingRevealTradeId, setPendingRevealTradeId,
    pendingDeleteTs, setPendingDeleteTs, entryDownloadFor, setEntryDownloadFor, logRangeCustomOpen, setLogRangeCustomOpen,
    rangeFrom, setRangeFrom, rangeTo, setRangeTo,
    moodFilterPoint, setMoodFilterPoint, moodFilterMood, setMoodFilterMood, moodFilterRefine, setMoodFilterRefine,
    historyPage, setHistoryPage, downloadDialogOpen, downloadDialogClosing, downloadTypes,
    addTradeDialogOpen, addTradeDialogClosing, addTradeDate, setAddTradeDate, addTradeAffectsCapital, setAddTradeAffectsCapital,
    addTradeMoodStepTs, addTradeSelectedMood, setAddTradeSelectedMood, newTradeIdToEdit, setNewTradeIdToEdit,
    pnlExportScope, setPnlExportScope, pnlExportMonth, setPnlExportMonth, pnlExportYear, setPnlExportYear,
    pnlExportRangeFrom, setPnlExportRangeFrom, pnlExportRangeTo, setPnlExportRangeTo,
    capitalAffectingPL, lifetimeChargesTotal, totalCapital,
    updatePnlEntry, recordTradeChange, setMonthlyCharge, isNonBusinessDayISO, clearDirtyPnlIds,
    deleteEntry, confirmDeleteEntry, addFundTransaction, resolvePastTradeDisplay,
    openLogAsPdf, downloadLogEntryAsMarkdown, deletePnlEntry, confirmDeletePnlEntry,
    openAddTradeDialog, closeAddTradeDialog, confirmAddTrade, saveAddTradeMood, skipAddTradeMood,
    sortedHistory, filtered, openDownloadDialog, closeDownloadDialog, toggleDownloadType,
    getLogRangeLabel, getScopedDownloadEntries, confirmDownload, confirmDownloadPdf,
    getPnlExportScope, downloadPnlMarkdown, viewPnlAsPdf,
    setPresetToday, setPresetWeek, setPresetMonth, setPresetAll, activeRangePreset,
    totalHistoryPages, clampedPage, pagedHistory,
  };
}
