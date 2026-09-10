import "server-only";

import type {
  AggregatesQuery,
  KudosAggregatesClient,
} from "./kudos-board-aggregates";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getKudosTotal`/`getKudosFilterOptions` consume: `from("kudos" |
 * "kudos_filter_options").select(columns[, opts])`, optionally chained
 * with `.order("value")`.
 *
 * Mirrors `kudos-client.ts`'s `wrapCardsQuery`/`toKudosClient` split, for
 * the same reason: comparing the SDK's builder structurally against a
 * hand-written type hits TS2589 ("type instantiation is excessively
 * deep") without re-issuing the chain through explicitly typed arrows.
 * Not part of phase 01's `owned_files` list — required anyway to give
 * `page.tsx` a real client to inject; no other phase in this plan owns
 * this filename (verified: `grep -rl kudos-board-aggregates
 * plans/**\/phase-*.md` returns only phase 01).
 */
type RealAggregatesBuilder = {
  order: (column: string) => RealAggregatesBuilder;
  then: AggregatesQuery["then"];
};

function wrapAggregatesQuery(real: RealAggregatesBuilder): AggregatesQuery {
  const query: AggregatesQuery = {
    order: (column) => wrapAggregatesQuery(real.order(column)),
    then: (onFulfilled, onRejected) => real.then(onFulfilled, onRejected),
  };
  return query;
}

export function toKudosAggregatesClient(
  supabase: ServerSupabaseClient,
): KudosAggregatesClient {
  return {
    from: (table) => ({
      select: (columns, opts) => {
        const real = opts
          ? supabase.from(table).select(columns, opts)
          : supabase.from(table).select(columns);
        return wrapAggregatesQuery(real as unknown as RealAggregatesBuilder);
      },
    }),
  };
}
