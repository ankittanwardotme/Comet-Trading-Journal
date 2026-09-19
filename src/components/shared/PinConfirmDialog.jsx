import { useState } from "react";
import { verifyPin } from "../../lib/security.js";
import { PinDigitInput } from "./PinDigitInput.jsx";

export function PinConfirmDialog({ pinRecord, title, message, onConfirm, onClose }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleComplete = async (pin) => {
    setChecking(true);
    const ok = await verifyPin(pin, pinRecord);
    setChecking(false);
    if (ok) { onConfirm(); return; }
    setAttempts((a) => a + 1);
    setDigits(["", "", "", ""]);
    setError("Incorrect PIN. Try again.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500">{message}</p>
        <PinDigitInput key={attempts} value={digits} onChange={setDigits} onComplete={handleComplete} autoFocus error={!!error} />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {checking && <p className="text-xs text-zinc-500">Checking...</p>}
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300 underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
