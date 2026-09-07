import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  KudosLeaderboard,
  type KudosLeaderboardItemData,
} from "./kudos-leaderboard";

const meta = {
  title: "Kudos/KudosLeaderboard",
  component: KudosLeaderboard,
} satisfies Meta<typeof KudosLeaderboard>;

export default meta;

type Story = StoryObj<typeof meta>;

const EMPTY_LABEL = "Chưa có dữ liệu";

/** Name/description/avatar copied verbatim from the repeated Figma
 * placeholder row (`2940:13516`-`2940:13520`), 3 of the design's 5 slots. */
const sampleItems: KudosLeaderboardItemData[] = [
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
  {
    id: "sample-sunner-3",
    name: "Huỳnh Dương Xuân",
    description: "Nhận được 1 áo phông SAA",
    avatarSrc: "/kudos/avatar-gift-recipient.png",
  },
];

/** Current production state (FR-213/BR-012/C08): no gift/rank data source
 * exists yet, so this is what both boards show today. */
export const Empty: Story = {
  args: {
    title: "10 SUNNER NHẬN QUÀ MỚI NHẤT",
    emptyLabel: EMPTY_LABEL,
    items: [],
  },
};

/** Once a board has data — avatar + name (`<Link href="/profile?id=">`) +
 * description, independently scrollable past 5 rows. */
export const Filled: Story = {
  args: {
    title: "10 SUNNER NHẬN QUÀ MỚI NHẤT",
    emptyLabel: EMPTY_LABEL,
    items: sampleItems,
  },
};
