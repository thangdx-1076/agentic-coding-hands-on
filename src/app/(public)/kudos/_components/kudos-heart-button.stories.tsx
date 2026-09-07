import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultKudosCopy } from "../_shared/kudos-copy";

import { KudosHeartButton } from "./kudos-heart-button";

const meta = {
  title: "Kudos/KudosHeartButton",
  component: KudosHeartButton,
} satisfies Meta<typeof KudosHeartButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotHearted: Story = {
  args: { hearted: false, count: 10, heartLabel: defaultKudosCopy.heartLabel },
};

export const Hearted: Story = {
  args: { hearted: true, count: 11, heartLabel: defaultKudosCopy.heartLabel },
};

/** FR-602 — anonymous viewer: disabled, title invites sign-in. */
export const AnonymousDisabled: Story = {
  args: {
    hearted: false,
    disabled: true,
    title: defaultKudosCopy.signInToHeart,
    count: 10,
    heartLabel: defaultKudosCopy.heartLabel,
  },
};

/** BR-002 — sender viewing their own kudo: disabled, no sign-in copy applies. */
export const OwnKudoDisabled: Story = {
  args: {
    hearted: false,
    disabled: true,
    title: "Không thể thả tim cho kudos của chính mình",
    count: 10,
    heartLabel: defaultKudosCopy.heartLabel,
  },
};
