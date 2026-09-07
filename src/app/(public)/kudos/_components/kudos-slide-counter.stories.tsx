import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosSlideCounter } from "./kudos-slide-counter";

const meta = {
  title: "Kudos/KudosSlideCounter",
  component: KudosSlideCounter,
  parameters: {
    backgrounds: { default: "dark" },
  },
} satisfies Meta<typeof KudosSlideCounter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstOfFive: Story = {
  args: { index: 0, count: 5 },
};

export const LastOfFive: Story = {
  args: { index: 4, count: 5 },
};

/** BR-003 — a hashtag/department filter can shrink the board below 5. */
export const FilteredToThree: Story = {
  args: { index: 0, count: 3 },
};
