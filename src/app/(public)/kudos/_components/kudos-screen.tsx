import { SiteFooter } from "../../../_components/site-footer";
import { SiteHeader } from "../../../_components/site-header";
import type { SiteViewer } from "../../../_shared/site-chrome";
import type { KudosPageCopy } from "../_shared/build-kudos-copy";
import type { FeedPage } from "../_hooks/use-infinite-feed";

import { KudosBanner } from "./kudos-banner";
import { KudosComposePill } from "./kudos-compose-pill";
import { KudosFilterBar } from "./kudos-filter-bar";
import type { KudosFilterState } from "./kudos-filter-menu";
import { KudosHighlightCarousel } from "./kudos-highlight-carousel";
import type { KudosHighlightCarouselItem } from "./kudos-highlight-carousel";
import {
  KudosSpotlight,
  type KudosSpotlightLatestKudo,
} from "./kudos-spotlight";
import { KudosFeed } from "./kudos-feed";
import type { KudosFeedCardState } from "./kudos-feed";
import { KudosSidebar } from "./kudos-sidebar";
import type { KudosLeaderboardItemData } from "./kudos-leaderboard";
import type { KudosStats } from "./kudos-stat-list";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";
import { LOCALE_LABEL, type AppLocale } from "@/lib/i18n/locale";
import { montserrat, montserratAlternates } from "@/styles/fonts";

export type KudosScreenProps = {
  copy: KudosPageCopy;
  viewer: SiteViewer | null;
  locale?: AppLocale;
  unreadCount?: number;
  onSelectLocale?: (locale: AppLocale) => void;
  logoutAction?: () => void | Promise<void>;

  highlightItems: KudosHighlightCarouselItem[];
  hashtagFilter: KudosFilterState;
  departmentFilter: KudosFilterState;

  spotlightTotal: number;
  spotlightNames: readonly string[];
  /** Optional — see `KudosSpotlightLatestKudo`. Omit/`null` renders no
   * ticker rather than inventing one. */
  spotlightLatestKudo?: KudosSpotlightLatestKudo | null;

  /** Remounts `KudosFeed` (and its internal pagination state) whenever the
   * active filter changes — see `KudosClient`'s own comment on why. */
  feedKey: string;
  feedInitialPage: FeedPage<KudosCardModel>;
  feedLoadMore: (cursor: string) => Promise<FeedPage<KudosCardModel>>;
  getFeedCardState: (card: KudosCardModel) => KudosFeedCardState;
  onToggleHeart: (card: KudosCardModel) => void;
  onSelectHashtag: (tag: string) => void;
  onCopyLink: (card: KudosCardModel) => void;

  stats: KudosStats | null;
  rankUps: KudosLeaderboardItemData[];
  giftRecipients: KudosLeaderboardItemData[];

  toastMessage: string | null;
};

/**
 * Root composition of `/kudos` (mm:2940:13431, phase 13's merge point) —
 * presentational only, mirrors `AwardsScreen`/`ProfileScreen`'s shape.
 * Document order matches `tests/e2e/kudos.spec.ts` C10: header → banner →
 * compose pill → highlight (filter header + carousel) → spotlight →
 * feed+sidebar row → footer.
 *
 * The feed+sidebar row supplies the 144px horizontal inset ONCE for both
 * columns (`Frame 502` in the source) — `KudosFeed`'s card list and
 * `kudos-sidebar.tsx` deliberately carry no padding of their own so they
 * never end up double-inset.
 */
export function KudosScreen({
  copy,
  viewer,
  locale = "vi",
  unreadCount = 0,
  onSelectLocale,
  logoutAction,
  highlightItems,
  hashtagFilter,
  departmentFilter,
  spotlightTotal,
  spotlightNames,
  spotlightLatestKudo,
  feedKey,
  feedInitialPage,
  feedLoadMore,
  getFeedCardState,
  onToggleHeart,
  onSelectHashtag,
  onCopyLink,
  stats,
  rankUps,
  giftRecipients,
  toastMessage,
}: KudosScreenProps) {
  const languageLabel = LOCALE_LABEL[locale] as "VN" | "EN";

  return (
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col bg-login-background`}
    >
      <SiteHeader
        copy={copy}
        languageLabel={languageLabel}
        viewer={viewer}
        unreadCount={unreadCount}
        onSelectLocale={onSelectLocale}
        logoutAction={logoutAction}
      />
      <main className="flex w-full flex-1 flex-col gap-16 pb-24">
        <KudosBanner title={copy.banner.title} logoAlt={copy.banner.logoAlt} />

        <div className="flex w-full justify-center px-6 sm:px-12 lg:px-36">
          <KudosComposePill
            placeholder={copy.compose.placeholder}
            ariaLabel={copy.compose.ariaLabel}
          />
        </div>

        <div className="flex w-full flex-col gap-6">
          <KudosFilterBar
            eyebrow={copy.highlight.eyebrow}
            heading={copy.highlight.heading}
            hashtag={hashtagFilter}
            department={departmentFilter}
          />
          <KudosHighlightCarousel
            items={highlightItems}
            copy={copy.card}
            emptyLabel={copy.feed.empty}
            prevLabel={copy.highlight.prev}
            nextLabel={copy.highlight.next}
          />
        </div>

        <KudosSpotlight
          total={spotlightTotal}
          names={spotlightNames}
          copy={copy.spotlight}
          latestKudo={spotlightLatestKudo}
        />

        <div className="flex w-full flex-col gap-10 px-6 sm:px-12 lg:flex-row lg:items-start lg:px-36">
          <div className="min-w-0 flex-1">
            <KudosFeed
              key={feedKey}
              eyebrow={copy.feed.eyebrow}
              heading={copy.feed.heading}
              emptyLabel={copy.feed.empty}
              initialPage={feedInitialPage}
              loadMore={feedLoadMore}
              cardCopy={copy.card}
              getCardState={getFeedCardState}
              onToggleHeart={onToggleHeart}
              onSelectHashtag={onSelectHashtag}
              onCopyLink={onCopyLink}
            />
          </div>
          <KudosSidebar
            stats={stats}
            copy={copy.sidebar}
            rankUps={rankUps}
            giftRecipients={giftRecipients}
          />
        </div>
      </main>
      <SiteFooter copy={copy} />

      {toastMessage ? (
        <div
          data-testid="kudos-toast"
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#0B0F12] px-6 py-4 font-montserrat text-base font-bold text-white shadow-lg"
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
