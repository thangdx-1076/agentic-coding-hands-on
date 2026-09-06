import type { UsersRoleClient } from "@/lib/auth/get-user-role";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one query slice
 * `getUserRole` consumes (`from("users").select("role").eq("id", …)
 * .maybeSingle()`).
 *
 * Why a shim instead of passing the client straight through: the SDK's
 * builder types are generic enough that structurally comparing the whole
 * client against `UsersRoleClient` fails with TS2589 ("type instantiation
 * is excessively deep"). Re-issuing the chain through explicitly typed
 * arrows keeps the comparison shallow while TypeScript still verifies the
 * final `maybeSingle()` result shape — no `as unknown as` escape hatch.
 */
export function toUsersRoleClient(
  supabase: ServerSupabaseClient,
): UsersRoleClient {
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
