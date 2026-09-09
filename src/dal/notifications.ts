import "server-only";

import {
  NOTIFICATION_COLUMNS,
  toNotificationRow,
  type NotificationsClient,
} from "./notifications-query";

import { decodeCursor, encodeCursor } from "@/domain/notifications/cursor";
import type { NotificationRow } from "@/domain/notifications/types";

export type {
  NotificationsClient,
  NotificationsSelectQuery,
  NotificationsUpdateQuery,
} from "./notifications-query";

/**
 * Server-side read/write for F012_NotificationsPanel
 * (technical-spec.md § 4). Mirrors `secret-box.ts`/`kudo-hearts.ts`: the
 * Supabase (or Supabase-shaped) client is always INJECTED, never created
 * here, and `import "server-only"` keeps this out of the browser bundle —
 * `src/domain/notifications` is the shared layer browser code (phase 05)
 * reaches for instead. Row/query shapes and the boundary parse for one
 * row live in `./notifications-query` (a size split only, same pattern as
 * `kudos.ts` / `kudos-cards-query.ts`).
 *
 * Two risk-shaped return conventions, both deliberate (phase-04 Key
 * Insight 3):
 *   - `getUnreadCount` fails OPEN to `0` — a broken badge must never crash
 *     the header (it has no auth guard of its own to hide behind).
 *   - `markRead`/`markAllRead` fail CLOSED to `{ok:false}` /
 *     `{updated:0}` — a mis-applied "already read" state is worse than a
 *     no-op the panel can retry.
 *   - `listNotifications` throws on a Supabase error or a malformed row:
 *     unlike the badge, an open panel already has explicit empty/error UI
 *     (phase 08) to fall into, so masking a real failure as "0 items" here
 *     would hide a bug instead of surfacing it.
 */

const PAGE_SIZE = 10;

/**
 * Count of unread notifications for `userId`. Fails OPEN to `0` on ANY
 * failure — a Supabase error, a missing/non-numeric `count`, or a thrown
 * exception — because a badge that crashes the header is worse than a
 * badge that silently under-reports.
 */
export async function getUnreadCount(
  client: NotificationsClient,
  userId: string,
): Promise<number> {
  try {
    const { count, error } = await client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error || typeof count !== "number") {
      return 0;
    }

    return count;
  } catch {
    return 0;
  }
}

export type ListNotificationsResult = {
  items: NotificationRow[];
  nextCursor: string | null;
};

/**
 * One page of `userId`'s notifications, newest first, `PAGE_SIZE` items,
 * keyset-paginated on `(created_at, id)` — never `offset` (FR-102). A
 * page is considered "possibly not the last" when it comes back full
 * (`items.length === PAGE_SIZE`), the same heuristic `kudos.ts`'s Feed
 * read uses: the next `loadMore` call simply comes back with `nextCursor:
 * null` once there truly is nothing left.
 */
export async function listNotifications(
  client: NotificationsClient,
  userId: string,
  cursor?: string,
): Promise<ListNotificationsResult> {
  let query = client
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("user_id", userId);

  const decoded = decodeCursor(cursor);
  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (error || !data) {
    throw new Error("notifications query failed");
  }

  const items = data.map(toNotificationRow);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor:
      items.length === PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null,
  };
}

export type MarkReadResult = { ok: boolean };

/**
 * Marks one notification read. `{ok:false}` is the SAME shape, with no
 * distinguishing `reason`, whether `id` belongs to someone else or does
 * not exist at all — RLS's `USING (user_id = auth.uid())`
 * (`0012_notifications.sql`) already filters both cases down to "0 rows
 * matched" before this function ever sees a difference, so there is
 * nothing left here to branch on (FR-603/EC013). Any other failure (a
 * Supabase error) also collapses to `{ok:false}` — fail CLOSED, per this
 * file's header.
 */
export async function markRead(
  client: NotificationsClient,
  userId: string,
  id: string,
): Promise<MarkReadResult> {
  try {
    const { data, error } = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error || !data || data.length === 0) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export type MarkAllReadResult = { updated: number };

/**
 * Marks every unread notification of `userId` read. 0 unread rows is a
 * normal outcome (`{updated: 0}`), not an error (FR-202) — the same
 * `.update().eq().eq().select("id")` shape as `markRead`, matching 0 rows
 * simply because there was nothing left to match.
 */
export async function markAllRead(
  client: NotificationsClient,
  userId: string,
): Promise<MarkAllReadResult> {
  try {
    const { data, error } = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("id");

    if (error || !data) {
      return { updated: 0 };
    }

    return { updated: data.length };
  } catch {
    return { updated: 0 };
  }
}
