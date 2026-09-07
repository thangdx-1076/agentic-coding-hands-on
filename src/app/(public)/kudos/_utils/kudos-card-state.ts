import type { KudosCard as KudosCardModel } from "@/dal/kudos";

/**
 * One card's heart state after a local toggle, keyed by kudo id in
 * `useKudosHearts`. Holds the values the Server Action itself returned,
 * so it takes precedence over the server-rendered snapshot below.
 */
export type HeartOverride = { hearted: boolean; heartCount: number };

export type KudosCardState = {
  hearted: boolean;
  heartCount: number;
  heartDisabled: boolean;
  heartTitle: string | undefined;
  isOwnKudo: boolean;
};

/** Everything outside the card itself that decides its heart state — one
 * value per render of `KudosClient`, shared by every card it resolves. */
export type KudosHeartContext = {
  viewerId: string | null;
  heartedIds: Set<string>;
  overrides: Record<string, HeartOverride>;
  signInTitle: string;
};

/** Server-verified `viewerId`/`heartedIds` (F008 FR-602/BR-002) plus any
 * local toggle override, resolved onto one card — anonymous → disabled
 * with a sign-in title (C22); own kudo → disabled, no title (C26). Used
 * for both the initial page and pages `loadMoreKudos` appends later. */
export function deriveKudosCardState(
  card: KudosCardModel,
  { viewerId, heartedIds, overrides, signInTitle }: KudosHeartContext,
): KudosCardState {
  const override = overrides[card.id];
  const isOwnKudo = viewerId !== null && card.sender.id === viewerId;
  return {
    hearted: override?.hearted ?? heartedIds.has(card.id),
    heartCount: override?.heartCount ?? card.heartCount,
    heartDisabled: viewerId === null || isOwnKudo,
    heartTitle: viewerId === null ? signInTitle : undefined,
    isOwnKudo,
  };
}
