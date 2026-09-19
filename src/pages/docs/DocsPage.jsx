import { useState, useEffect } from "react";
import { FONT_MONO } from "../../lib/format.js";
import { DOCS_SECTIONS } from "./docsShared.jsx";
import {
  GettingStartedDocsPage, ChecklistDocsPage, TradeSetupDocsPage, TradeHistoryDocsPage,
  RemindersDocsPage, LearningsDocsPage, DownloadsDocsPage, SettingsDocsPage,
} from "./DocsContentPages.jsx";
import { McpServerDocsPage } from "./McpServerDocsPage.jsx";

export function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  return (
    <div className="flex gap-12">
      <div className="w-52 flex-shrink-0 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 px-2.5" style={FONT_MONO}>Docs</p>
        {DOCS_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`w-full text-left text-xs px-2.5 py-2 rounded-lg transition-colors ${activeSection === s.id ? "tj-primary-bg font-semibold" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        {activeSection === "getting-started" && <GettingStartedDocsPage />}
        {activeSection === "checklist" && <ChecklistDocsPage />}
        {activeSection === "trade-setup" && <TradeSetupDocsPage />}
        {activeSection === "trade-history" && <TradeHistoryDocsPage />}
        {activeSection === "reminders" && <RemindersDocsPage />}
        {activeSection === "learnings" && <LearningsDocsPage />}
        {activeSection === "downloads" && <DownloadsDocsPage />}
        {activeSection === "settings" && <SettingsDocsPage />}
        {activeSection === "mcp-server" && <McpServerDocsPage />}
      </div>
    </div>
  );
}
