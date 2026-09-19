import { createPortal } from "react-dom";
import {
  IconLayoutDashboard, IconChecklist, IconAdjustmentsHorizontal, IconCurrencyRupee, IconBulb,
  IconSun, IconMoon, IconSettings, IconFlag, IconBook, IconLock,
} from "@tabler/icons-react";
import logo from "../../assets/logo.png";
import { supabase } from "../../lib/supabaseClient.js";
import { getPortalTarget } from "../../lib/portal.js";
import { Tooltip } from "../../components/shared/Tooltip.jsx";
import { NotificationBell } from "../../components/shared/NotificationBell.jsx";
import { AvatarSVG, DEFAULT_AVATAR } from "../../components/shared/AvatarSVG.jsx";

const NAV_TABS = [
  { id: "home", label: "Dashboard", icon: IconLayoutDashboard },
  { id: "checklist", label: "Checklist", icon: IconChecklist },
  { id: "setup", label: "Trade Setup", icon: IconAdjustmentsHorizontal, animated: true },
  { id: "pnl", label: "Trade History", icon: IconCurrencyRupee },
  { id: "learn", label: "My Learnings", icon: IconBulb, last: true },
];

export function TopNavBar({
  navRef, navHidden, topTab, setTopTab, mode,
  baseTh, effectiveMode, setColorMode,
  userProfile, avatarMenuOpen, setAvatarMenuOpen, avatarMenuCoords, setAvatarMenuCoords, avatarBtnRef,
  previousTopTab, setPreviousTopTab,
}) {
  return (
    <div
      ref={navRef}
      className="tj-navbar sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 relative transition-transform duration-300 ease-out"
      style={{ willChange: "transform", transform: navHidden ? "translateY(-100%)" : "translateY(0)" }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3.5">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <button onClick={() => setTopTab("home")} className="tj-logo-btn flex items-center flex-shrink-0" aria-label="Comet Trading Journal — Dashboard">
            <img src={logo} alt="Comet Trading Journal" className="h-12 w-auto transition-transform duration-150" />
          </button>

          <div className="flex items-center justify-center overflow-x-auto no-scrollbar py-3 -my-1.5 min-w-0">
            {NAV_TABS.map((t) => {
              const visible = t.id !== "setup" || mode === "trade";
              const tabButton = (
                <button
                  key={t.id}
                  onClick={() => setTopTab(t.id)}
                  className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap ${
                    topTab === t.id ? "tj-primary-bg" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <t.icon size={15} className="flex-shrink-0" />
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              );
              if (!t.animated) return <div key={t.id} className={`flex-shrink-0 ${t.last ? "" : "mr-2"}`}>{tabButton}</div>;
              return (
                <div
                  key={t.id}
                  className="flex-shrink-0"
                  style={{
                    transition: "max-width 750ms ease-out, opacity 750ms ease-out, transform 750ms ease-out, margin-right 750ms ease-out",
                    maxWidth: visible ? "220px" : "0px",
                    marginRight: visible ? "8px" : "0px",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "scale(1)" : "scale(0.6)",
                    overflow: visible ? "visible" : "hidden",
                  }}
                >
                  {tabButton}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {baseTh.alt && (
              <Tooltip text={effectiveMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                <button
                  onClick={() => setColorMode(effectiveMode === "dark" ? "light" : "dark")}
                  className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center tj-primary-text hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
                >
                  {effectiveMode === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}
                </button>
              </Tooltip>
            )}
            <NotificationBell />
            <Tooltip text="Profile">
              <button
                ref={avatarBtnRef}
                onClick={() => {
                  if (!avatarMenuOpen && avatarBtnRef.current) {
                    const rect = avatarBtnRef.current.getBoundingClientRect();
                    setAvatarMenuCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                  }
                  setAvatarMenuOpen((v) => !v);
                }}
                className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 overflow-hidden flex items-center justify-center flex-shrink-0 hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
              >
                {userProfile.avatarType === "custom" && userProfile.avatarValue ? (
                  <img src={userProfile.avatarValue} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <AvatarSVG preset={DEFAULT_AVATAR} size={32} animate={false} />
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {avatarMenuOpen && avatarMenuCoords && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setAvatarMenuOpen(false)} />
            <div
              className="tj-popover fixed z-[9999] w-56 rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-2 space-y-1"
              style={{ top: avatarMenuCoords.top, right: avatarMenuCoords.right }}
            >
              <button
                onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" ? previousTopTab : topTab); setTopTab("profile"); setAvatarMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
              >
                <IconSettings size={15} className="text-zinc-500 flex-shrink-0" /> Settings
              </button>
              <button
                onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" ? previousTopTab : topTab); setTopTab("holidays"); setAvatarMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
              >
                <IconFlag size={15} className="text-zinc-500 flex-shrink-0" /> Holiday Calendar
              </button>
              <button
                onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" || topTab === "docs" ? previousTopTab : topTab); setTopTab("docs"); setAvatarMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
              >
                <IconBook size={15} className="text-zinc-500 flex-shrink-0" /> Docs
              </button>
              <div className="h-px bg-zinc-800 my-1"></div>
              <button
                onClick={() => { setAvatarMenuOpen(false); sessionStorage.removeItem("tj-pin-unlocked"); supabase.auth.signOut(); }}
                className="w-full flex items-center gap-2.5 text-sm text-rose-400 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
              >
                <IconLock size={15} className="flex-shrink-0" /> Sign Out
              </button>
            </div>
          </>,
          getPortalTarget()
        )}
      </div>
    </div>
  );
}
