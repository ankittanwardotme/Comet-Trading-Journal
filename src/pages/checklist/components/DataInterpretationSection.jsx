import { FONT_MONO, FONT_DISPLAY } from "../../../lib/format.js";
import { DATA_ROWS, RADIO_OPTIONS } from "../../../lib/marketRead.js";

export function DataInterpretationSection({ dataReads, onSetRow, avg, verdict, staggerIn }) {
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
