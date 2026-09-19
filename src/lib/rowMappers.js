import { fmtDateTimeDMY } from "./dateUtils.js";

// --- trades ---
export function tradeRowToJs(row) {
  return {
    id: row.id,
    entryDate: row.entry_date || "",
    exitDate: row.exit_date || "",
    underlying: row.underlying || "",
    strategyLabel: row.strategy_label || "",
    legsSummary: row.legs_summary || "",
    premiumSummary: row.premium_summary || "",
    ...(row.legs ? { legs: row.legs } : {}),
    ...(row.net_premium !== null && row.net_premium !== undefined ? { netPremium: row.net_premium } : {}),
    expiryDate: row.expiry_date || "",
    overallPL: row.overall_pl === null || row.overall_pl === undefined ? "" : String(row.overall_pl),
    notes: row.notes || "",
    affectsCapital: row.affects_capital,
    ...(row.exit_mood ? { exitMood: row.exit_mood } : {}),
    ...(row.exit_mood_note ? { exitMoodNote: row.exit_mood_note } : {}),
    screenshots: row.screenshots || [],
  };
}
export function tradeJsToRow(entry, userId) {
  return {
    id: entry.id,
    user_id: userId,
    entry_date: entry.entryDate || null,
    exit_date: entry.exitDate || null,
    underlying: entry.underlying || null,
    strategy_label: entry.strategyLabel || null,
    legs_summary: entry.legsSummary || null,
    premium_summary: entry.premiumSummary || null,
    legs: entry.legs || null,
    net_premium: entry.netPremium === undefined || entry.netPremium === null ? null : entry.netPremium,
    expiry_date: entry.expiryDate || null,
    overall_pl: entry.overallPL === "" || entry.overallPL === undefined || entry.overallPL === null ? null : parseFloat(entry.overallPL),
    notes: entry.notes || null,
    affects_capital: entry.affectsCapital !== false,
    exit_mood: entry.exitMood || null,
    exit_mood_note: entry.exitMoodNote || null,
    screenshots: entry.screenshots || [],
    updated_at: new Date().toISOString(),
  };
}
export function reminderRowToJs(row) {
  return {
    id: row.id,
    title: row.title || "",
    category: row.category || "personal",
    subcategory: row.subcategory || null,
    severity: row.severity || "blue",
    date: row.reminder_date || "",
    time: row.reminder_time || "",
    leadDays: row.lead_days || 0,
    linkedTradeId: row.linked_trade_id || "",
  };
}
export function reminderJsToRow(entry, userId) {
  return {
    id: entry.id,
    user_id: userId,
    title: entry.title || "",
    category: entry.category || "personal",
    subcategory: entry.subcategory || null,
    severity: entry.severity || "blue",
    reminder_date: entry.date || null,
    reminder_time: entry.time || null,
    lead_days: entry.leadDays || 0,
    linked_trade_id: entry.linkedTradeId || null,
    updated_at: new Date().toISOString(),
  };
}

// --- fund_transactions ---
export function fundTxRowToJs(row) {
  return { id: row.id, date: row.date || "", type: row.type, amount: row.amount };
}
export function fundTxJsToRow(tx, userId) {
  return { id: tx.id, user_id: userId, date: tx.date || null, type: tx.type, amount: tx.amount };
}

