import Link from "next/link";

import { IconUpRight } from "../../_components/icons/icon-up-right";

export type CtaButtonsProps = {
  aboutAwardsLabel: string;
  aboutKudosLabel: string;
  aboutAwardsHref?: string;
  aboutKudosHref?: string;
};

/**
 * Hero CTA row (mm:2167:9062 mms_B3_Call-To-Action). Per clarifications.md
 * § Route & điều hướng: "ABOUT AWARDS" → `/awards`, "ABOUT KUDOS" → `/kudos`
 * — real routes, no placeholder pages.
 *
 * Phase 4 polish (additive, no redesign of the pixel-perfect rest states):
 * - Spec B3.1/B3.2 cross-reference each other's states 1-1 ("ABOUT AWARDS"
 *   normal looks like B3.2, "ABOUT KUDOS" hover looks like B3.1) — i.e. both
 *   buttons share ONE hover target: the filled gold variant. "ABOUT AWARDS"
 *   is already rendered filled at rest (the pixel-perfect baseline), so its
 *   hover only needs a subtle darken; "ABOUT KUDOS" (outlined at rest)
 *   transitions to that same filled gold look on hover, via `group-hover`
 *   on its two `currentColor` children.
 * - Both stack to full width below `sm` (flex-col) and sit side by side at
 *   `sm:` and up (flex-row), matching their fixed pixel-perfect widths.
 */
export function CtaButtons({
  aboutAwardsLabel,
  aboutKudosLabel,
  aboutAwardsHref = "/awards",
  aboutKudosHref = "/kudos",
}: CtaButtonsProps) {
  return (
    /* mm:2167:9062 */
    <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-start sm:gap-10">
      {/* mm:2167:9063 */}
      <Link
        href={aboutAwardsHref}
        className="flex w-full items-center gap-2 rounded-lg bg-login-button px-6 py-4 transition-colors duration-200 ease-out hover:bg-login-button/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-login-button focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none sm:w-[276px]"
      >
        {/* mm:I2167:9063;186:1935 */}
        <span className="flex flex-1 items-center gap-1">
          {/* mm:I2167:9063;186:1568 */}
          <span className="font-montserrat text-center text-[22px] leading-7 font-bold text-login-button-text">
            {aboutAwardsLabel}
          </span>
        </span>
        {/* mm:I2167:9063;186:1766 */}
        <IconUpRight className="h-6 w-6 shrink-0 text-login-button-text" />
      </Link>
      {/* mm:2167:9064 */}
      <Link
        href={aboutKudosHref}
        className="group flex w-full items-center gap-2 whitespace-nowrap rounded-lg border border-[#998C5F] bg-[#FFEA9E]/10 px-6 py-4 transition-colors duration-200 ease-out hover:border-transparent hover:bg-login-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none sm:w-auto"
      >
        {/* mm:I2167:9064;186:2758 */}
        <span className="flex flex-1 items-center gap-1">
          {/* mm:I2167:9064;186:2760 */}
          <span className="font-montserrat text-center text-[22px] leading-7 font-bold text-white transition-colors duration-200 ease-out group-hover:text-login-button-text motion-reduce:transition-none">
            {aboutKudosLabel}
          </span>
        </span>
        {/* mm:I2167:9064;186:2761 */}
        <IconUpRight className="h-6 w-6 shrink-0 text-white transition-colors duration-200 ease-out group-hover:text-login-button-text motion-reduce:transition-none" />
      </Link>
    </div>
  );
}
