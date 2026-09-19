import {
  IconChecklist, IconBulb, IconLock, IconAdjustmentsHorizontal, IconSettings, IconTarget, IconFileText,
  IconCurrencyRupee, IconGitBranch, IconBell, IconClockHour4, IconLink, IconFolder, IconSearch, IconLayoutGrid,
  IconCheck, IconDownload, IconUserCircle, IconTrash, IconUserOff,
} from "@tabler/icons-react";
import { DocsPageLayout, DocsHeader, DocsCardGrid, DocsSection, DocsSubCard } from "./docsShared.jsx";

export function GettingStartedDocsPage() {
  const CARDS = [
    { id: "workflow", icon: <IconChecklist size={15} />, title: "The Core Workflow", description: "Checklist → Setup → History → Dashboard.", actionLabel: "See the workflow" },
    { id: "other-areas", icon: <IconBulb size={15} />, title: "Everything Else", description: "Reminders, My Learnings, and more.", actionLabel: "Explore" },
    { id: "security", icon: <IconLock size={15} />, title: "Your Data & Security", description: "Account scope and the PIN lock.", actionLabel: "Learn more" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Getting Started"
        lead="Comet Trading Journal is a personal F&O (futures & options) trading journal — built around a discipline-first workflow, not just a P&L spreadsheet."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="workflow" title="The core workflow">
        <p>The app is built around four areas, meant to be used roughly in order for each trade:</p>
        <p><span className="text-zinc-200 font-semibold">1. Checklist</span> — before entering a trade, run through your own pre-trade discipline checklist. Critical items must be checked before the app considers you "armed" to trade.</p>
        <p><span className="text-zinc-200 font-semibold">2. Trade Setup</span> — pick a strategy, build out its legs, see the payoff shape, and record your reasoning before you actually place the trade.</p>
        <p><span className="text-zinc-200 font-semibold">3. Trade History</span> — once a trade is live, this is where it's tracked: editing legs as the position evolves, closing, rolling, or adjusting, and reviewing P&L.</p>
        <p><span className="text-zinc-200 font-semibold">4. Dashboard</span> — the numbers roll up here automatically: win rate, streaks, profit factor, expectancy, and more, all computed from your actual logged trades.</p>
      </DocsSection>

      <DocsSection id="other-areas" title="Everything else">
        <p><span className="text-zinc-200 font-semibold">Reminders</span> — market events, trade-specific alerts, and personal reminders, each with its own severity.</p>
        <p><span className="text-zinc-200 font-semibold">My Learnings</span> — a full notes system for trade journaling, research, and reusable templates, separate from the trade log itself.</p>
        <p>Everything above is reached from the top navigation bar. Your profile picture (top right) opens Settings, the Holiday Calendar, these Docs, and Sign Out.</p>
      </DocsSection>

      <DocsSection id="security" title="Your data, and getting locked out">
        <p>Every trade, note, and reminder is scoped strictly to your own account — nothing is ever visible across accounts, including through the MCP server (see that section for detail).</p>
        <p>On top of your account login, this app has its own PIN lock, checked independently every time you open it. See <span className="text-zinc-200">Settings &amp; Security</span> for how PIN setup, lockouts, and recovery work.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

export function ChecklistDocsPage() {
  const CARDS = [
    { id: "modes", icon: <IconAdjustmentsHorizontal size={15} />, title: "Trade Day vs. No-Trade Day", description: "Two modes, one for each kind of day.", actionLabel: "See the modes" },
    { id: "armed", icon: <IconChecklist size={15} />, title: "Critical vs. Optional", description: "What actually gates you from trading.", actionLabel: "How it works" },
    { id: "manage", icon: <IconSettings size={15} />, title: "Customize Your Checklist", description: "Add, edit, and reorder your own items.", actionLabel: "Manage it" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Pre-Trade Checklist"
        lead="A discipline gate that runs before every trade — not a formality, it actually controls whether you're considered ready to trade."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="modes" title="Trade Day vs. No-Trade Day">
        <p>Every day, pick one of two modes:</p>
        <p><span className="text-zinc-200 font-semibold">Trade Day</span> — the full checklist applies, and the <span className="text-zinc-200">Trade Setup</span> tab only becomes available once you're "armed" (see below).</p>
        <p><span className="text-zinc-200 font-semibold">No-Trade Day</span> — a simpler flow for days you've deliberately decided to sit out. Trade Setup stays hidden from the top navigation entirely while in this mode.</p>
      </DocsSection>

      <DocsSection id="armed" title="Critical vs. optional items">
        <p>Checklist items live in sections, and each item is either <span className="text-zinc-200 font-semibold">critical</span> or optional. Critical items must be checked before you're "ARMED" — shown as a status pill at the top of the page, with a pulsing indicator while checks are still pending.</p>
        <p>Items can also be scoped to only apply to certain strategies — a critical check for a directional trade doesn't need to block you on a delta-neutral one, for example. The set of applicable items updates automatically based on what strategy you've selected.</p>
      </DocsSection>

      <DocsSection id="manage" title="Customizing your own checklist">
        <p>Click <span className="text-zinc-200">Manage Checklist</span> to add, edit, reorder, or remove sections and items — this is your own checklist, not a fixed template. Mark an item critical or optional, and choose which strategies it applies to.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

export function TradeSetupDocsPage() {
  const CARDS = [
    { id: "strategy", icon: <IconTarget size={15} />, title: "Picking a Strategy", description: "Categories, and adding your own.", actionLabel: "See strategies" },
    { id: "legs", icon: <IconAdjustmentsHorizontal size={15} />, title: "Legs & Payoff", description: "Templates, hedges, and the payoff shape.", actionLabel: "Build a position" },
    { id: "notes", icon: <IconFileText size={15} />, title: "Notes & Templates", description: "Your reasoning, with template support.", actionLabel: "See notes" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Trade Setup"
        lead="Build out a strategy — legs, payoff, and reasoning — before it becomes a live position in Trade History."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="strategy" title="Picking a strategy">
        <p>Start with a directional outlook — Bullish, Bearish, Neutral, or Other — then choose a specific strategy within that category. Strategies are grouped this way so you're picking from a relevant, short list rather than one long dropdown.</p>
        <p>Don't see a strategy you use? <span className="text-zinc-200">Add your own strategy</span> — it'll show up in the category you assign it to, right alongside the built-in ones, and can be managed or removed later from the same screen.</p>
      </DocsSection>

      <DocsSection id="legs" title="Legs and payoff">
        <p>Most built-in strategies auto-populate their legs from a template — an Iron Condor arrives with all four legs already shaped, for instance. From there you fill in strikes, premiums, and quantities.</p>
        <p>Some templates include a built-in hedge leg (like the protective long option in a defined-risk spread) — those are automatically tagged as a hedge from the moment they're created, not left for you to classify manually.</p>
        <p>As legs are filled in, a payoff summary builds alongside them, so you can see the strategy's shape before you've committed to it.</p>
      </DocsSection>

      <DocsSection id="notes" title="Notes — directional view & reasoning">
        <p>A free-text field for your actual reasoning — why this trade, why now. This is a plain-text field (not the rich-text editor used in My Learnings), but it can pull in a template: click <span className="text-zinc-200">Use Template</span> to insert one of your saved templates directly into it.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

export function TradeHistoryDocsPage() {
  const CARDS = [
    { id: "table", icon: <IconCurrencyRupee size={15} />, title: "The Table", description: "Editable rows, grouped by month.", actionLabel: "See the table" },
    { id: "leg-lifecycle", icon: <IconGitBranch size={15} />, title: "Rolls & Adjustments", description: "Rolling, partial closes, hedges.", actionLabel: "Leg lifecycle" },
    { id: "strategy-shape", icon: <IconTarget size={15} />, title: "Strategy Shape Detection", description: "Auto-relabeling as legs change.", actionLabel: "How it works" },
    { id: "pl-and-mood", icon: <IconBulb size={15} />, title: "P/L & Mood", description: "Incremental P/L, entry mood.", actionLabel: "See P/L" },
    { id: "notes-and-log", icon: <IconFileText size={15} />, title: "Notes & Trade Log", description: "Per-trade notes, full log view.", actionLabel: "See notes" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Trade History"
        lead="The full P&L ledger — every trade you've logged, editable in place, with full support for rolls, adjustments, and partial closes."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="table" title="The table">
        <p>One row per trade, grouped by month. Click <span className="text-zinc-200">Edit</span> on a row to make changes; nothing is editable until you do. <span className="text-zinc-200">Add Trade</span> creates a blank row for a specific date and opens it straight into editing.</p>
        <p>Exit date stays locked until every leg in the position has been closed — there's nothing to set an exit date to while the position is still partially open.</p>
      </DocsSection>

      <DocsSection id="leg-lifecycle" title="Leg lifecycle — rolls, adjustments, partial closes">
        <p>Legs carry a colored left border showing what they are: a plain brown border for an original leg, sky blue for a hedge, yellow for an adjustment.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <DocsSubCard title="Rolling a leg">
            <p>Closing a leg and opening a new one to replace it — same position, new strike or expiry. The new leg's name carries a "— Rolled" suffix, and the timeline records it as a distinct roll event, not two unrelated opens/closes.</p>
          </DocsSubCard>
          <DocsSubCard title="Partial close">
            <p>Closing only some of a leg's quantity. The remainder keeps trading as its own leg, and its history still traces back to the original lot it split from — the timeline shows one "opened" event for the true original quantity, not a separate one per fragment.</p>
          </DocsSubCard>
          <DocsSubCard title="Hedge vs. adjustment">
            <p>Adding a leg after the trade is already open — the app asks whether it's a <span className="text-zinc-200">hedge</span> (protective) or an <span className="text-zinc-200">adjustment</span> (structural change) when the strategy's shape doesn't make that obvious on its own.</p>
          </DocsSubCard>
          <DocsSubCard title="Increasing position">
            <p>Adding more quantity to an already-open leg, detected automatically when a new leg exactly matches an existing one's strike and type.</p>
          </DocsSubCard>
        </div>
      </DocsSection>

      <DocsSection id="strategy-shape" title="Strategy shape detection">
        <p>As you edit legs, the app checks whether their actual structure now matches a different, more specific strategy than the one originally selected — a Bull Put Spread that's had a leg added and now reads as an Iron Condor, for example — and offers to relabel it, rather than leaving the label stale.</p>
      </DocsSection>

      <DocsSection id="pl-and-mood" title="P/L and mood">
        <p>Realized P/L updates incrementally as legs close — you don't have to wait for the entire position to be shut before seeing a number. Open legs are excluded from win/loss math everywhere in the app (Dashboard stats, MCP tools) until they actually close.</p>
        <p>Adding a trade for today also prompts for your mood at entry — a quick, optional tag (confident, fearful, greedy, and others) you can look back on later.</p>
      </DocsSection>

      <DocsSection id="notes-and-log" title="Notes and the Trade Log">
        <p>Each trade has its own plain-text notes field, same <span className="text-zinc-200">Use Template</span> support as Trade Setup's. The <span className="text-zinc-200">Trade Log</span> button opens a dedicated, full-page log of raw entries, separate from the P&L table itself — see <span className="text-zinc-200">Downloads</span> for exactly what can be exported from each.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

export function RemindersDocsPage() {
  const CARDS = [
    { id: "categories", icon: <IconBell size={15} />, title: "Categories & Severity", description: "Event, trade, and personal.", actionLabel: "See categories" },
    { id: "reschedule-snooze", icon: <IconClockHour4 size={15} />, title: "Reschedule vs. Snooze", description: "Two different ways to push a date.", actionLabel: "The difference" },
    { id: "linking", icon: <IconLink size={15} />, title: "Linking to a Trade", description: "Keep reminders in context.", actionLabel: "Learn more" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Reminders"
        lead="Market events, trade-specific alerts, and personal reminders — one list, with severity and category to sort out what actually needs attention."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="categories" title="Categories and severity">
        <p>Every reminder is one of three categories — <span className="text-zinc-200">event</span> (market-wide), <span className="text-zinc-200">trade</span> (tied to a specific position), or <span className="text-zinc-200">personal</span>. Within those, subcategories carry a severity level; you can add your own custom subcategories, each with its own severity, or hide built-in ones you don't use.</p>
      </DocsSection>

      <DocsSection id="reschedule-snooze" title="Rescheduling vs. snoozing">
        <p>Two different ways to change when a reminder fires: <span className="text-zinc-200">Reschedule</span> is a dedicated page for deliberately picking a new date and time. <span className="text-zinc-200">Snooze</span> is the quick option offered right on an active alarm popup — push it 10 minutes, an hour, whatever — meant for the moment an alarm actually goes off, not for planned rescheduling.</p>
      </DocsSection>

      <DocsSection id="linking" title="Linking to a trade">
        <p>A trade-category reminder can be linked to a specific position, so it shows up in context rather than as a bare, disconnected note.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

export function LearningsDocsPage() {
  const CARDS = [
    { id: "notes", icon: <IconBulb size={15} />, title: "Notes", description: "Rich text, images, tags.", actionLabel: "See notes" },
    { id: "folders", icon: <IconFolder size={15} />, title: "Folders", description: "Organize without losing anything.", actionLabel: "See folders" },
    { id: "search-tags-starred", icon: <IconSearch size={15} />, title: "Search, Tags, Starred", description: "Four ways to find a note.", actionLabel: "See how" },
    { id: "resources", icon: <IconLink size={15} />, title: "Resources", description: "Saved links, kept separate.", actionLabel: "See resources" },
    { id: "templates", icon: <IconLayoutGrid size={15} />, title: "Templates", description: "Reusable structure, three ways to use it.", actionLabel: "See templates" },
    { id: "bulk", icon: <IconCheck size={15} />, title: "Bulk Actions", description: "Multi-select delete, duplicate, move.", actionLabel: "See bulk actions" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="My Learnings"
        lead="A full notes system — rich text, folders, tags, saved resources, and reusable templates — separate from the trade log itself."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="notes" title="Notes">
        <p>Notes use a rich-text editor: headings, lists, and images. Images upload to private cloud storage rather than being embedded directly, so a note with several screenshots doesn't bloat in size — if that upload ever fails, it falls back to embedding the image directly rather than losing it.</p>
        <p>A note can carry <span className="text-zinc-200">tags</span>, be <span className="text-zinc-200">starred</span> for quick access, and optionally be <span className="text-zinc-200">linked to a specific trade</span>, underlying, or strategy — so your reasoning stays connected to what it was actually about.</p>
      </DocsSection>

      <DocsSection id="folders" title="Folders">
        <p>Organize notes into folders — create, rename, delete, drag-and-drop to move, or duplicate. Deleting a folder never deletes the notes inside it; they're simply unfiled, not destroyed.</p>
      </DocsSection>

      <DocsSection id="search-tags-starred" title="Search, tags, and starred">
        <p>The sidebar rail switches between browsing by folder, full-text search, filtering by tag, and a dedicated starred view — four different ways to find the same underlying notes.</p>
      </DocsSection>

      <DocsSection id="resources" title="Resources">
        <p>A separate, lighter-weight category for saved links — a resource is really just a note flagged differently, with a URL and a short description, kept out of your main notes list so it doesn't clutter actual journal entries.</p>
      </DocsSection>

      <DocsSection id="templates" title="Templates">
        <p>Save a note's structure as a reusable template, then insert it three different ways:</p>
        <p><span className="text-zinc-200 font-semibold">From the Templates section</span> — click <span className="text-zinc-200">Use Template</span> on a template card to create a brand-new note from it, starting untitled, and jump straight into editing.</p>
        <p><span className="text-zinc-200 font-semibold">From inside a note you're already writing</span> — insert a template exactly where your cursor is, letting you drop a template's structure in the middle of something you've already started, not just at the top.</p>
        <p><span className="text-zinc-200 font-semibold">From Trade Setup or Trade History's notes field</span> — since those fields are plain text, the template's content is converted down to plain text on insert.</p>
      </DocsSection>

      <DocsSection id="bulk" title="Bulk actions">
        <p>Multi-select notes to delete, duplicate, or move several at once — each action confirms with exactly how many notes were affected.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

export function DownloadsDocsPage() {
  const CARDS = [
    { id: "trade-log-download", icon: <IconFileText size={15} />, title: "Trade Log", description: "Raw entries, by date range.", actionLabel: "PDF or Markdown" },
    { id: "pnl-report-download", icon: <IconCurrencyRupee size={15} />, title: "P&L Report", description: "The summarized ledger.", actionLabel: "By month or year" },
    { id: "note-pdf-download", icon: <IconBulb size={15} />, title: "A Single Note", description: "Export one note as PDF.", actionLabel: "From the editor" },
    { id: "backup-download", icon: <IconDownload size={15} />, title: "Full Backup", description: "Everything, as one file.", actionLabel: "From Settings" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Downloads"
        lead="Everything in this app that can be exported, exactly what it contains, and exactly where to find it."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="trade-log-download" title="Trade Log — raw entries, by date range">
        <p>From <span className="text-zinc-200">Trade History → Trade Log</span>, the <span className="text-zinc-200">Download Logs</span> panel lets you pick a range — Today, Last 7 days, Last 30 days, All time, or a custom range — then choose <span className="text-zinc-200">Download</span>.</p>
        <p>A dialog then lets you pick exactly which entry types to include: <span className="text-zinc-200">Observation data</span>, <span className="text-zinc-200">Trade data</span>, <span className="text-zinc-200">Funds added</span>, and <span className="text-zinc-200">Withdrawals</span> — check any combination. Export as <span className="text-zinc-200">.PDF</span> or <span className="text-zinc-200">.MD</span> (Markdown).</p>
      </DocsSection>

      <DocsSection id="pnl-report-download" title="P&L report — the summarized ledger">
        <p>From the main <span className="text-zinc-200">Trade History</span> table itself (not the Trade Log), the <span className="text-zinc-200">Download P&L report</span> panel scopes the export <span className="text-zinc-200">By Month</span>, <span className="text-zinc-200">By Year</span>, or a custom date range, then downloads as Markdown or opens a PDF view you can save.</p>
        <p>This is the summarized trade ledger itself — different from the Trade Log's raw, timestamped entries above.</p>
      </DocsSection>

      <DocsSection id="note-pdf-download" title="A single note — as PDF">
        <p>Open any note in <span className="text-zinc-200">My Learnings</span> and use the download icon in its own toolbar (next to <span className="text-zinc-200">Use Template</span>) to export just that note as a PDF, formatted content and all.</p>
      </DocsSection>

      <DocsSection id="backup-download" title="Full backup — everything, as one file">
        <p>From your profile menu → <span className="text-zinc-200">Settings → Download Backup</span>, get a single JSON file containing your trades, checklist history, fund transactions, custom strategies, and My Learnings notes and folders.</p>
        <p>It does not include reminders or app settings (theme, PIN) — those live outside this export.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}

export function SettingsDocsPage() {
  const CARDS = [
    { id: "profile-theme", icon: <IconUserCircle size={15} />, title: "Profile & Theme", description: "4 themes, light and dark.", actionLabel: "Customize" },
    { id: "pin", icon: <IconLock size={15} />, title: "PIN Lock", description: "A second layer, independent of login.", actionLabel: "Set it up" },
    { id: "clear-data", icon: <IconTrash size={15} />, title: "Clearing Your Data", description: "Wipe categories independently.", actionLabel: "See options" },
    { id: "delete-account", icon: <IconUserOff size={15} />, title: "Deleting Your Account", description: "7-day grace period.", actionLabel: "How it works" },
  ];
  return (
    <DocsPageLayout>
      <DocsHeader
        title="Settings & Security"
        lead="Profile, appearance, your PIN, and everything to do with your own data — reached from your profile picture, top right."
      />

      <DocsCardGrid cards={CARDS} />

      <DocsSection id="profile-theme" title="Profile and theme">
        <p>Set a profile picture, nickname, and name. Appearance is fully skinnable — four themes (Swiss Minimal, Neubrutalist, Apple Glass, CRT Terminal), each with its own light and dark mode, changing colors, fonts, and even small interaction details, not just a color swap.</p>
      </DocsSection>

      <DocsSection id="pin" title="PIN lock">
        <p>Independent of your account login, the app has its own PIN, checked every time you open it. Set up security questions alongside it so a forgotten PIN is recoverable rather than a dead end. Too many failed attempts locks you out temporarily rather than allowing unlimited guesses.</p>
      </DocsSection>

      <DocsSection id="clear-data" title="Clearing your data">
        <p>Clear specific categories of your own data independently — Trading data, Strategies, Reminders, and My Learnings each have their own checkbox, so you can wipe one without touching the others. Every category's checkbox clears both the underlying records and any related settings tied to it (severity overrides, custom strategies, and so on) — not just the visible rows.</p>
      </DocsSection>

      <DocsSection id="delete-account" title="Deleting your account">
        <p>Requesting account deletion starts a 7-day grace period. Log back in within that window and it's automatically cancelled — nothing is lost. Let those 7 days pass and log in again after, and everything is gone at that point: every trade, note, and reminder, permanently, with no separate confirmation step once the window has closed.</p>
        <p>A full backup (see <span className="text-zinc-200">Downloads</span>) is independent of this flow, and worth taking before requesting deletion if you want a record.</p>
      </DocsSection>
    </DocsPageLayout>
  );
}
