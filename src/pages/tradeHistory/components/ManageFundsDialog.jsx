import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY, fmtINR } from "../../../lib/format.js";
import { localISODate } from "../../../lib/dateUtils.js";
import { CalendarPicker } from "../../../components/shared/CalendarPicker.jsx";

export function ManageFundsDialog({ onAddFunds, onWithdrawFunds, onClose, currentCapital }) {
  const [tab, setTab] = useState("add");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => localISODate(Date.now()));
  const [notes, setNotes] = useState("");

  const amt = parseFloat(amount) || 0;
  const exceedsCapital = tab === "withdraw" && amt > currentCapital;
  const canSubmit = amt > 0 && !exceedsCapital;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (tab === "add") onAddFunds(amt, date, notes);
    else onWithdrawFunds(amt, date, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Manage Funds</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("add")} className={`flex-1 text-xs px-3 py-2 rounded-lg border ${tab === "add" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>
            Add Funds
          </button>
          <button onClick={() => setTab("withdraw")} className={`flex-1 text-xs px-3 py-2 rounded-lg border ${tab === "withdraw" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>
            Withdraw Funds
          </button>
        </div>
        <label className="block">
          <span className="text-xs text-zinc-500">Amount (₹)</span>
          <input
            type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="e.g. 50000"
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={FONT_MONO}
          />
          {exceedsCapital && <p className="text-xs text-rose-400 mt-1.5">Can't withdraw more than your current capital ({fmtINR(currentCapital)}).</p>}
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Date</span>
          <div className="mt-1">
            <CalendarPicker value={date} onChange={setDate} maxDate={localISODate(Date.now())} placeholder="Select date" />
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Note (optional)</span>
          <input
            type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={tab === "add" ? "e.g. Monthly top-up" : "e.g. Moved to savings"}
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={!canSubmit} className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
            {tab === "add" ? "Add Funds" : "Withdraw Funds"}
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}
