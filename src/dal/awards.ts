import "server-only";

/**
 * Server-side read for `/awards` (F004_AwardSystemPage's public award
 * category content), mirroring `src/dal/users.ts`'s shape 1:1: the Supabase
 * client is always INJECTED by the caller (never created here), and every
 * failure mode — a Supabase error, a null result set, or a thrown exception
 * — fails OPEN to `[]` rather than throwing. `/awards` is a public page
 * (BR-001, no auth guard); an empty array only ever renders the screen's
 * empty-state, never a 500 or a redirect.
 */

export type AwardPrizeValue = { amount: string; note: string };

export type Award = {
  slug: string;
  title: string;
  description: string;
  quantityValue: string;
  quantityUnit: string;
  prizeValues: AwardPrizeValue[];
};

type AwardRow = {
  slug: string;
  title: string;
  description: string;
  quantity_value: string;
  quantity_unit: string;
  prize_values: AwardPrizeValue[];
};

type AwardsListResult = { data: AwardRow[] | null; error: unknown };

/**
 * The exact `select()` query string `getAwards` issues, kept as a literal
 * type (not widened to `string`) on purpose: the real `@supabase/postgrest-js`
 * builder parses the selected columns at the TYPE level against the query
 * string's literal value to infer the row shape. A widened `string` param
 * defeats that parsing and the builder falls back to an opaque error type,
 * which is what actually surfaced as a TS2322 here — not a hypothetical.
 */
type AwardColumns =
  "slug,title,description,quantity_value,quantity_unit,prize_values";

const AWARD_COLUMNS: AwardColumns =
  "slug,title,description,quantity_value,quantity_unit,prize_values";

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from("awards").select(columns).eq("locale", value)
 * .order("sort_order", { ascending: true })`. Deliberately narrower than
 * `SupabaseClient` so a caller (and this file's own test) can stub it
 * without matching the full SDK surface. `.order()` is typed as
 * `PromiseLike` (not `Promise`) on purpose: the real postgrest builder is a
 * thenable without `catch`/`finally`, so a `Promise` here would force every
 * caller to wrap the SDK in an adapter.
 */
export type AwardsClient = {
  from: (table: "awards") => {
    select: (columns: AwardColumns) => {
      eq: (
        column: "locale",
        value: string,
      ) => {
        order: (
          column: "sort_order",
          opts: { ascending: true },
        ) => PromiseLike<AwardsListResult>;
      };
    };
  };
};

/**
 * Resolves the award categories for `locale`, ordered by `sort_order`
 * ascending, mapped from the DB's snake_case rows to the camelCase `Award`
 * shape the UI consumes. Fails open to `[]` on any Supabase error, a null
 * result, or a thrown exception — never throws.
 */
export async function getAwards(
  supabase: AwardsClient,
  locale: string,
): Promise<Award[]> {
  try {
    const { data, error } = await supabase
      .from("awards")
      .select(AWARD_COLUMNS)
      .eq("locale", locale)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      slug: row.slug,
      title: row.title,
      description: row.description,
      quantityValue: row.quantity_value,
      quantityUnit: row.quantity_unit,
      // `prize_values` is jsonb, so the column type guarantees valid JSON but
      // NOT that it is an array. A non-array value would sail through this
      // mapping untouched and only blow up later, at `prizeValues.map(...)`
      // inside the Server Component render — a 500 on the exact page this
      // DAL's fail-open contract exists to keep serving. Coerce here, where
      // the shape is still ours to control.
      prizeValues: Array.isArray(row.prize_values) ? row.prize_values : [],
    }));
  } catch {
    return [];
  }
}
