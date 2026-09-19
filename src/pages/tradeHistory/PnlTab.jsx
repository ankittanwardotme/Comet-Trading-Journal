import { useState, useEffect, useMemo } from "react";
import {
  IconCurrencyRupee, IconDownload, IconPlus, IconBook, IconPointFilled, IconArrowsExchange, IconX,
  IconDeviceFloppy, IconPencil, IconTrash, IconCheck, IconAlertTriangle,
} from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY, fmtINR, fmtINRsigned, fmt2dp } from "../../lib/format.js";
import { notify } from "../../lib/notifications.js";
import {
  localISODate, isoToDMY, computeLegPL, fmtDateDMY, nearestLegExpiry, groupLegsByPosition, formatLegLine,
  classifyLegSymbol, legsToParts, computeNetPremiumSigned, monthKeyOf, monthLabel,
} from "../../lib/dateUtils.js";
import { legsFromTemplate, buildLegChangeEvents, compareTradesNewestFirst } from "../../lib/exportEngine.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { InfoIcon } from "../../components/shared/InfoIcon.jsx";
import { MonthPicker } from "../../components/shared/MonthPicker.jsx";
import { YearPicker } from "../../components/shared/YearPicker.jsx";
import { CalendarPicker } from "../../components/shared/CalendarPicker.jsx";
import { DropdownFilterButton } from "../../components/shared/DropdownFilterButton.jsx";
import { MoodPickerButton } from "../../components/shared/MoodPickerButton.jsx";
import { TradeScreenshotsButton } from "../../components/shared/TradeScreenshotsButton.jsx";
import { ExpandableNoteField } from "../../components/shared/ExpandableNoteField.jsx";
import { StrategyPicker } from "../../components/shared/StrategyPicker.jsx";
import { EditableCell } from "./components/EditableCell.jsx";
import { NotesBadge } from "./components/NotesBadge.jsx";
import { LegsEditDialog } from "./components/LegsEditDialog.jsx";

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

export function PnlTab({
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
