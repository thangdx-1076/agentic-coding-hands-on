import Image from "next/image";

import {
  BADGE_SLOTS,
  BADGE_SLOT_SIZE,
  type BadgeSlotSlug,
} from "../_shared/profile-copy";

export type BadgeCollectionProps = {
  /** Self/other verbatim split (GUI_003) — resolved by the caller. */
  heading: string;
  /** Always empty today — drives every slot's `data-locked`. A slug appearing
   * here later unlocks that slot without reshaping this component. */
  unlockedSlugs?: BadgeSlotSlug[];
};

/**
 * 6 fixed badge slots (mm:362:5064 `mms_A.3_Huy Hiệu` → mm:362:5065 "Danh
 * hiệu", one centered row) with the collection heading BELOW the row in DOM
 * order (mm:3053:10052 sits after the row — y=624 vs the row's y=528-592 in
 * the design) — FR-201, C4. Every slot renders `data-locked="true"` while
 * `unlockedSlugs` stays empty (GUI_002); `heading` carries the self/other
 * split (GUI_003, verbatim — no name interpolation for the "other" case).
 */
export function BadgeCollection({
  heading,
  unlockedSlugs = [],
}: BadgeCollectionProps) {
  return (
    // mm:362:5064
    <div className="flex flex-col items-center gap-6">
      {/* mm:362:5065 */}
      <ul className="flex flex-wrap items-center justify-center gap-4">
        {BADGE_SLOTS.map((slot) => {
          const locked = !unlockedSlugs.includes(slot.slug);
          return (
            // mm:362:5066 (template shared by 362:5067-362:5071)
            <li
              key={slot.slug}
              data-locked={locked ? "true" : "false"}
              className="flex h-16 w-20 items-center justify-center"
            >
              {/* mm:I362:5066;3053:10046 */}
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#323231]">
                <Image
                  src={slot.asset}
                  alt=""
                  aria-hidden="true"
                  width={slot.width}
                  height={slot.height}
                  sizes={`${BADGE_SLOT_SIZE}px`}
                  className={locked ? "grayscale" : undefined}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {/* mm:3053:10052 */}
      <h2 className="font-montserrat text-center text-[22px] leading-7 font-bold text-white">
        {heading}
      </h2>
    </div>
  );
}
