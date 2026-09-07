import Image from "next/image";

import type { HeroTier } from "../_shared/standards-copy";

export type HeroBadgeTierRowProps = {
  tier: HeroTier;
  copy: { alt: string; condition: string; description: string };
};

/**
 * One hero-badge tier row (mm:3204:6161, template shared with
 * `3204:6170`/`3204:6179`/`3204:6188`). The badge image is an
 * `MM_MEDIA_*` instance whose caption text is already baked into the
 * artwork — `alt` carries the tier name (`New Hero`…) because no other
 * text node exists for it (C4 in `standards.spec.ts`).
 *
 * Intrinsic width/height come from `tier` (the `HERO_TIERS` table) —
 * never hardcoded here, so this row can never drift into the
 * `next/image` "width or height modified" warning `/awards` hit once.
 */
export function HeroBadgeTierRow({ tier, copy }: HeroBadgeTierRowProps) {
  return (
    // mm:3204:6161 — content frame, 400×72 in the design
    <div className="flex flex-col gap-2">
      {/*
       * Badge and condition share ONE row. The design's geometry is
       * unambiguous: the badge (mm:3204:6163) occupies y 260–282 / x 947–1073
       * and the condition text (mm:3204:6162) y 260–280 / x 1081–1397 — same
       * vertical band, 8px apart horizontally. Stacking them in a column made
       * each tier ~102px instead of 72px, which pushed the 6-icon Secret Box
       * grid below the fold. C4 in `standards.spec.ts` only asserts that the
       * four condition strings EXIST, so it stayed green while the layout was
       * wrong — the geometry, not the contract, is what caught this.
       */}
      <div className="flex flex-row items-center gap-2">
        <Image
          src={tier.asset}
          alt={copy.alt}
          width={tier.width}
          height={tier.height}
        />
        {/* mm:3204:6162 */}
        <p className="font-montserrat text-base leading-6 font-bold tracking-[0.5px] text-white">
          {copy.condition}
        </p>
      </div>
      {/* mm:3204:6168 */}
      <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
        {copy.description}
      </p>
    </div>
  );
}
