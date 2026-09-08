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
 *
 * `secretBoxOpened`/`secretBoxUnopened` (F000_SecretBoxModal, phase 04)
 * read a THIRD table, `secret_box_openings` (migration `0011`), added
 * alongside the two `kudos` reads rather than recomputed from them:
 * `secretBoxOpened` is `count(*)` of the viewer's own opening rows, and
 * `secretBoxUnopened` is `floor(hearts / 5) − secretBoxOpened`, clamped to
 * never go negative (a corrupted/replayed opening row must never render a
 * negative count, only `0`). This does NOT requery `kudos` a second time —
 * it reuses the `hearts` total already computed above from the sender-side
 * read.
 */

export type KudosStatsSummary = {
  received: number;
  sent: number;
  hearts: number;
  secretBoxOpened: number;
  secretBoxUnopened: number;
};

/** Hearts credited per Secret Box unlock — clarifications.md § "Số hộp chưa mở tính thế nào". */
const HEARTS_PER_SECRET_BOX = 5;

type HeartRow = { heart_count: number };
type OpeningRow = { user_id: string };

type StatsResult = {
  data: Array<HeartRow | OpeningRow> | null;
  error: unknown;
};

/**
 * The exact `select()` column lists this file issues, kept as literal
 * types (not widened to `string`) — see `kudos-cards-query.ts`'s
 * `CardColumns` for the TS2589/type-inference reasoning this preserves.
 * `heart_count` alone is enough for the two `kudos` counters:
 * `received`/`sent` only need row COUNT, and `hearts` sums `heart_count`
 * from the sender-side rows only. `user_id` is enough for the
 * `secret_box_openings` counter: only the row COUNT is used, never a
 * column value.
 */
type StatsColumns = "heart_count" | "user_id";

const HEART_COUNT_COLUMN: StatsColumns = "heart_count";
const OPENINGS_COLUMN: StatsColumns = "user_id";

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from(table).select(columns).eq(column, value)` against
 * either `kudos` (`sender_id`/`receiver_id`) or `secret_box_openings`
 * (`user_id`). Deliberately narrower than `SupabaseClient` so a caller
 * (and this file's own test) can stub it without matching the full SDK
 * surface. Widening this to a THIRD table only ever means widening these
 * three unions — never narrowing — so `page.tsx`'s existing caller stays
 * valid untouched.
 */
export type KudosStatsClient = {
  from: (table: "kudos" | "secret_box_openings") => {
    select: (columns: StatsColumns) => {
      eq: (
        column: "sender_id" | "receiver_id" | "user_id",
        value: string,
      ) => PromiseLike<StatsResult>;
    };
  };
};

const EMPTY_STATS: KudosStatsSummary = {
  received: 0,
  sent: 0,
  hearts: 0,
  secretBoxOpened: 0,
  secretBoxUnopened: 0,
};

/**
 * Resolves `viewerId`'s personal counters: how many kudos they received,
 * how many they sent, how many hearts they've earned (credited to the
 * sender — see this file's top comment), and their Secret Box entitlement.
 * Short-circuits to `EMPTY_STATS` without touching the client for a falsy
 * `viewerId`. Fails open to `EMPTY_STATS` on any Supabase error, a null
 * result, or a thrown exception from any of the three reads — `/kudos` has
 * no auth guard, so under-reporting every counter to `0` (which also
 * disables the Secret Box button, per clarifications.md) is the safe
 * failure mode here, not a thrown error.
 */
export async function getKudosStats(
  client: KudosStatsClient,
  viewerId: string,
): Promise<KudosStatsSummary> {
  if (!viewerId) {
    return EMPTY_STATS;
  }

  try {
    const [receivedRows, sentRows, openedCount] = await Promise.all([
      selectHeartRows(client, "receiver_id", viewerId),
      selectHeartRows(client, "sender_id", viewerId),
      countOpenings(client, viewerId),
    ]);

    const hearts = sentRows.reduce((total, row) => total + row.heart_count, 0);
    const entitlement = Math.floor(hearts / HEARTS_PER_SECRET_BOX);

    return {
      received: receivedRows.length,
      sent: sentRows.length,
      hearts,
      secretBoxOpened: openedCount,
      secretBoxUnopened: Math.max(0, entitlement - openedCount),
    };
  } catch {
    return EMPTY_STATS;
  }
}

/**
 * One filtered `heart_count` read against `kudos`. Throws on a Supabase
 * error, a null result, or a row missing a numeric `heart_count` — this
 * repo generates no Supabase types (`createClient()` carries no `Database`
 * generic), so nothing at compile time catches a shape drift here; this
 * runtime check is the only thing that does. The single `try/catch` in
 * `getKudosStats` is the only fail-open branch for all three reads.
 */
async function selectHeartRows(
  client: KudosStatsClient,
  column: "sender_id" | "receiver_id",
  value: string,
): Promise<HeartRow[]> {
  const { data, error } = await client
    .from("kudos")
    .select(HEART_COUNT_COLUMN)
    .eq(column, value);

  if (error || !data) {
    throw new Error("kudos stats query failed");
  }

  return data.map((row) => {
    if (!("heart_count" in row) || typeof row.heart_count !== "number") {
      throw new Error("kudos stats query failed: unexpected row shape");
    }
    return row;
  });
}

/**
 * Counts `viewerId`'s own `secret_box_openings` rows. Only the row COUNT
 * is meaningful — no column value is ever read off these rows — so this
 * throws on a Supabase error or a null result but does not shape-check
 * individual rows the way `selectHeartRows` must.
 */
async function countOpenings(
  client: KudosStatsClient,
  viewerId: string,
): Promise<number> {
  const { data, error } = await client
    .from("secret_box_openings")
    .select(OPENINGS_COLUMN)
    .eq("user_id", viewerId);

  if (error || !data) {
    throw new Error("secret box openings query failed");
  }

  return data.length;
}
