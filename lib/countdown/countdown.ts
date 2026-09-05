/**
 * Pure countdown calculation (ALG-001). No React, no timers, no `Date.now()`
 * call of its own — every value that matters (the parsed target, "now") is
 * passed in, so this module is 100%-coverable without mocking a clock.
 *
 * `EVENT_START_AT` is a server-only env var the caller reads and hands to
 * `parseTargetDate` — an absent or malformed value must never throw here
 * (BR-004): the countdown degrades to a fixed zero display instead of
 * crashing the Server Component that renders it.
 */

/** Parses an untrusted ISO-8601 string into a `Date`, or `null` if absent/invalid. */
export function parseTargetDate(iso?: string | null): Date | null {
  if (!iso) {
    return null;
  }

  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type RemainingTime = {
  days: number;
  hours: number;
  minutes: number;
  /** True once `nowMs` has reached or passed `target`. */
  reached: boolean;
};

/**
 * Days/hours/minutes left between `target` and `nowMs`, floored to the
 * minute and clamped at zero — never negative once the target has passed.
 */
export function remaining(target: Date, nowMs: number): RemainingTime {
  const totalMin = Math.floor(Math.max(0, target.getTime() - nowMs) / 60_000);

  return {
    days: Math.floor(totalMin / 1440),
    hours: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60,
    reached: target.getTime() <= nowMs,
  };
}

/**
 * Zero-pads to a minimum of 2 digits. Days ≥100 render all 3 (4, ...)
 * digits unchanged — this only ever pads up, never truncates.
 */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
