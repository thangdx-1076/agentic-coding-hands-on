import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { logoutAction } from "../../_actions/logout";
import { getViewer } from "../../_utils/get-viewer";

import { toggleKudoHeart } from "./_actions/toggle-kudo-heart";
import { loadMoreKudos } from "./_actions/load-more-kudos";
import { KudosClient } from "./_components/kudos-client";
import { buildKudosCopy } from "./_shared/build-kudos-copy";
import type { KudosStats } from "./_components/kudos-stat-list";

import { getCurrentUser } from "@/dal/auth";
import { getKudosBoard } from "@/dal/kudos";
import { toKudosClient } from "@/dal/kudos-client";
import { getViewerHeartedKudoIds } from "@/dal/kudo-hearts";
import { toKudoHeartsClient } from "@/dal/kudo-hearts-client";
import { getKudosStats, type KudosStatsClient } from "@/dal/kudos-stats";
import { toKudosStatsClient } from "@/dal/kudos-stats-client";
import { createClient } from "@/lib/supabase/server";
import { normalizeLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Sun* Kudos",
};

type KudosPageSearchParams = {
  hashtag?: string | string[];
  department?: string | string[];
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
  const { hashtag: rawHashtag, department: rawDepartment } = await searchParams;
  const hashtag = firstNonEmpty(rawHashtag);
  const department = firstNonEmpty(rawDepartment);

  const [currentUser, viewer] = await Promise.all([
    getCurrentUser(),
    getViewer(),
  ]);
  const viewerId = currentUser?.id ?? null;

  const rawLocale = await getLocale();
  const locale = normalizeLocale(rawLocale);
  const tHome = await getTranslations("home");
  const tKudos = await getTranslations("kudos");
  const copy = buildKudosCopy(tHome, tKudos, locale);

  const supabase = await createClient();
  const [board, stats] = await Promise.all([
    getKudosBoard(toKudosClient(supabase), {
      hashtag: hashtag ?? undefined,
      department: department ?? undefined,
    }),
    buildViewerStats(toKudosStatsClient(supabase), viewerId),
  ]);

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
      logoutAction={logoutAction}
      toggleKudoHeartAction={toggleKudoHeart}
      loadMoreKudosAction={loadMoreKudos}
    />
  );
}

/**
 * `?hashtag=`/`?department=` cross the browser boundary, so a repeated key
 * (`string[]`) or an empty string is possible even though the type says
 * `string | string[] | undefined` — validated here into a single trusted
 * `string | null` before it ever reaches `getKudosBoard`'s filters.
 */
function firstNonEmpty(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() !== "" ? raw : null;
}

/**
 * `received`/`sent`/`hearts` come from `getKudosStats` (`src/dal/kudos-
 * stats.ts`), a per-viewer aggregate over `kudos` — see that file's own
 * doc comment for why `hearts` sums the viewer's SENT kudos, not their
 * received ones. `secretBoxOpened`/`secretBoxUnopened` stay `0` because
 * they are true zeros — no gift system exists yet (AD-8). Same
 * disclosed-limitation shape as `/profile`'s `ProfileStatisticsCard`,
 * which hardcodes those same two counters to `0` for the same reason.
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
  const { received, sent, hearts } = await getKudosStats(client, viewerId);
  return {
    received,
    sent,
    hearts,
    secretBoxOpened: 0,
    secretBoxUnopened: 0,
  };
}
