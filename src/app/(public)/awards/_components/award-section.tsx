import Image from "next/image";

import { AWARD_NAME_GRAPHIC } from "../../_shared/award-name-graphics";

import { IconDiamond } from "./icons/icon-diamond";
import { IconLicense } from "./icons/icon-license";
import { IconTarget } from "./icons/icon-target";

import type { Award } from "@/dal/awards";

export type AwardSectionProps = {
  award: Award;
  /** `true` for the 2nd/4th/6th award (index 1,3,5) — image right, content left. */
  reversed: boolean;
  copy: { quantityLabel: string; prizeLabel: string };
};

/**
 * One award category block (mm:313:8467 `mms_D.1_Top talent` and its 5
 * siblings `313:8468..8510`, all sharing this same template — only content +
 * the per-slug name graphic differ, per `get_node` cross-check recorded in
 * clarifications.md § Đính chính). `id={award.slug}` is the scroll target
 * `AwardCategoryNav` (`../_hooks/use-award-category-nav.ts`) scrolls to and
 * observes; `scroll-mt-24` compensates for `SiteHeader`'s `sticky top-0` so
 * the title doesn't land hidden behind it after a scroll.
 *
 * Image: TWO stacked `<img>` exactly like `(home)/_components/award-card.tsx`
 * — the shared gold ring `/home/Award_BG.png` plus the per-slug name PNG from
 * `AWARD_NAME_GRAPHIC`. No single flattened asset exists (`Picture-Award` is
 * a Figma vector, `list_media_nodes` returns no MM_MEDIA row for it), so
 * composing 2 images is the only way to reproduce the design — TC ID-7's
 * `toHaveCount(1)` is a known-wrong assertion the tester corrects in phase 07
 * (clarifications.md / phase-05 plan § Key Insights); this component must
 * NOT drop the name graphic to make that count pass.
 */
export function AwardSection({ award, reversed, copy }: AwardSectionProps) {
  const nameGraphic = AWARD_NAME_GRAPHIC[award.slug];

  return (
    // mm:313:8467 (template shared by 313:8467..8510)
    <section
      id={award.slug}
      className={`scroll-mt-24 flex flex-col gap-10 py-10 first:pt-0 lg:flex-row lg:items-start lg:gap-20 ${
        reversed ? "lg:flex-row-reverse" : ""
      }`}
    >
      {/* mm:I313:8467;214:2525 */}
      <div className="relative mx-auto aspect-square w-full max-w-[336px] shrink-0 overflow-hidden rounded-3xl border border-[#FFEA9E] mix-blend-screen shadow-[0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] lg:mx-0 lg:w-[336px]">
        {/* mm:I313:8467;214:2525;81:2442 */}
        <Image
          src="/home/Award_BG.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 336px, 90vw"
          className="object-cover"
        />
        {/* mm:I313:8467;214:2525;214:666 */}
        {nameGraphic ? (
          <div
            className="absolute top-1/2 left-1/2 w-[65%] -translate-x-1/2 -translate-y-1/2"
            style={{
              aspectRatio: `${nameGraphic.width} / ${nameGraphic.height}`,
            }}
          >
            <Image
              src={nameGraphic.src}
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 1024px) 220px, 60vw"
              className="object-contain"
            />
          </div>
        ) : null}
      </div>

      {/* mm:I313:8467;214:2526 */}
      <div className="flex w-full max-w-[640px] flex-col gap-8">
        {/* mm:I313:8467;214:2527 */}
        <div className="flex flex-col gap-6">
          {/* mm:I313:8467;214:2528 */}
          <h2 className="font-montserrat flex items-center gap-4 text-2xl leading-8 font-bold text-login-button">
            {/* mm:I313:8467;214:2529 */}
            <IconTarget className="h-6 w-6 shrink-0" />
            {award.title}
          </h2>
          {/* mm:I313:8467;214:2531 */}
          <p className="font-montserrat text-justify text-base leading-6 font-bold tracking-[0.5px] whitespace-pre-line text-white">
            {award.description}
          </p>
        </div>

        {/* mm:I313:8467;214:2532 */}
        <div className="h-px w-full bg-login-divider" />

        {/* mm:I313:8467;214:2534 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* mm:I313:8467;214:2535 */}
            <IconDiamond className="h-6 w-6 shrink-0 text-login-button" />
            {/* mm:I313:8467;214:2536 */}
            <span className="font-montserrat text-2xl leading-8 font-bold text-login-button">
              {copy.quantityLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            {/* mm:I313:8467;214:2538 */}
            <span className="font-montserrat text-[36px] leading-[44px] font-bold text-white">
              {award.quantityValue}
            </span>
            {/* mm:I313:8467;214:3532 */}
            <span className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
              {award.quantityUnit}
            </span>
          </div>
        </div>

        {/* mm:I313:8467;214:2539 */}
        <div className="h-px w-full bg-login-divider" />

        {/* mm:I313:8467;214:2540 */}
        <div className="flex flex-col gap-4">
          {/* mm:I313:8467;214:2542 */}
          <div className="flex items-center gap-4">
            {/* mm:I313:8467;214:2543 */}
            <IconLicense className="h-6 w-6 shrink-0 text-login-button" />
            {/* mm:I313:8467;214:2544 */}
            <span className="font-montserrat text-2xl leading-8 font-bold text-login-button">
              {copy.prizeLabel}
            </span>
          </div>
          {award.prizeValues.map((prizeValue, index) => (
            <div
              key={`${award.slug}-prize-${index}`}
              className="flex flex-col gap-1"
            >
              {/* mm:I313:8467;214:2546 */}
              <p className="font-montserrat text-[36px] leading-[44px] font-bold text-white">
                {prizeValue.amount}
              </p>
              {prizeValue.note ? (
                // mm:I313:8467;214:2547
                <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
                  {prizeValue.note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
