import { useState, useEffect, useRef } from "react";
import {
  IconUserCircle, IconPalette, IconLock, IconShield, IconRotate, IconAlertTriangle, IconDeviceFloppy, IconDownload,
} from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../lib/format.js";
import { THEMES } from "../../lib/theme.js";
import { notify } from "../../lib/notifications.js";
import { AvatarSVG, DEFAULT_AVATAR } from "../../components/shared/AvatarSVG.jsx";
import { PinConfirmDialog } from "../../components/shared/PinConfirmDialog.jsx";
import { ChangePinSection } from "./ChangePinSection.jsx";
import { SecurityQuestionsSection } from "./SecurityQuestionsSection.jsx";
import { ClearDataConfirmDialog } from "./ClearDataConfirmDialog.jsx";
import { PhotoCropDialog } from "./PhotoCropDialog.jsx";

export function SettingsPage({ profile, onSaveProfile, onClearData, onDownloadBackup, hasCustomStrategies, themeId, onSaveTheme, pinRecord, onPinChanged, onDeleteAccount, securityQuestions, onSecurityQuestionsChanged }) {
  const [section, setSection] = useState("account");
  const [draft, setDraft] = useState({ ...profile });
  const [themeDraft, setThemeDraft] = useState(themeId);
  const [savedFlash, setSavedFlash] = useState(false);
  const [themeSavedFlash, setThemeSavedFlash] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const fileInputRef = useRef(null);

  const [clearPinConfirmOpen, setClearPinConfirmOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearScope, setClearScope] = useState({ trading: true, strategies: false, learnings: false, reminders: false });
  const clearScopeSelectedCount = Object.values(clearScope).filter(Boolean).length;
  const [deletePinConfirmOpen, setDeletePinConfirmOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  useEffect(() => { setDraft({ ...profile }); }, [profile]);
  useEffect(() => { setThemeDraft(themeId); }, [themeId]);

  const accountDirty = draft.name !== profile.name || draft.nickname !== profile.nickname || draft.avatarType !== profile.avatarType || draft.avatarValue !== profile.avatarValue;
  const themeDirty = themeDraft !== themeId;

  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = "";
  };
  const [photoSavedFlash, setPhotoSavedFlash] = useState(false);
  const applyCroppedPhoto = (dataUrl) => {
    const next = { ...draft, avatarType: "custom", avatarValue: dataUrl };
    setDraft(next);
    setCropFile(null);
    onSaveProfile({ ...profile, avatarType: "custom", avatarValue: dataUrl });
    setPhotoSavedFlash(true);
    setTimeout(() => setPhotoSavedFlash(false), 1800);
    notify("Profile photo updated.");
  };
  const handleRemovePhoto = () => {
    setDraft((prev) => ({ ...prev, avatarType: null, avatarValue: "" }));
    onSaveProfile({ ...profile, avatarType: null, avatarValue: "" });
    setPhotoSavedFlash(true);
    setTimeout(() => setPhotoSavedFlash(false), 1800);
    notify("Profile photo removed.");
  };
  const handleSaveAccount = () => {
    onSaveProfile(draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    notify("Account details saved.");
  };
  const handleSaveTheme = () => {
    onSaveTheme(themeDraft);
    setThemeSavedFlash(true);
    setTimeout(() => setThemeSavedFlash(false), 1800);
  };

  const sections = [
    { id: "account", label: "Account Details", icon: IconUserCircle },
    { id: "appearance", label: "Appearance", icon: IconPalette },
    { id: "pin", label: "Change PIN", icon: IconLock },
    { id: "questions", label: "Security Questions", icon: IconShield },
    { id: "clear", label: "Clear My Data", icon: IconRotate },
    { id: "delete", label: "Delete My Account", icon: IconAlertTriangle },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5" style={FONT_MONO}>Settings</p>
      <div className="grid grid-cols-1 sm:grid-cols-[250px_1fr] gap-6">
        <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2.5 text-sm px-3.5 py-2.5 rounded-xl text-left flex-shrink-0 transition-colors ${
                section === s.id ? "tj-primary-bg font-semibold" : `text-zinc-400 hover:bg-zinc-900 ${s.id === "delete" ? "hover:text-rose-400" : "hover:text-zinc-200"}`
              } ${s.id === "delete" && section !== s.id ? "text-rose-500/80" : ""}`}
            >
              <s.icon size={15} className="flex-shrink-0" /> <span className="whitespace-nowrap">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6 min-w-0">
          {section === "account" && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-800 flex items-center justify-center bg-zinc-800">
                  {draft.avatarType === "custom" && draft.avatarValue ? (
                    <img src={draft.avatarValue} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarSVG preset={DEFAULT_AVATAR} size={96} animate={false} />
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg font-semibold transition-colors">
                    Upload Photo
                  </button>
                  {draft.avatarType === "custom" && (
                    <button onClick={handleRemovePhoto} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-2 rounded-lg font-semibold transition-colors">
                      Remove Photo
                    </button>
                  )}
                </div>
                {photoSavedFlash && <p className="text-xs text-emerald-600">Saved</p>}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 text-left">
                <label className="block">
                  <span className="text-xs text-zinc-500">Name</span>
                  <input
                    type="text" value={draft.name || ""} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your name"
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Nickname — what should I call you?</span>
                  <input
                    type="text" value={draft.nickname || ""} onChange={(e) => setDraft((prev) => ({ ...prev, nickname: e.target.value }))} placeholder="e.g. The Closer"
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-xs text-zinc-600 mt-1 block">Used for your greeting on the Home dashboard.</span>
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Email</span>
                  <input type="email" value={draft.email || ""} readOnly disabled className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
                  <span className="text-xs text-zinc-600 mt-1 block">From your Google account — can't be changed here.</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveAccount} disabled={!accountDirty} className="flex items-center gap-2 tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-6 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
                  <IconDeviceFloppy size={15} /> {savedFlash ? "Saved" : "Save"}
                </button>
              </div>
            </>
          )}

          {section === "appearance" && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-left">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3" style={FONT_MONO}>Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeDraft(t.id)}
                      className={`flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border text-left hover:scale-[1.03] active:scale-95 transition-transform ${
                        themeDraft === t.id ? "border-zinc-500 bg-zinc-800" : "border-zinc-800 bg-zinc-950"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md flex-shrink-0 border border-white/10 overflow-hidden relative" style={{ background: t.bg }}>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-tl" style={{ background: t.primary }}></span>
                      </span>
                      <span className="text-zinc-200 truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSaveTheme} disabled={!themeDirty} className="flex items-center gap-2 tj-primary-bg disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-6 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
                  <IconDeviceFloppy size={15} /> {themeSavedFlash ? "Saved" : "Save"}
                </button>
              </div>
            </>
          )}

          {section === "pin" && <ChangePinSection pinRecord={pinRecord} onPinChanged={onPinChanged} />}

          {section === "questions" && <SecurityQuestionsSection pinRecord={pinRecord} securityQuestions={securityQuestions} onQuestionsChanged={onSecurityQuestionsChanged} />}

          {section === "clear" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Download Full Backup</p>
                  <p className="text-xs text-zinc-500 mt-1">A single JSON file with every trade, checklist entry, fund transaction, custom strategy, and My Learnings note — everything below can delete. Worth doing before you clear anything.</p>
                </div>
                <button onClick={onDownloadBackup} className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold rounded-lg px-3.5 py-2.5 transition-colors">
                  <IconDownload size={13} /> Download Backup
                </button>
              </div>
            <div className="rounded-2xl border border-rose-900/50 bg-rose-950/10 p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-rose-600">Clear My Data</p>
                <p className="text-xs text-zinc-500 mt-1">Choose what to permanently delete. Anything left unchecked is kept.</p>
              </div>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={clearScope.trading}
                    onChange={(e) => setClearScope((prev) => ({ ...prev, trading: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                  />
                  <span>
                    <span className="text-sm text-zinc-200 font-semibold block">Trading data</span>
                    <span className="text-xs text-zinc-500">Every trade, P&L entry, fund transaction, and checklist log entry.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={clearScope.reminders}
                    onChange={(e) => setClearScope((prev) => ({ ...prev, reminders: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                  />
                  <span>
                    <span className="text-sm text-zinc-200 font-semibold block">Reminders</span>
                    <span className="text-xs text-zinc-500">All market, trade, and personal reminders, and your severity/subcategory customizations.</span>
                  </span>
                </label>
                {hasCustomStrategies && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={clearScope.strategies}
                      onChange={(e) => setClearScope((prev) => ({ ...prev, strategies: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                    />
                    <span>
                      <span className="text-sm text-zinc-200 font-semibold block">Custom strategies</span>
                      <span className="text-xs text-zinc-500">Your saved custom strategy templates.</span>
                    </span>
                  </label>
                )}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={clearScope.learnings}
                    onChange={(e) => setClearScope((prev) => ({ ...prev, learnings: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                  />
                  <span>
                    <span className="text-sm text-zinc-200 font-semibold block">My Learnings</span>
                    <span className="text-xs text-zinc-500">All notes, folders, and related tags.</span>
                  </span>
                </label>
              </div>
              <p className="text-xs text-zinc-600">Theme, holidays, and this profile are always kept.</p>
              <button
                onClick={() => setClearPinConfirmOpen(true)}
                disabled={clearScopeSelectedCount === 0}
                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed border border-rose-800 text-rose-600 font-semibold px-3.5 py-2.5 rounded-lg transition-colors"
              >
                Delete Selected Data
              </button>
            </div>
            </div>
          )}

          {section === "delete" && (
            <div className="rounded-2xl border border-rose-900/50 bg-rose-950/10 p-6 space-y-3">
              <p className="text-sm font-semibold text-rose-600">Delete My Account</p>
              <p className="text-xs text-zinc-500">
                This signs you out and schedules your account — profile, trades, everything — for deletion.
                If you log back in within <span className="font-semibold text-zinc-300">7 days</span>, it's automatically cancelled and your data is untouched.
                After 7 days with no login, everything is permanently deleted. Signing up again afterward starts as a completely new account.
              </p>
              <button onClick={() => setDeletePinConfirmOpen(true)} className="text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-800 text-rose-600 font-semibold px-3.5 py-2.5 rounded-lg transition-colors">
                Delete My Account
              </button>
            </div>
          )}
        </div>
      </div>

      {clearPinConfirmOpen && (
        <PinConfirmDialog
          pinRecord={pinRecord} title="Confirm it's you" message="Enter your PIN to continue clearing the selected data."
          onConfirm={() => { setClearPinConfirmOpen(false); setClearDialogOpen(true); }}
          onClose={() => setClearPinConfirmOpen(false)}
        />
      )}
      {clearDialogOpen && (
        <ClearDataConfirmDialog scope={clearScope} onConfirm={() => { onClearData(clearScope); setClearDialogOpen(false); }} onClose={() => setClearDialogOpen(false)} />
      )}

      {deletePinConfirmOpen && (
        <PinConfirmDialog
          pinRecord={pinRecord} title="Confirm it's you" message="Enter your PIN to continue deleting your account."
          onConfirm={() => { setDeletePinConfirmOpen(false); setDeleteDialogOpen(true); setDeleteText(""); }}
          onClose={() => setDeletePinConfirmOpen(false)}
        />
      )}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={() => setDeleteDialogOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-rose-900 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-rose-600" style={FONT_DISPLAY}>Last step</p>
            </div>
            <p className="text-xs text-zinc-400">
              You'll be signed out now. If you don't log back in within 7 days, your account and every piece of data in it is permanently deleted.
              Type <span className="font-bold text-zinc-200">DELETE MY ACCOUNT</span> to confirm.
            </p>
            <input
              type="text" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE MY ACCOUNT" autoFocus
              className="w-full bg-zinc-950 border border-rose-900 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              style={FONT_MONO}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onDeleteAccount(); setDeleteDialogOpen(false); }}
                disabled={deleteText !== "DELETE MY ACCOUNT"}
                className="bg-rose-500 hover:bg-rose-400 disabled:opacity-30 disabled:cursor-not-allowed text-rose-950 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 transition-colors"
              >
                Schedule Deletion
              </button>
              <button onClick={() => setDeleteDialogOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {cropFile && <PhotoCropDialog file={cropFile} onApply={applyCroppedPhoto} onClose={() => setCropFile(null)} />}
    </div>
  );
}
