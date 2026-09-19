import { FONT_MONO } from "../../lib/format.js";

export function TabBar({ tabs, activeTab, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl border whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            activeTab === t.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          {t.num && <span style={FONT_MONO} className={activeTab === t.id ? "opacity-100" : "opacity-80"}>{t.num}</span>}
          {t.label}
          <span className="text-[10px]" style={FONT_MONO}>{t.badge}</span>
          {t.warn && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>}
        </button>
      ))}
    </div>
  );
}
