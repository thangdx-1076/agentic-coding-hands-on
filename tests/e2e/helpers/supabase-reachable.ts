/**
 * Test helper: detect whether a Supabase instance is reachable.
 * Used to conditionally skip tests that require a live Supabase endpoint.
 *
 * The skip condition at both call sites is:
 *   `test.skip(!process.env.CI && isReachable)`
 *
 * Read that carefully — it skips when Supabase is UP, which is the opposite of
 * the usual pattern. These tests assert outage behaviour (PERM002 fail-open on
 * /login, PERM003 fail-closed on /todo), so a reachable Supabase is what makes
 * them meaningless, not a missing one.
 *
 * - In CI (`process.env.CI` set): NEVER skips. The runner cannot reach the
 *   local Supabase instance, so the outage path is exactly what executes — and
 *   a silent skip here would be the one failure mode this suite must not have.
 * - On a dev machine: skips when Supabase is up (the assertion could not hold),
 *   runs when it is down.
 */
export async function supabaseReachable(supabaseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3-second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}
