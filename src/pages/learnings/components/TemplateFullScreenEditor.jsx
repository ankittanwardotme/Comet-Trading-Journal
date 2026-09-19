import { useState, useEffect, useRef } from "react";
import { IconArrowLeft, IconCheck, IconX, IconTrash } from "@tabler/icons-react";
import { FONT_MONO, FONT_DISPLAY } from "../../../lib/format.js";
import { notify } from "../../../lib/notifications.js";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";
import { BlockNoteNoteEditor } from "./BlockNoteNoteEditor.jsx";

export function TemplateFullScreenEditor({ template, onUpdate, onDelete, onBack }) {
  const [title, setTitle] = useState(template.title);
  const [content, setContent] = useState(template.content);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "pending" | "saving"
  const [pendingDelete, setPendingDelete] = useState(false);
  const titleRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) { titleRef.current.focus(); titleRef.current.select(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = async () => {
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    setSaveStatus("saving");
    try {
      await onUpdate(template.id, payload);
      setSaveStatus("saved");
    } catch (err) {
      notify("Couldn't save that change — please try again.", "error");
      setSaveStatus("pending");
    }
  };
  const scheduleSave = (partial) => {
    pendingPayloadRef.current = { ...(pendingPayloadRef.current || {}), ...partial };
    setSaveStatus("pending");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 700);
  };
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); flushSave(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitle = (v) => { setTitle(v); scheduleSave({ title: v }); };
  const handleContent = (v) => { setContent(v); scheduleSave({ content: v }); };
  const handleDelete = async () => {
    try {
      // handleDeleteTemplate (passed in as onDelete) already shows its own
      // notification internally — it doesn't return a value for this to
      // act on, so no separate notify() here (that would either silently
      // never fire, or double up if it were "fixed" to fire).
      await onDelete(template.id);
      onBack();
    } catch (err) { /* onDelete already toasts on failure */ }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto">
      <div className="w-full py-6">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onBack} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <IconArrowLeft size={13} /> Back to Templates
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-600" style={FONT_MONO}>
                {saveStatus === "saving" ? "Saving…" : saveStatus === "pending" ? "Unsaved changes" : "Saved"}
              </span>
              {pendingDelete ? (
                <span className="flex items-center gap-1.5">
                  <Tooltip text="Confirm delete"><button onClick={handleDelete} className="text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={13} strokeWidth={3} /></button></Tooltip>
                  <Tooltip text="Cancel"><button onClick={() => setPendingDelete(false)} className="text-zinc-500 hover:text-zinc-300"><IconX size={15} /></button></Tooltip>
                </span>
              ) : (
                <Tooltip text="Delete"><button onClick={() => setPendingDelete(true)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={15} /></button></Tooltip>
              )}
            </div>
          </div>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => handleTitle(e.target.value)}
            placeholder="Template title"
            className="w-full bg-transparent border-none outline-none text-3xl font-bold text-zinc-100 placeholder-zinc-600"
            style={FONT_DISPLAY}
          />
        </div>
        <div className="mt-6 px-1">
          <BlockNoteNoteEditor initialValue={content} onChange={handleContent} />
        </div>
      </div>
    </div>
  );
}
