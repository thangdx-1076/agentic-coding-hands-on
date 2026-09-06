"use client";

import type { HomeCopy } from "../_shared/home-copy";
import { useSelectLocale } from "../../_hooks/use-select-locale";

import { HomeScreen } from "./home-screen";
import type { HeaderViewer } from "./header";
import { CountdownTimer } from "./countdown-timer";

import type { AppLocale } from "@/lib/i18n/locale";

export type HomeClientProps = {
  copy: HomeCopy;
  locale: AppLocale;
  viewer: HeaderViewer | null;
  /** Server-validated ISO-8601 target, or `null` (BR-004) — seeds `CountdownTimer`. */
  targetIso: string | null;
  /** Server's `Date.now()` snapshot — seeds `CountdownTimer`'s first client render. */
  initialNowMs: number;
  logoutAction: () => void | Promise<void>;
};

/**
 * Client boundary of `/` — mirrors `app/login/login-client.tsx`. Function
 * props (`onSelectLocale`) can't cross a Server Component render, so this
 * is where `useSelectLocale` (phase 03) gets wired to `HomeScreen`. The
 * countdown itself is a further-nested client component passed through the
 * `countdown` `ReactNode` slot (plan.md § Integration contract) so its 1s
 * tick never re-renders this tree.
 */
export function HomeClient({
  copy,
  locale,
  viewer,
  targetIso,
  initialNowMs,
  logoutAction,
}: HomeClientProps) {
  const { handleSelectLocale } = useSelectLocale();

  return (
    <HomeScreen
      copy={copy}
      locale={locale}
      viewer={viewer}
      unreadCount={0}
      onSelectLocale={handleSelectLocale}
      logoutAction={logoutAction}
      countdown={
        <CountdownTimer
          targetIso={targetIso}
          initialNowMs={initialNowMs}
          labels={{
            days: copy.hero.days,
            hours: copy.hero.hours,
            minutes: copy.hero.minutes,
            comingSoon: copy.hero.comingSoon,
          }}
        />
      }
    />
  );
}
