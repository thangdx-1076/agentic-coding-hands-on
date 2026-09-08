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

/** Literal `messages/vi.json` `kudos.sidebar`/`kudos.secretBox` strings
 * (phase 02 + phase 05). */
const sampleCopy: KudosStatListCopy = {
  received: "Số Kudos bạn nhận được:",
  sent: "Số Kudos bạn đã gửi:",
  hearts: "Số tim bạn nhận được:",
  boxOpened: "Số Secret Box bạn đã mở:",
  boxUnopened: "Số Secret Box chưa mở:",
  openGift: "Mở Secret Box 🎁",
  openGiftDisabledTitle: "Tính năng đang được phát triển",
  secretBox: {
    titleUnopened: "KHÁM PHÁ SECRET BOX CỦA BẠN",
    titleRevealed: "MỞ SECRET BOX THÀNH CÔNG",
    instruction: "Click vào box để tiếp tục mở",
    label: "Secretbox chưa mở",
    close: "Đóng",
    error: "Có lỗi khi mở Secret Box, vui lòng thử lại",
  },
};

/** "25" is the Figma frame's own literal placeholder value for the first
 * 3 rows (`2940:13491`/`13492`/`3241:14882`); the 2 Secret Box rows reflect
 * a viewer with no unopened boxes left (real numbers, phase 04/05). */
const sampleStats: KudosStats = {
  received: 25,
  sent: 25,
  hearts: 25,
  secretBoxOpened: 5,
  secretBoxUnopened: 0,
};

/** Same viewer, but with 1 box left to open (`SecretBoxLauncher` mounts the
 * dialog + enables the button — S01/S13's server-first-paint condition). */
const sampleStatsUnopened: KudosStats = {
  ...sampleStats,
  secretBoxUnopened: 1,
};

/** Authenticated, 0 unopened — exactly 5 `kudos-stat-row`, "Mở Secret Box" disabled (C27). */
export const Authenticated: Story = {
  args: { stats: sampleStats, copy: sampleCopy },
};

/** Authenticated, 1+ unopened — "Mở Secret Box" enabled, dialog mounted. */
export const AuthenticatedWithUnopenedBox: Story = {
  args: { stats: sampleStatsUnopened, copy: sampleCopy },
};

/** Anonymous — `stats={null}` renders nothing at all, not a hidden/empty
 * block (D001, C09): 0 `kudos-stat-row`, no `kudos-open-gift`. */
export const Anonymous: Story = {
  args: { stats: null, copy: sampleCopy },
};
