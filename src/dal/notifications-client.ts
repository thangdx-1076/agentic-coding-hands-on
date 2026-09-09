import "server-only";

import type {
  NotificationsClient,
  NotificationsSelectQuery,
  NotificationsUpdateQuery,
} from "./notifications";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the `notifications`
 * slice `src/dal/notifications.ts` consumes. Mirrors `kudos-client.ts`'s
 * `wrapCardsQuery` shape: `getUnreadCount` and `listNotifications` each
 * issue a different `eq`/`or`/`order`/`limit` combination against the same
 * `.select()`, so the query builder re-wraps itself after every call
 * instead of declaring one fixed chain.
 *
 * `RealSelectBuilder`/`RealUpdateBuilder` plus the two `as unknown as`
 * casts below are the same TS2589 workaround `kudos-client.ts` documents:
 * the real `@supabase/postgrest-js` builder is too deeply generic for
 * TypeScript to structurally compare against the narrow shape it actually
 * satisfies at runtime.
 */

type RealSelectBuilder = {
  eq: (column: string, value: string | boolean) => RealSelectBuilder;
  or: (filter: string) => RealSelectBuilder;
  order: (column: string, opts: { ascending: boolean }) => RealSelectBuilder;
  limit: (count: number) => RealSelectBuilder;
  then: NotificationsSelectQuery["then"];
};

function wrapSelectQuery(real: RealSelectBuilder): NotificationsSelectQuery {
  const query: NotificationsSelectQuery = {
    eq: (column, value) => wrapSelectQuery(real.eq(column, value)),
    or: (filter) => wrapSelectQuery(real.or(filter)),
    order: (column, opts) => wrapSelectQuery(real.order(column, opts)),
    limit: (count) => wrapSelectQuery(real.limit(count)),
    then: (onFulfilled, onRejected) => real.then(onFulfilled, onRejected),
  };
  return query;
}

type RealUpdateBuilder = {
  eq: (column: string, value: string | boolean) => RealUpdateBuilder;
  select: NotificationsUpdateQuery["select"];
};

function wrapUpdateQuery(real: RealUpdateBuilder): NotificationsUpdateQuery {
  return {
    eq: (column, value) => wrapUpdateQuery(real.eq(column, value)),
    select: (columns) => real.select(columns),
  };
}

export function toNotificationsClient(
  supabase: ServerSupabaseClient,
): NotificationsClient {
  return {
    from: (table) => ({
      select: (columns, opts) => {
        const real = opts
          ? supabase.from(table).select(columns, opts)
          : supabase.from(table).select(columns);
        // See header comment — mirrors `kudos-client.ts`'s documented
        // TS2589 workaround.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return wrapSelectQuery(real as unknown as RealSelectBuilder);
      },
      update: (values) => {
        const real = supabase.from(table).update(values);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return wrapUpdateQuery(real as unknown as RealUpdateBuilder);
      },
    }),
  };
}
