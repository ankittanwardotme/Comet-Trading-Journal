import {
  fmtDateDMY, fmtDateTimeDMY, isoToDMY, formatLegLine, classifyLegSymbol, computeLegPL, drawPdfMasthead,
  monthKeyOf, monthLabel, localISODate,
} from "./dateUtils.js";
import { fmtINR, fmtINRsigned, fmt2dp } from "./format.js";
import { moodMeta } from "./moodOptions.js";
import { DATA_ROWS, dataReadLabel } from "./marketRead.js";
import { LEG_TEMPLATES } from "./checklistLogic.js";
import { parseNoteBlocks, blockInlineText, formatNoteLinks } from "./noteBlocks.js";

/* ============== PDF generation helpers ==============
   jsPDF's built-in fonts only support basic Latin — the rupee symbol (₹)
   and other characters used throughout this app render as garbage without
   a custom font. DejaVu Sans (subsetted to just the ~20 characters this
   app actually needs, ~35KB total) is embedded and dynamically imported
   so it's code-split rather than bundled into the main app. */
export async function createPdfDoc(orientation) {
  const [{ jsPDF }, autoTableModule, { DEJAVU_SANS_NORMAL_B64 }, { DEJAVU_SANS_BOLD_B64 }, { JOST_SEMIBOLD_B64 }, { LOGO_PNG_B64, LOGO_ASPECT_RATIO }, { MOOD_EMOJI_PNG_B64 }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("../fonts/dejavu-sans-normal.js"),
    import("../fonts/dejavu-sans-bold.js"),
    import("../fonts/jost-semibold.js"),
    import("../fonts/logo-pdf.js"),
    import("../fonts/mood-emoji.js"),
  ]);
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  doc.addFileToVFS("DejaVuSans.ttf", DEJAVU_SANS_NORMAL_B64);
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", DEJAVU_SANS_BOLD_B64);
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  doc.addFileToVFS("JostSemiBold.ttf", JOST_SEMIBOLD_B64);
  doc.addFont("JostSemiBold.ttf", "JostSemiBold", "bold");
  doc.setFont("DejaVuSans", "normal");
  return { doc, autoTable: autoTableModule.default, logoB64: LOGO_PNG_B64, logoAspect: LOGO_ASPECT_RATIO, moodEmojiB64: MOOD_EMOJI_PNG_B64 };
}

export function logCategoryName(h) {
  if (h.mode === "no_trade") return "observation";
  if (h.mode === "funds_added") return "funds_added";
  if (h.mode === "funds_withdrawn") return "withdrawal";
  return "trade"; // "trade" and "past_trade" (unified into one category) both count as trade
}
export function pastTradeTitle(h) {
  const parts = [];
  if (h.underlying) parts.push(h.underlying);
  if (h.strategyLabel) parts.push(h.strategyLabel);
  return parts.length > 0 ? parts.join(" — ") : "Trade";
}

// Diffs the leg arrays from before/after a legs-edit session into structured
// events — which legs got closed (with their realized P/L) and which got
// newly opened — so the change log can narrate what actually happened
// instead of just showing two summary strings side by side.
export function buildLegChangeEvents(oldLegs, newLegs) {
  const oldById = new Map((oldLegs || []).map((l) => [l.id, l]));
  const events = [];
  (newLegs || []).forEach((l) => {
    const prior = oldById.get(l.id);
    if (!prior && !l._locked) {
      // A brand-new leg that didn't exist before this session at all.
      events.push({ kind: "opened", leg: l, classification: classifyLegSymbol(l) });
    } else if (prior && !prior.closedAt && l.closedAt) {
      // Existed before, wasn't closed then, is closed now — closed in this session.
      events.push({ kind: "closed", leg: l, classification: classifyLegSymbol(l), pl: computeLegPL(l) });
    }
  });
  return events;
}
function legEventLine(ev) {
  const kindLabel = ev.classification === "rolled" ? "Roll" : ev.classification === "hedge" ? "Adjustment" : ev.classification === "partial-close" ? "Partial Close" : ev.kind === "opened" ? "Adjustment" : "Update";
  const legDesc = `${ev.leg.action || ""} ${ev.leg.type || ""}${ev.leg.strike ? " " + ev.leg.strike : ""}`.trim();
  if (ev.kind === "closed") {
    const plStr = ev.pl !== null ? `for ${ev.pl >= 0 ? "+" : ""}${fmtINR(ev.pl)}` : "";
    return `${kindLabel}: closed ${legDesc} ${plStr}`.trim();
  }
  return `${kindLabel}: opened ${legDesc} at ${fmt2dp(ev.leg.premium)}`;
}

function formatChangeEntry(c) {
  if (c.type === "notes") return "Updated notes.";
  if (c.type === "legs") {
    if (c.legEvents && c.legEvents.length > 0) return c.legEvents.map(legEventLine).join("; ");
    return `Legs updated: ${c.from} → ${c.to}`;
  }
  if (c.type === "fields" && c.changes) return c.changes.map((fc) => `${fc.field}: ${fc.from} → ${fc.to}`).join("; ");
  return "Updated.";
}
function pushChangesLines(lines, h) {
  const changesArr = h.changes || [];
  if (changesArr.length === 0) return;
  const last = changesArr[changesArr.length - 1];
  lines.push("", `_Last updated on ${fmtDateDMY(last.ts)}: ${formatChangeEntry(last)}_`);
  lines.push("", "**Changes**");
  changesArr.forEach((c) => lines.push("- " + fmtDateDMY(c.ts) + " — " + formatChangeEntry(c)));
}

