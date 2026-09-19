import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getPortalTarget } from "../../lib/portal.js";
import { MOOD_OPTIONS, moodMeta, TWEMOJI_CDN } from "../../lib/moodOptions.js";
import { Tooltip } from "./Tooltip.jsx";
import { MoodEmoji } from "./MoodEmoji.jsx";

const MOOD_PICKER_EST_WIDTH = 260;
export function MoodPickerButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const meta = value ? moodMeta(value) : null;

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - MOOD_PICKER_EST_WIDTH - 8);
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

  return (
    <>
      <Tooltip text={meta ? `Exit mood: ${meta.label}` : "Tag exit mood"}>
        <button
          type="button"
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openPicker())}
          className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(128,128,128,0.18)] ${!meta ? "opacity-40 grayscale" : ""}`}
        >
          {meta ? <MoodEmoji id={meta.id} size={18} /> : (
            <img src={`${TWEMOJI_CDN}1F610.svg`} alt="Tag mood" width={18} height={18} style={{ width: 18, height: 18 }} loading="lazy" />
          )}
        </button>
      </Tooltip>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-2.5 flex flex-wrap gap-1.5 tj-popover"
            style={{ top: coords.top, left: coords.left, width: MOOD_PICKER_EST_WIDTH }}
          >
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(value === m.id ? null : m.id); setOpen(false); }}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
                  value === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <MoodEmoji id={m.id} size={16} /> {m.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </>
  );
}
