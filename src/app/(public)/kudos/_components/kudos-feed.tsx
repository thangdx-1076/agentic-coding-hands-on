"use client";

import { useCallback } from "react";

import { useInfiniteFeed, type FeedPage } from "../_hooks/use-infinite-feed";
import { defaultKudosCopy, type KudosCopy } from "../_shared/kudos-copy";

import { KudosCard } from "./kudos-card";
import { KudosEmptyState } from "./kudos-empty-state";
import { KudosFeedSentinel } from "./kudos-feed-sentinel";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

export type KudosFeedCardState = {
  hearted?: boolean;
  /** Overrides `card.heartCount` when a toggle has already updated the
   * server value but `initialPage`/`loadMore`'s own snapshot hasn't been
   * refetched — same override shape `KudosClient` already applies to
   * `board.highlight` (see that file's `deriveCardState`). Omitted (or
   * equal to `card.heartCount`) renders the card's own count unchanged. */
  heartCount?: number;
  heartDisabled?: boolean;
  heartTitle?: string;
  isOwnKudo?: boolean;
};

export type KudosFeedProps = {
  eyebrow: string;
  heading: string;
  /** BR-011 exact string — forwarded to the shared `KudosEmptyState`,
   * never hard-coded here. */
  emptyLabel: string;
  initialPage: FeedPage<KudosCardModel>;
  /** Server Action reference only — this component never calls one
   * directly (Out of scope); phase 13 supplies `loadMoreKudos`. */
  loadMore: (cursor: string) => Promise<FeedPage<KudosCardModel>>;
  cardCopy?: KudosCopy;
  /** Heart/self-kudo rules (BR-001..003, FR-602) are F008's own state, not
   * this component's — the caller derives per-card state (e.g. from a
   * hearted-ids set plus the viewer session) and hands it back here. */
  getCardState?: (card: KudosCardModel) => KudosFeedCardState;
  onToggleHeart?: (card: KudosCardModel) => void;
  onSelectHashtag?: (tag: string) => void;
  onCopyLink?: (card: KudosCardModel) => void;
};

/**
 * mm:2940:13475 `mms_C_All kudos` — ALL KUDOS section: header (`2940:14221`,
 * eyebrow + divider + "ALL KUDOS" heading, same type scale as the HIGHLIGHT
 * KUDOS header in `kudos-filter-bar.tsx`) followed by the card list
 * (`2940:13482`, instances `3127:21871`/`22053`/`22375`/`22439` — all the
 * same shared `KudosCard`, phase 07).
 *
 * Renders as one flowing column with no inner scroll box of its own
 * (unlike `kudos-sidebar.tsx`'s `overflow-y-auto`) — FR-211's "sidebar
 * scrolls independently" means the SIDEBAR gets the bounded scroll
 * container, not this feed; the feed just grows with the page. Placing
 * this beside `KudosSidebar` in a two-column row, and that row's own
 * 144px inset (`Frame 502` in the source — matches this section's own
 * header inset), is phase 13's job (`kudos-screen.tsx`).
 *
 * No fetch, no Server Action call, and no scroll observer of its own —
 * `initialPage`/`loadMore` flow straight into `useInfiniteFeed` (phase 06),
 * which owns the double-fetch guard C18/C19 depend on.
 */
export function KudosFeed({
  eyebrow,
  heading,
  emptyLabel,
  initialPage,
  loadMore,
  cardCopy = defaultKudosCopy,
  getCardState,
  onToggleHeart,
  onSelectHashtag,
  onCopyLink,
}: KudosFeedProps) {
  const { items, hasMore, isLoading, sentinelRef } = useInfiniteFeed(
    initialPage,
    loadMore,
  );

  const handleToggleHeart = useCallback(
    (card: KudosCardModel) => () => onToggleHeart?.(card),
    [onToggleHeart],
  );
  const handleCopyLink = useCallback(
    (card: KudosCardModel) => () => onCopyLink?.(card),
    [onCopyLink],
  );

  return (
    <section data-testid="kudos-feed" className="flex w-full flex-col gap-10">
      {/* mm:2940:14221 */}
      <div className="flex w-full flex-col gap-4 px-6 sm:px-12 lg:px-36">
        {/* mm:2940:14222 */}
        <p className="font-montserrat text-2xl leading-8 font-bold text-white">
          {eyebrow}
        </p>
        {/* mm:2940:14223 */}
        <div className="h-px w-full bg-login-divider" />
        {/* mm:2940:14225 */}
        <h2 className="font-montserrat text-[57px] leading-[64px] font-bold tracking-[-0.25px] text-login-button">
          {heading}
        </h2>
      </div>

      {/* mm:2940:13482 */}
      {items.length === 0 ? (
        <KudosEmptyState message={emptyLabel} />
      ) : (
        <div className="flex w-full flex-col gap-6">
          {items.map((card) => {
            const state = getCardState?.(card) ?? {};
            // `card` itself is `useInfiniteFeed`'s own snapshot and never
            // mutated — a hearted toggle's fresh count only ever reaches the
            // rendered card through `state.heartCount`, mirroring how
            // `KudosClient` patches `board.highlight`'s cards.
            const displayCard =
              state.heartCount !== undefined &&
              state.heartCount !== card.heartCount
                ? { ...card, heartCount: state.heartCount }
                : card;
            return (
              <KudosCard
                key={card.id}
                card={displayCard}
                variant="feed"
                copy={cardCopy}
                hearted={state.hearted ?? false}
                heartDisabled={state.heartDisabled}
                heartTitle={state.heartTitle}
                isOwnKudo={state.isOwnKudo}
                onToggleHeart={handleToggleHeart(card)}
                onSelectHashtag={onSelectHashtag}
                onCopyLink={handleCopyLink(card)}
              />
            );
          })}
          {hasMore ? <KudosFeedSentinel sentinelRef={sentinelRef} /> : null}
          {isLoading ? (
            <div
              data-testid="kudos-feed-loading"
              role="status"
              className="flex w-full justify-center py-4"
            >
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-login-button/30 border-t-login-button"
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
