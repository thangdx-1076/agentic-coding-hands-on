import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { logoutAction } from "../../_actions/logout";

import { ProfileClient } from "./_components/profile-client";
import { buildProfileCopy } from "./_shared/build-profile-copy";
import { parseProfileId } from "./_utils/parse-profile-id";

import { getCurrentUser } from "@/dal/auth";
import { getProfileCard } from "@/dal/profile-cards";
import { toProfileCardsClient } from "@/dal/profile-cards-client";
import { getUserRole } from "@/dal/users";
import { toUsersRoleClient } from "@/dal/users-role-client";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/constants/routes";
import { normalizeLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Hồ sơ",
};

type ProfilePageSearchParams = {
  id?: string | string[];
};

type ProfilePageProps = {
  searchParams: Promise<ProfilePageSearchParams>;
};

/**
 * `/profile` route entry point (mm:362:5037, technical-spec.md § 3.1/§ 5.3).
 * The single merge point for phases 03–06: resolves `?id=` through
 * `parseProfileId` (phase 06), reads the target row through the phase-03
 * DAL, builds localized copy (phase 04's `profile`/`home`/`login`
 * namespaces), and hands the rest to `ProfileClient` (phase 05's
 * `ProfileScreen` can't accept function props across a Server Component
 * render).
 *
 * `(protected)/layout.tsx` is the AUTHORITATIVE session gate — an anonymous
 * visitor never reaches this module. Re-reading `getCurrentUser()` here is
 * an accepted extra round-trip (same precedent as `TodoPage`) needed to
 * resolve `viewer.id` for `parseProfileId` and to build the header's
 * `SiteViewer`. A `null` user is handled defensively with
 * `redirect(ROUTES.LOGIN)`, never a non-null assertion.
 *
 * `parseProfileId`'s 4-branch union is switched on exhaustively — a
 * `default: notFound()` doubles as both the `"reject"` branch and a
 * compile-time guard if the union ever grows without this file being
 * updated. Self and other share the SAME `getProfileCard` call (one id
 * variable, one query) so both branches get identical null-handling: a
 * missing row — whether the row was deleted or the id never existed — is
 * `notFound()` either way (BR-003/D011, SEC_004's "same shape" guarantee).
 *
 * No `try/catch` wraps the switch: `notFound()`/`redirect()` work by
 * throwing, and a wide `try` here would swallow that throw and render a
 * blank page instead of a 404/redirect. `getProfileCard` already fails
 * open to `null` on its own, so nothing here needs a catch.
 */
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    redirect(ROUTES.LOGIN);
  }

  const { id: rawId } = await searchParams;
  const resolution = parseProfileId(rawId, viewer.id);

  let targetId: string;
  let isSelf: boolean;
  switch (resolution.kind) {
    case "reject":
      notFound();
    case "canonical":
      redirect(ROUTES.PROFILE);
    case "self":
      targetId = viewer.id;
      isSelf = true;
      break;
    case "other":
      targetId = resolution.id;
      isSelf = false;
      break;
    default:
      notFound();
  }

  const supabase = await createClient();
  const profile = await getProfileCard(
    toProfileCardsClient(supabase),
    targetId,
  );
  if (!profile) {
    notFound();
  }

  // Header/account-menu role read — same helper `getViewer()` uses for
  // `/`/`/awards`, kept consistent here so an admin's own header never
  // loses the "Trang quản trị" link just because `/profile` is protected.
  const role = await getUserRole(toUsersRoleClient(supabase), viewer.id);

  const rawLocale = await getLocale();
  const locale = normalizeLocale(rawLocale);
  const tHome = await getTranslations("home");
  const tProfile = await getTranslations("profile");
  const tLogin = await getTranslations("login");

  const copy = buildProfileCopy(tHome, tProfile, tLogin, locale);

  return (
    <ProfileClient
      copy={copy}
      profile={profile}
      isSelf={isSelf}
      viewer={{ email: viewer.email ?? "", isAdmin: role === "admin" }}
      locale={locale}
      logoutAction={logoutAction}
    />
  );
}
