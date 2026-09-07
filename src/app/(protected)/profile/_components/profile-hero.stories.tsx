import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleProfileCopy } from "../_shared/profile-copy";

import { ProfileHero } from "./profile-hero";

const meta = {
  title: "Profile/ProfileHero",
  component: ProfileHero,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ProfileHero>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Full name renders directly — no fallback needed. */
export const WithFullName: Story = {
  args: {
    profile: {
      fullName: "Huỳnh Dương Xuân Nhật",
      avatarUrl: "https://i.pravatar.cc/400",
    },
    copy: sampleProfileCopy.hero,
  },
};

/** `fullName: null` (sparse profile) → `copy.fallbackName` ("Sunner"). */
export const FallbackName: Story = {
  args: {
    profile: { fullName: null, avatarUrl: null },
    copy: sampleProfileCopy.hero,
  },
};
