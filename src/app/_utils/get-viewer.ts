import "server-only";

import type { SiteViewer } from "../_shared/site-chrome";

import { getCurrentUser } from "@/dal/auth";
import { toUsersRoleClient } from "@/dal/users-role-client";
import { getUserRole } from "@/dal/users";
import { createClient } from "@/lib/supabase/server";

/**
 * Session + role read for the header (FR-003/FR-601/INT-001/BR-002).
 * Hoisted out of `(home)/page.tsx` (phase-02) — `/awards` needs the exact
 * same read, and a route segment must never import another segment's
 * `page.tsx`-local helper. Wrapped in try/catch and fails OPEN to `null` —
 * like `/login`, unlike `/todo`: a Supabase outage must never block a
 * public page from rendering, it just renders as if nobody were signed
 * in. The session read goes through `src/dal/auth.ts`; a second,
 * page-local `createClient()` stays here only for the `toUsersRoleClient`
 * role read.
 */
export async function getViewer(): Promise<SiteViewer | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = await createClient();
    const role = await getUserRole(toUsersRoleClient(supabase), user.id);
    return { email: user.email ?? "", isAdmin: role === "admin" };
  } catch {
    return null;
  }
}
