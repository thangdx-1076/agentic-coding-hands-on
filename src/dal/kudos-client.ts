import "server-only";

import type { KudosCardsQuery, KudosClient } from "./kudos";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getKudosBoard` consumes: `from("kudos_cards").select(columns)` followed
 * by any subset, in any order, of `contains("hashtags", …)`,
 * `eq("receiver_department", …)`, `lt("created_at", …)`, `order(…)` (once
 * or twice), and `limit(…)`.
 *
 * Differs from `toAwardsClient`/`toProfileCardsClient` (each forwards ONE
 * fixed chain by calling the matching real method at each step) because
 * `getKudosBoard` issues three reads that each apply a different filter
 * combination — there is no single chain to write out. `wrapCardsQuery`
 * re-wraps the SDK's builder after every call instead, staying chainable
 * and awaitable at every step, mirroring `KudosCardsQuery` in
 * `kudos-cards-query.ts`.
 *
 * The one `as unknown as RealCardsBuilder` below is the sole boundary
 * cast: passing the SDK's builder straight to `wrapCardsQuery` without it
 * hits TS2589 ("type instantiation is excessively deep"), the same one
 * `toAwardsClient` avoids by forwarding a fixed chain instead of a value.
 * The real builder carries every method `RealCardsBuilder` declares — the
 * cast exists because TypeScript's generics are too deep to prove that,
 * not because the shapes actually differ.
 */
type RealCardsBuilder = {
  contains: (column: string, value: string[]) => RealCardsBuilder;
  eq: (column: string, value: string) => RealCardsBuilder;
  lt: (column: string, value: string) => RealCardsBuilder;
  order: (column: string, opts: { ascending: boolean }) => RealCardsBuilder;
  limit: (count: number) => RealCardsBuilder;
  // Reuses `KudosCardsQuery`'s own `then` signature (rather than a generic
  // `{ data: unknown; error: unknown }`) so forwarding `onFulfilled`/
  // `onRejected` straight through to `real.then(...)` below type-checks —
  // both sides then agree on `CardsResult`, not just "some thenable".
  then: KudosCardsQuery["then"];
};

function wrapCardsQuery(real: RealCardsBuilder): KudosCardsQuery {
  const query: KudosCardsQuery = {
    contains: (column, value) => wrapCardsQuery(real.contains(column, value)),
    eq: (column, value) => wrapCardsQuery(real.eq(column, value)),
    lt: (column, value) => wrapCardsQuery(real.lt(column, value)),
    order: (column, opts) => wrapCardsQuery(real.order(column, opts)),
    limit: (count) => wrapCardsQuery(real.limit(count)),
    then: (onFulfilled, onRejected) => real.then(onFulfilled, onRejected),
  };
  return query;
}

export function toKudosClient(supabase: ServerSupabaseClient): KudosClient {
  return {
    from: (table) => ({
      select: (columns) => {
        const real = supabase.from(table).select(columns);
        // `pnpm typecheck` (a fresh `tsc --noEmit`) hits TS2589 on this line
        // without the cast; eslint's type-aware `no-unnecessary-type-assertion`
        // disagrees because it runs on `projectService`'s incrementally
        // checked program, which resolves this specific deeply-generic
        // instantiation without hitting the same depth limit. `pnpm
        // typecheck` is the authoritative gate (see this file's top
        // comment), so the cast stays and the lint rule is disabled here.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return wrapCardsQuery(real as unknown as RealCardsBuilder);
      },
    }),
  };
}
