import { KudosFilterMenu, type KudosFilterState } from "./kudos-filter-menu";

export type KudosFilterBarProps = {
  eyebrow: string;
  heading: string;
  hashtag: KudosFilterState;
  department: KudosFilterState;
};

/**
 * HIGHLIGHT KUDOS section header (mm:2940:13452 `mms_B.1_header`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ) —
 * eyebrow + divider + title, plus the two filter dropdowns (B.1.1/B.1.2).
 * The carousel itself (cards, prev/next, pagination) is a sibling section
 * owned by a different phase; this component only owns the header row.
 */
export function KudosFilterBar({
  eyebrow,
  heading,
  hashtag,
  department,
}: KudosFilterBarProps) {
  return (
    // mm:2940:13452
    <div className="flex w-full flex-col gap-4 px-6 sm:px-12 lg:px-36">
      {/* mm:2940:13454 */}
      <p className="font-montserrat text-2xl leading-8 font-bold text-white">
        {eyebrow}
      </p>
      {/* mm:2940:13455 */}
      <div className="h-px w-full bg-login-divider" />
      {/* mm:2940:13456 */}
      <div className="flex flex-wrap items-center justify-between gap-8">
        {/* mm:2940:13457 */}
        <h2 className="font-montserrat text-[57px] leading-[64px] font-bold tracking-[-0.25px] text-login-button">
          {heading}
        </h2>
        {/* mm:2940:13458 */}
        <div className="flex items-center gap-2">
          <KudosFilterMenu
            {...hashtag}
            testId="kudos-filter-hashtag"
            optionTestId="kudos-filter-hashtag-option"
          />
          <KudosFilterMenu
            {...department}
            testId="kudos-filter-department"
            optionTestId="kudos-filter-department-option"
          />
        </div>
      </div>
    </div>
  );
}
