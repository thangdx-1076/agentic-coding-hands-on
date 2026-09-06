import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Reads the current session's user for every Server Component that only
 * needs "who is signed in", never a raw client. Wraps `createClient()` +
 * `supabase.auth.getUser()` and fails OPEN to `null` on any error (a
 * Supabase outage must never crash a page, only make it render as
 * anonymous) — the same fail-open shape every caller below already had
 * before this DAL module existed. `(protected)/layout.tsx` is what turns a
 * `null` into an actual redirect; this function never redirects itself.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user ?? null;
  } catch {
    return null;
  }
}
