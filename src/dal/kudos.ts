import "server-only";

import {
  selectCards,
  type CardRow,
  type KudosClient,
} from "./kudos-cards-query";

/**
 * Server-side read for `/kudos` (F007_KudosLiveBoard's public, read-only
 * board). Mirrors `src/dal/awards.ts`: the Supabase client is always
 * INJECTED (never created here), and every failure — a Supabase error, a
 * null result, or a thrown exception, on ANY of the three reads this
 * function issues — fails OPEN to a fully empty board rather than throwing
 * or rendering a partially-populated one (`/kudos` has no auth guard,
 * BR-015; an empty board only ever renders the empty states BR-011/BR-012
 * already define, never a 500).
 *
 * Deliberately does NOT know about `kudo_hearts` (migration `0007`,
 * F008_KudosHeartReaction) — plan.md AD-2: this keeps F007 runnable and
 * testable before `0007` is ever applied.
 *
 * The row shape, column list, injected-client surface and the single
 * `selectCards` read live in `./kudos-cards-query` (a size split only).
 * Both client types are re-exported below so `@/dal/kudos` stays the one
 * import path for this DAL — `kudos-client.ts` and this file's own test
 * still reach them here.
 */

export type { KudosCardsQuery, KudosClient } from "./kudos-cards-query";

export type KudosPerson = {
  /** `null` on the sender of an anonymous kudo (AD-2) — the view's only
   * anonymity signal, never a second `isAnonymous` flag. Never `null` for a
   * receiver: `kudos_cards` masks the sender side only. */
  id: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  department: string | null;
  kudosReceived: number;
};

export type KudosCard = {
  id: string;
  content: string;
  hashtags: string[];
  imageUrls: string[];
  heartCount: number;
  createdAt: string;
  sender: KudosPerson;
  receiver: KudosPerson;
};

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

/**
 * Resolves the whole `/kudos` board in one call: the Highlight carousel
 * (top `HIGHLIGHT_LIMIT` by `heart_count`, BR-001), one Feed page (keyset
 * `cursor` on `created_at`, AD-5 — no `OFFSET`), and the unfiltered totals
 * `kudos_cards` also carries: Spotlight's real count (BR-009), distinct
 * receiver names for its scatter (real receivers, per `clarifications.md`
 * § Spotlight), and the distinct hashtag/department lists
 * `KudosFilterBar`'s dropdowns render (FR-206). `hashtag`/`department`
 * filter Highlight and Feed together (BR-003); the totals read stays
 * unfiltered — Spotlight's totals and the filter option lists are
 * board-wide, not scoped to the current selection.
 *
 * Fails open to a fully empty board on a Supabase error, a null result, or
 * a thrown exception from ANY of the three reads — never a partially-
 * populated board from a partially-failed read.
 */
export async function getKudosBoard(
  client: KudosClient,
  options: GetKudosBoardOptions = {},
): Promise<KudosBoard> {
  const { hashtag, department, cursor } = options;

  try {
    const [totalsRows, highlightRows, feedRows] = await Promise.all([
      selectCards(client, {}),
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
      spotlightTotal: totalsRows.length,
      spotlightNames: dedupe(
        totalsRows.map((row) => row.receiver_full_name).filter(isPresent),
      ),
      filters: {
        hashtags: dedupe(totalsRows.flatMap((row) => toArray(row.hashtags))),
        departments: dedupe(
          totalsRows.map((row) => row.receiver_department).filter(isPresent),
        ),
      },
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
