import "server-only";

import type { KudoHeartsClient } from "./kudo-hearts";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getViewerHeartedKudoIds` consumes (`from("kudo_hearts")
 * .select("kudo_id").eq("user_id", …).in("kudo_id", …)`).
 *
 * Why a shim instead of passing the client straight through: the SDK's
 * builder types are generic enough that structurally comparing the whole
 * client against `KudoHeartsClient` fails with TS2589 ("type instantiation
 * is excessively deep"). Re-issuing the chain through explicitly typed
 * arrows keeps the comparison shallow while TypeScript still verifies the
 * final `in()` result shape — no `as unknown as` escape hatch, mirroring
 * `users-role-client.ts`.
 */
export function toKudoHeartsClient(
  supabase: ServerSupabaseClient,
): KudoHeartsClient {
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          in: (inColumn, values) =>
            supabase
              .from(table)
              .select(columns)
              .eq(column, value)
              .in(inColumn, values),
        }),
      }),
    }),
  };
}
