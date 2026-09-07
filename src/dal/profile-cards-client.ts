import "server-only";

import type { ProfileCardsClient } from "./profile-cards";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getProfileCard` consumes (`from("profile_cards").select(columns)
 * .eq("id", …).maybeSingle()`).
 *
 * Why a shim instead of passing the client straight through: the SDK's
 * builder types are generic enough that structurally comparing the whole
 * client against `ProfileCardsClient` fails with TS2589 ("type
 * instantiation is excessively deep"). Re-issuing the chain through
 * explicitly typed arrows keeps the comparison shallow while TypeScript
 * still verifies the final `maybeSingle()` result shape — no
 * `as unknown as` escape hatch.
 */
export function toProfileCardsClient(
  supabase: ServerSupabaseClient,
): ProfileCardsClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          maybeSingle: () =>
            supabase
              .from(table)
              .select(columns)
              .eq(column, value)
              .maybeSingle(),
        }),
      }),
    }),
  };
}
