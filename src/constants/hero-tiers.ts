/**
 * The four Hero badge tiers, in ascending order (New → Rising → Super →
 * Legend). Assets and intrinsic sizes only — the visible strings stay in
 * `messages/*.json` under `standards.heroSection.tiers.*`, so both screens
 * that render a badge read the same words in the reader's own locale.
 *
 * Shared because two route segments need it: `/standards` lists all four
 * with their conditions, and `/kudos` shows the one a Sunner has earned on
 * every card. `kudos-card-person.tsx` used to carry its own copy of this
 * table, with a comment explaining that ESLint bars a cross-segment
 * `_shared` import — true, and the reason the table belongs HERE instead,
 * one level up where both segments may import it.
 *
 * Intrinsic `width`/`height` are the real pixel dimensions of each PNG and
 * must stay in step with the files in `public/standards/`; passing anything
 * else to `next/image` triggers its "width or height modified" warning.
 */

export type HeroTierSlug =
  "newHero" | "risingHero" | "superHero" | "legendHero";

export type HeroTierAsset = {
  slug: HeroTierSlug;
  asset: string;
  width: number;
  height: number;
};

/** Tuple rows keep one tier per line under Prettier instead of six. */
const ROWS: [HeroTierSlug, string, number, number][] = [
  ["newHero", "/standards/new-hero.png", 126, 22],
  ["risingHero", "/standards/rising-hero.png", 110, 20],
  ["superHero", "/standards/super-hero.png", 109, 19],
  ["legendHero", "/standards/legend-hero.png", 110, 20],
];

export const HERO_TIERS: HeroTierAsset[] = ROWS.map(
  ([slug, asset, width, height]) => ({ slug, asset, width, height }),
);
