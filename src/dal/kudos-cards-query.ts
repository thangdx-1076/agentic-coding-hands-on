import "server-only";

/**
 * The `kudos_cards` read layer behind `src/dal/kudos.ts`: the row shape
 * PostgREST hands back, the column list every read selects, the minimal
 * injected-client surface those reads touch, and the one parameterized
 * `selectCards` all three of `getKudosBoard`'s reads go through.
 *
 * Split out of `kudos.ts` for size alone (this repo holds code files under
 * 200 lines) — `getKudosBoard` remains the only caller, and `kudos.ts`
 * re-exports `KudosClient`/`KudosCardsQuery`, so no call site moved and no
 * behavior changed. Nothing here fails open on its own: `selectCards`
 * throws, and `getKudosBoard`'s single `try/catch` stays the one fail-open
 * branch for all three reads.
 */

export type CardRow = {
  id: string;
  content: string;
  hashtags: string[] | null;
  image_urls: string[] | null;
  heart_count: number;
  created_at: string;
  sender_id: string;
  sender_full_name: string | null;
  sender_avatar_url: string | null;
  sender_department: string | null;
  sender_kudos_received: number;
  receiver_id: string;
  receiver_full_name: string | null;
  receiver_avatar_url: string | null;
  receiver_department: string | null;
  receiver_kudos_received: number;
};

type CardsResult = { data: CardRow[] | null; error: unknown };

/**
 * The exact `select()` column list `getKudosBoard` issues, kept as a
 * literal type (not widened to `string`) — see `awards.ts`'s
 * `AwardColumns` for the TS2589/type-inference reasoning this preserves.
 * One list serves all three reads, including the unfiltered totals read:
 * `kudos_cards` already carries every field each read needs, and
 * over-selecting a few unused columns there is cheaper than a second
 * literal type and a second query shape in `KudosClient`.
 */
type CardColumns =
  "id,content,hashtags,image_urls,heart_count,created_at,sender_id,sender_full_name,sender_avatar_url,sender_department,sender_kudos_received,receiver_id,receiver_full_name,receiver_avatar_url,receiver_department,receiver_kudos_received";

const CARD_COLUMNS: CardColumns =
  "id,content,hashtags,image_urls,heart_count,created_at,sender_id,sender_full_name,sender_avatar_url,sender_department,sender_kudos_received,receiver_id,receiver_full_name,receiver_avatar_url,receiver_department,receiver_kudos_received";

/**
 * The minimal slice of a Supabase client this helper touches:
 * `.from("kudos_cards").select(columns)` then any subset, in any order, of
 * `contains`/`eq`/`lt`/`order`/`limit`. Unlike `AwardsClient` (one fixed
 * chain), `getKudosBoard` applies a different filter/order/limit
 * combination to each of its three reads, so `KudosCardsQuery` is
 * self-returning (every method returns another `KudosCardsQuery`) AND
 * awaitable at every step (`extends PromiseLike<CardsResult>`) — the
 * totals read awaits `select()` directly with no further chaining, exactly
 * like the real `@supabase/postgrest-js` builder allows.
 */
export type KudosCardsQuery = PromiseLike<CardsResult> & {
  contains: (column: "hashtags", value: string[]) => KudosCardsQuery;
  eq: (column: "receiver_department", value: string) => KudosCardsQuery;
  lt: (column: "created_at", value: string) => KudosCardsQuery;
  order: (
    column: "heart_count" | "created_at",
    opts: { ascending: boolean },
  ) => KudosCardsQuery;
  limit: (count: number) => KudosCardsQuery;
};

export type KudosClient = {
  from: (table: "kudos_cards") => {
    select: (columns: CardColumns) => KudosCardsQuery;
  };
};

export type SelectFilters = {
  hashtag?: string;
  department?: string;
  cursor?: string;
  sort?: "highlight" | "feed";
  limit?: number;
};

/**
 * One filtered/ordered/paginated read against `kudos_cards`. Throws on a
 * Supabase error or a null result so the single `try/catch` in
 * `getKudosBoard` is the only fail-open branch for all three reads.
 */
export async function selectCards(
  client: KudosClient,
  filters: SelectFilters,
): Promise<CardRow[]> {
  let query = client.from("kudos_cards").select(CARD_COLUMNS);

  if (filters.hashtag) {
    query = query.contains("hashtags", [filters.hashtag]);
  }
  if (filters.department) {
    query = query.eq("receiver_department", filters.department);
  }
  if (filters.cursor) {
    query = query.lt("created_at", filters.cursor);
  }
  if (filters.sort === "highlight") {
    query = query
      .order("heart_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (filters.sort === "feed") {
    query = query.order("created_at", { ascending: false });
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    throw new Error("kudos_cards query failed");
  }

  return data;
}
