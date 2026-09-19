import { useState, useEffect, useRef } from "react";
import { IconLayoutGrid, IconDownload, IconCheck, IconX, IconTrash, IconTag, IconLink } from "@tabler/icons-react";
import { FONT_DISPLAY, FONT_MONO } from "../../../lib/format.js";
import { notify } from "../../../lib/notifications.js";
import { parseNoteBlocks } from "../../../lib/noteBlocks.js";
import { fmtDateDMY } from "../../../lib/dateUtils.js";
import { Tooltip } from "../../../components/shared/Tooltip.jsx";
import { TemplatePickerModal } from "../../../components/shared/TemplatePickerModal.jsx";
import { TagInput } from "./TagInput.jsx";
import { TradeLinkPicker } from "./TradeLinkPicker.jsx";
import { BlockNoteNoteEditor } from "./BlockNoteNoteEditor.jsx";

// The full-page note editor — always-open, no Save button. Every field
// autosaves 700ms after the last edit. Remounting on note.id change (via
// the `key` prop the caller passes) is what resets all local state when
// switching notes — see the caller in MyLearningsTab.
export function NoteMainPane({ note, folderPath, allTags, recentTags, pnlEntries, onUpdate, onDelete, onDownloadPdf, autoFocusTitle, templates = [] }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags || []);
  const [linkedTradeId, setLinkedTradeId] = useState(note.linkedTradeId || "");
  const [linkedUnderlying, setLinkedUnderlying] = useState(note.linkedUnderlying || "");
  const [linkedStrategy, setLinkedStrategy] = useState(note.linkedStrategy || "");
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "pending" | "saving"
  const [pendingDelete, setPendingDelete] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const titleRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (autoFocusTitle && titleRef.current) { titleRef.current.focus(); titleRef.current.select(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = async () => {
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    setSaveStatus("saving");
    try {
      await onUpdate(note.id, payload);
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

  // Flush on unmount (which — because the caller keys this component by
  // note.id — happens exactly when switching to a different note, or
  // navigating away) so the last few keystrokes are never lost.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingPayloadRef.current) onUpdate(note.id, pendingPayloadRef.current).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitle = (v) => { setTitle(v); scheduleSave({ title: v }); };
  const handleContent = (v) => { setContent(v || ""); scheduleSave({ content: v || "" }); };
  const handleTags = (v) => { setTags(v); scheduleSave({ tags: v }); };
  const handleTrade = (v) => {
    setLinkedTradeId(v);
    const trade = v ? pnlEntries.find((e) => e.id === v) : null;
    const newUnderlying = trade ? (trade.underlying || "") : "";
    const newStrategy = trade ? (trade.strategyLabel || "") : "";
    setLinkedUnderlying(newUnderlying);
    setLinkedStrategy(newStrategy);
    scheduleSave({ linkedTradeId: v, linkedUnderlying: newUnderlying, linkedStrategy: newStrategy });
  };

  const linkedTradeLabelText = (() => {
    if (!linkedTradeId) return null;
    const e = pnlEntries.find((x) => x.id === linkedTradeId);
    return e ? `${e.underlying || "—"} — ${e.strategyLabel || "Trade"} · ${fmtDateDMY(e.entryDate)}` : null;
  })();

  const handleDelete = async () => {
    try {
      await onDelete(note.id, `"${title || "Untitled"}" deleted.`);
    } catch (err) { /* onDelete already toasts on failure */ }
  };

  // Inserts the template's blocks right after wherever the cursor
  // currently is — not at the start or end of the note — so picking up
  // mid-way through writing (e.g. 30 lines in) drops the template exactly
  // where the cursor was left, not somewhere else in the document.
  const applyTemplateAtCursor = (template) => {
    const editor = editorRef.current;
    const blocks = parseNoteBlocks(template.content);
    setTemplatePickerOpen(false);
    if (!editor || blocks.length === 0) return;
    try {
      const referenceBlock = editor.getTextCursorPosition().block;
      editor.insertBlocks(blocks, referenceBlock, "after");
    } catch (err) {
      const doc = editor.document;
      const lastBlock = doc[doc.length - 1];
      if (lastBlock) editor.insertBlocks(blocks, lastBlock, "after");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      <div className="w-full py-6">
        <div className="px-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="Untitled"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-3xl font-bold text-zinc-100 placeholder-zinc-600"
              style={FONT_DISPLAY}
            />
            <div className="flex items-center gap-3 flex-shrink-0 pt-2">
              {templates.length > 0 && (
                <Tooltip text="Use a template">
                  <button onClick={() => setTemplatePickerOpen(true)} className="text-zinc-500 hover:tj-primary-text"><IconLayoutGrid size={15} /></button>
                </Tooltip>
              )}
              <Tooltip text="Download .pdf">
                <button onClick={() => onDownloadPdf({ id: note.id, title, content, tags, isResource: false, linkedTradeId, linkedUnderlying, linkedStrategy })} className="text-zinc-500 hover:tj-primary-text"><IconDownload size={15} /></button>
              </Tooltip>
              {pendingDelete ? (
                <span className="flex items-center gap-1.5">
                  <Tooltip text="Confirm delete">
                    <button onClick={handleDelete} className="flex items-center text-rose-950 bg-rose-400 hover:bg-rose-300 p-1 rounded"><IconCheck size={12} strokeWidth={3} /></button>
                  </Tooltip>
                  <Tooltip text="Cancel">
                    <button onClick={() => setPendingDelete(false)} className="text-zinc-500 hover:text-zinc-300"><IconX size={14} /></button>
                  </Tooltip>
                </span>
              ) : (
                <Tooltip text="Delete">
                  <button onClick={() => setPendingDelete(true)} className="text-zinc-600 hover:text-rose-600"><IconTrash size={15} /></button>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500 flex-wrap">
            {folderPath && <span>{folderPath}</span>}
            {folderPath && <span>·</span>}
            <span style={FONT_MONO}>{note.updatedAt ? fmtDateDMY(note.updatedAt) : ""}</span>
            <span>·</span>
            <span className={saveStatus === "saved" ? "text-emerald-600" : "text-amber-500"}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "pending" ? "Unsaved changes…" : "Saved"}
            </span>
          </div>
        </div>

        <div className="mt-6 px-1">
          <BlockNoteNoteEditor initialValue={content} onChange={handleContent} onEditorReady={(editor) => { editorRef.current = editor; }} />
        </div>

        {/* Metadata footer — tags and trade link live below the editor,
            not above it, so the writing surface is what you see first
            when a note opens. Stacked in one column: Tags first, Link to
            a trade below it. */}
        <div className="mt-8 pt-5 px-4 sm:px-6 border-t border-zinc-800/70 space-y-3">
          <div className="space-y-1 w-1/2">
            <label className="text-[11px] text-zinc-500 h-4 flex items-center gap-1"><IconTag size={10} /> Tags</label>
            <TagInput tags={tags} onChange={handleTags} allTags={allTags} recentTags={recentTags} />
          </div>
          <div className="space-y-1 w-1/2">
            <label className="text-[11px] text-zinc-500 h-4 flex items-center gap-1"><IconLink size={10} /> Link to a trade</label>
            <TradeLinkPicker pnlEntries={pnlEntries} value={linkedTradeId} onChange={handleTrade} />
          </div>
        </div>
      </div>
      {templatePickerOpen && (
        <TemplatePickerModal templates={templates} onSelect={applyTemplateAtCursor} onClose={() => setTemplatePickerOpen(false)} />
      )}
    </div>
  );
}
