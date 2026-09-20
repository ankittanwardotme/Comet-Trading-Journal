import logo from "../../../assets/logo.png";

export function PinDialogShell({ children }) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-7 text-center tj-popover">
        <img src={logo} alt="Comet Trading Journal" className="h-14 w-auto mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}
