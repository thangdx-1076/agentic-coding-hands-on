"use server";

import { searchSunners as searchSunnerProfiles } from "@/dal/sunner-search";
import type { SunnerSuggestion } from "@/dal/sunner-search";
import { toSunnerSearchClient } from "@/dal/sunner-search-client";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action ceiling on `query`: a Server Action is a real HTTP endpoint
 * once compiled, so a direct POST that skips the generated client wrapper
 * could send an arbitrarily long string. Capped BEFORE it ever reaches the
 * DAL's `ilike` pattern, regardless of what a well-behaved caller (the
 * recipient combobox, debounced) would ever type.
 */
const MAX_QUERY_LENGTH = 128;

/** Matches `searchSunners`'s (the DAL's) own default — kept explicit here
 * so this action's contract does not silently drift if the DAL's default
 * ever changes. */
const SUGGESTION_LIMIT = 8;

export type SearchSunnersResult = SunnerSuggestion[];

/**
 * Server Action backing the recipient combobox and `@`-mention suggestions
 * in the "Viết Kudo" compose dialog (F009_KudosWriteModal, C21/C27) —
 * both features share this one source (clarifications.md "Nguồn dữ liệu
 * người nhận"). Read-only: deliberately does NOT `revalidatePath`, same
 * reasoning as `load-more-kudos.ts` — nothing this reads is a cached page
 * that needs invalidating.
 *
 * Re-derives the caller from the server session rather than trusting any
 * client-supplied auth state, then short-circuits to `[]` when there is no
 * signed-in user. `profile_cards` is `GRANT SELECT TO authenticated` only
 * (migration `0005_profile_cards_view.sql:70`), so an anonymous caller
 * would get nothing back from Postgres regardless — this check just avoids
 * the round-trip and makes that intended behavior (no Sunner directory
 * leak to a logged-out visitor) explicit rather than incidental.
 *
 * Returns a bare `SunnerSuggestion[]` rather than a discriminated union
 * (unlike the write action `toggleKudoHeart`): this is a read, and
 * "nothing matched" / "not signed in" / "a Supabase error occurred" are all
 * the same observable outcome for a search box — an empty suggestion list —
 * matching `loadMoreKudos`'s bare-array read-action shape.
 */
export async function searchSunners(
  query: string,
): Promise<SearchSunnersResult> {
  if (typeof query !== "string") {
    return [];
  }

  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (trimmed.length < 1) {
    return [];
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    return await searchSunnerProfiles(toSunnerSearchClient(supabase), trimmed, {
      limit: SUGGESTION_LIMIT,
    });
  } catch {
    return [];
  }
}
