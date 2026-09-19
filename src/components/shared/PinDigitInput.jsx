import { useRef } from "react";

export function PinDigitInput({ value, onChange, onComplete, autoFocus, error }) {
  const inputRefs = useRef([]);

  const handleChange = (idx, raw) => {
    const clean = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = clean;
    onChange(next);
    if (clean && idx < 3) inputRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-14 h-14 text-center text-2xl font-bold bg-zinc-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-zinc-100 ${error ? "border-rose-500" : "border-zinc-700"}`}
        />
      ))}
    </div>
  );
}
