import { useState, useEffect } from "react";
import { IconLock } from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO } from "../../lib/format.js";
import { pad2 } from "../../lib/dateUtils.js";
import { PinDigitInput } from "../../components/shared/PinDigitInput.jsx";
import { PinDialogShell } from "./components/PinDialogShell.jsx";

export function PinLockedOutScreen({ until, onSignOutReset, onExpired }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= until) { onExpired(); return; }
      forceTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  const remainingMs = Math.max(0, until - Date.now());
  const totalSec = Math.ceil(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const countdown = `${h}:${pad2(m)}:${pad2(s)}`;

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-rose-500" />
        Account Blocked
      </div>
      <p className="text-sm text-zinc-500 mb-2">Too many incorrect attempts. Try again in:</p>
      <p className="text-3xl font-bold text-rose-500 mb-6" style={FONT_MONO}>{countdown}</p>
      <div className="pointer-events-none opacity-40">
        <PinDigitInput value={["", "", "", ""]} onChange={() => {}} onComplete={() => {}} autoFocus={false} />
      </div>
      <button onClick={onSignOutReset} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl mt-6 transition-colors">
        Logout
      </button>
    </PinDialogShell>
  );
}
