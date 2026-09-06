import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client factory (client components only). Reads
 * the publishable key — a drop-in replacement for the legacy anon key,
 * safe to expose via `NEXT_PUBLIC_*` — never the service-role/secret key.
 *
 * The `!` assertions are intentional: these two env vars are required for
 * the app to function at all (auth is the app's only gate), so a missing
 * value should fail loudly at first use rather than be silently
 * swallowed behind an `undefined` client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
