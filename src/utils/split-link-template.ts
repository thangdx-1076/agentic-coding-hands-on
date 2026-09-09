/**
 * Pure parser for the `<link>…</link>` marker used in i18n message templates
 * (e.g. `notifications.types.kudos_hidden`) — cuts a template string into an
 * ordered list of text/link segments the caller renders as plain text and
 * `<Link>` elements respectively.
 *
 * Exists because this repo has no `NextIntlClientProvider` / client-side
 * `useTranslations` and deliberately does not adopt `t.rich` (phase-06 § Key
 * Insights 2): messages carry a plain-text marker instead, and this function
 * is the one place that marker convention is parsed. Kept as a pure
 * function outside any `.tsx` file so it lands in the coverage allowlist
 * (`src/utils/` — component files are excluded from coverage).
 */

export type LinkTemplateSegment =
  { type: "text"; value: string } | { type: "link"; value: string };

const LINK_MARKER_PATTERN = /<link>(.*?)<\/link>/g;

/**
 * Splits `template` on every well-formed `<link>…</link>` marker.
 *
 * - No marker present → a single `text` segment (or `[]` for an empty
 *   string).
 * - An unterminated `<link>` (missing closing tag) is treated as literal
 *   text — it never throws and never drops content, since a malformed
 *   translation string must still render something instead of crashing.
 * - Multiple markers are all split out, in order, though the current
 *   templates only ever use one.
 */
export function splitLinkTemplate(template: string): LinkTemplateSegment[] {
  const segments: LinkTemplateSegment[] = [];
  let lastIndex = 0;

  LINK_MARKER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_MARKER_PATTERN.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: template.slice(lastIndex, match.index),
      });
    }
    segments.push({ type: "link", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < template.length) {
    segments.push({ type: "text", value: template.slice(lastIndex) });
  }

  return segments;
}
