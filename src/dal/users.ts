import "server-only";

/**
 * Server-side role read for the homepage account menu (FR-003 / FR-601 /
 * INT-001 / BR-002). `role` here is a display label, NOT an authorization
 * gate — any error or missing row fails OPEN to `"member"`. A real
 * authorization boundary for `/admin` belongs to a later feature; do not
 * reuse this helper as a security check.
 *
 * The Supabase client is always INJECTED by the caller (never created
 * here) so this module stays a plain, synchronously-testable `lib/`
 * function per the repo's layering rule — no `@supabase/ssr` boundary to
 * mock in this file's own test.
 */

export type UserRole = "member" | "admin";

type MaybeSingleResult = {
  data: { role?: string | null } | null;
  error: unknown;
};

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.from("users").select("role").eq("id", userId).maybeSingle()`.
 * Deliberately narrower than `SupabaseClient` so a caller (and a test) can
 * stub it without matching the full SDK surface. `maybeSingle()` is typed as
 * `PromiseLike` (not `Promise`) on purpose: the real postgrest builder is a
 * thenable without `catch`/`finally`, so a `Promise` here would force every
 * caller to wrap the SDK in an adapter.
 */
export type UsersRoleClient = {
  from: (table: "users") => {
    select: (columns: "role") => {
      eq: (
        column: "id",
        value: string,
      ) => { maybeSingle: () => PromiseLike<MaybeSingleResult> };
    };
  };
};

function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "member" || value === "admin";
}

/**
 * Resolves the caller's `public.users.role`. Fails open to `"member"` on
 * any error, missing row, or unrecognized role value — never throws.
 */
export async function getUserRole(
  supabase: UsersRoleClient,
  userId: string,
): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data || !isUserRole(data.role)) {
      return "member";
    }

    return data.role;
  } catch {
    return "member";
  }
}
