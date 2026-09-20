import { IconChecklist } from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";

export function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "#09090b" }}>
      <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-100" style={FONT_DISPLAY}>
        <IconChecklist size={22} className="tj-primary-text" />
        Comet Trading Journal
      </div>
      <div className="w-40 h-1 rounded-full bg-zinc-800 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-1/3 tj-primary-bg rounded-full" style={{ animation: "tj-loading-sweep 1.1s ease-in-out infinite" }}></div>
      </div>
      <p className="text-xs text-zinc-600" style={FONT_MONO}>Loading your journal...</p>
    </div>
  );
}
