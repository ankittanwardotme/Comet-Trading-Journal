import { useState, useEffect, useRef } from "react";
import { IconX } from "@tabler/icons-react";
import { FONT_DISPLAY } from "../../lib/format.js";

export function PhotoCropDialog({ file, onApply, onClose }) {
  const FRAME = 260;
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [imgUrl, setImgUrl] = useState(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImgNatural({ w: img.width, h: img.height });
        setImgUrl(ev.target.result);
        setZoom(1);
        setPos({ x: 0, y: 0 });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, [file]);

  const baseScale = imgNatural.w && imgNatural.h ? Math.max(FRAME / imgNatural.w, FRAME / imgNatural.h) : 1;
  const displayScale = baseScale * zoom;
  const displayW = imgNatural.w * displayScale;
  const displayH = imgNatural.h * displayScale;

  const clampPos = (p, scale) => {
    const w = imgNatural.w * scale, h = imgNatural.h * scale;
    const maxX = Math.max(0, (w - FRAME) / 2);
    const maxY = Math.max(0, (h - FRAME) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  };

  const pointOf = (e) => (e.touches ? e.touches[0] : e);
  const onDragStart = (e) => {
    dragging.current = true;
    const pt = pointOf(e);
    dragStart.current = { x: pt.clientX, y: pt.clientY };
    posStart.current = { ...pos };
  };
  const onDragMove = (e) => {
    if (!dragging.current) return;
    const pt = pointOf(e);
    const dx = pt.clientX - dragStart.current.x;
    const dy = pt.clientY - dragStart.current.y;
    setPos(clampPos({ x: posStart.current.x + dx, y: posStart.current.y + dy }, displayScale));
  };
  const onDragEnd = () => { dragging.current = false; };

  const handleZoom = (v) => {
    setZoom(v);
    setPos((p) => clampPos(p, baseScale * v));
  };

  const apply = () => {
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const outScale = (size / FRAME) * displayScale;
      const cx = size / 2 + pos.x * (size / FRAME);
      const cy = size / 2 + pos.y * (size / FRAME);
      ctx.drawImage(img, cx - (imgNatural.w * outScale) / 2, cy - (imgNatural.h * outScale) / 2, imgNatural.w * outScale, imgNatural.h * outScale);
      onApply(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = imgUrl;
  };

  if (!imgUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Adjust Photo</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>
        <div
          className="relative mx-auto rounded-full overflow-hidden border-2 border-zinc-700 cursor-move select-none touch-none"
          style={{ width: FRAME, height: FRAME }}
          onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
        >
          <img
            src={imgUrl}
            draggable={false}
            alt="Crop preview"
            style={{
              position: "absolute", left: "50%", top: "50%",
              width: displayW, height: displayH,
              maxWidth: "none", maxHeight: "none",
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 flex-shrink-0">Zoom</span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => handleZoom(parseFloat(e.target.value))} className="flex-1 accent-amber-400" />
        </div>
        <p className="text-xs text-zinc-600 text-center">Drag the photo to reposition it</p>
        <div className="flex gap-2">
          <button onClick={apply} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">Use Photo</button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}