function createLogEntryHelpers(doc, autoTable, marginX, contentWidth, pageHeight, yRef, moodEmojiB64) {
  const ensureRoom = (needed) => {
    if (yRef.y + needed > pageHeight - 16) { doc.addPage(); yRef.y = 18; }
  };
  const addHeading = (text, color) => {
    ensureRoom(8);
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...(color || [24, 24, 27]));
    doc.text(`${text}:`, marginX, yRef.y);
    yRef.y += 4.7;
  };
  const addParagraph = (label, value, labelColor, valueColor) => {
    if (value === undefined || value === null || value === "") return;
    doc.setFontSize(8.5);
    const text = `${label}: ${value}`;
    const wrapped = doc.splitTextToSize(text, contentWidth);
    ensureRoom(wrapped.length * 4.2 + 2);
    doc.setFont("DejaVuSans", "bold");
    doc.setTextColor(...(labelColor || [24, 24, 27]));
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.text(`${label}: `, marginX, yRef.y);
    doc.setFont("DejaVuSans", "normal");
    doc.setTextColor(...(valueColor || [39, 39, 42]));
    const restWrapped = doc.splitTextToSize(String(value), contentWidth - labelWidth);
    restWrapped.forEach((line, i) => {
      doc.text(line, marginX + (i === 0 ? labelWidth : 0), yRef.y + i * 4.2);
    });
    yRef.y += Math.max(1, restWrapped.length) * 4.2 + 2.5;
  };
  const addPlainParagraph = (text) => {
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(39, 39, 42);
    const wrapped = doc.splitTextToSize(text, contentWidth);
    ensureRoom(wrapped.length * 4.2 + 4);
    wrapped.forEach((line, i) => doc.text(line, marginX, yRef.y + i * 4.2));
    yRef.y += wrapped.length * 4.2 + 4;
  };
  const addLegsList = (legs, underlying) => {
    addHeading("Strategy Legs");
    doc.setFontSize(8);
    legs.forEach((l) => {
      const line = formatLegLine(l, underlying);
      const action = (l.action || "").toUpperCase();
      const rest = line.slice(action.length).trim();
      doc.setFont("DejaVuSans", "normal");
      const actionWidth = doc.getTextWidth(action) + 1.2;
      const wrapped = doc.splitTextToSize(rest, contentWidth - 6 - actionWidth);
      ensureRoom(wrapped.length * 4 + 1.5);
      const color = action === "BUY" ? [37, 99, 235] : action === "SELL" ? [220, 38, 38] : [39, 39, 42];
      doc.setTextColor(...color);
      doc.text("•", marginX, yRef.y);
      doc.text(action, marginX + 4, yRef.y);
      doc.setTextColor(39, 39, 42);
      wrapped.forEach((line2, i) => doc.text(line2, marginX + 4 + (i === 0 ? actionWidth : 0), yRef.y + i * 4));
      yRef.y += wrapped.length * 4 + 1;
    });
    yRef.y += 2.5;
  };
  const addMarketReadTable = (rows, overallValue) => {
    addHeading("Market Read");
    const body = rows.map((row) => [row.label, row.value]);
    body.push(["Overall Market Read", overallValue || "—"]);
    autoTable(doc, {
      startY: yRef.y,
      margin: { left: marginX, right: marginX },
      body,
      theme: "plain",
      styles: { font: "DejaVuSans", fontSize: 8.5, cellPadding: 2, valign: "top", lineColor: [228, 228, 231], lineWidth: 0.1 },
      columnStyles: { 0: { cellWidth: contentWidth * 0.5, textColor: [82, 82, 91] }, 1: { cellWidth: contentWidth * 0.5 } },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) data.cell.styles.fontStyle = "bold";
      },
    });
    yRef.y = doc.lastAutoTable.finalY + 5;
  };
  const addChangesList = (changesArr) => {
    addHeading("Changes", [82, 82, 91]);
    doc.setFontSize(8);
    doc.setFont("DejaVuSans", "normal");
    doc.setTextColor(63, 63, 70);
    changesArr.forEach((c, idx) => {
      const text = `${fmtDateDMY(c.ts)} — ${formatChangeEntry(c)}`;
      const wrapped = doc.splitTextToSize(text, contentWidth - 5);
      ensureRoom(wrapped.length * 3.9 + 1);
      doc.text(`${idx + 1}.`, marginX, yRef.y);
      wrapped.forEach((line, i) => doc.text(line, marginX + 5, yRef.y + i * 3.9));
      yRef.y += wrapped.length * 3.9 + 1;
    });
    yRef.y += 2.5;
  };
  const addMoodParagraph = (label, moodId) => {
    if (!moodId) return;
    const meta = moodMeta(moodId);
    const moodLabel = meta ? meta.label : moodId;
    const imgSize = 4.2;
    doc.setFontSize(8.5);
    doc.setFont("DejaVuSans", "bold");
    doc.setTextColor(24, 24, 27);
    const labelText = `${label}: `;
    const labelWidth = doc.getTextWidth(labelText);
    ensureRoom(imgSize + 1);
    doc.text(labelText, marginX, yRef.y);
    const png = moodEmojiB64 && moodEmojiB64[moodId];
    let textX = marginX + labelWidth;
    if (png) {
      // Baseline-align the small image with the text line rather than
      // top-aligning it, which would look like it's floating above the text.
      doc.addImage(`data:image/png;base64,${png}`, "PNG", textX, yRef.y - imgSize + 1.1, imgSize, imgSize);
      textX += imgSize + 1.3;
    }
    doc.setFont("DejaVuSans", "normal");
    doc.setTextColor(39, 39, 42);
    doc.text(moodLabel, textX, yRef.y);
    yRef.y += 6.2;
  };
  return { ensureRoom, addHeading, addParagraph, addPlainParagraph, addLegsList, addMarketReadTable, addChangesList, addMoodParagraph };
}

