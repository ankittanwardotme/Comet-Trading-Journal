import { IconBellRinging } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";

export function RemindersButton({ dueCount, onClick }) {
  return (
    <Tooltip text="My Reminders">
      <button onClick={onClick} className="relative flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold rounded-xl pl-3.5 pr-5 py-2 transition-colors hover:scale-[1.02] active:scale-95">
        <IconBellRinging size={14} />
        My Reminders
        {dueCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2" style={{ ...FONT_MONO, borderColor: "var(--tj-bg, #15152b)" }}>
            {dueCount > 9 ? "9+" : dueCount}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
