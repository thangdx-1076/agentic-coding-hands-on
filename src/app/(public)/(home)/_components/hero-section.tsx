import Image from "next/image";
import type { ReactNode } from "react";

import type { HomeCopy } from "../_shared/home-copy";

import { EventInfo } from "./event-info";

export type HeroSectionProps = {
  copy: HomeCopy;
  /**
   * Countdown slot (mm:2167:9035 mms_B1_Countdown time) — rendered
   * verbatim. `HeroSection` owns layout only; it does not compute
   * days/hours/minutes or "Coming soon" visibility — see
   * `countdown-tiles.tsx` and clarifications.md § Hero/Countdown (that
   * state belongs to a later integration phase's `countdown-timer.tsx`,
   * which wraps `CountdownTiles` together with the "Coming soon" label).
   */
  countdown: ReactNode;
};

/**
 * Hero content block (mm:2167:9031 Frame487) — the page's single `<h1>`
 * logo, the countdown slot, and event info. The logo image scales down
 * below `lg` (`w-[220px]` mobile → `w-[320px]` `sm:` → the pixel-perfect
 * `451px` at `lg:`) purely to avoid horizontal overflow on narrow
 * viewports (Phase 4 polish); it stays untouched at `lg:` and up. Excludes
 * the CTA row
 * (mm:2167:9062, a separate exported `CtaButtons`) and the outer
 * Bìa/1224px-container centering (mm:2167:9030), both owned by the later
 * page-composition phase per code-rules § 3 (containered layout).
 *
 * The `<h1>` carries a `sr-only` text node alongside the logo image: an
 * `<img alt="...">` gives the element an accessible NAME (screen readers,
 * `getByRole('heading', {name})`) but contributes nothing to DOM
 * `textContent`, which is what the E2E contract's
 * `locator('h1').toContainText('ROOT FURTHER')` (TC ID-0, ID-12/13) reads.
 * The image keeps its own `alt` too so it never regresses to a bare
 * decorative image if the sr-only span is ever removed.
 */
export function HeroSection({ copy, countdown }: HeroSectionProps) {
  return (
    /* mm:2167:9031 */
    <div className="flex w-full flex-col items-start gap-10">
      {/* mm:2167:9032 */}
      <h1>
        <span className="sr-only">{copy.hero.heading}</span>
        {/* mm:2788:12911 */}
        <Image
          src="/home/Root_Further_Logo.png"
          // Decorative here: the sr-only span above already gives the <h1>
          // its accessible name — a non-empty alt would announce it twice.
          alt=""
          width={451}
          height={200}
          preload
          className="h-auto w-[220px] sm:w-[320px] lg:w-[451px]"
        />
      </h1>
      {/* mm:2167:9034 */}
      <div className="flex w-full flex-col items-start gap-4">
        {/* mm:2167:9035 */}
        <div className="flex w-full flex-col items-start gap-4">
          {countdown}
        </div>
        <EventInfo copy={copy} />
      </div>
    </div>
  );
}
