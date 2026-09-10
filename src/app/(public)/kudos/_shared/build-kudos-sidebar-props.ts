import type { KudosLeaderboardItemData } from "../_components/kudos-leaderboard";
import type { KudosStats } from "../_components/kudos-stat-list";

export type KudosSidebarPropsBundle = {
  stats: KudosStats | null;
  rankUps: KudosLeaderboardItemData[];
  giftRecipients: KudosLeaderboardItemData[];
};

/**
 * Assembles `KudosScreen`'s 3 sidebar props in one place — split out of
 * `kudos-client.tsx` (already at its 200-line ceiling before wiring in
 * `giftRecipients`, see phase-02's own Key Insight) rather than inlined
 * there as 3 separate JSX props.
 *
 * `rankUps` stays hardcoded `[]`: no rank-tracking table exists in this
 * schema yet (F007 technical-spec.md § 5.2) — do not conflate it with
 * `giftRecipients`, which is real Secret Box opener data from
 * `getRecentGiftRecipients` (FR-219/BR-020).
 */
export function buildKudosSidebarProps(
  stats: KudosStats | null,
  giftRecipients: KudosLeaderboardItemData[],
): KudosSidebarPropsBundle {
  return { stats, rankUps: [], giftRecipients };
}
