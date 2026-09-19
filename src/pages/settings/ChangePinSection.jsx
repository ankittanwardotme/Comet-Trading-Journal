import { useState } from "react";
import { FONT_MONO } from "../../lib/format.js";
import { verifyPin, createPinRecord } from "../../lib/security.js";
import { notify } from "../../lib/notifications.js";
import { PinDigitInput } from "../../components/shared/PinDigitInput.jsx";

export function ChangePinSection({ pinRecord, onPinChanged }) {
  const [step, setStep] = useState("current"); // current | new | confirm | done
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCurrentComplete = async (pin) => {
    setBusy(true);
    const ok = await verifyPin(pin, pinRecord);
    setBusy(false);
    if (!ok) { setError("That's not your current PIN."); setDigits(["", "", "", ""]); return; }
    setError("");
    setDigits(["", "", "", ""]);
    setStep("new");
  };

  const handleNewComplete = (pin) => {
    setNewPin(pin);
    setDigits(["", "", "", ""]);
    setError("");
    setStep("confirm");
  };

  const handleConfirmComplete = async (pin) => {
    if (pin !== newPin) {
      setError("PINs didn't match — let's try again.");
      setDigits(["", "", "", ""]);
      setNewPin("");
      setStep("new");
      return;
    }
    setBusy(true);
    const record = await createPinRecord(pin);
    await onPinChanged(record);
    setBusy(false);
    setStep("done");
    notify("PIN updated.");
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-6">
      <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Change PIN</p>
      {step === "done" ? (
        <p className="text-sm text-emerald-600 font-semibold">Your PIN has been updated.</p>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            {step === "current" && "Enter your current PIN to continue."}
            {step === "new" && "Choose a new 4-digit PIN."}
            {step === "confirm" && "Re-enter it to confirm."}
          </p>
          <PinDigitInput
            key={step} value={digits} onChange={setDigits} autoFocus error={!!error}
            onComplete={step === "current" ? handleCurrentComplete : step === "new" ? handleNewComplete : handleConfirmComplete}
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {busy && <p className="text-xs text-zinc-500">Working...</p>}
        </>
      )}
    </div>
  );
}
