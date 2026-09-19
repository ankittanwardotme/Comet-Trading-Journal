import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { IconClock } from "@tabler/icons-react";
import { FONT_MONO } from "../../../lib/format.js";
import { getPortalTarget } from "../../../lib/portal.js";
import { lockPageScroll, unlockPageScroll } from "../../../lib/scrollLock.js";
import { parseReminderTime, currentTimeString } from "../../../lib/reminderTime.js";

const WHEEL_ITEM_H = 40;
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS;
const WHEEL_PAD = (WHEEL_H - WHEEL_ITEM_H) / 2;

// One scrollable "wheel" column — snaps to whichever row is centered after
// scrolling stops, and clicking any visible row jumps straight to it.
function TimeWheelColumn({ values, value, onChange, render }) {
  const isProgrammatic = useRef(false);
  const settleTimer = useRef(null);
  const lastWheelTime = useRef(0);
  const velocityLog = useRef([]);
  const idx = values.indexOf(value);
  const [position, setPosition] = useState(idx);
  const [snapping, setSnapping] = useState(true);
  const n = values.length;
  const wrap = (i) => ((i % n) + n) % n;

  useEffect(() => {
    if (isProgrammatic.current) return;
    setSnapping(true);
    setPosition(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const settle = (finalPos) => {
    setSnapping(true);
    const rounded = wrap(Math.round(finalPos));
    setPosition(rounded);
    velocityLog.current = [];
    if (values[rounded] !== value) { isProgrammatic.current = true; onChange(values[rounded]); requestAnimationFrame(() => { isProgrammatic.current = false; }); }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const now = performance.now();
    const dt = now - lastWheelTime.current;
    lastWheelTime.current = now;
    setSnapping(false);

    // Track recent wheel-event timing to estimate real scroll speed —
    // events arriving close together (a fast flick) move further per tick
    // than events spaced apart (a slow, deliberate nudge). A single,
    // isolated tick always moves by at least 1 rather than rounding away
    // to nothing; a rapid run of ticks ramps up to move by several at once.
    velocityLog.current.push(dt);
    if (velocityLog.current.length > 5) velocityLog.current.shift();
    const avgDt = velocityLog.current.reduce((a, b) => a + b, 0) / velocityLog.current.length;
    const speedFactor = Math.max(1, Math.min(4, 80 / Math.max(avgDt, 20)));
    const rawStep = Math.sign(e.deltaY) * speedFactor;

    // No clamping here — position is free to run past either end of the
    // range during the scroll itself, so the wheel motion stays smooth and
    // continuous through the wrap (00 minutes scrolling up keeps going
    // straight into 59, 58... rather than stopping dead at the boundary).
    setPosition((prev) => prev + rawStep);

    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      setPosition((prev) => { settle(prev); return prev; });
    }, 130);
  };

  // Takes the clicked row's offset from the current center (not an
  // absolute value) so the wheel always animates the short way around to
  // it, rather than potentially jumping all the way across the wheel if
  // "position" has wrapped several times from repeated scrolling.
  const jumpTo = (offset) => {
    setSnapping(true);
    const target = position + offset;
    setPosition(target);
    const wrappedIdx = wrap(Math.round(target));
    if (values[wrappedIdx] !== value) { isProgrammatic.current = true; onChange(values[wrappedIdx]); requestAnimationFrame(() => { isProgrammatic.current = false; }); }
  };

  const centerIndex = Math.round(position);
  const offsetPx = (position - centerIndex) * WHEEL_ITEM_H;

  // For short value arrays (AM/PM has only 2), wrapping the same 5 visible
  // slots would otherwise repeat a value 2-3 times. Process offsets in
  // order of distance from center so the closest occurrence of each
  // unique wrapped index "wins"; farther, duplicate offsets render blank
  // instead of showing the same value again.
  const keepOffset = new Set();
  const seenWrapped = new Set();
  [0, -1, 1, -2, 2].forEach((o) => {
    const w = wrap(centerIndex + o);
    if (!seenWrapped.has(w)) { seenWrapped.add(w); keepOffset.add(o); }
  });

  return (
    <div onWheel={handleWheel} style={{ height: WHEEL_H, overflow: "hidden" }} className="relative">
      <div style={{ transform: `translateY(${-offsetPx}px)`, transition: snapping ? "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)" : "none" }}>
        {[-2, -1, 0, 1, 2].map((o) => {
          const v = keepOffset.has(o) ? values[wrap(centerIndex + o)] : undefined;
          const distance = Math.abs(o);
          const isCenter = o === 0;
          return (
            <div key={o} style={{ height: WHEEL_ITEM_H }} className="flex items-center justify-center">
              {v !== undefined && (
                <button
                  type="button" onClick={() => jumpTo(o)}
                  className="w-full h-full flex items-center justify-center"
                >
                  <span
                    className="transition-all"
                    style={{
                      fontSize: isCenter ? 20 : 16, fontWeight: isCenter ? 700 : 400,
                      color: isCenter ? "#f5f5f7" : distance === 1 ? "#71717a" : "#3f3f46",
                      fontFamily: "monospace",
                    }}
                  >
                    {render ? render(v) : v}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const WHEEL_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => i);
const WHEEL_AMPM = ["AM", "PM"];

export function TimeWheelField({ value, onChange, error = false }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [measured, setMeasured] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [draftH, draftM, draftAP] = useMemo(() => parseReminderTime(value), [value, open]);
  const [h, setH] = useState(draftH);
  const [m, setM] = useState(draftM);
  const [ap, setAp] = useState(draftAP);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260), triggerTop: rect.top, triggerBottom: rect.bottom });
    }
  };
  const openPicker = () => {
    const [ph, pm, pap] = parseReminderTime(value);
    setH(ph); setM(pm); setAp(pap);
    setMeasured(false);
    updatePosition();
    setOpen(true);
  };

  // Renders below first as a reasonable guess, then measures its real
  // height and flips it to open above the trigger instead if it would
  // otherwise run past the bottom of the viewport.
  React.useLayoutEffect(() => {
    if (!open || !menuRef.current || !coords) return;
    const menuHeight = menuRef.current.getBoundingClientRect().height;
    const overflowBelow = coords.triggerBottom + 6 + menuHeight - window.innerHeight;
    if (overflowBelow > 0 && coords.triggerTop - 6 - menuHeight >= 0) {
      setCoords((prev) => ({ ...prev, top: prev.triggerTop - 6 - menuHeight }));
    }
    setMeasured(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coords && coords.triggerTop]);

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    window.addEventListener("resize", updatePosition);
    return () => { unlockPageScroll(); window.removeEventListener("resize", updatePosition); };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={openPicker}
        className={`w-full flex items-center justify-between gap-1.5 bg-zinc-950 border rounded-lg px-3 py-2 text-xs text-left ${error ? "border-rose-500" : "border-zinc-800"}`}
        style={FONT_MONO}
      >
        <span className={value ? "text-zinc-100" : "text-zinc-600"}>{value || currentTimeString()}</span>
        <IconClock size={13} className="text-zinc-500 flex-shrink-0" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl overflow-hidden tj-popover"
            style={{ width: Math.max(coords.width, 260), top: coords.top, left: coords.left, visibility: measured ? "visible" : "hidden" }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-amber-400 font-medium">Cancel</button>
              <p className="text-xs font-semibold text-zinc-200">Reminder Time</p>
              <button
                type="button"
                onClick={() => { onChange(`${h}:${String(m).padStart(2, "0")} ${ap}`); setOpen(false); }}
                className="text-xs text-amber-400 font-semibold"
              >
                Save
              </button>
            </div>
            <div className="relative px-3 py-2.5">
              <div className="absolute left-3 right-3 rounded-lg bg-zinc-800/60 pointer-events-none" style={{ top: 10 + WHEEL_PAD, height: WHEEL_ITEM_H }} />
              <div className="flex justify-center gap-6 relative">
                <TimeWheelColumn values={WHEEL_HOURS} value={h} onChange={setH} render={(v) => String(v).padStart(2, "0")} />
                <TimeWheelColumn values={WHEEL_MINUTES} value={m} onChange={setM} render={(v) => String(v).padStart(2, "0")} />
                <TimeWheelColumn values={WHEEL_AMPM} value={ap} onChange={setAp} />
              </div>
            </div>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-2.5 border-t border-zinc-800"
              >
                Clear time
              </button>
            )}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
