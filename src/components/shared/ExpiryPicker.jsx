import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { getPortalTarget } from "../../lib/portal.js";
import { FONT_MONO } from "../../lib/format.js";
import { generateExpiryOptions } from "../../lib/dateUtils.js";

export function ExpiryPicker({ value, onChange, holidays, referenceDate }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const options = useMemo(() => generateExpiryOptions(holidays, referenceDate), [holidays, referenceDate]);
  const selected = options.find((o) => o.iso === value);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 12; // small breathing room from the viewport edge
      const maxHeight = Math.max(120, Math.min(256, spaceBelow));
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight });
    }
    setOpen(true);
  };

  // Lock the page in place while open — a true dropdown, not something that
  // has to chase the button around as the page scrolls underneath it.
  // Scrollbar-width compensation isn't needed here: the global
  // `scrollbar-gutter: stable` rule (index.css) already keeps that space
  // permanently reserved, so adding padding-right on top of it would
  // double-count the gutter and shift content sideways when locking.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="w-full flex items-center justify-between gap-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
        style={FONT_MONO}
      >
        <span className="truncate">{selected ? selected.label : "Expiry"}</span>
        {open ? <IconChevronUp size={13} className="flex-shrink-0" /> : <IconChevronDown size={13} className="flex-shrink-0" />}
      </button>
      {open && coords && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] overflow-y-auto rounded-lg border border-zinc-800 tj-solid-bg shadow-2xl tj-popover"
            style={{ top: coords.top, left: coords.left, width: Math.max(coords.width, 208), maxHeight: coords.maxHeight }}
          >
            {options.map((o) => (
              <button
                type="button"
                key={o.iso}
                onClick={() => { onChange(o.iso); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs ${o.iso === value ? "tj-primary-bg font-semibold" : "text-zinc-200 hover:bg-zinc-800"}`}
                style={FONT_MONO}
              >
                {o.label} ({o.days} Day{o.days === 1 ? "" : "s"})
              </button>
            ))}
          </div>
        </>,
        getPortalTarget()
      )}
    </div>
  );
}
