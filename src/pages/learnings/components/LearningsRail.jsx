import { IconBulb, IconSearch, IconTag, IconStar, IconLayoutGrid, IconBooks } from "@tabler/icons-react";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";

export function LearningsRail({ view, onChange }) {
  const items = [
    { id: "notes", icon: IconBulb, label: "Notes" },
    { id: "search", icon: IconSearch, label: "Search" },
    { id: "tags", icon: IconTag, label: "Tags" },
    { id: "starred", icon: IconStar, label: "Starred" },
    { id: "templates", icon: IconLayoutGrid, label: "Templates" },
    { id: "resources", icon: IconBooks, label: "Resources" },
  ];
  return (
    <div className="w-14 flex-shrink-0 border-r border-zinc-800 flex flex-col items-center pt-[4.5px] pb-4 gap-1.5">
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.id;
        return (
          <Tooltip key={it.id} text={it.label}>
            <button
              onClick={() => onChange(it.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? "tj-primary-bg" : "text-zinc-500 hover:text-zinc-200 tj-row-hover"}`}
            >
              <Icon size={17} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
