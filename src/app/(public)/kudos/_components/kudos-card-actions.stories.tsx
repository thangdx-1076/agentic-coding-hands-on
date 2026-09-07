import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultKudosCopy } from "../_shared/kudos-copy";

import { KudosCardActions } from "./kudos-card-actions";

const meta = {
  title: "Kudos/KudosCardActions",
  component: KudosCardActions,
  args: { copy: defaultKudosCopy },
} satisfies Meta<typeof KudosCardActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { hearted: false, heartCount: 10 },
};

export const Hearted: Story = {
  args: { hearted: true, heartCount: 11 },
};

export const AnonymousHeartDisabled: Story = {
  args: {
    hearted: false,
    heartDisabled: true,
    heartTitle: defaultKudosCopy.signInToHeart,
    heartCount: 10,
  },
};

/** mm:C.4_Button (`I3127:21871;256:5194`) — feed's own action bar has no
 * detail button (content-click opens detail there instead, § out of scope). */
export const FeedNoDetail: Story = {
  args: { hearted: false, heartCount: 10, showDetail: false },
};
