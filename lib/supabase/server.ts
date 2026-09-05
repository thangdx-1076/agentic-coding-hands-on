import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client factory for Server Components, Server
 * Actions, and Route Handlers. Next 16 `cookies()` is async, so this
 * factory is async too — every call site must `await createClient()`.
 *
 * `setAll` is wrapped in try/catch per the official `@supabase/ssr`
 * pattern: a Server Component's `cookies()` store is read-only and
 * throws on `.set()`. That's expected there (session refresh instead
 * happens one layer up, in `proxy.ts`) — silently ignoring the error is
 * correct, not a swallowed bug, so no `catch` body is needed beyond
 * preventing the render from crashing.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render (no response to
            // write cookies onto) — `proxy.ts` already refreshes the
            // session cookie for that request, so this is a no-op, not
            // a failure.
          }
        },
      },
    },
  );
}
