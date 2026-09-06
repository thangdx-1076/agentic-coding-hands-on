/**
 * Pure scroll-spy slug picker (BR-003). Takes a minimal, hand-rolled shape
 * instead of the real `IntersectionObserverEntry` — jsdom has no
 * `IntersectionObserver`, so keeping this layer's input plain-object
 * literals is what makes it testable synchronously, without a DOM. The hook
 * (`../_hooks/use-award-category-nav.ts`) is the only place that translates
 * real entries into this shape.
 */
export type SpyEntry = {
  /** The observed section's `id`, which doubles as its nav slug. */
  slug: string;
  isIntersecting: boolean;
  intersectionRatio: number;
  /** `boundingClientRect.top` at the moment of the callback. */
  top: number;
};

/**
 * Picks which slug should be active given the latest batch of intersection
 * entries.
 *
 * - No entry intersecting → keep `current` (a scroll gap between sections
 *   must not blank the nav).
 * - One or more intersecting → prefer the one closest to the top of the
 *   viewport among those already at or past it (`top >= 0`); if none has
 *   scrolled that far yet, fall back to the entry with the largest
 *   intersection ratio.
 */
export function pickActiveSlug(
  entries: readonly SpyEntry[],
  current: string,
): string {
  const intersecting = entries.filter((entry) => entry.isIntersecting);
  if (intersecting.length === 0) {
    return current;
  }

  const aboveOrAtTop = intersecting.filter((entry) => entry.top >= 0);
  if (aboveOrAtTop.length > 0) {
    return aboveOrAtTop.reduce((closest, entry) =>
      entry.top < closest.top ? entry : closest,
    ).slug;
  }

  return intersecting.reduce((best, entry) =>
    entry.intersectionRatio > best.intersectionRatio ? entry : best,
  ).slug;
}
