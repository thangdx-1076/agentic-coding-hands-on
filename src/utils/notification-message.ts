import { splitLinkTemplate } from "./split-link-template";

import type {
  NotificationRow,
  NotificationType,
} from "@/domain/notifications/types";
import { parseNotificationPayload } from "@/domain/notifications/types";

/**
 * Renderer-side message formatting for F012_NotificationsPanel
 * (phase-08). Two boundary problems solved here, both flagged by
 * `clarifications.md` § "Phát sinh khi chạy":
 *
 * 1. The i18n templates (`messages/{vi,en}.json`'s `notifications.types.*`)
 *    use `**bold**` markdown-style emphasis for the name — this repo has
 *    nothing else that parses `**`, so a raw template dumped into the DOM
 *    would show the literal asterisks. `splitBoldSegments` below is the
 *    one place that convention is parsed, mirroring how
 *    `split-link-template.ts` is the one place `<link>` is parsed (kept as
 *    a separate function/file rather than folded into that one — the two
 *    markers are independent and `<link>` already has its own tested
 *    contract).
 * 2. `senderName`/`actorName` are `string | null` on purpose
 *    (`domain/notifications/types.ts`) — 9/21 real users have no
 *    `full_name`. The repo's own fallback convention
 *    (`kudos-card-person.tsx`: `person.fullName ?? "Sunner"`) is applied
 *    here, at the render boundary, never upstream.
 *
 * Pure and framework-free on purpose (no `.tsx`) so it lands in the
 * `src/utils/**` coverage allowlist (`vitest.config.ts`) — component files
 * are excluded from the 100% coverage gate, so logic that must actually be
 * covered lives here instead.
 */

export type NotificationMessageSegment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; value: string };

/** Structurally identical to `SiteChromeCopy["notifications"]["types"]`
 * (`src/app/_shared/site-chrome.ts`) — declared locally instead of
 * imported from there because `src/utils/**` is a shared, non-route layer
 * and `eslint.config.mjs` bans it from importing `src/app/**` (Zone A
 * boundary rule). */
export type NotificationMessageTemplates = Record<NotificationType, string>;

const FALLBACK_NAME = "Sunner";
const BOLD_PATTERN = /\*\*(.+?)\*\*/g;

function splitBoldSegments(text: string): NotificationMessageSegment[] {
  const segments: NotificationMessageSegment[] = [];
  let lastIndex = 0;

  BOLD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BOLD_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }
    segments.push({ type: "bold", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

function resolveTemplateName(
  row: NotificationRow,
): { placeholder: "{senderName}" | "{actorName}"; name: string | null } | null {
  if (row.type === "kudos_received") {
    const payload = parseNotificationPayload("kudos_received", row.payload);
    return { placeholder: "{senderName}", name: payload.senderName };
  }
  if (row.type === "heart_received") {
    const payload = parseNotificationPayload("heart_received", row.payload);
    return { placeholder: "{actorName}", name: payload.actorName };
  }
  return null;
}

/**
 * Builds the ordered, render-ready segments for one notification row:
 * resolves its `{senderName}`/`{actorName}` placeholder (with the
 * `"Sunner"` fallback for a `null` name), splits the `<link>` marker
 * (`kudos_hidden`), then splits `**bold**` runs out of every non-link
 * segment. `secret_box_available`/`kudos_hidden` carry no name
 * placeholder, so their template passes through unchanged before the
 * link/bold split.
 */
export function formatNotificationMessage(
  templates: NotificationMessageTemplates,
  row: NotificationRow,
): NotificationMessageSegment[] {
  const template = templates[row.type];
  const nameSlot = resolveTemplateName(row);
  const resolved = nameSlot
    ? template.replace(nameSlot.placeholder, nameSlot.name ?? FALLBACK_NAME)
    : template;

  return splitLinkTemplate(resolved).flatMap((segment) =>
    segment.type === "link"
      ? [{ type: "link" as const, value: segment.value }]
      : splitBoldSegments(segment.value),
  );
}
