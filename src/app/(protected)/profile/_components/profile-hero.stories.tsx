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

/** Full name renders directly — no fallback needed.
 *
 * `avatarUrl` points at a LOCAL asset out of `staticDirs: ["../public"]`
 * rather than a third-party placeholder service: the component renders it
 * through `next/image`, which rejects any host absent from
 * `src/configs/image-remote-patterns.ts` — and that allowlist deliberately
 * covers only Supabase Storage and the Google avatar CDN, never a story
 * fixture's host. */
export const WithFullName: Story = {
  args: {
    profile: {
      fullName: "Huỳnh Dương Xuân Nhật",
      avatarUrl: "/kudos/avatar-receiver.png",
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
