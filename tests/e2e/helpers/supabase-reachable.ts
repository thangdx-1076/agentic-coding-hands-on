/**
 * Test helper: detect whether a Supabase instance is reachable.
 * Used to conditionally skip tests that require a live Supabase endpoint.
 *
 * The skip condition is: `test.skip(!process.env.CI && !(await supabaseReachable(...)))`
 * This ensures:
 * - In CI (where `process.env.CI` is set), the test ALWAYS runs — even if Supabase is
 *   unreachable. This is intentional: the test exercises the outage-tolerant code path
 *   (fail-open or graceful degrade).
 * - On a dev machine (where `process.env.CI` is undefined), skip if Supabase is down,
 *   run if it's up.
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
