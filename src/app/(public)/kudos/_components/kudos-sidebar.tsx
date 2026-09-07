import {
  KudosLeaderboard,
  type KudosLeaderboardItemData,
} from "./kudos-leaderboard";
import {
  KudosStatList,
  type KudosStatListCopy,
  type KudosStats,
} from "./kudos-stat-list";

/**
 * Slot `mm:2940:13488` `mms_D_Thống menu phải` — right column of `/kudos`:
 * the personal stat block (hidden entirely for anonymous viewers, D001)
 * stacked above the two public leaderboards (always visible — they're
 * public data, not the viewer's own). Composition only; `page.tsx` /
 * `kudos-screen.tsx` (phase 13) own fetching `stats`/`rankUps`/
 * `giftRecipients` and placing this column beside the feed.
 */
export type KudosSidebarCopy = KudosStatListCopy & {
  rankBoardTitle: string;
  giftBoardTitle: string;
  emptyBoard: string;
};

export type KudosSidebarProps = {
  stats: KudosStats | null;
  copy: KudosSidebarCopy;
  rankUps: KudosLeaderboardItemData[];
  giftRecipients: KudosLeaderboardItemData[];
};

export function KudosSidebar({
  stats,
  copy,
  rankUps,
  giftRecipients,
}: KudosSidebarProps) {
  return (
    // mm:2940:13488 — own scroll container (FR-211), independent of the
    // feed's infinite-scroll column next to it.
    <aside
      data-testid="kudos-sidebar"
      className="flex w-full max-w-[422px] flex-col gap-6 self-start overflow-y-auto"
      style={{ scrollbarColor: "#999999 transparent", scrollbarWidth: "thin" }}
    >
      <KudosStatList stats={stats} copy={copy} />
      {/* Both boards share the one list-item shape the design draws
       * (`2940:13510`) — "10 SUNNER CÓ SỰ THĂNG HẠNG MỚI NHẤT" has no
       * distinct frame of its own (see kudos-leaderboard.tsx). */}
      <KudosLeaderboard
        title={copy.rankBoardTitle}
        emptyLabel={copy.emptyBoard}
        items={rankUps}
      />
      <KudosLeaderboard
        title={copy.giftBoardTitle}
        emptyLabel={copy.emptyBoard}
        items={giftRecipients}
      />
    </aside>
  );
}
