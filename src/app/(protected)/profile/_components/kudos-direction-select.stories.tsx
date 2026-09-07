import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleProfileCopy } from "../_shared/profile-copy";

import { KudosDirectionSelect } from "./kudos-direction-select";

const meta = {
  title: "Profile/KudosDirectionSelect",
  component: KudosDirectionSelect,
} satisfies Meta<typeof KudosDirectionSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Self — both directions, trigger starts at "Đã nhận (0)". */
export const SelfBothDirections: Story = {
  args: {
    directions: ["received", "sent"],
    copy: sampleProfileCopy.kudosDirection,
  },
};

/** Other — Received ONLY; "sent" is absent from the array entirely, not
 * disabled/hidden (SEC_001, C9b). */
export const OtherReceivedOnly: Story = {
  args: {
    directions: ["received"],
    copy: sampleProfileCopy.kudosDirection,
  },
};
