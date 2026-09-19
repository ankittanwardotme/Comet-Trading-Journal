import React from "react";

export const AvatarSVG = React.memo(function AvatarSVG({ preset, size = 64, animate = true, delay = 0 }) {
  if (!preset) return null;
  const gradId = `tj-avatar-grad-${preset.id}`;
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size}
      className={animate ? "tj-avatar-breathe" : ""}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.colors[0]} />
          <stop offset="100%" stopColor={preset.colors[1]} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${gradId})`} />
      <path d="M 18 96 Q 50 64 82 96 Z" fill="rgba(255,255,255,0.9)" />
      <circle cx="50" cy="42" r="18" fill="rgba(255,255,255,0.97)" />
      {preset.hair === "short" ? (
        <path d="M 31 35 Q 50 17 69 35 Q 68 25 50 23 Q 32 25 31 35 Z" fill={preset.colors[1]} />
      ) : (
        <path d="M 29 46 Q 26 19 50 19 Q 74 19 71 46 Q 67 29 50 29 Q 33 29 29 46 Z" fill={preset.colors[1]} />
      )}
    </svg>
  );
});