function renderLogEntryBody(h, strategyLabelLookup, helpers) {
  const { addHeading, addParagraph, addPlainParagraph, addLegsList, addMarketReadTable, addChangesList, addMoodParagraph } = helpers;
  const isPastTrade = h.mode === "past_trade";
  const isFundsEntry = h.mode === "funds_added" || h.mode === "funds_withdrawn";
  const changesArr = h.changes || [];
  const lastChange = changesArr.length > 0 ? changesArr[changesArr.length - 1] : null;
  const PL_POS = [4, 180, 136], PL_NEG = [241, 94, 59];
  const addMoodLines = () => {
    addMoodParagraph("Entry mood", h.entryMood);
    addMoodParagraph("Exit mood", h.exitMood);
  };

  if (isFundsEntry) {
    addParagraph(h.mode === "funds_added" ? "Amount added" : "Amount withdrawn", fmtINR(h.amount));
    if (h.capitalAfter !== undefined && h.capitalAfter !== null) addParagraph("Total capital after transaction", fmtINRsigned(h.capitalAfter));
    if (h.notes) { addHeading("Note"); addPlainParagraph(h.notes); }
  } else if (isPastTrade) {
    if (h.underlying) addParagraph("Underlying", h.underlying);
    if (h.capital) addParagraph("Total capital", fmtINRsigned(h.capital));
    addParagraph("Trade date", isoToDMY(h.entryDate));
    if (h.legs && h.legs.length) addLegsList(h.legs, h.underlying);
    if (h.exitDate) addParagraph("Exit date", isoToDMY(h.exitDate));
    if (h.overallPL) {
      const plVal = parseFloat(h.overallPL) || 0;
      addParagraph("P/L", fmtINRsigned(plVal), null, plVal >= 0 ? PL_POS : PL_NEG);
    }
    if (h.notes) { addHeading("Note"); addPlainParagraph(h.notes); }
    addMoodLines();
    if (lastChange) addParagraph("Last updated", `${fmtDateDMY(lastChange.ts)}: ${formatChangeEntry(lastChange)}`, [82, 82, 91]);
    if (changesArr.length > 0) addChangesList(changesArr);
  } else {
    if (h.mode !== "no_trade") {
      if (h.underlying) addParagraph("Underlying", h.underlying);
      if (h.capital) addParagraph("Capital", fmtINR(h.capital));
      if (h.plannedLoss) addParagraph("Planned max loss", `${fmtINR(h.plannedLoss)}${h.pct !== null && h.pct !== undefined ? " (" + h.pct.toFixed(2) + "% of capital)" : ""}`);
      addParagraph("Trade date", isoToDMY(h.entryDate));
      if (h.legs && h.legs.length) addLegsList(h.legs, h.underlying);
      if (h.exitDate) addParagraph("Exit date", isoToDMY(h.exitDate));
      if (h.overallPL) {
        const plVal = parseFloat(h.overallPL) || 0;
        addParagraph("P/L", fmtINRsigned(plVal), null, plVal >= 0 ? PL_POS : PL_NEG);
      }
    }
    const rows = DATA_ROWS.map((row) => ({ label: row.label, value: dataReadLabel(h.dataReadsSnapshot ? h.dataReadsSnapshot[row.id] : undefined) }));
    addMarketReadTable(rows, h.marketRead);
    if (h.notes) { addHeading("Note"); addPlainParagraph(h.notes); }
    addMoodLines();
    if (lastChange) addParagraph("Last updated", `${fmtDateDMY(lastChange.ts)}: ${formatChangeEntry(lastChange)}`, [82, 82, 91]);
    if (changesArr.length > 0) addChangesList(changesArr);
  }
}

function logEntryTitle(h, strategyLabelLookup) {
  const isPastTrade = h.mode === "past_trade";
  return h.mode === "no_trade" ? "No-Trade Day — Observation" : isPastTrade ? pastTradeTitle(h) : h.mode === "funds_added" ? "Funds Added" : h.mode === "funds_withdrawn" ? "Withdrawal" : `${h.underlying ? h.underlying + " — " : ""}${strategyLabelLookup(h.strategyType)}`;
}

export async function buildLogDetailPDF(h, strategyLabelLookup) {
  const { doc, autoTable, logoB64, logoAspect, moodEmojiB64 } = await createPdfDoc("portrait");
  const marginX = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const mastheadBottom = drawPdfMasthead(doc, logoB64, logoAspect, pageWidth);
  const yRef = { y: mastheadBottom + 4 };
  const helpers = createLogEntryHelpers(doc, autoTable, marginX, contentWidth, pageHeight, yRef, moodEmojiB64);

  const title = logEntryTitle(h, strategyLabelLookup);
  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(14);
  doc.setTextColor(9, 9, 11);
  const titleWrapped = doc.splitTextToSize(`${h.dateLabel} — ${title}`, contentWidth);
  titleWrapped.forEach((line, i) => doc.text(line, marginX, yRef.y + i * 6.5));
  yRef.y += titleWrapped.length * 6.5 + 2;
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.2);
  doc.line(marginX, yRef.y, pageWidth - marginX, yRef.y);
  yRef.y += 8;

  renderLogEntryBody(h, strategyLabelLookup, helpers);

  helpers.ensureRoom(8);
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(161, 161, 170);
  doc.text("See the P&L log for full trade details.", marginX, yRef.y + 4);

  return doc;
}

