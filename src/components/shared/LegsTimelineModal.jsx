import { useMemo } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO, fmt2dp, fmtINR } from "../../lib/format.js";
import { getPortalTarget } from "../../lib/portal.js";
import { computeLegPL, fmtDateTimeDMY } from "../../lib/dateUtils.js";

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

export function LegsTimelineModal({ legs, onClose, referenceDate }) {
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
