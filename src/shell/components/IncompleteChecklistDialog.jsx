import { IconAlertTriangle } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";

export function IncompleteChecklistDialog({ missingCount, onClose, onProceedAnyway, onGoToChecklist }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-amber-900 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <IconAlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-400" style={FONT_DISPLAY}>Checklist not complete</p>
        </div>
        <p className="text-xs text-zinc-400">
          You haven't finished the pre-trade checklist yet ({missingCount} item{missingCount === 1 ? "" : "s"} pending). Do you want to proceed and save anyway, or go fill it in first?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onProceedAnyway}
            className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg hover:scale-[1.02] active:scale-95 transition-transform"
          >
            Proceed and Save Anyway
          </button>
          <button
            onClick={onGoToChecklist}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            Take Me to the Checklist
          </button>
        </div>
      </div>
    </div>
  );
}
