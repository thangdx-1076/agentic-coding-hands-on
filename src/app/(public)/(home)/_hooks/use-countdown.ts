"use client";

import { useEffect, useMemo, useState } from "react";

import { pad2, parseTargetDate, remaining } from "../_utils/countdown";

export type CountdownDisplay = {
  /** Zero-padded (≥2 digits, 3 once days reaches 100). */
  days: string;
  /** Zero-padded, 00-23 in practice. */
  hours: string;
  /** Zero-padded, 00-59 in practice. */
  minutes: string;
  /** True while the target is unknown (`null`) or still in the future. */
  showComingSoon: boolean;
};

const ZERO_TILES = { days: "00", hours: "00", minutes: "00" } as const;

/**
 * Ticking countdown display, seeded from a server-computed timestamp so the
 * first client render is byte-identical to SSR output (no
 * `suppressHydrationWarning` needed — see clarifications.md § Hero/Countdown).
 *
 * `initialNowMs` MUST come from the caller (the server's `Date.now()` at
 * render time) — this hook never calls `Date.now()` itself before the first
 * `setInterval` tick.
 *
 * `targetIso === null` (missing/invalid `EVENT_START_AT`, BR-004) renders the
 * zero tiles but keeps `showComingSoon: true` — the event date is simply
 * unknown, not reached.
 */
export function useCountdown(
  targetIso: string | null,
  initialNowMs: number,
): CountdownDisplay {
  const target = useMemo(() => parseTargetDate(targetIso), [targetIso]);
  const [nowMs, setNowMs] = useState(initialNowMs);

  useEffect(() => {
    if (!target) {
      return;
    }

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => clearInterval(intervalId);
  }, [target]);

  if (!target) {
    return { ...ZERO_TILES, showComingSoon: true };
  }

  const { days, hours, minutes, reached } = remaining(target, nowMs);
  return {
    days: pad2(days),
    hours: pad2(hours),
    minutes: pad2(minutes),
    showComingSoon: !reached,
  };
}
