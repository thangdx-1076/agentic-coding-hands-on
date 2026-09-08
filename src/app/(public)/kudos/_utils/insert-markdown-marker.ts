/**
 * Computes the next `<textarea>` value and caret/selection after clicking
 * one toolbar button (FR-204, BR-005 — B/I/S/number/link/quote). Pure
 * string + index math only: it never touches the DOM or calls
 * `setSelectionRange` — the `_hooks` layer (phase 07) reads this result
 * back onto the real textarea element.
 *
 * `url` is an out-of-band 5th argument used only for `"link"`; plan.md's
 * 4-arg description covers the other 5 kinds directly, and threading a
 * resolved URL (already confirmed via a prompt/dialog at the hook layer)
 * through a single optional trailing parameter keeps that contract intact
 * instead of forcing every call site to pass `undefined` positionally.
 */

export type MarkdownMarkerKind =
  "bold" | "italic" | "strike" | "number" | "quote" | "link";

export type MarkdownMarkerResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

const LINK_PLACEHOLDER_TEXT = "text";

/**
 * Wraps the selected substring with `marker` on both sides. When
 * `selectionStart === selectionEnd` (nothing selected) this naturally
 * inserts an empty-bodied marker pair with the caret collapsed exactly
 * between the two halves — the "no selection → caret inside" case falls
 * out of the same formula, no separate branch needed.
 */
function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  marker: string,
): MarkdownMarkerResult {
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);
  const newStart = selectionStart + marker.length;

  return {
    value: `${before}${marker}${selected}${marker}${after}`,
    selectionStart: newStart,
    selectionEnd: newStart + selected.length,
  };
}

/** Start index of the line that contains `position` — the character right
 * after the previous `\n`, or `0` for the first line. */
function lineStartAt(value: string, position: number): number {
  return value.lastIndexOf("\n", position - 1) + 1;
}

/** End index (exclusive) of the line starting at `lineStart`. */
function lineEndAt(value: string, lineStart: number): number {
  const nextBreak = value.indexOf("\n", lineStart);
  return nextBreak === -1 ? value.length : nextBreak;
}

/**
 * Prefixes the line under the cursor with `prefix` (`"1. "` or `"> "`) —
 * always the line containing `selectionStart`, never a multi-line
 * selection. A line that already starts with `prefix` is left untouched
 * (clicking the same toolbar button twice must not double the marker).
 */
function insertLinePrefix(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): MarkdownMarkerResult {
  const lineStart = lineStartAt(value, selectionStart);
  const lineEnd = lineEndAt(value, lineStart);
  const line = value.slice(lineStart, lineEnd);

  if (line.startsWith(prefix)) {
    return { value, selectionStart, selectionEnd };
  }

  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);

  return {
    value: newValue,
    selectionStart: selectionStart + prefix.length,
    selectionEnd: selectionEnd + prefix.length,
  };
}

/**
 * Inserts `[text](url)`. With an explicit `linkText` (the "Thêm đường
 * dẫn" dialog, A5/SM-002 — the user typed/edited the link text
 * themselves), that value ALWAYS wins over whatever was selected: the
 * `[start,end)` range is replaced outright and the caret collapses right
 * after the closing `)`, so typing continues after the freshly inserted
 * link rather than re-selecting it. Without `linkText` (the placeholder
 * toolbar behavior, unchanged), `text` falls back to the current
 * selection or the literal placeholder `"text"` selected in place so
 * typing immediately replaces it. A blank/missing `url` (the URL prompt
 * was cancelled, or the dialog somehow reached here without one) is a
 * no-op either way — a link to nowhere is worse than no toolbar feedback
 * at all.
 */
function insertLink(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  url: string,
  linkText?: string,
): MarkdownMarkerResult {
  const trimmedUrl = url.trim();
  if (trimmedUrl === "") {
    return { value, selectionStart, selectionEnd };
  }

  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);

  if (linkText !== undefined) {
    const markdown = `[${linkText}](${trimmedUrl})`;
    const caret = before.length + markdown.length;

    return {
      value: `${before}${markdown}${after}`,
      selectionStart: caret,
      selectionEnd: caret,
    };
  }

  const hasSelection = selectionStart !== selectionEnd;
  const text = hasSelection
    ? value.slice(selectionStart, selectionEnd)
    : LINK_PLACEHOLDER_TEXT;
  const markdown = `[${text}](${trimmedUrl})`;
  const textStart = before.length + 1;

  return {
    value: `${before}${markdown}${after}`,
    selectionStart: textStart,
    selectionEnd: textStart + text.length,
  };
}

export function insertMarkdownMarker(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  kind: MarkdownMarkerKind,
  url?: string,
  linkText?: string,
): MarkdownMarkerResult {
  if (kind === "bold") {
    return wrapSelection(value, selectionStart, selectionEnd, "**");
  }
  if (kind === "italic") {
    return wrapSelection(value, selectionStart, selectionEnd, "*");
  }
  if (kind === "strike") {
    return wrapSelection(value, selectionStart, selectionEnd, "~~");
  }
  if (kind === "number") {
    return insertLinePrefix(value, selectionStart, selectionEnd, "1. ");
  }
  if (kind === "quote") {
    return insertLinePrefix(value, selectionStart, selectionEnd, "> ");
  }
  return insertLink(value, selectionStart, selectionEnd, url ?? "", linkText);
}