export async function buildLogsDetailPDF(entries, rangeLabel, strategyLabelLookup) {
  const { doc, autoTable, logoB64, logoAspect, moodEmojiB64 } = await createPdfDoc("portrait");
  const marginX = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const mastheadBottom = drawPdfMasthead(doc, logoB64, logoAspect, pageWidth);
  const yRef = { y: mastheadBottom + 4 };
  const helpers = createLogEntryHelpers(doc, autoTable, marginX, contentWidth, pageHeight, yRef, moodEmojiB64);

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(15);
  doc.setTextColor(9, 9, 11);
  doc.text("Trade Log", marginX, yRef.y);
  yRef.y += 6;
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(`Range: ${rangeLabel} · Exported: ${fmtDateTimeDMY(Date.now())}`, marginX, yRef.y);
  yRef.y += 6;
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.2);
  doc.line(marginX, yRef.y, pageWidth - marginX, yRef.y);
  yRef.y += 8;

  if (entries.length === 0) {
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(11);
    doc.setTextColor(39, 39, 42);
    doc.text("No entries in this range.", marginX, yRef.y + 4);
    return doc;
  }

  entries.forEach((h, idx) => {
    if (idx > 0) helpers.ensureRoom(14);
    const title = logEntryTitle(h, strategyLabelLookup);
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    const entryTitleWrapped = doc.splitTextToSize(`${h.dateLabel} — ${title}`, contentWidth);
    helpers.ensureRoom(entryTitleWrapped.length * 5.5 + 4);
    entryTitleWrapped.forEach((line, i) => doc.text(line, marginX, yRef.y + i * 5.5));
    yRef.y += entryTitleWrapped.length * 5.5 + 4;

    renderLogEntryBody(h, strategyLabelLookup, helpers);

    helpers.ensureRoom(6);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.2);
    doc.line(marginX, yRef.y, pageWidth - marginX, yRef.y);
    yRef.y += 10;
  });

  helpers.ensureRoom(8);
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(161, 161, 170);
  doc.text("See the P&L log for full trade details.", marginX, yRef.y + 4);

  return doc;
}

export function buildMarkdownFromHistory(entries, rangeLabel, strategyLabelLookup) {
  const lines = [];
  lines.push("# Trade Log", "", "Range: " + rangeLabel,
    "Exported: " + fmtDateTimeDMY(Date.now()), "", "---");
  if (entries.length === 0) { lines.push("", "_No entries in this range._"); }
  entries.forEach((h) => {
    lines.push("");
    const bits = [h.dateLabel];
    if (h.mode === "no_trade") bits.push("No-Trade Day — Observation");
    else if (h.mode === "past_trade") bits.push(pastTradeTitle(h));
    else if (h.mode === "funds_added") bits.push("Funds Added");
    else if (h.mode === "funds_withdrawn") bits.push("Withdrawal");
    else bits.push(`${h.underlying ? h.underlying + " — " : ""}${strategyLabelLookup(h.strategyType)}`);
    lines.push("## " + bits.join(" — "), "");
    if (h.mode === "funds_added" || h.mode === "funds_withdrawn") {
      lines.push("- " + (h.mode === "funds_added" ? "Amount added: " : "Amount withdrawn: ") + fmtINR(h.amount));
      if (h.capitalAfter !== undefined && h.capitalAfter !== null) lines.push("- Total capital after transaction: " + fmtINRsigned(h.capitalAfter));
      if (h.notes) lines.push("", "Note: " + h.notes);
      return;
    }
    if (h.mode === "past_trade") {
      if (h.underlying) lines.push("- Underlying: " + h.underlying);
      if (h.capital) lines.push("- Total capital: " + fmtINRsigned(h.capital));
      lines.push("- Trade date: " + isoToDMY(h.entryDate));
      if (h.expiryDate) lines.push("- Expiry date: " + isoToDMY(h.expiryDate));
      if (h.legs && h.legs.length) {
        lines.push("- Strategy Legs:");
        h.legs.forEach((leg) => {
          lines.push("  - " + formatLegLine(leg, h.underlying));
        });
      }
      if (h.exitDate) lines.push("- Exit date: " + isoToDMY(h.exitDate));
      if (h.overallPL) lines.push("- P/L: " + fmtINRsigned(parseFloat(h.overallPL) || 0));
      if (h.notes) lines.push("", "Note: " + h.notes);
      pushChangesLines(lines, h);
      return;
    }
    if (h.mode !== "no_trade") {
      if (h.underlying) lines.push("- Underlying: " + h.underlying);
      if (h.capital) lines.push("- Capital: " + fmtINR(h.capital));
      if (h.plannedLoss) lines.push("- Planned max loss: " + fmtINR(h.plannedLoss) + (h.pct !== null && h.pct !== undefined ? " (" + h.pct.toFixed(2) + "% of capital)" : ""));
      lines.push("- Trade date: " + isoToDMY(h.entryDate));
      if (h.expiryDate) lines.push("- Expiry date: " + isoToDMY(h.expiryDate) + (h.daysToExpirySnapshot !== null && h.daysToExpirySnapshot !== undefined ? " (" + h.daysToExpirySnapshot + " days at log time)" : ""));
      if (h.legs && h.legs.length) {
        lines.push("- Strategy Legs:");
        h.legs.forEach((leg) => {
          lines.push("  - " + formatLegLine(leg, h.underlying));
        });
      }
      if (h.exitDate) lines.push("- Exit date: " + isoToDMY(h.exitDate));
      if (h.overallPL) lines.push("- P/L: " + fmtINRsigned(parseFloat(h.overallPL) || 0));
    }
    lines.push("", "| Data Point | Reading |", "|---|---|");
    DATA_ROWS.forEach((row) => {
      const val = h.dataReadsSnapshot ? h.dataReadsSnapshot[row.id] : undefined;
      lines.push(`| ${row.label} | ${dataReadLabel(val)} |`);
    });
    lines.push(`| **Overall Market Read** | **${h.marketRead || "—"}** |`);
    if (h.notes) lines.push("", "Note: " + h.notes);
    pushChangesLines(lines, h);
  });
  lines.push("", "---", "", "_See the P&L log for full trade details._");
  return lines.join("\n");
}

