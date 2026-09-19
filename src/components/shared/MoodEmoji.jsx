import { moodMeta, TWEMOJI_CDN } from "../../lib/moodOptions.js";

export function MoodEmoji({ id, size = 18, className = "" }) {
  const m = moodMeta(id);
  if (!m) return null;
  return (
    <img
      src={`${TWEMOJI_CDN}${m.codepoint}.svg`}
      alt={m.label}
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
