// Parses a note/template's stored content (JSON string of BlockNote blocks)
// — it never throws, and any pre-migration note whose content isn't
// valid JSON (i.e. old markdown/plain text) is wrapped as a single
// plain paragraph rather than silently discarded, so nothing is ever
// lost, it just shows up unformatted until re-saved.
export function parseNoteBlocks(contentJson) {
  if (!contentJson) return [];
  if (typeof contentJson === "string") {
    try {
      const parsed = JSON.parse(contentJson);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) { /* not JSON — fall through to the legacy-text wrapper below */ }
    if (contentJson.trim()) {
      return [{ type: "paragraph", content: [{ type: "text", text: contentJson, styles: {} }], children: [] }];
    }
  }
  return [];
}

// Recursively flattens a BlockNote inline-content array (or the legacy
// bare-string form some block types accept) down to plain text.
export function blockInlineText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((item) => {
    if (!item) return "";
    if (item.type === "text") return item.text || "";
    if (item.content) return blockInlineText(item.content); // links and similar wrapping inline types
    return item.text || "";
  }).join("");
}

// A short plain-text preview for a note card — walks the block tree
// (including nested/indented blocks) rather than rendering anything
// visually; good enough to judge relevance at a glance in a list.
export function blockNoteSnippet(contentJson, maxWords = 22) {
  const blocks = parseNoteBlocks(contentJson);
  if (blocks.length === 0) return "";
  const walk = (list) => list.flatMap((b) => [blockInlineText(b.content), ...(b.children && b.children.length ? walk(b.children) : [])]);
  const text = walk(blocks).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const words = text.split(" ");
  return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "…" : text;
}

// Full plain-text conversion of a note/template's rich content, one line
// per block (not truncated) — for inserting a template into a plain-text
// field like ExpandableNoteField, where BlockNote's JSON can't render.
export function blockNoteToPlainText(contentJson) {
  const blocks = parseNoteBlocks(contentJson);
  if (blocks.length === 0) return "";
  const walk = (list) => list.flatMap((b) => [blockInlineText(b.content), ...(b.children && b.children.length ? walk(b.children) : [])]);
  return walk(blocks).filter((line) => line.trim()).join("\n");
}

// A note can be linked to a specific trade (via linkedTradeId — resolved
// to a display label by the caller) AND/OR tagged with a more general
// underlying/strategy "topic" that isn't tied to any one trade — these
// are two different granularities (per Research-Tab-Roadmap.md §3's
// "link a note to a specific trade... or a specific underlying/strategy"),
// not two representations of the same thing, so they're kept as clearly
// separated segments rather than joined in a way that reads as one
// duplicated value when both happen to reference the same underlying.
export function formatNoteLinks(linkedTradeLabel, note) {
  const parts = [];
  if (linkedTradeLabel) parts.push(`Trade: ${linkedTradeLabel}`);
  const topic = [note.linkedUnderlying, note.linkedStrategy].filter(Boolean).join(" — ");
  if (topic) parts.push(`Topic: ${topic}`);
  return parts;
}