// Newest entryDate first; when trades share the same date, the one
// created more recently sorts first too, since id embeds its creation
// timestamp. This is what actually decides on-screen order, independent
// of whatever order the database returns same-date rows in.
export function compareTradesNewestFirst(a, b) {
  const byDate = (b.entryDate || "").localeCompare(a.entryDate || "");
  if (byDate !== 0) return byDate;
  return (b.id || "").localeCompare(a.id || "");
}

export function pnlGroupsByMonth(entries) {
  const groups = {};
  entries.forEach((e) => { const k = monthKeyOf(e.entryDate); (groups[k] = groups[k] || []).push(e); });
  return Object.keys(groups).sort().reverse().map((k) => ({
    key: k,
    rows: groups[k].slice().sort(compareTradesNewestFirst),
  }));
}

export function getTradeStatus(e) {
  const today = localISODate(Date.now());
  const missingExit = !e.exitDate;
  const missingPL = !e.overallPL;
  const expiryPassed = !!(e.expiryDate && e.expiryDate < today);
  const expiryFuture = !!(e.expiryDate && e.expiryDate >= today);
  if ((missingExit || missingPL) && expiryPassed) return "warning";
  if ((missingExit || missingPL) && expiryFuture) return "open";
  return null;
}

export function buildPnlMarkdown(entries, scopeLabel, monthlyCharges, totalCapital) {
  const lines = [];
  lines.push("# Trade History", "", "Scope: " + scopeLabel, "Exported: " + fmtDateTimeDMY(Date.now()));
  if (totalCapital !== undefined && totalCapital !== null) lines.push(`Total Capital: **${fmtINRsigned(totalCapital)}**`);
  lines.push("", "---");
  if (entries.length === 0) { lines.push("", "_No entries in this range._"); return lines.join("\n"); }
  const groups = pnlGroupsByMonth(entries);
  let grandPL = 0, grandCharges = 0, warningCount = 0, openCount = 0;
  groups.forEach(({ key: k, rows }) => {
    lines.push("", "## " + monthLabel(k), "");
    lines.push("| Trade Date | Underlying | Strategy | Strategy Legs | Exit Date | P/L | Status | Note |");
    lines.push("|---|---|---|---|---|---|---|---|");
    let mPL = 0;
    rows.forEach((e) => {
      const pl = parseFloat(e.overallPL) || 0;
      mPL += pl;
      const cell = (s) => (s || "—").toString().replace(/\|/g, "/");
      const status = getTradeStatus(e);
      if (status === "warning") warningCount++;
      if (status === "open") openCount++;
      const statusLabel = status === "warning" ? "⚠ Needs attention" : status === "open" ? "● Open position" : "—";
      lines.push(`| ${isoToDMY(e.entryDate)} | ${cell(e.underlying)} | ${cell(e.strategyLabel)} | ${cell(e.legsSummary)} | ${e.exitDate ? isoToDMY(e.exitDate) : "—"} | ${fmtINRsigned(pl)} | ${statusLabel} | ${cell(e.notes)} |`);
    });
    const mCh = parseFloat((monthlyCharges || {})[k]) || 0;
    lines.push(`| **Month Total** | | | | | **${fmtINRsigned(mPL)}** | | |`);
    lines.push("");
    lines.push(`Charges this month: ${fmtINR(mCh)}  `);
    lines.push(`Net P/L this month: **${fmtINRsigned(mPL - mCh)}**`);
    grandPL += mPL; grandCharges += mCh;
  });
  lines.push("", "---", "", `**Total for this export — P/L: ${fmtINRsigned(grandPL)}, Charges: ${fmtINR(grandCharges)}, Net: ${fmtINRsigned(grandPL - grandCharges)}**`);
  if (warningCount > 0 || openCount > 0) {
    lines.push("", `⚠ ${warningCount} trade${warningCount === 1 ? "" : "s"} past expiry still missing an exit date or P/L. ● ${openCount} open position${openCount === 1 ? "" : "s"} not yet at expiry.`);
  }
  return lines.join("\n");
}

