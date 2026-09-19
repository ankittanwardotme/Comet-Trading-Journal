import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { getPortalTarget } from "../../lib/portal.js";

const TOOLTIP_EST_WIDTH = 220;
export const Tooltip = React.memo(function Tooltip({ text, children, disabled = false, wrapperClassName = "inline-flex" }) {
  const [mounted, setMounted] = useState(false); // present in the DOM at all
  const [visible, setVisible] = useState(false); // drives the opacity transition
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const fadeFrameRef = useRef(null);

  const updatePosition = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const wouldOverflowRight = rect.left + TOOLTIP_EST_WIDTH > window.innerWidth - 8;
      if (wouldOverflowRight) {
        // Anchor to the trigger's own right edge instead of jumping to some
        // unrelated fixed position — keeps the tooltip visually attached to
        // whatever you're actually hovering, even right at the screen edge.
        setCoords({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right), left: null });
      } else {
        setCoords({ top: rect.bottom + 6, left: Math.max(8, rect.left), right: null });
      }
    }
  };
  const show = () => {
    if (disabled || !text) return;
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => {
      updatePosition();
      setMounted(true);
      // Flip to visible on the next frame, after the initial (opacity: 0)
      // state has actually painted — flipping in the same tick would let
      // the browser collapse straight to the end state with no transition.
      fadeFrameRef.current = requestAnimationFrame(() => setVisible(true));
    }, 1000);
  };
  const hide = () => {
    if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
    if (fadeFrameRef.current) { cancelAnimationFrame(fadeFrameRef.current); fadeFrameRef.current = null; }
    if (!mounted) return;
    setVisible(false); // starts the fade-out transition
    hideTimerRef.current = setTimeout(() => { setMounted(false); hideTimerRef.current = null; }, 160);
  };
  useEffect(() => () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (fadeFrameRef.current) cancelAnimationFrame(fadeFrameRef.current);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [mounted]);

  return (
    <span ref={wrapRef} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} className={wrapperClassName}>
      {children}
      {mounted && coords && text && createPortal(
        <div
          className="fixed max-w-[220px] w-max rounded-lg border border-zinc-700 tj-solid-bg shadow-2xl px-2.5 py-1.5 text-[10.5px] text-zinc-300 leading-relaxed pointer-events-none z-[9999]"
          style={{
            top: coords.top, ...(coords.left !== null ? { left: coords.left } : { right: coords.right }),
            opacity: visible ? 1 : 0,
            transition: "opacity 150ms ease",
          }}
        >
          {text}
        </div>,
        getPortalTarget()
      )}
    </span>
  );
});
