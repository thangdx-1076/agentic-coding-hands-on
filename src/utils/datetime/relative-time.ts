/**
 * `formatRelativeTime` — F012_NotificationsPanel's "3 phút trước" style
 * timestamp (technical-spec.md § 6). `Intl.RelativeTimeFormat`, no new
 * dependency. `now` is always injected rather than read from `Date.now()`
 * internally, so tests never depend on the wall clock.
 */

type RelativeUnit = "second" | "minute" | "hour" | "day";

const UNIT_SECONDS: Record<RelativeUnit, number> = {
  second: 1,
  minute: 60,
  hour: 60 * 60,
  day: 60 * 60 * 24,
};

/**
 * `date` may be an ISO string (as `notifications.created_at` reads off
 * PostgREST) or a `Date`. An unparsable string never throws — it falls
 * back to `""` so a render never crashes on a malformed row, matching
 * this feature's other boundary-parse functions
 * (`domain/notifications/types.ts`'s `parseNotificationPayload`).
 */
export function formatRelativeTime(
  date: Date | string,
  now: Date,
  locale: string,
): string {
  const target = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(target.getTime())) {
    return "";
  }

  const diffSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const absSeconds = Math.abs(diffSeconds);
  if (absSeconds < UNIT_SECONDS.minute) {
    return rtf.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / UNIT_SECONDS.minute);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffSeconds / UNIT_SECONDS.hour);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffSeconds / UNIT_SECONDS.day);
  return rtf.format(diffDays, "day");
}
