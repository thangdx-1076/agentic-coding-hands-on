import "server-only";

/**
 * Server-side read of "which kudos has the current viewer already hearted"
 * (F008_KudosHeartReaction). This is the ONLY module in the codebase that
 * reads `kudo_hearts` — `src/dal/kudos.ts` deliberately never references it
 * (plan.md AD-2), so `/kudos` (F007) keeps working, and stays testable,
 * whether or not migration `0007` has been applied.
 *
 * Mirrors `users-role-client.ts`'s shape: the Supabase client is always
 * INJECTED (never created here), and any Supabase error, a null result, or
 * a thrown exception fails OPEN to an empty `Set` — `/kudos` has no auth
 * guard, so a Supabase hiccup here must only render every heart button as
 * "not hearted yet", never crash the board.
 */

type HeartRow = { kudo_id: string };

type InResult = { data: HeartRow[] | null; error: unknown };

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from("kudo_hearts").select("kudo_id").eq("user_id", userId)
 * .in("kudo_id", kudoIds)`. Deliberately narrower than `SupabaseClient` so a
 * caller (and a test) can stub it without matching the full SDK surface.
 */
export type KudoHeartsClient = {
  from: (table: "kudo_hearts") => {
    select: (columns: "kudo_id") => {
      eq: (
        column: "user_id",
        value: string,
      ) => {
        in: (column: "kudo_id", values: string[]) => PromiseLike<InResult>;
      };
    };
  };
};

/**
 * Resolves the subset of `kudoIds` the given viewer has already hearted.
 * Short-circuits to an empty `Set` without touching the client when there is
 * no viewer or nothing to check — an anonymous visitor never has a hearted
 * kudo, and an empty `kudoIds` list has nothing to look up.
 */
export async function getViewerHeartedKudoIds(
  client: KudoHeartsClient,
  userId: string,
  kudoIds: string[],
): Promise<Set<string>> {
  if (!userId || kudoIds.length === 0) {
    return new Set();
  }

  try {
    const { data, error } = await client
      .from("kudo_hearts")
      .select("kudo_id")
      .eq("user_id", userId)
      .in("kudo_id", kudoIds);

    if (error || !data) {
      return new Set();
    }

    return new Set(data.map((row) => row.kudo_id));
  } catch {
    return new Set();
  }
}
