import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { logoutAction } from "../../_actions/logout";
import { getViewer } from "../../_utils/get-viewer";
import { getNotificationsCopy } from "../../_utils/get-notifications-copy";

import { toggleKudoHeart } from "./_actions/toggle-kudo-heart";
import { loadMoreKudos } from "./_actions/load-more-kudos";
import { KudosClient } from "./_components/kudos-client";
import { buildKudosCopy } from "./_shared/build-kudos-copy";
import { buildGiftRecipientItems } from "./_shared/build-gift-recipient-items";
import type { KudosStats } from "./_components/kudos-stat-list";

import { getCurrentUser } from "@/dal/auth";
import { getKudosBoard } from "@/dal/kudos";
import { toKudosAggregatesClient } from "@/dal/kudos-board-aggregates-client";
import { toKudosClient } from "@/dal/kudos-client";
import { getViewerHeartedKudoIds } from "@/dal/kudo-hearts";
import { getProfileCard } from "@/dal/profile-cards";
import { toProfileCardsClient } from "@/dal/profile-cards-client";
import { toKudoHeartsClient } from "@/dal/kudo-hearts-client";
import { getKudosStats, type KudosStatsClient } from "@/dal/kudos-stats";
import { toKudosStatsClient } from "@/dal/kudos-stats-client";
import { getRecentGiftRecipients } from "@/dal/recent-gift-recipients";
import { toRecentGiftRecipientsClient } from "@/dal/recent-gift-recipients-client";
import { createClient } from "@/lib/supabase/server";
import { normalizeLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Sun* Kudos",
};

type KudosPageSearchParams = {
  hashtag?: string | string[];
  department?: string | string[];
  /** A Sunner id to start a kudo for, set by the write-Kudo bar on
   * `/profile?id=` — that screen has no compose dialog of its own. */
  compose?: string | string[];
};

type KudosPageProps = {
  searchParams: Promise<KudosPageSearchParams>;
};

/**
 * `/kudos` public route entry point (mm:2940:13431, F007_KudosLiveBoard /
 * F008_KudosHeartReaction). The single merge point for phases 03–12: reads
 * `?hashtag=`/`?department=` (Next 16 — `searchParams` is a Promise and
 * MUST be awaited), resolves the board + the viewer's own hearted-kudo set
 * through the DAL, builds localized copy, and hands everything else to
 * `KudosClient` — `KudosScreen`'s function props can't cross a Server
 * Component render (same boundary `AwardsClient`/`ProfileClient` draw).
 *
 * PUBLIC by design (clarifications.md § Route & điều hướng, BR-015): an
 * anonymous visitor renders the exact same markup as an authenticated one,
 * just with `viewer`/`viewerId: null` — there is no auth guard here, unlike
 * `/profile`.
 *
 * `getKudosBoard`/`getViewerHeartedKudoIds` both fail open (empty board /
 * empty `Set`) on any Supabase error — this page never `throw`s or
 * `redirect()`s; a Supabase outage renders the chrome plus the same empty
 * states BR-011/BR-012 already define, never a 500.
 */
export default async function KudosPage({ searchParams }: KudosPageProps) {
  const {
    hashtag: rawHashtag,
    department: rawDepartment,
    compose: rawCompose,
  } = await searchParams;
  const hashtag = firstNonEmpty(rawHashtag);
  const department = firstNonEmpty(rawDepartment);
  const composeRecipientId = firstNonEmpty(rawCompose);

  const [currentUser, viewer] = await Promise.all([
    getCurrentUser(),
    getViewer(),
  ]);
  const viewerId = currentUser?.id ?? null;

  const rawLocale = await getLocale();
  const locale = normalizeLocale(rawLocale);
  const tHome = await getTranslations("home");
  const tKudos = await getTranslations("kudos");
  const tStandards = await getTranslations("standards");
  const notificationsCopy = await getNotificationsCopy();
  const copy = buildKudosCopy(
    tHome,
    tKudos,
    notificationsCopy,
    locale,
    tStandards,
  );

  const supabase = await createClient();

  // `?compose=<id>` opens the dialog with that Sunner already chosen. The
  // name and avatar have to be resolved HERE: the client only receives an
  // id, and `profile_cards` is an authenticated-only read, so a signed-out
  // visitor resolves to `null` and simply lands on the board — the compose
  // flow gates on auth anyway (AD-7).
  const composeRecipient =
    viewerId !== null && isUuid(composeRecipientId)
      ? await getProfileCard(toProfileCardsClient(supabase), composeRecipientId)
      : null;

  const [board, stats, recentGiftRecipients] = await Promise.all([
    getKudosBoard(
      toKudosClient(supabase),
      { hashtag: hashtag ?? undefined, department: department ?? undefined },
      toKudosAggregatesClient(supabase),
    ),
    buildViewerStats(toKudosStatsClient(supabase), viewerId),
    getRecentGiftRecipients(toRecentGiftRecipientsClient(supabase)),
  ]);
  const giftRecipients = buildGiftRecipientItems(
    recentGiftRecipients,
    tStandards,
  );

  const visibleCardIds = [...board.highlight, ...board.feed.items].map(
    (card) => card.id,
  );
  const heartedIds = await getViewerHeartedKudoIds(
    toKudoHeartsClient(supabase),
    // `getViewerHeartedKudoIds` already short-circuits to an empty `Set` for
    // a falsy `userId` — passing `""` for an anonymous visitor avoids a
    // branch here without changing behavior.
    viewerId ?? "",
    visibleCardIds,
  );

  return (
    <KudosClient
      copy={copy}
      viewer={viewer}
      locale={locale}
      board={board}
      viewerId={viewerId}
      heartedIds={Array.from(heartedIds)}
      hashtag={hashtag}
      department={department}
      stats={stats}
      giftRecipients={giftRecipients}
      logoutAction={logoutAction}
      toggleKudoHeartAction={toggleKudoHeart}
      loadMoreKudosAction={loadMoreKudos}
      composeRecipient={composeRecipient}
    />
  );
}

/**
 * `?hashtag=`/`?department=` cross the browser boundary, so a repeated key
 * (`string[]`) or an empty string is possible even though the type says
 * `string | string[] | undefined` — validated here into a single trusted
 * `string | null` before it ever reaches `getKudosBoard`'s filters.
 */
/** `?compose=` crosses the browser boundary, so it can be anything. The id
 * only ever addresses a `public.users` row, whose key is a UUID — anything
 * else cannot match and is rejected here rather than spending a Supabase
 * round-trip to learn the same thing. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | null): value is string {
  return value !== null && UUID_PATTERN.test(value);
}

function firstNonEmpty(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() !== "" ? raw : null;
}

/**
 * All 5 counters come from `getKudosStats` (`src/dal/kudos-stats.ts`), a
 * per-viewer aggregate over `kudos` + `secret_box_openings` — see that
 * file's own doc comment for why `hearts` sums the viewer's SENT kudos, not
 * their received ones, and how `secretBoxOpened`/`secretBoxUnopened` are
 * derived (F000_SecretBoxModal, phase 04). `KudosStatsSummary` and
 * `KudosStats` are structurally identical, so this is a passthrough, not a
 * remap — kept as its own function (rather than inlined at the call site)
 * only for the `null`-for-anonymous short-circuit below.
 *
 * Short-circuits to `null` for an anonymous visitor without ever touching
 * the client (D001) — `KudosStatList` renders nothing at all for `null`.
 */
async function buildViewerStats(
  client: KudosStatsClient,
  viewerId: string | null,
): Promise<KudosStats | null> {
  if (viewerId === null) {
    return null;
  }
  return getKudosStats(client, viewerId);
}
