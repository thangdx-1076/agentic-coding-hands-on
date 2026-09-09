"use server";

import {
  markAllRead,
  markRead,
  type MarkAllReadResult,
  type MarkReadResult,
} from "@/dal/notifications";
import { toNotificationsClient } from "@/dal/notifications-client";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions behind the notifications panel's "mark read"/"mark all
 * read" affordances (F012_NotificationsPanel, technical-spec.md § 4).
 * Both re-derive the caller from the server session — never a client-
 * supplied `userId` — and fail closed to `{ok:false}` on no session,
 * exactly like `openSecretBoxAction`.
 *
 * Deliberately does NOT `revalidatePath` (phase-04 Key Insight 5,
 * following `open-secret-box.ts`'s precedent): revalidating while the
 * popup panel is open would unmount it out from under the user. The panel
 * refetches its own state after a successful call.
 */

export type MarkReadActionResult = { ok: true } | { ok: false };

export async function markReadAction(
  id: string,
): Promise<MarkReadActionResult> {
  if (typeof id !== "string" || id.trim() === "") {
    return { ok: false };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false };
    }

    const result: MarkReadResult = await markRead(
      toNotificationsClient(supabase),
      user.id,
      id,
    );

    return result.ok ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export type MarkAllReadActionResult =
  { ok: true; updated: number } | { ok: false };

export async function markAllReadAction(): Promise<MarkAllReadActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false };
    }

    const result: MarkAllReadResult = await markAllRead(
      toNotificationsClient(supabase),
      user.id,
    );

    return { ok: true, updated: result.updated };
  } catch {
    return { ok: false };
  }
}
