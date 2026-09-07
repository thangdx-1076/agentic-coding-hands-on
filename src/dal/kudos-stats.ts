import "server-only";

/**
 * Server-side read of one viewer's personal Kudos counters, for `/kudos`'s
 * sidebar (F007_KudosLiveBoard, mm:2940:13489 `mms_D.1_Thống kê tổng quat`).
 * Kept out of `src/dal/kudos.ts` on purpose — that file is already at the
 * repo's 200-line guideline and reads `kudos_cards` for the public board, a
 * different shape entirely from this per-viewer aggregate over `kudos`.
 *
 * Mirrors `kudo-hearts.ts`: the Supabase client is always INJECTED, never
 * created here; a falsy `viewerId` short-circuits before any query (the
 * caller only invokes this once `viewerId !== null`, but the guard costs
 * nothing and matches the sibling DAL's own defensiveness at this
 * boundary); and any Supabase error, a null result, or a thrown exception
 * from either read fails OPEN to all-zero stats — `/kudos` has no auth
 * guard, and a Supabase hiccup here must never crash the board, only
 * under-report a number a reload will fix.
 *
 * `hearts` is NOT `sum(heart_count) WHERE receiver_id = viewerId`.
 * clarifications.md § "Lượt tim cộng vào tài khoản NGƯỜI GỬI hay NGƯỜI
 * NHẬN" resolves migration `0007`'s own crediting rule: a heart credits the
 * kudo's SENDER, not its receiver (the "Like on special day" test case is
 * the tiebreaker for the design's self-contradictory copy). So the
 * viewer's own hearts-received total is the sum of `heart_count` across
 * every kudo THIS viewer sent, not received.
 */

export type KudosStatsSummary = {
  received: number;
  sent: number;
  hearts: number;
};

type StatsRow = { heart_count: number };

type StatsResult = { data: StatsRow[] | null; error: unknown };

/**
 * The exact `select()` column list this file issues, kept as a literal
 * type (not widened to `string`) — see `kudos-cards-query.ts`'s
 * `CardColumns` for the TS2589/type-inference reasoning this preserves.
 * `heart_count` alone is enough for all three counters:
 * `received`/`sent` only need row COUNT, and `hearts` sums
 * `heart_count` from the sender-side rows only.
 */
type StatsColumns = "heart_count";

const STATS_COLUMNS: StatsColumns = "heart_count";

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from("kudos").select("heart_count").eq(column, value)`.
 * Deliberately narrower than `SupabaseClient` so a caller (and this file's
 * own test) can stub it without matching the full SDK surface.
 */
export type KudosStatsClient = {
  from: (table: "kudos") => {
    select: (columns: StatsColumns) => {
      eq: (
        column: "sender_id" | "receiver_id",
        value: string,
      ) => PromiseLike<StatsResult>;
    };
  };
};

const EMPTY_STATS: KudosStatsSummary = { received: 0, sent: 0, hearts: 0 };

/**
 * Resolves `viewerId`'s personal counters: how many kudos they received,
 * how many they sent, and how many hearts they've earned (credited to the
 * sender — see this file's top comment). Short-circuits to `EMPTY_STATS`
 * without touching the client for a falsy `viewerId`. Fails open to
 * `EMPTY_STATS` on any Supabase error, a null result, or a thrown
 * exception from either read.
 */
export async function getKudosStats(
  client: KudosStatsClient,
  viewerId: string,
): Promise<KudosStatsSummary> {
  if (!viewerId) {
    return EMPTY_STATS;
  }

  try {
    const [receivedRows, sentRows] = await Promise.all([
      selectRows(client, "receiver_id", viewerId),
      selectRows(client, "sender_id", viewerId),
    ]);

    return {
      received: receivedRows.length,
      sent: sentRows.length,
      hearts: sentRows.reduce((total, row) => total + row.heart_count, 0),
    };
  } catch {
    return EMPTY_STATS;
  }
}

/**
 * One filtered read against `kudos`. Throws on a Supabase error or a null
 * result so the single `try/catch` in `getKudosStats` is the only
 * fail-open branch for both reads.
 */
async function selectRows(
  client: KudosStatsClient,
  column: "sender_id" | "receiver_id",
  value: string,
): Promise<StatsRow[]> {
  const { data, error } = await client
    .from("kudos")
    .select(STATS_COLUMNS)
    .eq(column, value);

  if (error || !data) {
    throw new Error("kudos stats query failed");
  }

  return data;
}
