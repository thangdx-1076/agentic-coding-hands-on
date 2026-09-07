"use client";

import { useState } from "react";

export type CarouselIndex = {
  index: number;
  canPrev: boolean;
  canNext: boolean;
  next: () => void;
  prev: () => void;
};

/**
 * Owns the Highlight carousel's slide index (BR-002/BR-003/SM-001) so both
 * button pairs — `kudos-carousel-nav` rendered next to the card
 * (`B.2.1`/`B.2.2`) and next to the page counter (`B.5.1`/`B.5.3`) — and
 * the slide counter all read the exact same state. Track A imports this
 * hook rather than keeping its own `useState` for the index.
 *
 * `count` changing resets `index` back to `0` (BR-003: choosing a new
 * hashtag/department filter always returns the carousel to slide 1). The
 * reset compares `count` against its previous value DURING render (the
 * React-documented "adjusting state when a prop changes" pattern) instead
 * of inside a `useEffect`, so there is no extra render where a stale
 * `index` briefly points past the new, possibly shorter, `items` array.
 */
export function useCarouselIndex(count: number): CarouselIndex {
  const [index, setIndex] = useState(0);
  const [observedCount, setObservedCount] = useState(count);

  if (count !== observedCount) {
    setObservedCount(count);
    setIndex(0);
  }

  const canPrev = index > 0;
  const canNext = index < count - 1;

  function next(): void {
    setIndex((current) => (current < count - 1 ? current + 1 : current));
  }

  function prev(): void {
    setIndex((current) => (current > 0 ? current - 1 : current));
  }

  return { index, canPrev, canNext, next, prev };
}
