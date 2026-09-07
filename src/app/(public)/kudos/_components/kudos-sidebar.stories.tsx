import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { KudosLeaderboardItemData } from "./kudos-leaderboard";
import { KudosSidebar, type KudosSidebarCopy } from "./kudos-sidebar";
import type { KudosStats } from "./kudos-stat-list";

const meta = {
  title: "Kudos/KudosSidebar",
  component: KudosSidebar,
} satisfies Meta<typeof KudosSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Literal `messages/vi.json` `kudos.sidebar` strings (phase 02). */
const sampleCopy: KudosSidebarCopy = {
  received: "Số Kudos bạn nhận được:",
  sent: "Số Kudos bạn đã gửi:",
  hearts: "Số tim bạn nhận được:",
  boxOpened: "Số Secret Box bạn đã mở:",
  boxUnopened: "Số Secret Box chưa mở:",
  openGift: "Mở Secret Box 🎁",
  openGiftDisabledTitle: "Tính năng đang được phát triển",
  rankBoardTitle: "10 SUNNER CÓ SỰ THĂNG HẠNG MỚI NHẤT",
  giftBoardTitle: "10 SUNNER NHẬN QUÀ MỚI NHẤT",
  emptyBoard: "Chưa có dữ liệu",
};

const sampleStats: KudosStats = {
  received: 25,
  sent: 25,
  hearts: 25,
  secretBoxOpened: 0,
  secretBoxUnopened: 0,
};

const sampleGiftRecipients: KudosLeaderboardItemData[] = [
  {
    id: "sample-sunner-1",
    name: "Huỳnh Dương Xuân",
    description: "Nhận được 1 áo phông SAA",
    avatarSrc: "/kudos/avatar-gift-recipient.png",
  },
  {
    id: "sample-sunner-2",
    name: "Huỳnh Dương Xuân",
    description: "Nhận được 1 áo phông SAA",
    avatarSrc: "/kudos/avatar-gift-recipient.png",
  },
];

/** Signed in — 5 `kudos-stat-row` + disabled "Mở Secret Box"; both boards
 * still empty (today's real production state, C08 + C27). */
export const Authenticated: Story = {
  args: {
    stats: sampleStats,
    copy: sampleCopy,
    rankUps: [],
    giftRecipients: [],
  },
};

/** Anonymous — the whole stat block is absent (D001, C09): 0
 * `kudos-stat-row`, no `kudos-open-gift`. Both leaderboards stay visible —
 * they're public data, not the viewer's own. */
export const Anonymous: Story = {
  args: {
    stats: null,
    copy: sampleCopy,
    rankUps: [],
    giftRecipients: [],
  },
};

/** Same empty state as `Authenticated`, named explicitly for the
 * per-board-not-shared-empty-state contract (FR-213). */
export const BothBoardsEmpty: Story = {
  args: {
    stats: sampleStats,
    copy: sampleCopy,
    rankUps: [],
    giftRecipients: [],
  },
};

/** Exactly one board has data — the empty state is per-board, not shared
 * (FR-213): only the rank-up board should read "Chưa có dữ liệu". */
export const OneBoardFilled: Story = {
  args: {
    stats: sampleStats,
    copy: sampleCopy,
    rankUps: [],
    giftRecipients: sampleGiftRecipients,
  },
};
