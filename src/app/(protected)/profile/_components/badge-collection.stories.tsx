import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleProfileCopy } from "../_shared/profile-copy";

import { BadgeCollection } from "./badge-collection";

const meta = {
  title: "Profile/BadgeCollection",
  component: BadgeCollection,
} satisfies Meta<typeof BadgeCollection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Self view — "Bộ sưu tập icon của tôi", all 6 slots locked. */
export const Self: Story = {
  args: { heading: sampleProfileCopy.badges.headingSelf },
};

/** Other view — "Bộ sưu tập icon" (no name interpolation, GUI_003). */
export const Other: Story = {
  args: { heading: sampleProfileCopy.badges.headingOther },
};
