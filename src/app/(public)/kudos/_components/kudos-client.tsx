"use client";

import { useCallback } from "react";

import { useSelectLocale } from "../../../_hooks/use-select-locale";
import type { SiteViewer } from "../../../_shared/site-chrome";
import { useKudosFilters } from "../_hooks/use-kudos-filters";
import {
  useKudosHearts,
  type ToggleHeartResult,
} from "../_hooks/use-kudos-hearts";
import { useKudosToast } from "../_hooks/use-kudos-toast";
import type { KudosPageCopy } from "../_shared/build-kudos-copy";
import { buildKudosSidebarProps } from "../_shared/build-kudos-sidebar-props";
import {
  deriveKudosCardState,
  type KudosCardState,
} from "../_utils/kudos-card-state";

import { KudosScreen } from "./kudos-screen";
import type { KudosHighlightCarouselItem } from "./kudos-highlight-carousel";
import type { KudosLeaderboardItemData } from "./kudos-leaderboard";
import type { KudosStats } from "./kudos-stat-list";

import type { KudosBoard, KudosCard as KudosCardModel } from "@/dal/kudos";
import { ROUTES } from "@/constants/routes";
import type { AppLocale } from "@/lib/i18n/locale";

type FeedResult = { items: KudosCardModel[]; nextCursor: string | null };

export type KudosClientProps = {
  copy: KudosPageCopy;
  viewer: SiteViewer | null;
  locale: AppLocale;
  board: KudosBoard;
  viewerId: string | null;
  heartedIds: string[];
  hashtag: string | null;
  department: string | null;
  stats: KudosStats | null;
  giftRecipients: KudosLeaderboardItemData[];
  logoutAction: () => void | Promise<void>;
  toggleKudoHeartAction: (kudoId: string) => Promise<ToggleHeartResult>;
  loadMoreKudosAction: (input: {
    cursor: string;
    hashtag?: string;
    department?: string;
  }) => Promise<FeedResult>;
};

/**
 * Client boundary of `/kudos` (mirrors `AwardsClient`/`ProfileClient`).
 * Composition only: the heart overrides, the toast timer and the
 * URL-driven filters each own a hook under `../_hooks`, and per-card state
 * resolution lives in `../_utils/kudos-card-state`.
 *
 * Known limitation: a heart-count override only patches `board.highlight`
 * (owned here as a plain array) — feed cards live inside `KudosFeed`'s own
 * `useInfiniteFeed` state (phase 06/11), whose `getCardState` can override
 * `hearted`/`heartDisabled` but not `heartCount`, so a feed toggle updates
 * the icon now, the count on the next page load. */
export function KudosClient({
  copy,
  viewer,
  locale,
  board,
  viewerId,
  heartedIds,
  hashtag,
  department,
  stats,
  giftRecipients,
  logoutAction,
  toggleKudoHeartAction,
  loadMoreKudosAction,
}: KudosClientProps) {
  const { handleSelectLocale } = useSelectLocale();
  const { toastMessage, showToast } = useKudosToast();
  const { heartOverrides, pendingIds, toggleHeart } = useKudosHearts(
    viewerId,
    toggleKudoHeartAction,
  );
  const { hashtagFilter, departmentFilter, selectHashtag } = useKudosFilters(
    { hashtag, department },
    {
      hashtag: copy.highlight.filterHashtag,
      department: copy.highlight.filterDepartment,
    },
    {
      hashtags: board.filters.hashtags,
      departments: board.filters.departments,
    },
  );

  const heartedSet = new Set(heartedIds);

  function getCardState(card: KudosCardModel): KudosCardState {
    return deriveKudosCardState(card, {
      viewerId,
      heartedIds: heartedSet,
      overrides: heartOverrides,
      signInTitle: copy.card.signInToHeart,
      pendingIds,
    });
  }

  function handleCopyLink(card: KudosCardModel) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const shareUrl = `${window.location.origin}${ROUTES.KUDOS}?kudo=${encodeURIComponent(card.id)}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => showToast(copy.card.copiedToast))
      .catch(() => {
        // Clipboard write denied — no toast; nothing else depends on it.
      });
  }

  // `board.feed.items` is sorted `created_at desc` (unlike `board.highlight`,
  // sorted by heart_count), so its first entry is the real most-recent kudo
  // — feeds the Spotlight ticker (`kudos-spotlight.tsx`). Scoped to the
  // current hashtag/department filter, same as the rest of `board.feed`.
  const latestFeedCard = board.feed.items[0];

  const highlightItems: KudosHighlightCarouselItem[] = board.highlight.map(
    (card) => {
      const state = getCardState(card);
      return {
        card:
          state.heartCount === card.heartCount
            ? card
            : { ...card, heartCount: state.heartCount },
        hearted: state.hearted,
        heartDisabled: state.heartDisabled,
        heartTitle: state.heartTitle,
        isOwnKudo: state.isOwnKudo,
        onToggleHeart: () => toggleHeart(card),
        onSelectHashtag: selectHashtag,
        onCopyLink: () => handleCopyLink(card),
      };
    },
  );

  // Must stay referentially stable — `useInfiniteFeed` tears down and
  // recreates its `IntersectionObserver` on every identity change.
  const feedLoadMore = useCallback(
    (cursor: string) =>
      loadMoreKudosAction({
        cursor,
        hashtag: hashtag ?? undefined,
        department: department ?? undefined,
      }),
    [loadMoreKudosAction, hashtag, department],
  );

  return (
    <KudosScreen
      copy={copy}
      viewer={viewer}
      locale={locale}
      onSelectLocale={handleSelectLocale}
      logoutAction={logoutAction}
      highlightItems={highlightItems}
      hashtagFilter={hashtagFilter}
      departmentFilter={departmentFilter}
      spotlightTotal={board.spotlightTotal}
      spotlightNames={board.spotlightNames}
      spotlightLatestKudo={
        latestFeedCard?.receiver.fullName
          ? {
              receiverName: latestFeedCard.receiver.fullName,
              createdAt: latestFeedCard.createdAt,
            }
          : null
      }
      // Remounts `KudosFeed` on filter change — `useInfiniteFeed` seeds
      // `items` from `initialPage` only on mount (C14/C15). Also remounts
      // when the server's newest feed item changes: `createKudo`'s
      // `revalidatePath` refreshes `board`/this component's props, but
      // `useInfiniteFeed`'s own `items` state (F007, not remounted by a prop
      // change alone) would otherwise keep showing the pre-submit top card
      // (C24-C26). Any client-appended page gets dropped in that same
      // instant — an acceptable trade-off right after the viewer's own
      // submit, matching the filter-change remount's identical trade-off.
      feedKey={`${hashtag ?? ""}::${department ?? ""}::${latestFeedCard?.id ?? "empty"}`}
      feedInitialPage={board.feed}
      feedLoadMore={feedLoadMore}
      getFeedCardState={getCardState}
      onToggleHeart={toggleHeart}
      onSelectHashtag={selectHashtag}
      onCopyLink={handleCopyLink}
      {...buildKudosSidebarProps(stats, giftRecipients)}
      toastMessage={toastMessage}
      compose={{
        isSignedIn: viewerId !== null,
        hashtagVocabulary: board.filters.hashtags,
      }}
    />
  );
}
