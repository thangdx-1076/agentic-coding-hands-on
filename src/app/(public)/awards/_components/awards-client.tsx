"use client";

import type { AwardsCopy } from "../_shared/awards-copy";
import { useSelectLocale } from "../../../_hooks/use-select-locale";
import type { SiteViewer } from "../../../_shared/site-chrome";

import { AwardsScreen } from "./awards-screen";

import type { Award } from "@/dal/awards";
import type { AppLocale } from "@/lib/i18n/locale";

export type AwardsClientProps = {
  copy: AwardsCopy;
  locale: AppLocale;
  viewer: SiteViewer | null;
  awards: Award[];
  logoutAction: () => void | Promise<void>;
};

/**
 * Client boundary of `/awards` — mirrors `(home)/_components/home-client.tsx`
 * line for line. `onSelectLocale` is a plain function prop that can't cross
 * a Server Component render, so this is where `useSelectLocale` (phase 03)
 * gets wired to `AwardsScreen`. `AwardCategoryNav` is already its own client
 * leaf inside `AwardsScreen` — this boundary only wraps, it never absorbs
 * that logic.
 */
export function AwardsClient({
  copy,
  locale,
  viewer,
  awards,
  logoutAction,
}: AwardsClientProps) {
  const { handleSelectLocale } = useSelectLocale();

  return (
    <AwardsScreen
      awards={awards}
      copy={copy}
      locale={locale}
      viewer={viewer}
      onSelectLocale={handleSelectLocale}
      logoutAction={logoutAction}
    />
  );
}
