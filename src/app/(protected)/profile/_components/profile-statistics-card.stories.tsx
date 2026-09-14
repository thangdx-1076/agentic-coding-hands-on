import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleProfileCopy } from "../_shared/profile-copy";

import { ProfileStatisticsCard } from "./profile-statistics-card";

const meta = {
  title: "Profile/ProfileStatisticsCard",
  component: ProfileStatisticsCard,
} satisfies Meta<typeof ProfileStatisticsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Self — 5 rows carrying the viewer's real counters, 1 divider, disabled
 * "Mở Secret Box". */
export const Self: Story = {
  args: {
    copy: sampleProfileCopy.stats,
    isSelf: true,
    profileId: "00000000-0000-4000-8000-000000000001",
    stats: {
      received: 12,
      sent: 7,
      hearts: 23,
      secretBoxOpened: 3,
      secretBoxUnopened: 1,
    },
  },
};

/** Self, before anyone has sent them anything — every row reads `0`. This is
 * also what a failed Supabase read renders, since `getKudosStats` fails open
 * to all-zero rather than throwing. */
export const SelfEmpty: Story = {
  args: {
    ...Self.args,
    stats: {
      received: 0,
      sent: 0,
      hearts: 0,
      secretBoxOpened: 0,
      secretBoxUnopened: 0,
    },
  },
};

/** Other — ONLY a disabled "Viết Kudo" bar, no rows, no Secret Box button
 * (mutually exclusive with `Self` — C8). */
export const Other: Story = {
  args: {
    copy: sampleProfileCopy.stats,
    isSelf: false,
    profileId: "00000000-0000-4000-8000-000000000001",
    stats: null,
  },
};
