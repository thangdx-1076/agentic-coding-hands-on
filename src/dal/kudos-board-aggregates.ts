import "server-only";

/**
 * Board-wide aggregates for `/kudos` (F007_KudosLiveBoard) that a single
 * `kudos_cards` read can no longer answer correctly once the table passes
 * PostgREST's `max_rows = 1000` cap (`supabase/config.toml:18`, BR-017):
 * the Spotlight total needs an exact `COUNT`, and the Hashtag/Phòng ban
 * filter option lists need every distinct value, not whatever 1000 rows
 * PostgREST happened to return. Split out of `kudos.ts` for size — see
 * that file's own doc comment for how the two calls below fit into
 * `getKudosBoard`'s `Promise.all`/`try-catch` fail-open contract.
 */

export type FilterOptionRow = { kind: "hashtag" | "department"; value: string };
export type KudosFilterOptions = { hashtags: string[]; departments: string[] };

type AggregatesResult = {
  count: number | null;
  data: FilterOptionRow[] | null;
  error: unknown;
};

/** Self-returning + awaitable at every step, mirroring `KudosCardsQuery` —
 * `.select("*", {count,head:true})` on `kudos` is awaited directly, while
 * `.select("kind,value")` on `kudos_filter_options` chains one `.order()`
 * first; both end up awaiting the same `AggregatesResult` shape. */
export type AggregatesQuery = PromiseLike<AggregatesResult> & {
  order: (column: "value") => AggregatesQuery;
};

/** The minimal slice of a Supabase (or Supabase-shaped) client both reads
 * below touch: `.from(table).select(columns[, opts])`. */
export type KudosAggregatesClient = {
  from: (table: "kudos" | "kudos_filter_options") => {
    select: (
      columns: "*" | "kind,value",
      opts?: { count: "exact"; head: true },
    ) => AggregatesQuery;
  };
};

/** Exact row count of `public.kudos`, independent of `max_rows`
 * (BR-017/FR-217) — `head: true` fetches no rows, only the count. Throws
 * on a Supabase error or a null count; `getKudosBoard`'s `try/catch` is
 * the one fail-open branch for this and every other board read. */
export async function getKudosTotal(
  client: KudosAggregatesClient,
): Promise<number> {
  const { count, error } = await client
    .from("kudos")
    .select("*", { count: "exact", head: true });

  if (error || count === null) {
    throw new Error("kudos count query failed");
  }
  return count;
}

/** Every distinct hashtag CHIP and receiver department in `public.kudos`,
 * via the `kudos_filter_options` view (migrations `0014`/`0018`) — PostgREST
 * has no `DISTINCT` (BR-017/FR-215). Sorted by `value` (the view read orders
 * by it) so dropdown order stays deterministic across runs.
 *
 * "Chip", not "hashtag", is exact: element 1 of `kudos.hashtags` is the Danh
 * hiệu (title), and `0018` excludes it, so a title never shows up as a
 * filterable tag. */
export async function getKudosFilterOptions(
  client: KudosAggregatesClient,
): Promise<KudosFilterOptions> {
  const { data, error } = await client
    .from("kudos_filter_options")
    .select("kind,value")
    .order("value");

  if (error || !data) {
    throw new Error("kudos_filter_options query failed");
  }
  return {
    hashtags: data
      .filter((row) => row.kind === "hashtag")
      .map((row) => row.value),
    departments: data
      .filter((row) => row.kind === "department")
      .map((row) => row.value),
  };
}
