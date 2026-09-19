import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { getPortalTarget } from "../../lib/portal.js";
import { FONT_MONO } from "../../lib/format.js";

export const InfoIcon = React.memo(function InfoIcon({ text }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const tooltipRef = useRef(null);

  const positionFor = (tooltipHeight) => {
    if (!btnRef.current) return null;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < tooltipHeight + 10;
    return {
      top: flipUp ? Math.max(6, rect.top - tooltipHeight - 6) : rect.bottom + 6,
      right: window.innerWidth - rect.right,
    };
  };

  // Before the tooltip has ever rendered we don't know its real height, so
  // guess conservatively (most of these run 2-4 lines at this width) — the
  // layout effect below corrects this against the actual height a moment
  // later, synchronously before paint, so there's no visible flicker.
  const updatePosition = () => setCoords(positionFor(tooltipRef.current ? tooltipRef.current.getBoundingClientRect().height : 90));

  const showTooltip = () => {
    updatePosition();
    setOpen(true);
  };
  const hideTooltip = () => setOpen(false);
  const toggleTooltip = (e) => {
    e.stopPropagation();
    if (open) { hideTooltip(); return; }
    showTooltip();
  };

  React.useLayoutEffect(() => {
    if (open && tooltipRef.current) {
      setCoords(positionFor(tooltipRef.current.getBoundingClientRect().height));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    // Tapping/clicking anywhere else closes it — needed since touch
    // devices have no hover-out equivalent to hideTooltip.
    const closeOnOutside = () => hideTooltip();
    document.addEventListener("click", closeOnOutside);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("click", closeOnOutside);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        tabIndex={-1}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={toggleTooltip}
        className="w-4 h-4 rounded-full border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 flex items-center justify-center text-[9px] font-bold transition-colors cursor-help"
        style={FONT_MONO}
      >
        i
      </button>
      {open && coords && createPortal(
        <div
          ref={tooltipRef}
          className="fixed w-52 rounded-lg border border-zinc-700 tj-solid-bg shadow-2xl p-2.5 text-[10.5px] text-zinc-300 leading-relaxed pointer-events-none z-[9999]"
          style={{ top: coords.top, right: coords.right }}
        >
          {text}
        </div>,
        getPortalTarget()
      )}
    </>
  );
});
