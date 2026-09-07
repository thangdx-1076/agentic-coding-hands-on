import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosEmptyState } from "./kudos-empty-state";

const meta = {
  title: "Kudos/KudosEmptyState",
  component: KudosEmptyState,
} satisfies Meta<typeof KudosEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

/** ALL KUDOS feed with zero cards (C07). */
export const Feed: Story = {
  args: { message: "Hiện tại chưa có Kudos nào." },
};

/** Leaderboard-style empty copy (BR-011 — same component, different
 * caller string; the sidebar boards use `kudos-leaderboard.tsx` directly
 * instead, this just demonstrates the component isn't message-specific). */
export const CustomMessage: Story = {
  args: { message: "Chưa có dữ liệu" },
};
