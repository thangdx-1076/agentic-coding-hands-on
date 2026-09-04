"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout Server Action bound to the `/todo` page's logout form
 * (FR-603/US004). Always redirects to `/login` afterward, even if
 * `signOut()` itself fails (e.g. session already expired server-side) —
 * the user's intent is to leave the authenticated area either way, and
 * `/login`'s own guard will re-derive the correct state.
 */
export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Best-effort sign-out — proceed to redirect regardless so the user
    // is never stuck on a page that no longer reflects their session.
  }

  redirect("/login");
}
