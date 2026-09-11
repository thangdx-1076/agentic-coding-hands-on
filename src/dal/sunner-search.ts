import "server-only";

/**
 * Server-side recipient search for the "Viết Kudo" compose dialog
 * (F009_KudosWriteModal, C21 recipient combobox / C27 `@`-mention
 * suggestions). Reads through the SAME SECURITY DEFINER view
 * `public.profile_cards` (migration `0005`) that `src/dal/profile-cards.ts`
 * reads for `/profile` — but that file is F006's territory and stays
 * untouched (clarifications.md "Nguồn dữ liệu người nhận"): this is a
 * separate list/search read, not the existing single-id lookup.
 *
 * `public.users` is FORCE RLS own-row only (`0001_users_table.sql:55-59`),
 * so a search across every Sunner cannot query it directly — `profile_cards`
 * is the one view that exposes a cross-Sunner, `authenticated`-only read,
 * and exposes exactly `(id, full_name, avatar_url, department)`.
 *
 * `department` joined that list in migration `0020`, for the dropdown's
 * third line; that migration's header sets out why it is not the widening
 * SEC_004 bars (it is already public to `anon` via `kudos_cards`, on the
 * public /kudos board). Never widen the `select()` below any further —
 * `email`/`role`/`locale` and the timestamps remain off limits.
 *
 * The Supabase client is always INJECTED by the caller (never created
 * here), matching every other DAL read in this codebase. Fails open to
 * `[]` on any Supabase error, a null result, or a thrown exception — a
 * search hiccup should render "no results", never crash the compose
 * dialog. Never logs `query`: an empty catch keeps a caller's search text
 * out of any log line.
 */

export type SunnerSuggestion = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  /** Rendered as the third line of each recipient-dropdown row. Nullable:
   * `users.department` is only backfilled for seeded Sunners, so a real
   * sign-in has none until someone sets it. */
  department: string | null;
};

type SunnerRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
};

type SunnerSearchResult = { data: SunnerRow[] | null; error: unknown };

/**
 * The exact `select()` query string `searchSunners` issues, kept as a
 * literal type (not widened to `string`) for the same reason
 * `AwardColumns`/`ProfileCardColumns` are: the real `@supabase/postgrest-js`
 * builder parses the selected columns at the TYPE level against this
 * literal to infer the row shape.
 */
type SunnerSearchColumns = "id,full_name,avatar_url,department";

const SUNNER_SEARCH_COLUMNS: SunnerSearchColumns =
  "id,full_name,avatar_url,department";

const DEFAULT_LIMIT = 8;

/** Escapes Postgres `ilike` metacharacters (`%`, `_`) and the escape
 * character itself (`\`) in user-typed search text before it is
 * interpolated into an `ilike` pattern — otherwise a Sunner searching for a
 * literal `%` or `_` in a name would have it match "anything"/"any single
 * character" instead. Postgres's default `LIKE`/`ILIKE` escape character is
 * `\`, so prefixing each of these three characters with `\` is sufficient;
 * no `ESCAPE` clause needs to be passed through `.ilike()`. */
const ILIKE_METACHARACTERS = /[\\%_]/g;

function escapeIlikePattern(value: string): string {
  return value.replace(ILIKE_METACHARACTERS, "\\$&");
}

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from("profile_cards").select(columns)
 * .ilike("full_name", pattern).order("full_name", { ascending: true })
 * .limit(count)`. Deliberately narrower than `SupabaseClient` so a caller
 * (and this file's own test) can stub it without matching the full SDK
 * surface. `.limit()` is typed as `PromiseLike` (not `Promise`) on purpose:
 * the real postgrest builder is a thenable without `catch`/`finally`, so a
 * `Promise` here would force every caller to wrap the SDK in an adapter.
 */
export type SunnerSearchClient = {
  from: (table: "profile_cards") => {
    select: (columns: SunnerSearchColumns) => {
      ilike: (
        column: "full_name",
        pattern: string,
      ) => {
        order: (
          column: "full_name",
          opts: { ascending: true },
        ) => {
          limit: (count: number) => PromiseLike<SunnerSearchResult>;
        };
      };
    };
  };
};

/**
 * Searches `profile_cards` by (case-insensitive, substring) `full_name`
 * match, ordered alphabetically and capped at `limit`. Returns `[]`
 * WITHOUT touching the client for a query that trims to fewer than 1
 * character (AD-6) — there is nothing meaningful to search for, and this
 * also keeps an empty compose-dialog field from firing a query on every
 * keystroke of a debounce warm-up.
 *
 * Fails open to `[]` on any Supabase error, a null result, or a thrown
 * exception — never throws.
 */
export async function searchSunners(
  client: SunnerSearchClient,
  query: string,
  { limit = DEFAULT_LIMIT }: { limit?: number } = {},
): Promise<SunnerSuggestion[]> {
  const trimmed = typeof query === "string" ? query.trim() : "";
  if (trimmed.length < 1) {
    return [];
  }

  try {
    const pattern = `%${escapeIlikePattern(trimmed)}%`;
    const { data, error } = await client
      .from("profile_cards")
      .select(SUNNER_SEARCH_COLUMNS)
      .ilike("full_name", pattern)
      .order("full_name", { ascending: true })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      department: row.department,
    }));
  } catch {
    return [];
  }
}