export async function buildPnlDetailPDF(entries, scopeLabel, monthlyCharges, totalCapital) {
  const { doc, autoTable, logoB64, logoAspect } = await createPdfDoc("landscape");
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const mastheadBottom = drawPdfMasthead(doc, logoB64, logoAspect, pageWidth);
  const COL = { date: 22, underlying: 22, strategy: 26, legs: 63, exit: 22, pl: 29, status: 30, note: 49 };
  const LEG_FONT_SIZE = 8;
  const LEG_LINE_HEIGHT = 4.2;
  const LEG_GAP = 1.2;

  const computeLegLines = (legList) => {
    const innerWidth = COL.legs - 4;
    doc.setFontSize(LEG_FONT_SIZE);
    doc.setFont("DejaVuSans", "normal");
    return legList.map((leg) => {
      const actionWidth = doc.getTextWidth(leg.action) + LEG_GAP;
      const wrapped = doc.splitTextToSize(leg.rest, Math.max(10, innerWidth - actionWidth));
      return { action: leg.action, actionWidth, wrapped };
    });
  };
  const legsForEntry = (e) => {
    if (e.legs && e.legs.length > 0) {
      return e.legs.map((l) => {
        const line = formatLegLine(l, e.underlying);
        const action = (l.action || "").toUpperCase();
        return { action, rest: line.slice(action.length).trim() };
      });
    }
    if (e.legsSummary) {
      return e.legsSummary.split(",").map((s) => s.trim()).filter(Boolean).map((part) => {
        const action = part.split(" ")[0].toUpperCase();
        return { action, rest: part.slice(action.length).trim() };
      });
    }
    return [];
  };
  const legColor = (action) => (action === "BUY" ? [37, 99, 235] : action === "SELL" ? [220, 38, 38] : [39, 39, 42]);

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27);
  doc.text("Trade History", marginX, mastheadBottom + 4);
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(`Scope: ${scopeLabel} · Exported: ${fmtDateTimeDMY(Date.now())}`, marginX, mastheadBottom + 10);
  let cursorY = mastheadBottom + 15;
  if (totalCapital !== undefined && totalCapital !== null) {
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(totalCapital >= 0 ? [4, 180, 136] : [241, 94, 59]));
    doc.text(`Total Capital: ${fmtINRsigned(totalCapital)}`, marginX, cursorY);
    cursorY += 7;
  }
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.2);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 8;

  if (entries.length === 0) {
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(11);
    doc.setTextColor(39, 39, 42);
    doc.text("No entries in this range.", marginX, cursorY + 6);
    return doc;
  }

  const groups = pnlGroupsByMonth(entries);
  let grandPL = 0, grandCharges = 0, warningCount = 0, openCount = 0;

  groups.forEach(({ key: k, rows }) => {
    let mPL = 0;
    const rowLegs = [];
    const body = rows.map((e) => {
      const pl = parseFloat(e.overallPL) || 0;
      mPL += pl;
      const status = getTradeStatus(e);
      if (status === "warning") warningCount++;
      if (status === "open") openCount++;
      const statusText = status === "warning" ? "⚠ Needs attention" : status === "open" ? "● Open position" : "—";
      rowLegs.push(legsForEntry(e));
      return [
        isoToDMY(e.entryDate), e.underlying || "—", e.strategyLabel || "—", "",
        e.exitDate ? isoToDMY(e.exitDate) : "—", fmtINRsigned(pl), statusText, e.notes || "—",
      ];
    });

    if (cursorY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); cursorY = 15; }
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text(monthLabel(k), marginX, cursorY);

    autoTable(doc, {
      startY: cursorY + 4,
      margin: { left: marginX, right: marginX },
      head: [["Trade Date", "Underlying", "Strategy", "Strategy Legs", "Exit Date", "P/L", "Status", "Note"]],
      body,
      theme: "plain",
      styles: { font: "DejaVuSans", fontSize: 8.5, cellPadding: 2, valign: "top", lineColor: [228, 228, 231], lineWidth: { top: 0, right: 0, bottom: 0.15, left: 0 }, textColor: [39, 39, 42] },
      headStyles: { textColor: [82, 82, 91], fontStyle: "bold", fontSize: 8, halign: "left", lineWidth: { top: 0, right: 0, bottom: 0.3, left: 0 }, lineColor: [212, 212, 216] },
      columnStyles: {
        0: { cellWidth: COL.date }, 1: { cellWidth: COL.underlying }, 2: { cellWidth: COL.strategy }, 3: { cellWidth: COL.legs },
        4: { cellWidth: COL.exit }, 5: { cellWidth: COL.pl }, 6: { cellWidth: COL.status }, 7: { cellWidth: COL.note },
      },
      didParseCell: (data) => {
        if (data.section !== "body" || !rows[data.row.index]) return;
        if (data.column.index === 3) {
          const lines = computeLegLines(rowLegs[data.row.index]);
          const totalLines = lines.reduce((sum, l) => sum + l.wrapped.length, 0);
          data.cell.text = [];
          data.row.height = Math.max(data.row.height, totalLines * LEG_LINE_HEIGHT + 4);
        } else if (data.column.index === 5) {
          const pl = parseFloat(rows[data.row.index].overallPL) || 0;
          data.cell.styles.textColor = pl >= 0 ? [4, 180, 136] : [241, 94, 59];
        } else if (data.column.index === 6) {
          const status = getTradeStatus(rows[data.row.index]);
          data.cell.styles.textColor = status === "warning" ? [220, 38, 38] : status === "open" ? [5, 150, 105] : [39, 39, 42];
          if (status) data.cell.styles.fontSize = 7.5;
        }
      },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 3 || !rows[data.row.index]) return;
        const lines = computeLegLines(rowLegs[data.row.index]);
        let y = data.cell.y + 4;
        doc.setFontSize(LEG_FONT_SIZE);
        lines.forEach((l) => {
          const color = legColor(l.action);
          doc.setFont("DejaVuSans", "normal");
          doc.setTextColor(...color);
          doc.text(l.action, data.cell.x + 2, y);
          doc.setTextColor(39, 39, 42);
          l.wrapped.forEach((line, i) => {
            doc.text(line, data.cell.x + 2 + (i === 0 ? l.actionWidth : 0), y + i * LEG_LINE_HEIGHT);
          });
          y += l.wrapped.length * LEG_LINE_HEIGHT;
        });
      },
    });

    cursorY = doc.lastAutoTable.finalY + 6;
    const mCh = parseFloat((monthlyCharges || {})[k]) || 0;
    const mNet = mPL - mCh;
    grandPL += mPL; grandCharges += mCh;
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(63, 63, 70);
    doc.text(`Month P/L: `, marginX, cursorY);
    let x = marginX + doc.getTextWidth("Month P/L: ");
    doc.setFont("DejaVuSans", "bold");
    doc.setTextColor(...(mPL >= 0 ? [4, 180, 136] : [241, 94, 59]));
    doc.text(fmtINRsigned(mPL), x, cursorY);
    x += doc.getTextWidth(fmtINRsigned(mPL) + "   ");
    doc.setFont("DejaVuSans", "normal");
    doc.setTextColor(63, 63, 70);
    doc.text(`· Charges: `, x, cursorY);
    x += doc.getTextWidth("· Charges: ");
    doc.setFont("DejaVuSans", "bold");
    doc.text(fmtINR(mCh), x, cursorY);
    x += doc.getTextWidth(fmtINR(mCh) + "   ");
    doc.setFont("DejaVuSans", "normal");
    doc.setTextColor(63, 63, 70);
    doc.text(`· Net: `, x, cursorY);
    x += doc.getTextWidth("· Net: ");
    doc.setFont("DejaVuSans", "bold");
    doc.setTextColor(...(mNet >= 0 ? [4, 180, 136] : [241, 94, 59]));
    doc.text(fmtINRsigned(mNet), x, cursorY);
    cursorY += 10;
  });

  const grandNet = grandPL - grandCharges;
  if (cursorY > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); cursorY = 15; }
  doc.setDrawColor(24, 24, 27);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 7;
  doc.setFontSize(10.5);
  doc.setFont("DejaVuSans", "normal");
  doc.setTextColor(24, 24, 27);
  doc.text(`Total for this export — P/L: `, marginX, cursorY);
  let gx = marginX + doc.getTextWidth("Total for this export — P/L: ");
  doc.setFont("DejaVuSans", "bold");
  doc.setTextColor(...(grandPL >= 0 ? [4, 180, 136] : [241, 94, 59]));
  doc.text(fmtINRsigned(grandPL), gx, cursorY);
  gx += doc.getTextWidth(fmtINRsigned(grandPL) + ", ");
  doc.setFont("DejaVuSans", "normal");
  doc.setTextColor(24, 24, 27);
  doc.text("Charges: ", gx, cursorY);
  gx += doc.getTextWidth("Charges: ");
  doc.setFont("DejaVuSans", "bold");
  doc.text(fmtINR(grandCharges), gx, cursorY);
  gx += doc.getTextWidth(fmtINR(grandCharges) + ", ");
  doc.setFont("DejaVuSans", "normal");
  doc.setTextColor(24, 24, 27);
  doc.text("Net: ", gx, cursorY);
  gx += doc.getTextWidth("Net: ");
  doc.setFont("DejaVuSans", "bold");
  doc.setTextColor(...(grandNet >= 0 ? [4, 180, 136] : [241, 94, 59]));
  doc.text(fmtINRsigned(grandNet), gx, cursorY);
  cursorY += 8;

  if (warningCount > 0 || openCount > 0) {
    doc.setFontSize(9.5);
    if (warningCount > 0) {
      doc.setFont("DejaVuSans", "bold");
      doc.setTextColor(220, 38, 38);
      const t = `⚠ ${warningCount} trade${warningCount === 1 ? "" : "s"} past expiry still missing an exit date or P/L.`;
      doc.text(t, marginX, cursorY);
      cursorY += 5.5;
    }
    if (openCount > 0) {
      doc.setFont("DejaVuSans", "bold");
      doc.setTextColor(5, 150, 105);
      doc.text(`● ${openCount} open position${openCount === 1 ? "" : "s"} not yet at expiry.`, marginX, cursorY);
    }
  }

  return doc;
}

