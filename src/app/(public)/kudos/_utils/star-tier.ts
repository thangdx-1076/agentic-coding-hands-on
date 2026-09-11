/**
 * Which Hero badge a Sunner has earned, as an index into `HERO_TIERS`
 * (`@/constants/hero-tiers`), or `null` for no badge at all.
 *
 * Ranks on how many DIFFERENT Sunners have sent them a kudo
 * (`KudosPerson.distinctSenders`, from `kudos_cards`'s
 * `*_distinct_senders`, migration 0022) — never a raw DB row, never the
 * total kudos count.
 *
 * The thresholds are the design's own, quoted in the tier copy this app
 * now shows in the badge's hover card and on `/standards`:
 *
 *   | badge       | condition                              |
 *   |-------------|----------------------------------------|
 *   | New Hero    | Có 1-4 người gửi Kudos cho bạn         |
 *   | Rising Hero | Có 5-9 người gửi Kudos cho bạn         |
 *   | Super Hero  | Có 10–20 người gửi Kudos cho bạn       |
 *   | Legend Hero | Có hơn 20 người gửi Kudos cho bạn      |
 *
 * This REPLACES an earlier rule that ranked on total kudos received against
 * 10/20/50, thresholds taken from an early spec draft (§ 13
 * `STAR_TIER_THRESHOLDS`). The two disagreed on both the quantity being
 * measured and where the lines fall, and the mismatch became visible the
 * moment the badge started explaining itself: a Sunner with no kudos at all
 * was shown "New Hero" over the caption "1-4 people sent you Kudos". The
 * caption is what the design specifies, so the count follows it.
 *
 * Zero senders now means NO badge, which the old rule had no way to express
 * — it floored at tier 0, and tier 0 is a real badge. Nobody has earned
 * "New Hero" until at least one person has actually thanked them.
 */

export type HeroTierIndex = 0 | 1 | 2 | 3;

/** "hơn 20", so 20 itself is still Super Hero. */
const LEGEND_MIN_EXCLUSIVE = 20;
const SUPER_MIN = 10;
const RISING_MIN = 5;
const NEW_MIN = 1;

/**
 * `null` below `NEW_MIN`. A negative count cannot come out of
 * `count(DISTINCT ...)`, but this is a pure function with no say over its
 * caller, so it falls through to `null` rather than throwing.
 */
export function heroTierIndex(distinctSenders: number): HeroTierIndex | null {
  if (distinctSenders > LEGEND_MIN_EXCLUSIVE) {
    return 3;
  }
  if (distinctSenders >= SUPER_MIN) {
    return 2;
  }
  if (distinctSenders >= RISING_MIN) {
    return 1;
  }
  if (distinctSenders >= NEW_MIN) {
    return 0;
  }
  return null;
}
