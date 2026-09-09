import { createClient } from "@/lib/supabase/client";
import { decodeCursor, encodeCursor } from "@/domain/notifications/cursor";
import {
  isNotificationType,
  type NotificationRow,
} from "@/domain/notifications/types";

/**
 * Browser-side read path for F012_NotificationsPanel
 * (technical-spec.md § 5, phase-05). Mirrors `src/api/auth.ts`'s shape: the
 * Supabase browser client (`src/lib/supabase/client.ts`) is created fresh
 * per call, never module-scoped, so nothing here holds a stale session
 * across navigations.
 *
 * Writes still go through the Server Actions in
 * `src/app/_actions/notifications.ts` (phase 04) — this module is
 * READ-ONLY plus the realtime subscription below. The popup only fetches
 * while it is open (FR-007), and a live realtime channel can only be held
 * open from the browser, so this split is deliberate, not an oversight
 * (clarifications.md § "Realtime").
 *
 * `toNotificationRow` below intentionally DUPLICATES
 * `src/dal/notifications-query.ts`'s function of the same purpose rather
 * than importing it: that module opens with `import "server-only"`, which
 * throws the moment any module reachable from a client bundle imports it —
 * browser code can never reach across that boundary. This is the same
 * reasoning `src/domain/notifications/types.ts`'s header gives for why the
 * shared types live outside `src/dal` in the first place.
 */

const PAGE_SIZE = 10;
const NOTIFICATION_COLUMNS = "id,type,payload,is_read,created_at";

function toNotificationRow(raw: unknown): NotificationRow {
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

export type ListNotificationsResult = {
  items: NotificationRow[];
  nextCursor: string | null;
};

/**
 * One page of the signed-in user's notifications, newest first,
 * keyset-paginated on `(created_at, id)` (FR-102) — never `offset`.
 * `userId` is deliberately NOT passed to the query: RLS
 * (`0012_notifications.sql`'s `notifications_select_own`) filters to
 * `auth.uid()` on its own, and that is the real security boundary, not a
 * client-supplied id (this file's `subscribeToNotifications` documents the
 * same rule for the realtime filter).
 *
 * Selects `PAGE_SIZE + 1` rows to know — without a second round trip —
 * whether there is a next page: getting back 11 rows means the 11th is
 * dropped and the 10th's own `(created_at, id)` becomes `nextCursor`;
 * getting back 10 or fewer means this was the last page. Throws on a
 * Supabase error or a malformed row, same fail-CLOSED convention as
 * `src/dal/notifications.ts`'s `listNotifications`: an open panel already
 * has explicit error UI (phase 08) to fall into, so masking a real failure
 * as "0 items" here would hide a bug instead of surfacing it.
 */
export async function listNotifications(
  cursor?: string | null,
): Promise<ListNotificationsResult> {
  const supabase = createClient();
  let query = supabase.from("notifications").select(NOTIFICATION_COLUMNS);

  const decoded = decodeCursor(cursor);
  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (error || !data) {
    throw new Error("notifications query failed");
  }

  const rows = data.map(toNotificationRow);
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = items[items.length - 1];

  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null,
  };
}

/**
 * Unread count for the signed-in user. Fails OPEN to `0` on any error —
 * same convention as `src/dal/notifications.ts`'s `getUnreadCount`: a
 * badge that crashes the header is worse than one that silently
 * under-reports.
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const supabase = createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    if (error || typeof count !== "number") {
      return 0;
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Subscribes to INSERT events on `public.notifications` for `userId`
 * (the table is already in the `supabase_realtime` publication, migration
 * `0012`). Returns an unsubscribe function the caller MUST invoke on
 * unmount — an un-removed channel stays open for the life of the tab.
 *
 * The `filter` only narrows traffic to cut noise; it is NOT the security
 * boundary. RLS enforces that on its own regardless of what a client
 * subscribes to (clarifications.md § "Realtime", TC-F007-002) — a caller
 * must never treat a channel subscribing successfully as proof it will
 * only ever receive its own rows.
 */
export function subscribeToNotifications(
  userId: string,
  onInsert: () => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onInsert();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
