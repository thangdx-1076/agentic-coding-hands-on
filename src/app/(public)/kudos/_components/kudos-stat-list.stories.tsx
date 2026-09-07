import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  KudosStatList,
  type KudosStatListCopy,
  type KudosStats,
} from "./kudos-stat-list";

const meta = {
  title: "Kudos/KudosStatList",
  component: KudosStatList,
} satisfies Meta<typeof KudosStatList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Literal `messages/vi.json` `kudos.sidebar` strings (phase 02). */
const sampleCopy: KudosStatListCopy = {
  received: "Số Kudos bạn nhận được:",
  sent: "Số Kudos bạn đã gửi:",
  hearts: "Số tim bạn nhận được:",
  boxOpened: "Số Secret Box bạn đã mở:",
  boxUnopened: "Số Secret Box chưa mở:",
  openGift: "Mở Secret Box 🎁",
  openGiftDisabledTitle: "Tính năng đang được phát triển",
};

/** "25" is the Figma frame's own literal placeholder value for the first
 * 3 rows (`2940:13491`/`13492`/`3241:14882`); the 2 Secret Box rows are `0`
 * because no gift system exists yet (AD-8) — a real count, not a stand-in. */
const sampleStats: KudosStats = {
  received: 25,
  sent: 25,
  hearts: 25,
  secretBoxOpened: 0,
  secretBoxUnopened: 0,
};

/** Authenticated — exactly 5 `kudos-stat-row`, "Mở Secret Box" disabled (C27). */
export const Authenticated: Story = {
  args: { stats: sampleStats, copy: sampleCopy },
};

/** Anonymous — `stats={null}` renders nothing at all, not a hidden/empty
 * block (D001, C09): 0 `kudos-stat-row`, no `kudos-open-gift`. */
export const Anonymous: Story = {
  args: { stats: null, copy: sampleCopy },
};
