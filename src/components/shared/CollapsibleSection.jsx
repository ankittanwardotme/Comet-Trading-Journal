import { useState, useEffect, useRef } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { FONT_MONO } from "../../lib/format.js";

export function CollapsibleSection({ title, icon: Icon, open, onToggle, children }) {
  const containerRef = useRef(null);
  const [overflowVisible, setOverflowVisible] = useState(open);

  useEffect(() => {
    if (open) {
      // Keep content clipped until the grid has actually finished growing
      // to fit it — removing the clip immediately let content visually pop
      // into full view before the row height had caught up, making the
      // expand look instant instead of smooth.
      const t = setTimeout(() => setOverflowVisible(true), 750);
      return () => clearTimeout(t);
    }
    setOverflowVisible(false); // closing — clip immediately, no animation to wait for
  }, [open]);

  const handleToggle = () => {
    const wasOpen = open;
    onToggle();
    if (!wasOpen) {
      // Opening from closed — scroll so the section comes into view as it
      // expands, rather than leaving the user to scroll down manually.
      // A single early scroll attempt gets clamped when this section is
      // near the bottom of the page: at that moment the page hasn't grown
      // tall enough yet (the content hasn't expanded), so the browser
      // can't scroll as far as the target requires. Re-asserting the
      // target every frame across the animation lets the scroll catch up
      // naturally as the page grows.
      const el = containerRef.current;
      if (!el) return;
      const NAVBAR_OFFSET = 88;
      const DURATION = 780;
      const start = performance.now();
      const tick = () => {
        const rect = el.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - NAVBAR_OFFSET;
        window.scrollTo({ top: Math.max(0, targetY) });
        if (performance.now() - start < DURATION) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  return (
    <div ref={containerRef} style={{ scrollMarginTop: "88px" }}>
      <button onClick={handleToggle} className="tj-section-toggle flex items-center justify-between w-full group px-6 sm:px-7 py-3 rounded-xl transition-colors">
        <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2 group-hover:text-zinc-300 transition-colors" style={FONT_MONO}>
          <Icon size={13} /> {title}
        </p>
        <IconChevronDown size={16} className={`text-zinc-500 group-hover:text-zinc-300 transition-transform duration-[750ms] ${open ? "" : "-rotate-90"}`} />
      </button>
      <div
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          marginTop: open ? "1rem" : "0px",
          transition: "grid-template-rows 750ms ease-in-out, margin-top 750ms ease-in-out",
        }}
      >
        <div className={overflowVisible ? "min-h-0" : "overflow-hidden min-h-0"}>
          <div className="space-y-4 pt-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Same grid-rows grow/shrink mechanism as CollapsibleSection (0fr <-> 1fr,
// with overflow clipped until the transition finishes) but as a persistent
// element whose `open` state toggles — never unmounted/remounted — so
// toggling smoothly collapses and expands the same content both ways,
// with no scroll-into-view behavior. `animated={false}` snaps instantly
// instead, for the case where this region shouldn't visibly animate at all.
export function CollapsibleRegion({ open, animated, duration = 750, children }) {
  const [overflowVisible, setOverflowVisible] = useState(open);
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setOverflowVisible(true), animated ? duration : 0);
      return () => clearTimeout(t);
    }
    setOverflowVisible(false);
  }, [open, animated, duration]);

  return (
    <div
      className="grid overflow-x-hidden"
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        transition: animated ? `grid-template-rows ${duration}ms ease-in-out` : "none",
      }}
    >
      <div className={overflowVisible ? "min-h-0" : "overflow-hidden min-h-0"}>{children}</div>
    </div>
  );
}
