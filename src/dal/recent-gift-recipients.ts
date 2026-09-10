import "server-only";

/**
 * Server-side read of the 10 most recent Secret Box openers, for the
 * "10 SUNNER NHẬN QUÀ MỚI NHẤT" sidebar on `/kudos`
 * (F007_KudosLiveBoard FR-219/BR-020, MoMorph rows D.3/D.3.2/D.3.4).
 *
 * Reads through `public.recent_gift_recipients` (migration `0015`) — a
 * SECURITY DEFINER view over `secret_box_openings` joined to `users`, never
 * `secret_box_openings` directly: that table's own RLS is own-row-only
 * (`0011`), so a direct read can never show one Sunner another Sunner's
 * opening. `LIMIT 10` and `ORDER BY opened_at DESC` are baked into the view
 * itself, but this query re-asserts both explicitly rather than trusting a
 * bare `SELECT *` to preserve the view's internal ordering — Postgres does
 * not guarantee that.
 *
 * The Supabase client is always INJECTED by the caller (never created
 * here), matching every other DAL read in this codebase. Fails open to
 * `[]` on any Supabase error, a null result, or a thrown exception — the
 * sidebar's own empty state (`Chưa có dữ liệu`, BR-012) already covers "no
 * data", so a Supabase hiccup here must render the same thing, never crash
 * the public `/kudos` page.
 */

export type GiftRecipient = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  badgeKey: string;
  openedAt: string;
};

type GiftRecipientRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  badge_key: string;
  opened_at: string;
};

type RecentGiftRecipientsResult = {
  data: GiftRecipientRow[] | null;
  error: unknown;
};

/**
 * The exact `select()` query string `getRecentGiftRecipients` issues, kept
 * as a literal type (not widened to `string`) for the same reason
 * `SunnerSearchColumns` is: the real `@supabase/postgrest-js` builder
 * parses the selected columns at the TYPE level against this literal to
 * infer the row shape.
 */
type RecentGiftRecipientsColumns =
  "id,full_name,avatar_url,badge_key,opened_at";

const RECENT_GIFT_RECIPIENTS_COLUMNS: RecentGiftRecipientsColumns =
  "id,full_name,avatar_url,badge_key,opened_at";

/** `GIFT_RECIPIENTS_LIMIT` per `technical-spec.md` § 4.6 — matches the
 * `LIMIT 10` already inside the view (migration `0015`). */
const DEFAULT_LIMIT = 10;

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from("recent_gift_recipients").select(columns)
 * .order("opened_at", { ascending: false }).limit(count)`. Deliberately
 * narrower than `SupabaseClient` so a caller (and this file's own test) can
 * stub it without matching the full SDK surface. `.limit()` is typed as
 * `PromiseLike` (not `Promise`) on purpose: the real postgrest builder is a
 * thenable without `catch`/`finally`, so a `Promise` here would force every
 * caller to wrap the SDK in an adapter.
 */
export type RecentGiftRecipientsClient = {
  from: (table: "recent_gift_recipients") => {
    select: (columns: RecentGiftRecipientsColumns) => {
      order: (
        column: "opened_at",
        opts: { ascending: false },
      ) => {
        limit: (count: number) => PromiseLike<RecentGiftRecipientsResult>;
      };
    };
  };
};

/**
 * Resolves the most recent `limit` (default 10) Secret Box openings, newest
 * first, mapped to camelCase. Fails open to `[]` on any Supabase error, a
 * null result, or a thrown exception — never throws.
 */
export async function getRecentGiftRecipients(
  client: RecentGiftRecipientsClient,
  { limit = DEFAULT_LIMIT }: { limit?: number } = {},
): Promise<GiftRecipient[]> {
  try {
    const { data, error } = await client
      .from("recent_gift_recipients")
      .select(RECENT_GIFT_RECIPIENTS_COLUMNS)
      .order("opened_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      userId: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      badgeKey: row.badge_key,
      openedAt: row.opened_at,
    }));
  } catch {
    return [];
  }
}
