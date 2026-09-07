import type { SVGProps } from "react";

export type KudosHeroSearchPillProps = {
  placeholder: string;
  ariaLabel: string;
};

/**
 * Sunner-search pill in the KV band (mm:2940:13450 `Tìm kiếm sunner`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ).
 *
 * Sibling of the compose pill inside `mm:2940:13448 Button chuc nang`
 * (1440×72 at y 408–480): compose is 738 wide at x 144–882, this one is
 * 381 wide at x 914–1295, so the two sit 32px apart on the same row.
 * Both are the SAME Figma component (`componentId 186:2757`), which is why
 * the border/background/radius below match `kudos-compose-pill.tsx` exactly.
 *
 * The placeholder comes from the node's `character`, not its `itemName` —
 * this instance's `itemName` is a stale `"Awards Information Navigation
 * Links"` left over from the component it was copied from, the same trap
 * F005 D003 already recorded. `character` is `"Tìm kiếm profile Sunner"`.
 *
 * Readonly like the compose pill: the Sunner-profile search this opens has
 * no Figma frame in this file, so wiring a handler would either no-op or
 * navigate somewhere that does not exist. Distinct from the Spotlight's own
 * search (`kudos-sunner-search.tsx`, mm:2940:14833), which filters the
 * scatter that is already on screen and IS wired.
 */
export function KudosHeroSearchPill({
  placeholder,
  ariaLabel,
}: KudosHeroSearchPillProps) {
  return (
    // mm:2940:13450
    <div
      data-testid="kudos-hero-search-pill"
      className="flex w-full max-w-[381px] items-center gap-2 rounded-[68px] border border-[#998C5F] bg-[rgba(255,234,158,0.10)] px-4 py-6"
    >
      {/* mm:I2940:13450;186:2758 — gap 16px between icon and label */}
      <div className="flex flex-1 items-center gap-4">
        {/* mm:I2940:13450;186:2759 MM_MEDIA_Search, 24×24 */}
        <IconSearch
          data-testid="kudos-hero-search-icon"
          aria-hidden="true"
          className="h-6 w-6 shrink-0 text-white"
        />
        {/* mm:I2940:13450;186:2760 */}
        <input
          type="text"
          readOnly
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="w-full bg-transparent font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-white placeholder:text-white focus:outline-none"
        />
      </div>
    </div>
  );
}

/**
 * `MM_MEDIA_Search` inlined with `fill="currentColor"` per code-rules §2a,
 * matching how `kudos-compose-pill.tsx` inlines `MM_MEDIA_Pen`.
 */
function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-9 7a9 9 0 1 1 16.03 5.62l3.68 3.67a1 1 0 0 1-1.42 1.42l-3.67-3.68A9 9 0 0 1 2 11Z"
        fill="currentColor"
      />
    </svg>
  );
}
