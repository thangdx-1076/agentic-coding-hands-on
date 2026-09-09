import "server-only";

import type { SiteViewer } from "../_shared/site-chrome";

import { getCurrentUser } from "@/dal/auth";
import { toUsersRoleClient } from "@/dal/users-role-client";
import { getUserRole } from "@/dal/users";
import { getUnreadCount } from "@/dal/notifications";
import { toNotificationsClient } from "@/dal/notifications-client";
import { createClient } from "@/lib/supabase/server";

/**
 * Session + role + unread-notification-count read for the header
 * (FR-003/FR-601/INT-001/BR-002, phase-07). Hoisted out of `(home)/page.tsx`
 * (phase-02) — `/awards` and `/kudos` need the exact same read, and a route
 * segment must never import another segment's `page.tsx`-local helper.
 * Wrapped in try/catch and fails OPEN to `null` — like `/login`, unlike
 * `/todo`: a Supabase outage must never block a public page from rendering,
 * it just renders as if nobody were signed in. The session read goes
 * through `src/dal/auth.ts`; a second, page-local `createClient()` stays
 * here for the `toUsersRoleClient`/`toNotificationsClient` reads.
 *
 * `getUnreadCount` is called inside this SAME `try` rather than its own
 * nested one — it already fails open to `0` internally
 * (`src/dal/notifications.ts`), so nothing here needs a second safety net,
 * and an unexpected throw past that fail-open still degrades to the
 * existing "anonymous viewer" fallback instead of a half-built object.
 */
export async function getViewer(): Promise<SiteViewer | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = await createClient();
    const role = await getUserRole(toUsersRoleClient(supabase), user.id);
    const unreadCount = await getUnreadCount(
      toNotificationsClient(supabase),
      user.id,
    );
    return { email: user.email ?? "", isAdmin: role === "admin", unreadCount };
  } catch {
    return null;
  }
}