let legIdCounter = 1;
export function freshLegId() { legIdCounter += 1; return "leg_" + legIdCounter + "_" + Date.now(); }
export function legsFromTemplate(strategyId, customStrategies) {
  if (!strategyId) return [];
  const legKindFor = (name) => (name && /\(.*hedge.*\)/i.test(name)) ? { legKind: "hedge" } : {};
  const tpl = LEG_TEMPLATES[strategyId];
  if (tpl) return tpl.map((t) => ({ id: freshLegId(), name: t.name, action: t.action, type: t.type, strike: "", premium: "", qty: "", lotSize: "", expiry: "", ...legKindFor(t.name) }));
  const custom = (customStrategies || []).find((s) => s.id === strategyId);
  if (custom && custom.legTemplate && custom.legTemplate.length > 0) {
    return custom.legTemplate.map((t) => ({ id: freshLegId(), name: t.name || "", action: t.action, type: t.type, strike: "", premium: "", qty: "", lotSize: "", expiry: "", ...legKindFor(t.name) }));
  }
  return [{ id: freshLegId(), name: "", action: "Sell", type: "CE", strike: "", premium: "", qty: "", lotSize: "", expiry: "" }];
}
let pnlIdCounter = 1;
export function freshPnlId() { pnlIdCounter += 1; return "pnl_" + Date.now() + "_" + pnlIdCounter; }

let noteIdCounter = 1;
export function freshNoteId() { noteIdCounter += 1; return "note_" + Date.now() + "_" + noteIdCounter; }

let reminderIdCounter = 1;
export function freshReminderId() { reminderIdCounter += 1; return "reminder_" + Date.now() + "_" + reminderIdCounter; }

let folderIdCounter = 1;
export function freshFolderId() { folderIdCounter += 1; return "folder_" + Date.now() + "_" + folderIdCounter; }

