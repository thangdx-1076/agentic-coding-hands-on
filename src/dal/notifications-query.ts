import "server-only";

import {
  isNotificationType,
  type NotificationRow,
} from "@/domain/notifications/types";

/**
 * Row/query shapes and the injected-client surface behind
 * `src/dal/notifications.ts` — split out for size alone (this repo holds
 * code files under 200 lines), mirroring `kudos-cards-query.ts`'s split
 * from `kudos.ts`. `notifications.ts` re-exports every type below so
 * `@/dal/notifications` stays the one import path for this DAL —
 * `notifications-client.ts` and this file's own test still reach them
 * here directly.
 */

export const NOTIFICATION_COLUMNS = "id,type,payload,is_read,created_at";

export type SelectResult = {
  data: unknown[] | null;
  count: number | null;
  error: unknown;
};

export type UpdateResult = {
  data: { id: string }[] | null;
  error: unknown;
};

/**
 * Self-returning query builder — mirrors `KudosCardsQuery`'s shape
 * (`kudos-cards-query.ts`) for the same reason: `getUnreadCount` and
 * `listNotifications` each apply a different combination of `eq`/`or`/
 * `order`/`limit` to the same `.select()` call, so there is no single
 * fixed chain to declare.
 */
export type NotificationsSelectQuery = PromiseLike<SelectResult> & {
  eq: (
    column: "user_id" | "is_read",
    value: string | boolean,
  ) => NotificationsSelectQuery;
  or: (filter: string) => NotificationsSelectQuery;
  order: (
    column: "created_at" | "id",
    opts: { ascending: boolean },
  ) => NotificationsSelectQuery;
  limit: (count: number) => NotificationsSelectQuery;
};

export type NotificationsUpdateQuery = {
  eq: (
    column: "id" | "user_id" | "is_read",
    value: string | boolean,
  ) => NotificationsUpdateQuery;
  select: (columns: "id") => PromiseLike<UpdateResult>;
};

/** The minimal slice of a Supabase (or Supabase-shaped) client this DAL
 * touches. Deliberately narrower than `SupabaseClient` so a caller (and
 * this file's own test) can stub it without matching the full SDK
 * surface, and so `notifications-client.ts` never hits TS2589 the way a
 * structural comparison against the real generic builder would. */
export type NotificationsClient = {
  from: (table: "notifications") => {
    select: (
      columns: string,
      opts?: { count: "exact"; head: true },
    ) => NotificationsSelectQuery;
    update: (values: { is_read: boolean }) => NotificationsUpdateQuery;
  };
};

/**
 * Boundary check for one row of `.select(NOTIFICATION_COLUMNS)`'s
 * response (no generated Supabase types exist in this repo — see
 * `secret-box.ts`'s `parseOpeningRow` for the same reasoning). Throws on
 * an unrecognized shape (fail CLOSED, per `notifications.ts`'s header)
 * rather than guessing; `payload` itself is intentionally left as
 * `unknown` here — `domain/notifications/types.ts`'s
 * `parseNotificationPayload` is the defensive parse for that field,
 * applied by callers that know the row's `type`.
 */
export function toNotificationRow(raw: unknown): NotificationRow {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("notifications row: not an object");
  }

  const {
    id,
    type,
    payload,
    is_read: isRead,
    created_at: createdAt,
  } = raw as Record<string, unknown>;

  if (
    typeof id !== "string" ||
    typeof createdAt !== "string" ||
    typeof isRead !== "boolean" ||
    !isNotificationType(type)
  ) {
    throw new Error("notifications row: unrecognized shape");
  }

  return { id, type, payload, isRead, createdAt };
}
