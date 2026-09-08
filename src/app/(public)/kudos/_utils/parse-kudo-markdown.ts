/**
 * Parses the markdown-subset a Kudo's `content` may contain (BR-005,
 * FR-204) into a plain token TREE — never an HTML string. Rendering is
 * `kudo-markdown-text.tsx`'s job (phase 14): it walks this tree into real
 * React elements, so no raw-HTML-injection escape hatch ever enters the
 * picture, and no markdown dependency is added to parse a subset this small.
 *
 * Security: the one place user text becomes a clickable `href` is the
 * `link` node, and its target reaches the public feed. `isSafeLinkUrl`
 * whitelists the `http://`/`https://` schemes only — anything else
 * (`javascript:`, a relative path, a bare string) falls back to literal
 * text instead of a node, closing off the classic
 * `[click me](javascript:...)` vector without needing a URL parser.
 *
 * Malformed input never throws: an unmatched `**`, an unterminated
 * `[text`, or a link with a rejected scheme all degrade to the original
 * characters rendered as plain text.
 */

export type KudoMarkdownNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: KudoMarkdownNode[] }
  | { type: "italic"; children: KudoMarkdownNode[] }
  | { type: "strike"; children: KudoMarkdownNode[] }
  | { type: "link"; href: string; children: KudoMarkdownNode[] }
  | { type: "quote"; children: KudoMarkdownNode[] }
  | { type: "listItem"; children: KudoMarkdownNode[] }
  | { type: "lineBreak" };

const LIST_PREFIX = "1. ";
const QUOTE_PREFIX = "> ";

function isSafeLinkUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

type LinkMatch = { node: KudoMarkdownNode; nextIndex: number };

/**
 * Tries to read `[text](url)` starting at `text[start]` (`"["`). Returns
 * `null` on any shape mismatch or an unsafe scheme — the caller then
 * falls back to consuming `"["` as a literal character, which correctly
 * reconstructs the whole construct as plain text one character at a time.
 */
function tryParseLink(text: string, start: number): LinkMatch | null {
  const closeBracket = text.indexOf("]", start + 1);
  if (closeBracket === -1) {
    return null;
  }
  if (text[closeBracket + 1] !== "(") {
    return null;
  }
  const closeParen = text.indexOf(")", closeBracket + 2);
  if (closeParen === -1) {
    return null;
  }

  const url = text.slice(closeBracket + 2, closeParen);
  if (!isSafeLinkUrl(url)) {
    return null;
  }

  const linkText = text.slice(start + 1, closeBracket);
  return {
    node: { type: "link", href: url, children: parseInline(linkText) },
    nextIndex: closeParen + 1,
  };
}

/**
 * Recursive-descent inline parser for `**bold**` / `*italic*` /
 * `~~strike~~` / `[text](url)` within one line (or one list/quote line's
 * remainder). `**` is checked before the single-`*` italic case so a bold
 * marker is never misread as two adjacent italics.
 */
function parseInline(text: string): KudoMarkdownNode[] {
  const nodes: KudoMarkdownNode[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer !== "") {
      nodes.push({ type: "text", text: buffer });
      buffer = "";
    }
  };

  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const close = text.indexOf("**", i + 2);
      if (close !== -1) {
        flush();
        nodes.push({
          type: "bold",
          children: parseInline(text.slice(i + 2, close)),
        });
        i = close + 2;
        continue;
      }
    } else if (text.startsWith("~~", i)) {
      const close = text.indexOf("~~", i + 2);
      if (close !== -1) {
        flush();
        nodes.push({
          type: "strike",
          children: parseInline(text.slice(i + 2, close)),
        });
        i = close + 2;
        continue;
      }
    } else if (text[i] === "[") {
      const link = tryParseLink(text, i);
      if (link) {
        flush();
        nodes.push(link.node);
        i = link.nextIndex;
        continue;
      }
    } else if (text[i] === "*") {
      const close = text.indexOf("*", i + 1);
      if (close !== -1) {
        flush();
        nodes.push({
          type: "italic",
          children: parseInline(text.slice(i + 1, close)),
        });
        i = close + 1;
        continue;
      }
    }

    buffer += text[i];
    i += 1;
  }

  flush();
  return nodes;
}

/**
 * Splits on `\n` first (block level: `listItem`/`quote` only ever apply
 * to the line they prefix, joined back with `lineBreak` nodes), then
 * inline-parses each line's remainder. An empty string naturally yields
 * `[]` — one empty line has no prefix and `parseInline("")` produces no
 * nodes — so no separate empty-input branch is needed.
 */
export function parseKudoMarkdown(text: string): KudoMarkdownNode[] {
  const lines = text.split("\n");
  const nodes: KudoMarkdownNode[] = [];

  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push({ type: "lineBreak" });
    }

    if (line.startsWith(LIST_PREFIX)) {
      nodes.push({
        type: "listItem",
        children: parseInline(line.slice(LIST_PREFIX.length)),
      });
    } else if (line.startsWith(QUOTE_PREFIX)) {
      nodes.push({
        type: "quote",
        children: parseInline(line.slice(QUOTE_PREFIX.length)),
      });
    } else {
      nodes.push(...parseInline(line));
    }
  });

  return nodes;
}
