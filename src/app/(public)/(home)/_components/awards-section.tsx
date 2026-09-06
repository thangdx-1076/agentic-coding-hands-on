import type { HomeCopy } from "../_shared/home-copy";

import { AwardCard } from "./award-card";

export type AwardsSectionProps = {
  copy: HomeCopy;
};

/**
 * "Hệ thống giải thưởng" section (mm:2167:9068). Renders the
 * `mms_C1_Header` caption/heading/divider, then the 6-card award grid in
 * the FIXED order `copy.awards.items` already carries (top-talent →
 * top-project → top-project-leader → best-manager →
 * signature-2025-creator → mvp) — do not reorder.
 *
 * Grid: `grid-cols-2 lg:grid-cols-3` per clarifications.md § Nội dung tĩnh
 * (desktop ≥1024px = 3 cols, tablet+mobile <1024px = 2 cols; the Figma
 * instance name says "1-column mobile" but spec + TC ID-15/16 win as
 * content acceptance — never collapses to 1 column). Gap values read from
 * `get_node` on `2167:9074` ("Frame 491", row auto-layout `gap: 80px`) are
 * the pixel-perfect `lg:` baseline; Phase 4 polish tightens the gap below
 * `lg` (`16px`/`32px` mobile → `32px`/`48px` `sm:`) so the still-2-column
 * grid stays comfortable on narrow viewports without shrinking to 1 column.
 *
 * The 6 "Chi tiết" links all reuse `copy.kudos.detailLabel` ("Chi tiết") —
 * `home-copy.ts` doesn't carry a separate top-level string for it and this
 * is the exact same label reused verbatim elsewhere on the screen (DRY,
 * no new/duplicated content key).
 */
export function AwardsSection({ copy }: AwardsSectionProps) {
  return (
    // mm:2167:9068
    <section className="mx-auto flex w-full max-w-[1224px] flex-col gap-10 px-6 lg:px-0">
      {/* mm:2167:9069 */}
      <div className="flex w-full flex-col items-start gap-4">
        {/* mm:2167:9070 */}
        <p className="font-montserrat text-2xl leading-8 font-bold text-white">
          {copy.awards.caption}
        </p>
        {/* mm:2167:9071 */}
        <div aria-hidden="true" className="h-px w-full bg-[#2E3940]" />
        {/* mm:2167:9072 */}
        <div>
          {/* mm:2167:9073 */}
          <h2 className="font-montserrat text-4xl leading-tight font-bold tracking-[-0.25px] text-[#FFEA9E] sm:text-5xl lg:text-[57px] lg:leading-[64px]">
            {copy.awards.heading}
          </h2>
        </div>
      </div>
      {/* mm:5005:14974 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3 lg:gap-x-20 lg:gap-y-16">
        {copy.awards.items.map((item) => (
          <AwardCard
            key={item.slug}
            item={item}
            detailLabel={copy.kudos.detailLabel}
          />
        ))}
      </div>
    </section>
  );
}
