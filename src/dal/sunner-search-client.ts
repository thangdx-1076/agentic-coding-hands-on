import "server-only";

import type { SunnerSearchClient } from "./sunner-search";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `searchSunners` consumes (`from("profile_cards").select(columns)
 * .ilike("full_name", …).order("full_name", { ascending: true })
 * .limit(…)`).
 *
 * Why a shim instead of passing the client straight through: the SDK's
 * builder types are generic enough that structurally comparing the whole
 * client against `SunnerSearchClient` fails with TS2589 ("type
 * instantiation is excessively deep"). Re-issuing the chain through
 * explicitly typed arrows keeps the comparison shallow while TypeScript
 * still verifies the final `limit()` result shape — no `as unknown as`
 * escape hatch, mirroring `toProfileCardsClient`/`toAwardsClient`.
 */
export function toSunnerSearchClient(
  supabase: ServerSupabaseClient,
): SunnerSearchClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        ilike: (column, pattern) => ({
          order: (column2, opts) => ({
            limit: (count) =>
              supabase
                .from(table)
                .select(columns)
                .ilike(column, pattern)
                .order(column2, opts)
                .limit(count),
          }),
        }),
      }),
    }),
  };
}
