import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleProfileCopy } from "../_shared/profile-copy";

import { ProfileStatisticsCard } from "./profile-statistics-card";

const meta = {
  title: "Profile/ProfileStatisticsCard",
  component: ProfileStatisticsCard,
} satisfies Meta<typeof ProfileStatisticsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Self — 5 rows (all `0`), 1 divider, disabled "Mở Secret Box". */
export const Self: Story = {
  args: {
    copy: sampleProfileCopy.stats,
    isSelf: true,
    profileId: "00000000-0000-4000-8000-000000000001",
  },
};

/** Other — ONLY a disabled "Viết Kudo" bar, no rows, no Secret Box button
 * (mutually exclusive with `Self` — C8). */
export const Other: Story = {
  args: {
    copy: sampleProfileCopy.stats,
    isSelf: false,
    profileId: "00000000-0000-4000-8000-000000000001",
  },
};
