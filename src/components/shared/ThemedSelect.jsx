import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "@tabler/icons-react";
import { getPortalTarget } from "../../lib/portal.js";
import { lockPageScroll, unlockPageScroll } from "../../lib/scrollLock.js";

export function ThemedSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [measured, setMeasured] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width, triggerTop: rect.top, triggerBottom: rect.bottom });
    }
  };
  const toggle = () => {
    if (!open) { setMeasured(false); updatePosition(); }
    setOpen((v) => !v);
  };

  // The menu always renders below first (a reasonable guess), then this
  // measures its real height and flips it to open upward instead if it
  // would otherwise run past the bottom of the viewport — the same
  // approach native OS pickers use, so the page itself never needs to
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

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={toggle}
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 text-left"
      >
        {current ? current.label : ""}
        <IconChevronDown size={13} className="flex-shrink-0 text-zinc-500" />
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-zinc-800 tj-solid-bg shadow-2xl p-1.5 tj-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width, visibility: measured ? "visible" : "hidden" }}
          >
            {options.map((o) => (
              <button
                key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${value === o.value ? "tj-primary-bg font-semibold" : "text-zinc-200 hover:bg-zinc-800"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
