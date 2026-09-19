import { FONT_MONO, FONT_DISPLAY } from "../../../lib/format.js";
import { COLOR_CLASSES } from "../../../lib/greeks.js";
import { CheckItem } from "./CheckItem.jsx";
import { LiquidityReferenceCard } from "./LiquidityReferenceCard.jsx";

export function ChecklistTabPanel({ section, profile, checked, onToggle, onToggleAll, strategyId }) {
  const applic = section.items.filter((i) => {
    if (i.applies === "all") return true;
    if (i.appliesBy === "id") return i.applies.includes(strategyId);
    return i.applies.includes(profile);
  });
  const cnt = applic.filter((i) => checked[i.id]).length;
  const allChecked = applic.length > 0 && cnt === applic.length;
  const cc = COLOR_CLASSES[section.color] || COLOR_CLASSES.amber;
  const Icon = section.icon;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-9 h-9 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center flex-shrink-0`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>{section.title}</p>
          <p className="text-xs text-zinc-500" style={FONT_MONO}>{cnt}/{applic.length} checked in this tab</p>
        </div>
        <button onClick={() => onToggleAll(applic.map((i) => i.id), !allChecked)} className="ml-auto text-xs text-zinc-400 hover:text-zinc-100 underline underline-offset-2 flex-shrink-0">
          {allChecked ? "Uncheck all" : "Check all"}
        </button>
      </div>
      {section.id === "entry" && <div className="mb-4"><LiquidityReferenceCard /></div>}
      <div className="space-y-2.5">
        {applic.map((item) => (
          <CheckItem key={item.id} item={item} checked={!!checked[item.id]} onToggle={onToggle} profile={profile} />
        ))}
      </div>
    </div>
  );
}
