import "server-only";

import type { RecentGiftRecipientsClient } from "./recent-gift-recipients";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getRecentGiftRecipients` consumes (`from("recent_gift_recipients")
 * .select(columns).order("opened_at", { ascending: false }).limit(…)`).
 *
 * Why a shim instead of passing the client straight through: the SDK's
 * builder types are generic enough that structurally comparing the whole
 * client against `RecentGiftRecipientsClient` fails with TS2589 ("type
 * instantiation is excessively deep"). Re-issuing the chain through
 * explicitly typed arrows keeps the comparison shallow while TypeScript
 * still verifies the final `limit()` result shape — no `as unknown as`
 * escape hatch, mirroring `toSunnerSearchClient`/`toKudoHeartsClient`.
 */
export function toRecentGiftRecipientsClient(
  supabase: ServerSupabaseClient,
): RecentGiftRecipientsClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        order: (column, opts) => ({
          limit: (count) =>
            supabase
              .from(table)
              .select(columns)
              .order(column, opts)
              .limit(count),
        }),
      }),
    }),
  };
}
