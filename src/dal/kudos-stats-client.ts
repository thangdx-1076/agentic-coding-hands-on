import "server-only";

import type { KudosStatsClient } from "./kudos-stats";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getKudosStats` consumes (`from("kudos").select("heart_count")
 * .eq(column, …)`).
 *
 * Why a shim instead of passing the client straight through: the SDK's
 * builder types are generic enough that structurally comparing the whole
 * client against `KudosStatsClient` fails with TS2589 ("type
 * instantiation is excessively deep"). Re-issuing the chain through
 * explicitly typed arrows keeps the comparison shallow while TypeScript
 * still verifies the final `eq()` result shape — no `as unknown as`
 * escape hatch, mirroring `profile-cards-client.ts`/`kudo-hearts-client.ts`.
 */
export function toKudosStatsClient(
  supabase: ServerSupabaseClient,
): KudosStatsClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) =>
          supabase.from(table).select(columns).eq(column, value),
      }),
    }),
  };
}
