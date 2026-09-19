import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { IconBell } from "@tabler/icons-react";
import { getPortalTarget } from "../../lib/portal.js";
import { dbStorage } from "../../lib/supabaseClient.js";
import { subscribeToNotifications, clearPersistedNotifications } from "../../lib/notifications.js";
import { FONT_MONO, formatRelativeTime } from "../../lib/format.js";
import { Tooltip } from "./Tooltip.jsx";

export function NotificationBell() {
  const [history, setHistory] = useState([]);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [, forceTick] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [clearingCount, setClearingCount] = useState(0);
  const btnRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [historyRes, seenRes] = await Promise.all([
          dbStorage.get("notification-history"),
          dbStorage.get("notification-last-seen"),
        ]);
        const parsedHistory = historyRes && historyRes.value ? JSON.parse(historyRes.value) : null;
        const parsedSeenAt = seenRes && seenRes.value ? JSON.parse(seenRes.value) : 0;
        if (!cancelled) {
          const loadedHistory = Array.isArray(parsedHistory) ? parsedHistory : [];
          setLastSeenAt(parsedSeenAt || 0);
          // Merge with whatever's already in state instead of replacing it
          // outright — a live notification may have already arrived (and
          // been added via the subscription below) while this load was
          // still in flight, and a blind overwrite here would silently
          // discard it from the UI even though it's correctly persisted.
          setHistory((prev) => {
            const merged = [...prev];
            const existingIds = new Set(prev.map((n) => n.id));
            loadedHistory.forEach((n) => { if (!existingIds.has(n.id)) merged.push(n); });
            merged.sort((a, b) => b.createdAt - a.createdAt);
            return merged.slice(0, 20);
          });
        }
      } catch (err) { /* best effort — start from empty history */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notification) => {
      setHistory((prev) => (prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev].slice(0, 20)));
    });
    return unsubscribe;
  }, []);

  // Derived from history + lastSeenAt rather than tracked as its own piece
  // of state — a separately-updated counter is exactly what raced against
  // the async load above. Computed fresh from the two things it actually
  // depends on, it can't drift out of sync with either.
  const unreadCount = useMemo(() => history.filter((n) => n.createdAt > lastSeenAt).length, [history, lastSeenAt]);

  // Persistence for new entries is handled centrally inside notify() itself
  // now (see its definition) — this component only needs to load the
  // initial history and reflect live updates in the UI while mounted.

  // Clears one notification at a time, starting from the oldest (bottom of
  // the list, rendered last) and working up to the newest (top, rendered
  // first) — matching the same right-slide-out the toasts use — then closes
  // the dropdown once the last one has finished.
  const clearHistory = () => {
    if (history.length === 0 || isClearing) return;
    const total = history.length;
    const stagger = 70;
    const animDuration = 250;
    setIsClearing(true);
    for (let i = 1; i <= total; i++) {
      setTimeout(() => setClearingCount(i), (i - 1) * stagger);
    }
    setTimeout(() => {
      setHistory([]);
      setIsClearing(false);
      setClearingCount(0);
      setOpen(false);
      clearPersistedNotifications();
    }, (total - 1) * stagger + animDuration);
  };

  // Keep "Xs ago" / "X min ago" accurate while the dropdown is actually open.
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(true);
    const now = Date.now();
    setLastSeenAt(now);
    dbStorage.set("notification-last-seen", JSON.stringify(now)).catch(() => {});
  };

  return (
    <>
      <Tooltip text="Notifications">
        <button
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openDropdown())}
          className="relative w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center flex-shrink-0 hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
        >
          <IconBell size={15} className="text-zinc-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center" style={FONT_MONO}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="tj-popover fixed z-[9999] w-80 max-h-96 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-2 flex flex-col"
            style={{ top: coords.top, right: coords.right }}
          >
            <div className="flex items-center justify-between px-2 py-1.5 flex-shrink-0">
              <span className="text-xs font-semibold text-zinc-300">Notifications</span>
              {history.length > 0 && !isClearing && (
                <button onClick={clearHistory} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">Clear</button>
              )}
            </div>
            <div className="overflow-y-auto overflow-x-hidden">
            {history.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">No notifications yet.</p>
            ) : (
              <div className="space-y-1">
                {history.map((n, index) => {
                  const positionFromBottom = history.length - 1 - index;
                  const isExiting = isClearing && positionFromBottom < clearingCount;
                  return (
                    <div key={n.id} className={`px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors ${isExiting ? "tj-toast-out" : ""}`}>
                      <p className="text-xs text-zinc-200">{n.message}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5" style={FONT_MONO}>{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}
