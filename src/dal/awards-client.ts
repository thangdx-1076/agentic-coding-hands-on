import "server-only";

import type { AwardsClient } from "./awards";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getAwards` consumes (`from("awards").select(...).eq("locale", …)
 * .order("sort_order", { ascending: true })`).
 *
 * Why a shim instead of passing the client straight through: the SDK's
 * builder types are generic enough that structurally comparing the whole
 * client against `AwardsClient` fails with TS2589 ("type instantiation is
 * excessively deep"). Re-issuing the chain through explicitly typed arrows
 * keeps the comparison shallow while TypeScript still verifies the final
 * `order()` result shape — no `as unknown as` escape hatch.
 */
export function toAwardsClient(supabase: ServerSupabaseClient): AwardsClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          order: (column2, opts) =>
            supabase
              .from(table)
              .select(columns)
              .eq(column, value)
              .order(column2, opts),
        }),
      }),
    }),
  };
}
