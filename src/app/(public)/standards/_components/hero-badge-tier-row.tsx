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
    // mm:3204:6161
    <div className="flex flex-col gap-2">
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
      {/* mm:3204:6168 */}
      <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
        {copy.description}
      </p>
    </div>
  );
}
