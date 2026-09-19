import { useState, useEffect, useMemo, useCallback } from "react";
import { dbStorage, dbTable, currentUserId } from "../lib/supabaseClient.js";
import { notify } from "../lib/notifications.js";
import { historyJsToRow, tradeJsToRow } from "../lib/rowMappers.js";
import { playErrorBeep } from "../lib/audio.js";
import {
  localISODate, fmtDateTimeDMY, daysUntil, nearestLegExpiry, isLegComplete, computeStrategyPayoff,
  legsToParts, computeNetPremiumSigned, monthKeyOf,
} from "../lib/dateUtils.js";
import {
  DEFAULT_STRATEGIES, slugify, makeUniqueId, DEFAULT_SECTION_DEFS, buildEffectiveSections, freshChecklistItemId,
} from "../lib/checklistLogic.js";
import { freshLegId, freshPnlId, legsFromTemplate } from "../lib/exportEngine.js";
import { DATA_ROWS, getVerdict } from "../lib/marketRead.js";

// The pre-trade checklist + trade-setup form: everything from "which
// strategy/legs am I setting up" through "did I check every critical box"
// to "save this check" (which, for a real trade day, also creates the
// linked P&L row — hence the setHistory/setPnlEntries/setSelectedMonthKey
// callbacks passed in from useTradeData at the call site, rather than this
// hook reaching into that domain directly).
export function useChecklistState({
  topTab, setTopTab, totalCapital, capitalBaseLoading, fundTransactionsLoading, pnlLoading, monthlyChargesLoading,
  setHistory, setPnlEntries, setSelectedMonthKey,
}) {
  const [mode, setMode] = useState("trade");
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
  const [saveStatus, setSaveStatus] = useState("idle");
  const [incompleteChecklistDialogOpen, setIncompleteChecklistDialogOpen] = useState(false);
  const [checklistManagerOpen, setChecklistManagerOpen] = useState(false);

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
        const res = await dbStorage.get("custom-strategies");
        if (!cancelled) { const parsed = res && res.value ? JSON.parse(res.value) : []; setCustomStrategies(Array.isArray(parsed) ? parsed : []); }
      } catch (err) { /* no custom strategies yet */ }
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (checklistOverridesLoading) return;
    const t = setTimeout(() => {
      dbStorage.set("checklist-config", JSON.stringify(checklistOverrides)).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [checklistOverrides, checklistOverridesLoading]);

  useEffect(() => { if (mode === "no_trade" && topTab === "setup") setTopTab("checklist"); }, [mode, topTab, setTopTab]);
  useEffect(() => { if (mode === "no_trade") setActiveTab("data"); }, [mode]);
  useEffect(() => { if (mode === "no_trade") setChecklistManagerOpen(false); }, [mode]);
  useEffect(() => { setLegs(legsFromTemplate(strategyType, customStrategies)); }, [strategyType]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const applicableItems = useMemo(() => applicableItemsFor(profile, strategyType), [profile, strategyType, sections]); // eslint-disable-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return {
    mode, setMode, handleModeToggle,
    customStrategies, setCustomStrategies, checklistOverrides, checklistOverridesLoading, sections,
    strategyType, setStrategyType, strategyCategory, setStrategyCategory,
    showAddStrategy, setShowAddStrategy, editingStratId, setEditingStratId,
    showManageStrategies, setShowManageStrategies, pendingDeleteStratId, setPendingDeleteStratId,
    underlying, setUnderlying, legs, addLeg, removeLeg, updateLeg,
    checked, toggleItem, toggleAllInSection,
    region2Animated, specialSlideActive, contentUsesSpecialSlide,
    capital, setCapital, plannedLoss, setPlannedLoss, customRiskPct, setCustomRiskPct,
    targetRiskPct, targetRiskLoading, editingTargetRisk, setEditingTargetRisk, targetRiskDraft, setTargetRiskDraft,
    saveTargetRiskPct, applyRiskPct, activeRiskPct, capNum, lossNum, pct, riskEdgePct, pctColor, pctVerdict,
    notes, setNotes, screenshots, setScreenshots,
    entryMood, setEntryMood, entryMoodNote, setEntryMoodNote, entryMoodNoteOpen, setEntryMoodNoteOpen,
    entryMoodNoteDraft, setEntryMoodNoteDraft, expiryDate,
    dataReads, setDataRow, activeTab, setActiveTab,
    saveStatus, incompleteChecklistDialogOpen, setIncompleteChecklistDialogOpen, checklistManagerOpen, setChecklistManagerOpen,
    allStrategies, strategiesInCategory, strategyLabelLookup, currentStrategy, profile,
    netPremium, payoffInfo, applicableItemsFor, applicableItems, totalApplicable, totalChecked,
    criticalApplicable, missingCritical, readyToTrade, legsComplete, itemToSection,
    marketAvg, marketVerdict, progressPct, tabs, activeSection,
    addCustomStrategy, editCustomStrategy, deleteCustomStrategy,
    addChecklistItem, editChecklistItem, deleteChecklistItem, editChecklistSectionTitle, addChecklistSection, deleteChecklistSection,
    handleSaveClick, saveCheck, resetTradeSetup, startNewCheck,
  };
}
