"use client";

import { useSelectLocale } from "../../../_hooks/use-select-locale";
import type { SiteViewer } from "../../../_shared/site-chrome";
import type { ProfileCopy } from "../_shared/profile-copy";

import { ProfileScreen } from "./profile-screen";

import type { ProfileCard } from "@/dal/profile-cards";
import type { AppLocale } from "@/lib/i18n/locale";

export type ProfileClientProps = {
  copy: ProfileCopy;
  profile: ProfileCard;
  isSelf: boolean;
  /** Never null — `/profile` only renders after `(protected)/layout.tsx`'s
   * session gate. */
  viewer: SiteViewer;
  locale: AppLocale;
  logoutAction: () => void | Promise<void>;
};

/**
 * Client boundary of `/profile` — mirrors
 * `/awards/_components/awards-client.tsx` line for line. `onSelectLocale`
 * is a plain function prop that can't cross a Server Component render, so
 * this is where `useSelectLocale` gets wired to `ProfileScreen`.
 * `KudosDirectionSelect` is already its own client leaf inside
 * `ProfileScreen` (phase 05) — this boundary only wraps, it never absorbs
 * that logic.
 */
export function ProfileClient({
  copy,
  profile,
  isSelf,
  viewer,
  locale,
  logoutAction,
}: ProfileClientProps) {
  const { handleSelectLocale } = useSelectLocale();

  return (
    <ProfileScreen
      copy={copy}
      profile={profile}
      isSelf={isSelf}
      viewer={viewer}
      locale={locale}
      unreadCount={0}
      onSelectLocale={handleSelectLocale}
      logoutAction={logoutAction}
    />
  );
}
