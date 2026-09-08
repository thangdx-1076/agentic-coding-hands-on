"use server";

import { openSecretBox, type SecretBoxBadgeKey } from "@/dal/secret-box";
import { toSecretBoxClient } from "@/dal/secret-box-client";
import { createClient } from "@/lib/supabase/server";

export type OpenSecretBoxResult =
  | { ok: true; badgeKey: SecretBoxBadgeKey; unopened: number }
  | { ok: false; reason: "no_boxes_left" | "unauthenticated" | "unknown" };

/**
 * Opens one Secret Box for the CURRENT server session (F000_SecretBoxModal,
 * BR-002, FR-601). Takes NO parameters — identity and entitlement are both
 * resolved server-side, first by `createClient()`'s session cookie, then
 * again inside `open_secret_box()`'s own `auth.uid()` (migration `0011`).
 * There is no client-supplied `userId`/`badgeKey` surface to bypass.
 *
 * `openSecretBox` (the DAL) only ever resolves `{ok:false}` for the two
 * outcomes the RPC itself names (`no_boxes_left`, `unauthenticated`);
 * everything else — a malformed RPC response, an unrecognized Postgres
 * error, `createClient()` itself failing — throws, and this action's
 * `try/catch` is the single place that downgrades ANY of those to a typed
 * `{ ok: false, reason: "unknown" }` instead of crashing the caller.
 *
 * Deliberately does NOT `revalidatePath` (D-P04, unlike `toggleKudoHeart`):
 * `/kudos`'s server tree renders `secretBoxUnopened` from `getKudosStats`,
 * and revalidating here would re-run that render mid-dialog, remounting
 * `SecretBoxLauncher` and unmounting the open `<dialog>` out from under the
 * user. The client instead holds the returned `unopened` count itself.
 */
export async function openSecretBoxAction(): Promise<OpenSecretBoxResult> {
  try {
    const supabase = await createClient();
    return await openSecretBox(toSecretBoxClient(supabase));
  } catch {
    return { ok: false, reason: "unknown" };
  }
}
