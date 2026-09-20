// Maps AppShell's internal tab identifiers (unchanged since before routing —
// every page component still receives/calls `topTab`/`setTopTab` exactly as
// it always did) to real URLs, so the browser's address bar, back/forward
// buttons, and refresh all reflect the page actually being shown.
export const TAB_TO_PATH = {
  home: "/dashboard",
  checklist: "/pre-trade-checklist",
  setup: "/trade-setup",
  pnl: "/trade-history",
  log: "/log",
  learn: "/my-learnings",
  strategyBuilder: "/strategy-builder",
  holidays: "/holidays",
  profile: "/settings",
  docs: "/docs",
  reminders: "/reminders",
  addReminder: "/reminders/add",
  rescheduleReminder: "/reminders/reschedule",
  reminderSettings: "/reminders/settings",
  reminderWindowSettings: "/reminders/settings/window",
  editCategories: "/reminders/settings/categories",
};

const PATH_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab]));

export function tabToPath(tab) {
  return TAB_TO_PATH[tab] || TAB_TO_PATH.home;
}

export function pathToTab(pathname) {
  return PATH_TO_TAB[pathname] || "home";
}