// Recursively renders a BlockNote block array directly into a jsPDF
// document using the same drawing primitives as the rest of this app's
// PDF pipeline (createLogEntryHelpers). This intentionally renders each
// block's PLAIN text (heading size, list markers, checkbox state, quote
// indent, code-block background are all preserved) rather than
// per-character bold/italic styling within a block — jsPDF's plain text
// API doesn't cleanly support mixed-run styling without manual glyph
// positioning, and block-level fidelity is enough for a portable export.
export function renderBlockNoteBlocksToPDF(doc, helpers, yRef, marginX, contentWidth, blocks, depth = 0) {
  const indent = depth * 5;
  let numberedIndex = 0;
  blocks.forEach((block) => {
    numberedIndex = block.type === "numberedListItem" ? numberedIndex + 1 : 0;
    const text = blockInlineText(block.content);

    if (block.type === "heading") {
      const level = (block.props && block.props.level) || 1;
      const size = level === 1 ? 13 : level === 2 ? 11.5 : 10;
      const lh = size * 0.42;
      doc.setFont("DejaVuSans", "bold");
      doc.setFontSize(size);
      doc.setTextColor(24, 24, 27);
      const wrapped = doc.splitTextToSize(text || " ", contentWidth - indent);
      helpers.ensureRoom(wrapped.length * lh + 3);
      wrapped.forEach((line, i) => doc.text(line, marginX + indent, yRef.y + i * lh));
      yRef.y += wrapped.length * lh + 3;
    } else if (block.type === "bulletListItem" || block.type === "numberedListItem" || block.type === "checkListItem") {
      const prefix = block.type === "bulletListItem" ? "•"
        : block.type === "numberedListItem" ? `${numberedIndex}.`
        : (block.props && block.props.checked ? "[x]" : "[ ]");
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(39, 39, 42);
      const wrapped = doc.splitTextToSize(text || " ", contentWidth - indent - 6);
      helpers.ensureRoom(wrapped.length * 4.2 + 1);
      doc.text(prefix, marginX + indent, yRef.y);
      wrapped.forEach((line, i) => doc.text(line, marginX + indent + 5, yRef.y + i * 4.2));
      yRef.y += wrapped.length * 4.2 + 1;
    } else if (block.type === "quote") {
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      const wrapped = doc.splitTextToSize(text || " ", contentWidth - indent - 6);
      helpers.ensureRoom(wrapped.length * 4.2 + 3);
      doc.setDrawColor(200, 200, 205);
      doc.setLineWidth(0.6);
      doc.line(marginX + indent, yRef.y - 3, marginX + indent, yRef.y + wrapped.length * 4.2 - 3.5);
      wrapped.forEach((line, i) => doc.text(line, marginX + indent + 4, yRef.y + i * 4.2));
      yRef.y += wrapped.length * 4.2 + 3;
    } else if (block.type === "codeBlock") {
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(8);
      const wrapped = doc.splitTextToSize(text || " ", contentWidth - indent - 6);
      const boxHeight = wrapped.length * 4 + 4;
      helpers.ensureRoom(boxHeight + 3);
      doc.setFillColor(244, 244, 245);
      doc.rect(marginX + indent, yRef.y - 3.5, contentWidth - indent, boxHeight, "F");
      doc.setTextColor(39, 39, 42);
      wrapped.forEach((line, i) => doc.text(line, marginX + indent + 2, yRef.y + i * 4));
      yRef.y += boxHeight + 3;
    } else if (block.type === "table") {
      // A full grid-aware render is possible but out of scope for a
      // first pass — this keeps a clear pointer rather than silently
      // dropping the block.
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      helpers.ensureRoom(5);
      doc.text("[Table — open the note in the app to view]", marginX + indent, yRef.y);
      yRef.y += 5;
    } else {
      // paragraph and any unrecognized/future block types
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(39, 39, 42);
      const wrapped = doc.splitTextToSize(text || " ", contentWidth - indent);
      helpers.ensureRoom(wrapped.length * 4.2 + (text ? 2.5 : 1.5));
      wrapped.forEach((line, i) => doc.text(line, marginX + indent, yRef.y + i * 4.2));
      yRef.y += wrapped.length * 4.2 + (text ? 2.5 : 1.5);
    }

    if (block.children && block.children.length > 0) {
      renderBlockNoteBlocksToPDF(doc, helpers, yRef, marginX, contentWidth, block.children, depth + 1);
    }
  });
}

export async function buildNotePDF(note, linkedTradeLabel) {
  const { doc, autoTable, logoB64, logoAspect, moodEmojiB64 } = await createPdfDoc("portrait");
  const marginX = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const mastheadBottom = drawPdfMasthead(doc, logoB64, logoAspect, pageWidth);
  const yRef = { y: mastheadBottom + 4 };
  const helpers = createLogEntryHelpers(doc, autoTable, marginX, contentWidth, pageHeight, yRef, moodEmojiB64);

  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(14);
  doc.setTextColor(9, 9, 11);
  const titleWrapped = doc.splitTextToSize(note.title || "Untitled Note", contentWidth);
  titleWrapped.forEach((line, i) => doc.text(line, marginX, yRef.y + i * 6.5));
  yRef.y += titleWrapped.length * 6.5 + 2;

  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(`Exported: ${fmtDateTimeDMY(Date.now())}`, marginX, yRef.y);
  yRef.y += 6;
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.2);
  doc.line(marginX, yRef.y, pageWidth - marginX, yRef.y);
  yRef.y += 8;

  if (note.tags && note.tags.length > 0) helpers.addParagraph("Tags", note.tags.map((t) => `#${t}`).join("  "), [82, 82, 91], [82, 82, 91]);
  const linkParts = formatNoteLinks(linkedTradeLabel, note);
  if (linkParts.length > 0) helpers.addParagraph("Linked", linkParts.join(" · "), [82, 82, 91], [39, 39, 42]);
  if (note.isResource && note.resourceUrl) helpers.addParagraph("Link", note.resourceUrl, [82, 82, 91], [37, 99, 235]);
  yRef.y += 1;

  const blocks = parseNoteBlocks(note.content);
  if (blocks.length === 0) {
    helpers.addPlainParagraph("This note is empty.");
  } else {
    renderBlockNoteBlocksToPDF(doc, helpers, yRef, marginX, contentWidth, blocks);
  }

  return doc;
}
