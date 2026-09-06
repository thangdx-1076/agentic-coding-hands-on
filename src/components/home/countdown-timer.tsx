"use client";

import { CountdownTiles } from "./countdown-tiles";

import { useCountdown } from "@/hooks/use-countdown";

export type CountdownTimerLabels = {
  days: string;
  hours: string;
  minutes: string;
  comingSoon: string;
};

export type CountdownTimerProps = {
  /** Server-validated ISO-8601 target, or `null` when `EVENT_START_AT` is missing/invalid (BR-004). */
  targetIso: string | null;
  /**
   * `Date.now()` captured by the server at render time — seeds the first
   * client tick so SSR and hydration render byte-identical output (no
   * `suppressHydrationWarning` needed, see clarifications.md § Hero/Countdown).
   */
  initialNowMs: number;
  /**
   * Localized labels from `HomeCopy.hero` (next-intl `home.hero.*`). DAYS /
   * HOURS / MINUTES and "Coming soon" happen to render identically in both
   * locales by design, but they still flow from `copy` rather than being
   * hardcoded here, per FR-002 ("copy lấy từ next-intl, cả vi lẫn en").
   */
  labels: CountdownTimerLabels;
};

/**
 * Thin client wrapper around `useCountdown` (phase 03) + Track A's
 * `CountdownTiles`. `HomeClient` passes an instance of this component as
 * the `countdown` `ReactNode` slot on `HomeScreen` so the 1s tick only
 * re-renders this subtree — never the 6 award cards or the footer
 * (plan.md § Integration contract).
 *
 * Renders the same DOM shape as `HomeScreen`'s own default slot
 * (`[role="timer"]` wrapping 3 tiles + a "Coming soon" paragraph), except
 * "Coming soon" visibility now follows the live `showComingSoon` flag
 * instead of always being on (BR-003/BR-004).
 */
export function CountdownTimer({
  targetIso,
  initialNowMs,
  labels,
}: CountdownTimerProps) {
  const { days, hours, minutes, showComingSoon } = useCountdown(
    targetIso,
    initialNowMs,
  );

  return (
    <>
      {showComingSoon && (
        // mm:2167:9036
        <p className="font-montserrat text-2xl leading-8 font-bold text-white">
          {labels.comingSoon}
        </p>
      )}
      <CountdownTiles
        days={days}
        hours={hours}
        minutes={minutes}
        daysLabel={labels.days}
        hoursLabel={labels.hours}
        minutesLabel={labels.minutes}
      />
    </>
  );
}
