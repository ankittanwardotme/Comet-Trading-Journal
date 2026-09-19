export function CalendarViewSwitcher({ view, setView }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-0.5 flex-shrink-0">
      {[["week", "Week"], ["month", "Month"], ["year", "Year"]].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} className={`text-xs px-3 py-2 rounded-full font-semibold transition-colors ${view === id ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-300"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
