"use server";

import { getKudosBoard } from "@/dal/kudos";
import type { GetKudosBoardOptions, KudosBoard } from "@/dal/kudos";
import { toKudosClient } from "@/dal/kudos-client";
import { createClient } from "@/lib/supabase/server";

/** Matches the `timestamptz` shape `kudos_cards.created_at` outputs. */
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

export type LoadMoreKudosInput = {
  cursor: string;
} & Pick<GetKudosBoardOptions, "hashtag" | "department">;

export type LoadMoreKudosResult = KudosBoard["feed"];

const EMPTY_RESULT: LoadMoreKudosResult = { items: [], nextCursor: null };

/**
 * Loads the next ALL KUDOS feed page for `useInfiniteFeed`
 * (`kudos-feed-sentinel`, C18/C19). A read-only Server Action —
 * deliberately does NOT `revalidatePath`: revalidating would re-run the
 * page's own `getKudosBoard` and hand back page 1 again, wiping out every
 * page already appended to the client-side list. `toggleKudoHeart`
 * (F008) is the opposite case — it writes, so it does revalidate.
 *
 * Boundary check: a Server Action is a real HTTP endpoint once compiled,
 * so `cursor` — a value that round-trips through the browser between
 * calls — does not reliably arrive as the `string` its parameter type
 * promises. It is validated as an ISO timestamp before it ever reaches
 * `getKudosBoard`'s `.lt("created_at", cursor)` filter. This is not an
 * injection defense (`@supabase/postgrest-js` parameterizes every filter
 * value; it never string-concatenates SQL) — it is what lets a malformed
 * cursor fail open to an empty page HERE, instead of surfacing a
 * PostgREST error through `getKudosBoard`'s own fail-open, which would
 * blank out `highlight`/`spotlight` too, not just this one read.
 *
 * Fails open to `{ items: [], nextCursor: null }` on an invalid cursor or
 * any thrown error (Supabase outage, network failure) — `useInfiniteFeed`
 * then simply stops offering more pages instead of the feed erroring out.
 */
export async function loadMoreKudos(
  input: LoadMoreKudosInput,
): Promise<LoadMoreKudosResult> {
  const { cursor, hashtag, department } = input;

  if (!isIsoTimestamp(cursor)) {
    return EMPTY_RESULT;
  }

  try {
    const supabase = await createClient();
    const board = await getKudosBoard(toKudosClient(supabase), {
      cursor,
      hashtag,
      department,
    });
    return board.feed;
  } catch {
    return EMPTY_RESULT;
  }
}

function isIsoTimestamp(value: string): boolean {
  return (
    typeof value === "string" &&
    ISO_TIMESTAMP_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}
