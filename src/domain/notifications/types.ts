/**
 * Shared shapes for F012_NotificationsPanel, consumed by BOTH `src/dal`
 * (server, `import "server-only"`) and `src/api` (browser, phase 05) —
 * this is why these types live in `src/domain` rather than `src/dal`
 * (technical-spec.md § 4, phase-04 Key Insight 1): a `server-only` module
 * can never be imported from browser code, so the DAL cannot be the shared
 * home.
 *
 * Source of truth for the 4 values is `notifications.type`'s `CHECK`
 * constraint in migration `0012`.
 */

export const NOTIFICATION_TYPES = [
  "kudos_received",
  "heart_received",
  "secret_box_available",
  "kudos_hidden",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Per-type payload contracts (technical-spec.md § 2). `senderName`/
 * `actorName` are `string | null` ON PURPOSE (clarifications.md §
 * "Phát sinh khi chạy" — 9/21 real users have no `full_name`): the
 * trigger that writes these rows never invents a name, and this layer
 * must not coerce `null` to a string either. The `"Sunner"`-style
 * fallback belongs to the renderer (repo convention:
 * `kudos-card-person.tsx`'s `person.fullName ?? "Sunner"`), never here.
 */
export type KudosReceivedPayload = {
  kudosId: string;
  senderName: string | null;
};

export type HeartReceivedPayload = {
  kudosId: string;
  /** Only used to dedupe at the DB layer (migration `0012`'s partial
   * unique index) — not rendered. */
  actorId: string;
  actorName: string | null;
};

/** No emitter in v1 (clarifications.md) — enum + payload shape ship so the
 * renderer and a seeded test row both work ahead of the future emitter. */
export type SecretBoxAvailablePayload = {
  boxId: string;
  sourceKudosId: string | null;
};

/** No emitter in v1. Deliberately carries no moderator identity
 * (technical-spec.md § 2, BL03/EC002 boundary). */
export type KudosHiddenPayload = {
  kudosId: string;
};

export type NotificationPayloadByType = {
  kudos_received: KudosReceivedPayload;
  heart_received: HeartReceivedPayload;
  secret_box_available: SecretBoxAvailablePayload;
  kudos_hidden: KudosHiddenPayload;
};

/** One row as read off `public.notifications` (camelCased) — `payload`
 * stays `unknown` here; callers narrow it with `parseNotificationPayload`
 * using this row's own `type`. */
export type NotificationRow = {
  id: string;
  type: NotificationType;
  payload: unknown;
  isRead: boolean;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === "string" ? value : "";
}

function readNullableString(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const value = obj[key];
  return typeof value === "string" ? value : null;
}

/**
 * Defensive boundary parse for `notifications.payload` — raw `jsonb`, so
 * "dữ liệu ngoài hệ thống" even though it was written by our own trigger
 * (a future migration could change its shape, or a row could be
 * hand-seeded for a test per clarifications.md § "Phạm vi 4 loại thông
 * báo"). A missing or mistyped key never throws: it falls back to `""`
 * (or `null` for the two nullable name fields) so a render never crashes
 * on a malformed row. Never invents a non-empty value.
 */
export function parseNotificationPayload<T extends NotificationType>(
  type: T,
  raw: unknown,
): NotificationPayloadByType[T] {
  const obj = isRecord(raw) ? raw : {};

  switch (type) {
    case "kudos_received":
      return {
        kudosId: readString(obj, "kudosId"),
        senderName: readNullableString(obj, "senderName"),
      } as NotificationPayloadByType[T];
    case "heart_received":
      return {
        kudosId: readString(obj, "kudosId"),
        actorId: readString(obj, "actorId"),
        actorName: readNullableString(obj, "actorName"),
      } as NotificationPayloadByType[T];
    case "secret_box_available":
      return {
        boxId: readString(obj, "boxId"),
        sourceKudosId: readNullableString(obj, "sourceKudosId"),
      } as NotificationPayloadByType[T];
    case "kudos_hidden":
      return {
        kudosId: readString(obj, "kudosId"),
      } as NotificationPayloadByType[T];
    default: {
      const exhaustive: never = type;
      throw new Error(
        `parseNotificationPayload: unknown type ${String(exhaustive)}`,
      );
    }
  }
}