// --- notes (My Learnings) ---
// A "resource" is just a note with isResource true and a resourceUrl set —
// one table for both, rather than a separate bookmarks table, since the
// two only ever differ by a couple of fields and are always browsed side
// by side in the same tab.
export function noteRowToJs(row) {
  return {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    isResource: !!row.is_resource,
    resourceUrl: row.resource_url || "",
    isTemplate: !!row.is_template,
    linkedTradeId: row.linked_trade_id || "",
    linkedUnderlying: row.linked_underlying || "",
    linkedStrategy: row.linked_strategy || "",
    folderId: row.folder_id || null,
    starred: !!row.starred,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : Date.now() / 1000,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}
export function noteJsToRow(n, userId) {
  return {
    id: n.id,
    user_id: userId,
    title: n.title || "",
    content: n.content || "",
    tags: Array.isArray(n.tags) ? n.tags : [],
    is_resource: !!n.isResource,
    resource_url: n.resourceUrl || null,
    is_template: !!n.isTemplate,
    linked_trade_id: n.linkedTradeId || null,
    linked_underlying: n.linkedUnderlying || null,
    linked_strategy: n.linkedStrategy || null,
    folder_id: n.folderId || null,
    starred: !!n.starred,
    sort_order: typeof n.sortOrder === "number" ? n.sortOrder : Date.now() / 1000,
    updated_at: new Date().toISOString(),
  };
}

// --- note_folders ---
export function folderRowToJs(row) {
  return {
    id: row.id,
    name: row.name || "New Folder",
    parentId: row.parent_id || null,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : Date.now() / 1000,
    createdAt: row.created_at || null,
  };
}
export function folderJsToRow(f, userId) {
  return {
    id: f.id,
    user_id: userId,
    name: f.name || "New Folder",
    parent_id: f.parentId || null,
    sort_order: typeof f.sortOrder === "number" ? f.sortOrder : Date.now() / 1000,
  };
}

// --- checklist_history ---
export function historyRowToJs(row) {
  return {
    ts: Number(row.ts),
    dateLabel: fmtDateTimeDMY(Number(row.ts)),
    entryDate: row.entry_date || "",
    mode: row.mode,
    ...(row.pnl_id ? { pnlId: row.pnl_id } : {}),
    ...(row.fund_tx_id ? { fundTxId: row.fund_tx_id } : {}),
    strategyType: row.strategy_type,
    underlying: row.underlying,
    capital: row.capital,
    plannedLoss: row.planned_loss,
    pct: row.pct,
    totalChecked: row.total_checked,
    totalApplicable: row.total_applicable,
    ready: row.ready,
    expiryDate: row.expiry_date || null,
    daysToExpirySnapshot: row.days_to_expiry_snapshot,
    legs: row.legs,
    marketRead: row.market_read,
    dataPointsFilled: row.data_points_filled,
    dataReadsSnapshot: row.data_reads_snapshot || {},
    notes: row.notes || "",
    ...(row.amount !== null && row.amount !== undefined ? { amount: row.amount } : {}),
    ...(row.capital_after !== null && row.capital_after !== undefined ? { capitalAfter: row.capital_after } : {}),
    ...(row.changes ? { changes: row.changes } : {}),
    ...(row.entry_mood ? { entryMood: row.entry_mood } : {}),
    ...(row.entry_mood_note ? { entryMoodNote: row.entry_mood_note } : {}),
  };
}
export function historyJsToRow(entry, userId) {
  return {
    user_id: userId,
    ts: entry.ts,
    entry_date: entry.entryDate || null,
    mode: entry.mode,
    pnl_id: entry.pnlId || null,
    fund_tx_id: entry.fundTxId || null,
    strategy_type: entry.strategyType ?? null,
    underlying: entry.underlying ?? null,
    capital: entry.capital ?? null,
    planned_loss: entry.plannedLoss ?? null,
    pct: entry.pct ?? null,
    total_checked: entry.totalChecked ?? null,
    total_applicable: entry.totalApplicable ?? null,
    ready: entry.ready ?? null,
    expiry_date: entry.expiryDate || null,
    days_to_expiry_snapshot: entry.daysToExpirySnapshot ?? null,
    legs: entry.legs ?? null,
    market_read: entry.marketRead ?? null,
    data_points_filled: entry.dataPointsFilled ?? null,
    data_reads_snapshot: entry.dataReadsSnapshot ?? null,
    notes: entry.notes || null,
    amount: entry.amount ?? null,
    capital_after: entry.capitalAfter ?? null,
    changes: entry.changes ?? null,
    entry_mood: entry.entryMood || null,
    entry_mood_note: entry.entryMoodNote || null,
  };
}
