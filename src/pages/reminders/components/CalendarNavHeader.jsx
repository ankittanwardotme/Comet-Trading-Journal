import { IconChevronLeft, IconChevronRight, IconArrowLeft } from "@tabler/icons-react";

export function CalendarNavHeader({ label, onPrev, onNext, isCurrent, backLabel, onBack, direction }) {
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
