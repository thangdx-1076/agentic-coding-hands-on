import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PrelaunchScreen } from "./_components/prelaunch-screen";
import { PrelaunchCountdown } from "./_components/prelaunch-countdown";

import { parseTargetDate } from "@/utils/countdown";

export const metadata: Metadata = {
  title: "SAA 2025",
};

/**
 * `/prelaunch` public entry point (mm:2268:35127 · FR-101/FR-601). Mirrors
 * `(home)/page.tsx`'s shape: a Server Component reads the countdown target
 * once, seeds the first client tick, then hands the ticking concern to
 * `PrelaunchCountdown` — a further-nested client component (plan.md §
 * Integration contract) so the 1s tick never re-renders `PrelaunchScreen`.
 *
 * PUBLIC by design (clarifications.md § Route & điều hướng, FR-601): no
 * auth guard, no session read — this route is not yet in `config.matcher`
 * (that's phase 04), so it renders directly for now.
 */
export default async function PrelaunchPage() {
  const targetIso = resolveTargetIso();
  const initialNowMs = getInitialNowMs();

  const t = await getTranslations("prelaunch");
  const tHome = await getTranslations("home");

  return (
    <PrelaunchScreen
      title={t("title")}
      countdown={
        <PrelaunchCountdown
          targetIso={targetIso}
          initialNowMs={initialNowMs}
          labels={{
            days: tHome("hero.days"),
            hours: tHome("hero.hours"),
            minutes: tHome("hero.minutes"),
          }}
        />
      }
    />
  );
}

/**
 * Validates `EVENT_START_AT` (server-only, BR-003/BR-004) into the ISO
 * string `useCountdown` expects — same pattern as `(home)/page.tsx`'s
 * `resolveTargetIso`, duplicated here rather than shared (phase-03's Key
 * Insight 3: the real DRY already lives in `parseTargetDate`; this 8-line
 * env read isn't worth extracting and would require touching
 * `(home)/page.tsx`, owned by phase 01).
 */
function resolveTargetIso(): string | null {
  const raw = process.env.EVENT_START_AT;
  const target = parseTargetDate(raw);

  if (!target && raw) {
    console.warn(
      `[prelaunch] Invalid EVENT_START_AT env value "${raw}" — countdown falls back to 00/00/00.`,
    );
  }

  return target ? target.toISOString() : null;
}

/**
 * `PrelaunchCountdown`'s `useCountdown` seeds its first client tick from
 * this value so SSR and hydration render byte-identical output — captured
 * once per request, here, and never again on the client's first render.
 */
function getInitialNowMs(): number {
  return Date.now();
}
