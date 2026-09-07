/**
 * Star tier for a Sunner's Kudos profile (BR-008, `mms_B.3.2`). Counts how
 * many kudos they have RECEIVED — `starTier` is meant to be fed
 * `KudosPerson.kudosReceived` (`src/dal/kudos.ts`), never a raw DB row or a
 * "kudos sent" count.
 *
 * Thresholds come straight from the spec's § 13 Configuration
 * (`STAR_TIER_THRESHOLDS = 10, 20, 50`), used directly as local literals
 * here — this is the only module in the route that reads them, so a
 * shared constants file would just add an indirection with one caller.
 */

export type StarTier = 0 | 1 | 2 | 3;

const TIER_THREE_THRESHOLD = 50;
const TIER_TWO_THRESHOLD = 20;
const TIER_ONE_THRESHOLD = 10;

/**
 * Each threshold is inclusive (exactly 10, 20, or 50 already earns that
 * tier); fewer than 10 kudos received earns no star. A negative count
 * (should never happen — `COUNT(*)` cannot go negative — but this is a
 * pure function with no control over its caller) falls through to `0`
 * rather than throwing.
 */
export function starTier(kudosReceived: number): StarTier {
  if (kudosReceived >= TIER_THREE_THRESHOLD) {
    return 3;
  }
  if (kudosReceived >= TIER_TWO_THRESHOLD) {
    return 2;
  }
  if (kudosReceived >= TIER_ONE_THRESHOLD) {
    return 1;
  }
  return 0;
}
