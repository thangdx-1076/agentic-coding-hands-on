"use client";

import { useCountdown } from "../../_hooks/use-countdown";
import { CountdownTiles } from "../../_components/countdown-tiles";

export type PrelaunchCountdownLabels = {
  days: string;
  hours: string;
  minutes: string;
};

export type PrelaunchCountdownProps = {
  /** Server-validated ISO-8601 target, or `null` when `EVENT_START_AT` is missing/invalid (BR-004). */
  targetIso: string | null;
  /**
   * `Date.now()` captured by the server at render time — seeds the first
   * client tick so SSR and hydration render byte-identical output (no
   * `suppressHydrationWarning` needed, mirrors `(home)/countdown-timer.tsx`).
   */
  initialNowMs: number;
  /** `home.hero.{days,hours,minutes}` — reused verbatim (clarifications.md § Copy tiêu đề). */
  labels: PrelaunchCountdownLabels;
};

/**
 * Thin client wrapper around `useCountdown` + the shared `CountdownTiles`
 * (mm:2268:35138 "Time", identical sub-tree to the homepage hero's
 * `mm:2167:9037`). Unlike `(home)/countdown-timer.tsx`, this screen has no
 * "Coming soon" element (spec.md § 3 lists exactly 9 elements, none of them
 * that copy) — so `showComingSoon` from `useCountdown` is intentionally
 * ignored here, not threaded through.
 */
export function PrelaunchCountdown({
  targetIso,
  initialNowMs,
  labels,
}: PrelaunchCountdownProps) {
  const { days, hours, minutes } = useCountdown(targetIso, initialNowMs);

  return (
    <CountdownTiles
      days={days}
      hours={hours}
      minutes={minutes}
      daysLabel={labels.days}
      hoursLabel={labels.hours}
      minutesLabel={labels.minutes}
    />
  );
}
