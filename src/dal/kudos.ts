import "server-only";

import {
  selectCards,
  type CardRow,
  type KudosClient,
} from "./kudos-cards-query";
import {
  getKudosFilterOptions,
  getKudosTotal,
  type KudosAggregatesClient,
  type KudosFilterOptions,
} from "./kudos-board-aggregates";
import type { KudosCard } from "./kudos-card-model";

/**
 * Server-side read for `/kudos` (F007_KudosLiveBoard's public, read-only
 * board). Mirrors `src/dal/awards.ts`: the Supabase client is always
 * INJECTED (never created here), and every failure — a Supabase error, a
 * null result, or a thrown exception, on ANY read this function issues —
 * fails OPEN to a fully empty board rather than throwing or rendering a
 * partially-populated one (`/kudos` has no auth guard, BR-015; an empty
 * board only ever renders the empty states BR-011/BR-012 already define).
 *
 * Spotlight's total and the Hashtag/Phòng ban filter option lists come
 * from a SEPARATE, OPTIONAL `aggregatesClient` (`getKudosTotal`/
 * `getKudosFilterOptions`, `./kudos-board-aggregates`) — an exact `COUNT`
 * and a distinct-value view read, both independent of PostgREST's
 * `max_rows = 1000` cap (BR-017/FR-215/FR-217); they used to be derived
 * from `.length`/`.flatMap` over the same unbounded `kudos_cards` read
 * Highlight/Feed also use, which silently went wrong past 1000 rows. When
 * `aggregatesClient` is omitted, `spotlightTotal` defaults to `0` and
 * `filters` to empty lists — `loadMoreKudos` (`_actions/load-more-kudos.ts`)
 * only ever reads `board.feed` and skips both extra reads on every scroll.
 *
 * `spotlightNames` (the scatter's receiver names) is NOT board-wide — it
 * only needs names from the currently-displayed set (Highlight + Feed), so
 * it stays a plain dedupe over those two reads.
 *
 * Deliberately does NOT know about `kudo_hearts` (migration `0007`,
 * F008_KudosHeartReaction) — plan.md AD-2. The row shape, column list,
 * injected-client surface and the `selectCards` read live in
 * `./kudos-cards-query` (a size split only); both client types are
 * re-exported below so `@/dal/kudos` stays the one import path.
 */

export type { KudosCardsQuery, KudosClient } from "./kudos-cards-query";
export type {
  AggregatesQuery,
  FilterOptionRow,
  KudosAggregatesClient,
  KudosFilterOptions,
} from "./kudos-board-aggregates";
export type { KudosCard, KudosPerson } from "./kudos-card-model";

export type KudosBoard = {
  highlight: KudosCard[];
  feed: { items: KudosCard[]; nextCursor: string | null };
  spotlightTotal: number;
  spotlightNames: string[];
  filters: { hashtags: string[]; departments: string[] };
};

export type GetKudosBoardOptions = {
  hashtag?: string;
  department?: string;
  cursor?: string;
};

const HIGHLIGHT_LIMIT = 5;
const FEED_PAGE_SIZE = 10;

const EMPTY_BOARD: KudosBoard = {
  highlight: [],
  feed: { items: [], nextCursor: null },
  spotlightTotal: 0,
  spotlightNames: [],
  filters: { hashtags: [], departments: [] },
};

const EMPTY_FILTER_OPTIONS: KudosFilterOptions = {
  hashtags: [],
  departments: [],
};

/**
 * Resolves the whole `/kudos` board in one call: the Highlight carousel
 * (top `HIGHLIGHT_LIMIT` by `heart_count`, BR-001), one Feed page (keyset
 * `cursor` on `created_at`, AD-5 — no `OFFSET`), and Spotlight's total +
 * filter option lists via `aggregatesClient` (BR-009/BR-017, see top
 * comment). `hashtag`/`department` filter Highlight and Feed together
 * (BR-003); the two aggregate reads stay board-wide, unfiltered.
 *
 * Fails open to a fully empty board on a Supabase error, a null result, or
 * a thrown exception from ANY of the reads.
 */
export async function getKudosBoard(
  client: KudosClient,
  options: GetKudosBoardOptions = {},
  aggregatesClient?: KudosAggregatesClient,
): Promise<KudosBoard> {
  const { hashtag, department, cursor } = options;

  try {
    const [total, filters, highlightRows, feedRows] = await Promise.all([
      aggregatesClient ? getKudosTotal(aggregatesClient) : 0,
      aggregatesClient
        ? getKudosFilterOptions(aggregatesClient)
        : EMPTY_FILTER_OPTIONS,
      selectCards(client, {
        hashtag,
        department,
        sort: "highlight",
        limit: HIGHLIGHT_LIMIT,
      }),
      selectCards(client, {
        hashtag,
        department,
        cursor,
        sort: "feed",
        limit: FEED_PAGE_SIZE,
      }),
    ]);

    const lastFeedRow = feedRows[feedRows.length - 1];

    return {
      highlight: highlightRows.map(toCard),
      feed: {
        items: feedRows.map(toCard),
        nextCursor:
          feedRows.length === FEED_PAGE_SIZE && lastFeedRow
            ? lastFeedRow.created_at
            : null,
      },
      spotlightTotal: total,
      spotlightNames: dedupe(
        [...highlightRows, ...feedRows]
          .map((row) => row.receiver_full_name)
          .filter(isPresent),
      ),
      filters,
    };
  } catch {
    return EMPTY_BOARD;
  }
}

function toCard(row: CardRow): KudosCard {
  return {
    id: row.id,
    content: row.content,
    hashtags: toArray(row.hashtags),
    imageUrls: toArray(row.image_urls),
    heartCount: row.heart_count,
    createdAt: row.created_at,
    sender: {
      id: row.sender_id,
      fullName: row.sender_full_name,
      avatarUrl: row.sender_avatar_url,
      department: row.sender_department,
      kudosReceived: row.sender_kudos_received,
    },
    receiver: {
      id: row.receiver_id,
      fullName: row.receiver_full_name,
      avatarUrl: row.receiver_avatar_url,
      department: row.receiver_department,
      kudosReceived: row.receiver_kudos_received,
    },
    isOwn: row.is_own,
  };
}

/** `text[] NOT NULL` in the migration, but a PostgREST boundary value is
 * validated here, not trusted — see `awards.ts`'s `prize_values` coercion. */
function toArray(value: string[] | null): string[] {
  return Array.isArray(value) ? value : [];
}

function isPresent(value: string | null): value is string {
  return value !== null;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}
