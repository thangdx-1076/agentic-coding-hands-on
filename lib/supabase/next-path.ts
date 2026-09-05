/**
 * Guards FR-402/BR-002 (open-redirect prevention): the `?next=` query
 * param on `/auth/callback` is untrusted client input and must never be
 * allowed to redirect outside this origin, nor to inject extra bytes into
 * the response headers this value eventually reaches. This is the single
 * choke point every "next path" value passes through before use.
 *
 * Only a same-origin, root-relative path is accepted:
 *  - must start with exactly one `/` (rejects empty/missing values)
 *  - must NOT start with `//` or `/\` (both are browser-parsed as a
 *    protocol-relative or backslash-normalized absolute URL, e.g.
 *    `//evil.com` navigates off-origin the same as `https://evil.com`)
 *  - must NOT contain a `://` scheme separator anywhere (defends against
 *    inputs that happen to start with `/` yet still resolve to another
 *    origin or a non-http scheme once the browser normalizes them)
 *  - must NOT contain any forbidden code point, raw or percent-encoded
 *    (case-insensitive):
 *      · ASCII control characters (0x00-0x1f, 0x7f) — e.g. `%0d`, `%0a`,
 *        `%00`
 *      · U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR — encoded as
 *        `%e2%80%a8` / `%e2%80%a9` in UTF-8, so a per-byte scan never sees
 *        them; they are line terminators to JS/JSON parsers and to some
 *        header/log consumers.
 *    This value is interpolated into a `Location` header by
 *    `NextResponse.redirect()`; an unescaped line terminator would let an
 *    attacker split the header and inject arbitrary response headers (HTTP
 *    response/header splitting). Node's header-value validator happens
 *    to throw on these today, but that's the caller's try/catch acting as
 *    an accidental safety net -- these checks make the rejection explicit
 *    and independent of any caller's error handling.
 *
 * Anything else falls back to `fallback`.
 */

const LINE_SEPARATOR = 0x2028;
const PARAGRAPH_SEPARATOR = 0x2029;

function isForbiddenCodePoint(codePoint: number): boolean {
  return (
    codePoint < 0x20 ||
    codePoint === 0x7f ||
    codePoint === LINE_SEPARATOR ||
    codePoint === PARAGRAPH_SEPARATOR
  );
}

function hasRawForbiddenChar(raw: string): boolean {
  for (const char of raw) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && isForbiddenCodePoint(codePoint)) {
      return true;
    }
  }
  return false;
}

function hasEncodedForbiddenChar(raw: string): boolean {
  const percentEncodedSequences = raw.match(/%[0-9a-fA-F]{2}/g);
  if (!percentEncodedSequences) {
    return false;
  }

  // Per-byte pass: catches ASCII controls even when the string as a whole
  // is not valid UTF-8 (a lone `%80` makes `decodeURIComponent` throw).
  const hasEncodedAsciiControl = percentEncodedSequences.some((sequence) =>
    isForbiddenCodePoint(parseInt(sequence.slice(1), 16)),
  );
  if (hasEncodedAsciiControl) {
    return true;
  }

  // Decoded pass: U+2028/U+2029 span three bytes, so only the decoded form
  // reveals them. A malformed sequence throws and is left to the per-byte
  // pass above -- it cannot hide a forbidden code point on its own.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return false;
  }
  return hasRawForbiddenChar(decoded);
}

function containsForbiddenChars(raw: string): boolean {
  return hasRawForbiddenChar(raw) || hasEncodedForbiddenChar(raw);
}

export function safeNextPath(raw: string | null, fallback = "/todo"): string {
  if (!raw) {
    return fallback;
  }

  const startsWithSingleSlash =
    raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\");
  const hasSchemeSeparator = raw.includes("://");

  if (
    !startsWithSingleSlash ||
    hasSchemeSeparator ||
    containsForbiddenChars(raw)
  ) {
    return fallback;
  }

  return raw;
}
