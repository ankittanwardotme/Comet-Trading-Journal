import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconCamera, IconX, IconLoader2, IconPlus } from "@tabler/icons-react";
import { FONT_MONO } from "../../lib/format.js";
import { getPortalTarget } from "../../lib/portal.js";
import { uploadTradeFile, deleteTradeScreenshotFiles } from "../../lib/supabaseClient.js";
import { notify } from "../../lib/notifications.js";
import { Tooltip } from "./Tooltip.jsx";

const SCREENSHOTS_POPOVER_WIDTH = 260;
export function TradeScreenshotsButton({ screenshots = [], onChange, tradeLabel = "trade" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const btnRef = useRef(null);
  const fileInputRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - SCREENSHOTS_POPOVER_WIDTH - 8);
      setCoords({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
  };
  const openPicker = () => { updatePosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const handleFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTradeFile(file);
      onChange([...(screenshots || []), { url, uploaded_at: new Date().toISOString() }]);
      notify("Screenshot added.");
    } catch (err) {
      notify("Couldn't upload that screenshot — please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = async (idx) => {
    const removed = screenshots[idx];
    onChange(screenshots.filter((_, i) => i !== idx));
    if (removed) deleteTradeScreenshotFiles([removed]);
  };

  return (
    <>
      <Tooltip text={screenshots.length ? `${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"}` : "Attach a chart screenshot"}>
        <button
          type="button"
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openPicker())}
          className={`relative flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(128,128,128,0.18)] ${screenshots.length ? "" : "opacity-40"}`}
        >
          <IconCamera size={16} />
          {screenshots.length > 0 && (
            <span className="absolute -top-1 -right-1 tj-primary-bg text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
              {screenshots.length}
            </span>
          )}
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-2.5 tj-popover"
            style={{ top: coords.top, left: coords.left, width: SCREENSHOTS_POPOVER_WIDTH }}
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 px-0.5" style={FONT_MONO}>Screenshots — {tradeLabel}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {screenshots.map((s, idx) => (
                <div key={s.url + idx} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-800">
                  <img
                    src={s.url}
                    alt=""
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightboxUrl(s.url)}
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconX size={10} className="text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                {uploading ? <IconLoader2 size={16} className="animate-spin" /> : <IconPlus size={16} />}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
          </div>
        </>,
        getPortalTarget(),
      )}
      {lightboxUrl && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-8" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <IconX size={18} className="text-white" />
          </button>
        </div>,
        getPortalTarget(),
      )}
    </>
  );
}
