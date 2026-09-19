import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";

export function RemindersSettingsPage({ onBack, onEditWindowClick, onEditCategoriesClick }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <IconChevronLeft size={16} /> Back
      </button>
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-1">
        <p className="text-lg font-bold text-zinc-100 mb-4" style={FONT_DISPLAY}>Settings</p>

        <button onClick={onEditWindowClick} className="w-full flex items-center justify-between text-sm text-zinc-200 font-semibold hover:text-amber-400 transition-colors py-3 border-b border-zinc-800">
          Edit Reminder Window
          <IconChevronRight size={16} className="text-zinc-500" />
        </button>
        <button onClick={onEditCategoriesClick} className="w-full flex items-center justify-between text-sm text-zinc-200 font-semibold hover:text-amber-400 transition-colors py-3">
          Edit Categories
          <IconChevronRight size={16} className="text-zinc-500" />
        </button>
      </div>
    </div>
  );
}
