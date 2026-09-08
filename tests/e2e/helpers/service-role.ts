import { execFileSync } from "child_process";

/**
 * Resolves the local Supabase service-role key for `@local-db` cleanup.
 *
 * Why this exists: cleanup used to depend on the runner having exported
 * `SUPABASE_SERVICE_ROLE_KEY` by hand. Nobody did, so every `afterEach`
 * took its "missing key" branch and left its rows behind — measured
 * 2026-09-09 at 2 499 test users, 412 kudos and 88 secret-box openings
 * against a seed of 12, which is what finally broke `kudos.spec` C19
 * (it asserts a single scroll reaches the end of a seed-sized feed).
 *
 * So the key is now DERIVED rather than required: env first, then the
 * local CLI, which prints it from the running stack. Memoized because
 * `supabase status` costs ~1s and every spec's `afterEach` wants it.
 *
 * Local-only by construction. CI never runs the `@local-db` tier and has
 * no Supabase CLI, so the lookup fails there and callers fall back to
 * skipping cleanup — which is correct, there is nothing to clean.
 */
let cached: string | null | undefined;

export function getServiceRoleKey(): string | null {
  if (cached !== undefined) {
    return cached;
  }

  const fromEnv =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (fromEnv) {
    cached = fromEnv;
    return cached;
  }

  try {
    // argv array, no shell — nothing here is interpolated from test input.
    const out = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    });
    const line = out.split("\n").find((l) => l.startsWith("SERVICE_ROLE_KEY="));
    cached = line
      ? line.slice("SERVICE_ROLE_KEY=".length).trim().replace(/^"|"$/g, "")
      : null;
  } catch {
    cached = null;
  }

  return cached;
}

/** Base URL of the local Supabase REST/auth API. */
export function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || "http://127.0.0.1:55321";
}

/**
 * Deletes one test user and everything hanging off them, using the service
 * role. Best-effort by design — a failed cleanup must never turn a passing
 * assertion red — but it reports what went wrong instead of swallowing it,
 * because a silent no-op is exactly how the pile above accumulated.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const key = getServiceRoleKey();
  if (!key) {
    console.warn(
      `[cleanup] no service-role key (env or \`supabase status\`) — test user ${userId} left in the local DB`,
    );
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const url = getSupabaseUrl();

  // Rows first, then the auth user: the FKs point at the user, so deleting
  // the user first is what leaves orphans behind.
  for (const path of [
    `/rest/v1/kudo_hearts?user_id=eq.${userId}`,
    `/rest/v1/kudos?sender_id=eq.${userId}`,
    `/rest/v1/kudos?receiver_id=eq.${userId}`,
    `/rest/v1/secret_box_openings?user_id=eq.${userId}`,
  ]) {
    try {
      await fetch(`${url}${path}`, { method: "DELETE", headers });
    } catch (error) {
      console.warn(`[cleanup] ${path} failed:`, error);
    }
  }

  try {
    const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      console.warn(
        `[cleanup] admin delete of ${userId} returned ${res.status} — user left behind`,
      );
    }
  } catch (error) {
    console.warn(`[cleanup] admin delete of ${userId} failed:`, error);
  }
}
