import "server-only";

/**
 * Server-side read for `/profile` (F006_ProfilePage). Reads through the
 * SECURITY DEFINER view `public.profile_cards` (migration `0005`), which
 * exposes exactly `(id, full_name, avatar_url)` — never `email`/`role`/
 * `locale` — and is the ONE data source for both the self and the other-user
 * (`?id=`) branches of `/profile` (see technical-spec.md § 3.1). The
 * Supabase client is always INJECTED by the caller (never created here),
 * matching `src/dal/awards.ts` and `src/dal/users.ts`.
 *
 * Fails open to `null` on any Supabase error, a missing row, or a thrown
 * exception — never throws. Unlike `getAwards` (a list, fails open to `[]`),
 * a single profile fails open to `null` because the caller (`ProfilePage`)
 * turns `null` into `notFound()`: a transient network error and a
 * genuinely-nonexistent profile render the SAME observable outcome, and
 * that is acceptable because both are "nothing to show", not an
 * authorization decision.
 */

export type ProfileCard = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
};

type ProfileCardRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type ProfileCardResult = { data: ProfileCardRow | null; error: unknown };

/**
 * The exact `select()` query string `getProfileCard` issues, kept as a
 * literal type (not widened to `string`) on purpose: the real
 * `@supabase/postgrest-js` builder parses the selected columns at the TYPE
 * level against the query string's literal value to infer the row shape. A
 * widened `string` param defeats that parsing (see `src/dal/awards.ts`'s
 * `AwardColumns` for the TS2322 this avoids).
 */
type ProfileCardColumns = "id,full_name,avatar_url";

const PROFILE_CARD_COLUMNS: ProfileCardColumns = "id,full_name,avatar_url";

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from("profile_cards").select(columns).eq("id", value)
 * .maybeSingle()`. Deliberately narrower than `SupabaseClient` so a caller
 * (and this file's own test) can stub it without matching the full SDK
 * surface. `.maybeSingle()` is typed as `PromiseLike` (not `Promise`) on
 * purpose: the real postgrest builder is a thenable without
 * `catch`/`finally`, so a `Promise` here would force every caller to wrap
 * the SDK in an adapter.
 */
export type ProfileCardsClient = {
  from: (table: "profile_cards") => {
    select: (columns: ProfileCardColumns) => {
      eq: (
        column: "id",
        value: string,
      ) => { maybeSingle: () => PromiseLike<ProfileCardResult> };
    };
  };
};

/**
 * Resolves the `profile_cards` row for `id`, mapped from the DB's
 * snake_case row to the camelCase `ProfileCard` shape the UI consumes.
 * Fails open to `null` on any Supabase error, a missing row, or a thrown
 * exception — never throws.
 */
export async function getProfileCard(
  supabase: ProfileCardsClient,
  id: string,
): Promise<ProfileCard | null> {
  try {
    const { data, error } = await supabase
      .from("profile_cards")
      .select(PROFILE_CARD_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
    };
  } catch {
    return null;
  }
}
