"use client";

import { useSpotlightSearch } from "../_hooks/use-spotlight-search";

import { KudosSpotlightScatter } from "./kudos-spotlight-scatter";
import { KudosSunnerSearch } from "./kudos-sunner-search";

export type KudosSpotlightCopy = {
  eyebrow: string;
  heading: string;
  totalSuffix: string;
  searchPlaceholder: string;
  searchSubmit: string;
  /** Not part of the `kudos.spotlight` i18n namespace yet — falls back to a
   * static Vietnamese message when omitted, same pattern as
   * `kudos-stat-list.tsx`'s `openGiftDisabledTitle`. */
  emptyMessage?: string;
  /** Same not-yet-namespaced pattern as `emptyMessage` above — the fixed
   * tail of the bottom-left ticker sentence (`mm:3004:15995` etc.), e.g.
   * "08:30PM {name} đã nhận được một Kudos mới". */
  tickerSuffix?: string;
};

/** A single real kudo (receiver + timestamp) to drive the bottom-left
 * ticker — NOT the design's literal "Nguyễn Bá Chức"/"08:30PM". Pass the
 * most recent card from `KudosBoard.feed.items` (already sorted
 * `created_at desc`); omit or pass `null` to render no ticker rather than
 * inventing one. */
export type KudosSpotlightLatestKudo = {
  receiverName: string;
  createdAt: string;
};

export type KudosSpotlightProps = {
  /** Real DB row count (BR-009, C20) — NEVER the design's literal "388". */
  total: number;
  /** Real receiver names (`KudosBoard.spotlightNames`) — already
   * deduplicated by `getKudosBoard`. */
  names: readonly string[];
  copy: KudosSpotlightCopy;
  /** Optional — see `KudosSpotlightLatestKudo`. */
  latestKudo?: KudosSpotlightLatestKudo | null;
};

const DEFAULT_EMPTY_MESSAGE = "Chưa có Sunner nào được ghi nhận.";
const DEFAULT_TICKER_SUFFIX = "đã nhận được một Kudos mới";

/**
 * mm:3004:15999,3004:15998,3004:15997,3004:15996,3004:15995,2940:14230 —
 * the bottom-left ticker inside `2940:14174` B.7_Spotlight. All 6 real TEXT
 * nodes carry the exact same `characters` ("08:30PM Nguyễn Bá Chức đã nhận
 * được một Kudos mới"); only their `top` offset and `opacity` differ — the
 * mock is a single scroll/fade animation frozen mid-motion, not 6 distinct
 * messages. Renders the ONE real `latestKudo` sentence at all 6 positions
 * to match that literal design content. `top`/`opacity` pairs below are
 * each node's absolute Figma position minus the card's own
 * (`startX:142, startY:1658`) — same relative-to-card convention as
 * `SLOTS` in `kudos-spotlight-scatter.tsx`. `left` is 49px for every row.
 */
const TICKER_LEFT = 49;
const TICKER_ROWS: ReadonlyArray<readonly [number, number]> = [
  [410, 0.1],
  [429, 0.3],
  [448, 0.5],
  [467, 0.7],
  [486, 1],
  [505, 1],
];

/** `08:30PM` style — 12h clock, zero-padded, no space before AM/PM, no
 * date. Deliberately its own function rather than reusing
 * `formatKudoTime` (`_utils/format-kudo-time.ts`), which renders a
 * different literal shape (`HH:mm - MM/DD/YYYY`) for the feed/card
 * timestamps elsewhere on this screen. Reads with `getUTC*` for the same
 * reason `formatKudoTime` does — output must not depend on the host
 * process's `TZ`. */
function formatTickerTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const hours24 = date.getUTCHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${String(hours12).padStart(2, "0")}:${minutes}${period}`;
}

/**
 * mm:B.6_Header Giải thưởng (`2940:13476`) + mm:B.7_Spotlight (`2940:14174`),
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ.
 *
 * Owns the section header (eyebrow/divider/heading, same shape as
 * `kudos-filter-bar.tsx`'s B.1 header) plus the Spotlight card: the real
 * total (`kudos-spotlight-total`), the Sunner search box, and the static
 * name scatter. `useSpotlightSearch` lives here (not in the scatter) so the
 * search box and the scatter it filters share one source of truth.
 *
 * No pan/zoom control is rendered — `B.7.2` (`3007:17479`) is an empty
 * frame in the design with no visual content, and clarifications.md rules
 * out building pan/zoom behavior for it.
 */
export function KudosSpotlight({
  total,
  names,
  copy,
  latestKudo,
}: KudosSpotlightProps) {
  const { query, setQuery, matched, canSubmit } = useSpotlightSearch(names);
  const tickerMessage = latestKudo
    ? `${formatTickerTime(latestKudo.createdAt)} ${latestKudo.receiverName} ${
        copy.tickerSuffix ?? DEFAULT_TICKER_SUFFIX
      }`
    : null;

  return (
    // mm:2940:13476 + mm:2940:14174
    <div
      data-testid="kudos-spotlight"
      className="flex w-full flex-col gap-4 px-6 sm:px-12 lg:px-36"
    >
      {/* mm:2940:13477 */}
      <p className="font-montserrat text-2xl leading-8 font-bold text-white">
        {copy.eyebrow}
      </p>
      {/* mm:2940:13478 */}
      <div className="h-px w-full bg-login-divider" />
      {/* mm:2940:13480 */}
      <h2 className="font-montserrat text-[57px] leading-[64px] font-bold tracking-[-0.25px] text-login-button">
        {copy.heading}
      </h2>

      {/* mm:2940:14174 */}
      <div className="relative mx-auto h-[548px] w-full max-w-[1157px] overflow-hidden rounded-[47px] border border-[#998C5F]">
        {/* mm:3007:17482 — real DB count, never the design's literal "388" */}
        <p
          data-testid="kudos-spotlight-total"
          className="absolute top-[14px] left-[470px] font-montserrat text-[36px] leading-[44px] font-bold text-white"
        >
          {total} {copy.totalSuffix}
        </p>
        {/* mm:2940:14833 */}
        <div className="absolute top-[26px] left-[25px]">
          <KudosSunnerSearch
            query={query}
            onQueryChange={setQuery}
            canSubmit={canSubmit}
            placeholder={copy.searchPlaceholder}
            submitLabel={copy.searchSubmit}
          />
        </div>
        <KudosSpotlightScatter
          names={names}
          matched={matched}
          emptyMessage={copy.emptyMessage ?? DEFAULT_EMPTY_MESSAGE}
        />
        {/* mm:3004:15999,3004:15998,3004:15997,3004:15996,3004:15995,2940:14230 */}
        {tickerMessage
          ? TICKER_ROWS.map(([top, opacity]) => (
              <p
                key={top}
                data-testid="kudos-spotlight-ticker"
                style={{ left: TICKER_LEFT, top, opacity }}
                className="absolute font-montserrat text-sm leading-5 font-bold tracking-[0.1px] whitespace-nowrap text-white"
              >
                {tickerMessage}
              </p>
            ))
          : null}
      </div>
    </div>
  );
}
