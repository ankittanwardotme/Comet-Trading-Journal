import { useState, useEffect, useRef } from "react";
import { parseNoteBlocks } from "../../../lib/noteBlocks.js";
import { uploadNoteFile, readFileAsDataUrl } from "../../../lib/supabaseClient.js";
import { notify } from "../../../lib/notifications.js";

// A thin, lazy-loaded wrapper around BlockNote (@blocknote/core +
// @blocknote/react + @blocknote/mantine's default UI). BlockNote's own
// selection toolbar already has text color, background (highlight) color,
// bold/italic/underline/strike, and heading levels (used in place of
// arbitrary font sizes — the same approach Notion itself uses) built in,
// so no custom formatting plugins are needed.
//
// Module loading happens in two stages because useCreateBlockNote is a
// React hook — it can't be called conditionally. The outer component
// only loads the modules; a separate inner component (mounted once
// loading finishes) is the one that actually calls the hook.
const BLOCKNOTE_THEME = {
  colors: {
    editor: { text: "var(--tj-text1)", background: "transparent" },
    menu: { text: "var(--tj-text1)", background: "var(--tj-panel-solid)" },
    tooltip: { text: "var(--tj-text1)", background: "var(--tj-panel-solid)" },
    hovered: { text: "var(--tj-text1)", background: "rgba(128,128,128,0.12)" },
    selected: { text: "var(--tj-primary-contrast)", background: "var(--tj-primary)" },
    disabled: { text: "var(--tj-text4)", background: "var(--tj-panel2)" },
    shadow: "var(--tj-shadow)",
    border: "var(--tj-border)",
    sideMenu: "var(--tj-text4)",
    highlights: {
      gray: { text: "#9b9a97", background: "#ebeced" },
      brown: { text: "#64473a", background: "#e9e5e3" },
      red: { text: "#e03e3e", background: "#fbe4e4" },
      orange: { text: "#d9730d", background: "#faebdd" },
      yellow: { text: "#dfab01", background: "#fbf3db" },
      green: { text: "#4d6461", background: "#ddedea" },
      blue: { text: "#0b6e99", background: "#ddebf1" },
      purple: { text: "#6940a5", background: "#eae4f2" },
      pink: { text: "#ad1a72", background: "#f4dfeb" },
    },
  },
  borderRadius: 8,
  fontFamily: "var(--tj-font-body)",
};

function BlockNoteEditorInner({ mods, initialValue, onChange, onEditorReady }) {
  const { useCreateBlockNote, BlockNoteView } = mods;
  const initialBlocksRef = useRef(null);
  if (initialBlocksRef.current === null) {
    const parsed = parseNoteBlocks(initialValue);
    initialBlocksRef.current = parsed.length > 0 ? parsed : undefined; // undefined lets BlockNote create its own default empty block
  }

  const editor = useCreateBlockNote({
    initialContent: initialBlocksRef.current,
    uploadFile: async (file) => {
      try {
        return await uploadNoteFile(file);
      } catch (err) {
        // Falls back to the old behavior (embedded base64) if Storage isn't
        // set up yet or the upload fails for any other reason — inserting
        // a file (image, PDF, spreadsheet, anything) should never just break.
        notify("Couldn't upload to Storage — embedding the file directly instead.", "error");
        return readFileAsDataUrl(file);
      }
    },
  });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const unsub = editor.onChange(() => {
      onChangeRef.current && onChangeRef.current(JSON.stringify(editor.document));
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [editor]);

  useEffect(() => {
    if (onEditorReady) onEditorReady(editor);
  }, [editor]);

  return <BlockNoteView editor={editor} theme={BLOCKNOTE_THEME} />;
}

export function BlockNoteNoteEditor({ initialValue, onChange, onEditorReady }) {
  const [mods, setMods] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@blocknote/react"),
      import("@blocknote/mantine"),
      import("@blocknote/mantine/style.css"),
    ]).then(([react, mantine]) => {
      if (cancelled) return;
      setMods({ useCreateBlockNote: react.useCreateBlockNote, BlockNoteView: mantine.BlockNoteView });
    }).catch(() => { /* stays on the loading placeholder */ });
    return () => { cancelled = true; };
  }, []);

  if (!mods) {
    return <div className="flex items-center justify-center h-full text-xs text-zinc-600">Loading editor…</div>;
  }
  return <BlockNoteEditorInner mods={mods} initialValue={initialValue} onChange={onChange} onEditorReady={onEditorReady} />;
}
