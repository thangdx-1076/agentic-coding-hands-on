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
 *  - must NOT contain any ASCII control character (0x00-0x1f or 0x7f),
 *    raw or percent-encoded (e.g. `%0d`, `%0a`, `%00`, case-insensitive).
 *    This value is interpolated into a `Location` header by
 *    `NextResponse.redirect()`; an unescaped CR/LF would let an attacker
 *    split the header and inject arbitrary response headers (HTTP
 *    response/header splitting). Node's header-value validator happens
 *    to throw on a raw CR/LF today, but that's the caller's try/catch
 *    acting as an accidental safety net -- this check makes the
 *    rejection explicit and independent of any caller's error handling.
 *
 * Anything else falls back to `fallback`.
 */

function isControlCodePoint(codePoint: number): boolean {
  return codePoint < 0x20 || codePoint === 0x7f;
}

function hasRawControlChar(raw: string): boolean {
  for (let i = 0; i < raw.length; i++) {
    if (isControlCodePoint(raw.charCodeAt(i))) {
      return true;
    }
  }
  return false;
}

function hasEncodedControlChar(raw: string): boolean {
  const percentEncodedSequences = raw.match(/%[0-9a-fA-F]{2}/g);
  if (!percentEncodedSequences) {
    return false;
  }
  return percentEncodedSequences.some((sequence) =>
    isControlCodePoint(parseInt(sequence.slice(1), 16)),
  );
}

function containsControlChars(raw: string): boolean {
  return hasRawControlChar(raw) || hasEncodedControlChar(raw);
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
    containsControlChars(raw)
  ) {
    return fallback;
  }

  return raw;
}
