import "server-only";

import type { SecretBoxClient } from "./secret-box";

import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one call
 * `openSecretBox` issues: `.rpc("open_secret_box")`, no arguments.
 *
 * Mirrors `toKudosStatsClient`/`toKudoHeartsClient`'s narrow-shim shape for
 * the same reason (structurally comparing the whole client against a hand
 * -rolled type risks TS2589), even though an RPC call has no
 * `.from().select().eq()` chain to re-issue — this repo's first `.rpc()`
 * call, so there is no prior shim to follow for this exact shape.
 */
export function toSecretBoxClient(
  supabase: ServerSupabaseClient,
): SecretBoxClient {
  return {
    rpc: (fn) => supabase.rpc(fn),
  };
}
