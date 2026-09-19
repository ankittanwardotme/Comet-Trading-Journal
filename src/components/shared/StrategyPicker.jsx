import { useState, useRef, useEffect } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "@tabler/icons-react";
import { STRATEGY_CATEGORIES } from "../../lib/checklistLogic.js";
import { getPortalTarget } from "../../lib/portal.js";
import { lockPageScroll, unlockPageScroll } from "../../lib/scrollLock.js";

export function StrategyPicker({ value, allStrategies, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [measured, setMeasured] = useState(false);
  const [activeCategory, setActiveCategory] = useState(STRATEGY_CATEGORIES[0].id);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 280), triggerTop: rect.top, triggerBottom: rect.bottom });
    }
  };
  const toggle = () => {
    if (!open) {
      setMeasured(false);
      updatePosition();
      const current = (allStrategies || []).find((s) => s.label === value);
      setActiveCategory(current ? (current.category || "other") : STRATEGY_CATEGORIES[0].id);
    }
    setOpen((v) => !v);
  };

  // Same below-first-then-flip-up-if-needed approach used by ThemedSelect
  // and the other custom pickers in this app, so the page never has to
  // scroll to accommodate the menu.
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

  const optionsInCategory = (allStrategies || []).filter((s) => (s.category || "other") === activeCategory);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={toggle}
        className="w-full flex items-center justify-between gap-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 text-left focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <span className="truncate">{value || "Select strategy"}</span>
        <IconChevronDown size={12} className="flex-shrink-0 text-zinc-500" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-2 tj-popover flex flex-col"
            style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: 360, visibility: measured ? "visible" : "hidden" }}
          >
            <div className="flex gap-1 mb-2 flex-shrink-0">
              {STRATEGY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg font-semibold transition-colors ${activeCategory === cat.id ? "tj-primary-bg" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto space-y-0.5">
              {optionsInCategory.length === 0 && <p className="text-xs text-zinc-600 px-2 py-3 text-center">No strategies in this category.</p>}
              {optionsInCategory.map((s) => (
                <button
                  key={s.id} type="button"
                  onClick={() => { onChange(s.label); setOpen(false); }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${value === s.label ? "tj-primary-bg font-semibold" : "text-zinc-200 hover:bg-zinc-800"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
