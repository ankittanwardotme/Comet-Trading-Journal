import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { getPortalTarget } from "../../lib/portal.js";
import { subscribeToNotifications } from "../../lib/notifications.js";

export function ToastStack() {
  const [toasts, setToasts] = useState([]);

  const dismissToast = (id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250);
  };

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notification) => {
      const duration = notification.duration || 2000;
      setToasts((prev) => [...prev, { ...notification, closing: false, duration }]);
      setTimeout(() => dismissToast(notification.id), duration);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-20 right-4 sm:right-8 z-[10002] flex flex-col gap-2 w-72 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`relative overflow-hidden rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl px-3.5 py-3 pr-8 pointer-events-auto ${t.closing ? "tj-toast-out" : "tj-toast-in"}`}
        >
          <p className="text-xs text-zinc-200 leading-relaxed">{t.message}</p>
          {t.onUndo && !t.closing && (
            <button
              type="button"
              onClick={() => { t.onUndo(); dismissToast(t.id); }}
              className="mt-1.5 text-xs font-semibold tj-primary-text hover:underline"
            >
              Undo
            </button>
          )}
          <button type="button" onClick={() => dismissToast(t.id)} className="tj-toast-close absolute top-2 right-2 text-zinc-500">
            <IconX size={13} />
          </button>
          {!t.closing && <div className="absolute bottom-0 left-0 h-0.5 bg-rose-500" style={{ animation: `tj-toast-countdown ${t.duration}ms linear forwards` }}></div>}
        </div>
      ))}
    </div>,
    getPortalTarget()
  );
}
