"use client";

import type { ReactNode, SVGProps } from "react";

export type KudosCarouselNavPlacement = "card" | "counter";

export type KudosCarouselNavProps = {
  /** `"card"` = the pair beside the KUDO card row (`B.2.1`/`B.2.2`, 60px
   * icon). `"counter"` = the pair beside the `x/N` page label (`B.5.1`/
   * `B.5.3`, 28px icon). Spec: both placements read/write ONE state, so
   * `kudos-highlight-carousel.tsx` renders this component twice rather
   * than forking a second button implementation (phase-09 Key Insight). */
  placement: KudosCarouselNavPlacement;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  /** `"counter"` only — lets the caller sandwich `KudosSlideCounter`
   * between the two buttons without this file importing that component. */
  children?: ReactNode;
};

const TEST_ID: Record<
  KudosCarouselNavPlacement,
  { prev: string; next: string }
> = {
  card: { prev: "kudos-carousel-prev", next: "kudos-carousel-next" },
  counter: { prev: "kudos-slide-nav-prev", next: "kudos-slide-nav-next" },
};

const HIT_SIZE: Record<KudosCarouselNavPlacement, number> = {
  card: 80,
  counter: 48,
};

const ICON_SIZE: Record<KudosCarouselNavPlacement, number> = {
  card: 60,
  counter: 28,
};

/**
 * mm:B.2.1_Button lùi (`2940:13470`, left edge, Frame 528) / mm:B.2.2_Button
 * tiến (`2940:13468`, right edge, Frame 527) / mm:B.5.1 (`2940:13472`) /
 * mm:B.5.3 (`2940:13474`). The CSV's `itemName`/`nameTrans` columns disagree
 * on which of B.2.1/B.2.2 is prev vs next; resolved by their `description`
 * Function text + actual X position (`2940:13470` sits at the LEFT edge and
 * its description disables at "page 1" → prev; `2940:13468` sits at the
 * RIGHT edge and disables at "page 5" → next) — consistent with each other
 * and with B.5's left-to-right prev/counter/next child order.
 *
 * `disabled` is the real `<button disabled>` DOM property, not a dimmed
 * class, so C12's `toBeDisabled()`/`toBeEnabled()` read it directly.
 */
export function KudosCarouselNav({
  placement,
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  children,
}: KudosCarouselNavProps) {
  const testId = TEST_ID[placement];
  const hit = HIT_SIZE[placement];
  const icon = ICON_SIZE[placement];
  const buttonClassName =
    "flex shrink-0 items-center justify-center rounded bg-transparent disabled:cursor-not-allowed disabled:opacity-30";

  const prevButton = (
    // mm:2940:13470 (card) / mm:2940:13472 (counter)
    <button
      type="button"
      data-testid={testId.prev}
      aria-label={prevLabel}
      disabled={!canPrev}
      onClick={onPrev}
      style={{ width: hit, height: hit }}
      className={buttonClassName}
    >
      <IconArrowLeft
        aria-hidden="true"
        style={{ width: icon, height: icon }}
        className="text-white"
      />
    </button>
  );

  const nextButton = (
    // mm:2940:13468 (card) / mm:2940:13474 (counter)
    <button
      type="button"
      data-testid={testId.next}
      aria-label={nextLabel}
      disabled={!canNext}
      onClick={onNext}
      style={{ width: hit, height: hit }}
      className={buttonClassName}
    >
      <IconArrowRight
        aria-hidden="true"
        style={{ width: icon, height: icon }}
        className="text-white"
      />
    </button>
  );

  if (placement === "counter") {
    return (
      // mm:2940:13471
      <div className="flex items-center justify-center gap-8">
        {prevButton}
        {children}
        {nextButton}
      </div>
    );
  }

  return (
    <>
      {/* mm:2940:13469 (Frame 528) — fade toward the page background */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-100 items-center pl-20"
        style={{
          background:
            "linear-gradient(90deg, #00101A 50%, rgba(255, 255, 255, 0) 100%)",
        }}
      >
        <div className="pointer-events-auto">{prevButton}</div>
      </div>
      {/* mm:2940:13467 (Frame 527) — mirrored fade on the right edge */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-100 items-center justify-end pr-10"
        style={{
          background:
            "linear-gradient(270deg, #00101A 50%, rgba(255, 255, 255, 0) 100%)",
        }}
      >
        <div className="pointer-events-auto">{nextButton}</div>
      </div>
    </>
  );
}

/** `MM_MEDIA_Left` (`I2940:13470;186:1420`) inlined with `currentColor`
 * (code-rules 2a) — `public/kudos/icon-arrow-left.svg` bakes `fill="white"`,
 * which an `<img>` could never recolor if this ever needs a second theme. */
function IconArrowLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15.41 16.58L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.58Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** `MM_MEDIA_Right` (`I2940:13468;186:1420`) — same reasoning as
 * `IconArrowLeft` above. */
function IconArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8.57959 16.4777L13.1596 11.8977L8.57959 7.3077L9.98959 5.89771L15.9896 11.8977L9.98959 17.8977L8.57959 16.4777Z"
        fill="currentColor"
      />
    </svg>
  );
}
