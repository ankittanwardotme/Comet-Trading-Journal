import { IconX } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";

export function DownloadLogDialog({ closing, entryCount, downloadTypes, onToggleType, onDownloadPdf, onDownloadMarkdown, onClose }) {
  const noneSelected = !downloadTypes.observation && !downloadTypes.trade && !downloadTypes.funds_added && !downloadTypes.funds_withdrawn;
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 ${closing ? "tj-backdrop-out" : "tj-fade"}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 ${closing ? "tj-dialog-out" : "tj-popover"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Download Log</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>
        <p className="text-xs text-zinc-600">
          Choose which entries to include for the selected date range ({entryCount} {entryCount === 1 ? "entry" : "entries"} total).
        </p>
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
            <input type="checkbox" checked={downloadTypes.observation} onChange={() => onToggleType("observation")} className="w-4 h-4 accent-amber-400" />
            Observation data
          </label>
          <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
            <input type="checkbox" checked={downloadTypes.trade} onChange={() => onToggleType("trade")} className="w-4 h-4 accent-amber-400" />
            Trade data
          </label>
          <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
            <input type="checkbox" checked={downloadTypes.funds_added} onChange={() => onToggleType("funds_added")} className="w-4 h-4 accent-amber-400" />
            Funds added
          </label>
          <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
            <input type="checkbox" checked={downloadTypes.funds_withdrawn} onChange={() => onToggleType("funds_withdrawn")} className="w-4 h-4 accent-amber-400" />
            Withdrawals
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={onDownloadPdf}
              disabled={noneSelected}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center border border-zinc-700"
            >
              .PDF
            </button>
            <button
              onClick={onDownloadMarkdown}
              disabled={noneSelected}
              className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center"
            >
              .MD
            </button>
          </div>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
