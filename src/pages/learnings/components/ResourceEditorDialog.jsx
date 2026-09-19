import { useState } from "react";
import { createPortal } from "react-dom";
import { IconBooks, IconX, IconTag, IconDeviceFloppy } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../../lib/format.js";
import { notify } from "../../../lib/notifications.js";
import { getPortalTarget } from "../../../lib/portal.js";
import { TagInput } from "./TagInput.jsx";

// Create/edit dialog — resources only now (Markdown notes are written
// directly in the full-page NoteMainPane, not a modal). A resource is a
// simple saved link: name, URL, an optional plain-text note, and tags —
// deliberately lighter than a note, with no folder/trade linking, since
// it's meant to be a quick bookmark, not something you organize a
// knowledge base around.
export function ResourceEditorDialog({ initial, allTags, recentTags, onSave, onClose }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || "");
  const [resourceUrl, setResourceUrl] = useState(initial?.resourceUrl || "");
  const [content, setContent] = useState(initial?.content || "");
  const [tags, setTags] = useState(initial?.tags || []);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && resourceUrl.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), resourceUrl: resourceUrl.trim(), content, tags, isResource: true });
      onClose();
    } catch (err) {
      notify(`Couldn't save — ${err?.message || "please try again"}.`, "error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={onClose}>
      <div className="tj-app w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 sm:p-6 flex flex-col gap-4 tj-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2" style={FONT_DISPLAY}>
            <IconBooks size={16} /> {isEdit ? "Edit" : "New"} Resource
          </p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. NSE FII/DII Data" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">URL</label>
          <input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400" style={FONT_MONO} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">Note (optional)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's this link for..." className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500 flex items-center gap-1"><IconTag size={11} /> Tags</label>
          <TagInput tags={tags} onChange={setTags} allTags={allTags} recentTags={recentTags} />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={!canSave || saving} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-40">
            <IconDeviceFloppy size={14} /> {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>,
    getPortalTarget()
  );
}
