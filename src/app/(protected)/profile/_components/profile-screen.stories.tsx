import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleProfileCopy } from "../_shared/profile-copy";

import { ProfileScreen } from "./profile-screen";

const meta = {
  title: "Screens/ProfileScreen",
  component: ProfileScreen,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ProfileScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

const viewer = {
  email: "sunner@sun-asterisk.com",
  isAdmin: false,
  unreadCount: 0,
};

/** Both fixtures point `avatarUrl` at LOCAL assets out of
 * `staticDirs: ["../public"]` rather than a third-party placeholder
 * service: `ProfileHero` renders it through `next/image`, which rejects
 * any host absent from `src/configs/image-remote-patterns.ts` — and that
 * allowlist deliberately covers only Supabase Storage and the Google
 * avatar CDN, never a story fixture's host. */
const selfProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  fullName: "Huỳnh Dương Xuân Nhật",
  avatarUrl: "/kudos/avatar-sender.png",
};

const otherProfile = {
  id: "22222222-2222-2222-2222-222222222222",
  fullName: "Nguyễn Văn A",
  avatarUrl: "/kudos/avatar-receiver.png",
};

/** Own profile — statistics card (5 rows × `0`) + "Mở Secret Box" disabled;
 * KUDOS dropdown offers both directions. */
export const Self: Story = {
  args: {
    copy: sampleProfileCopy,
    profile: selfProfile,
    isSelf: true,
    viewer,
  },
};

/** Another Sunner's profile — statistics card is REPLACED by a disabled
 * "Viết Kudo" bar (C8); KUDOS dropdown offers Received only (SEC_001). */
export const Other: Story = {
  args: {
    copy: sampleProfileCopy,
    profile: otherProfile,
    isSelf: false,
    viewer,
  },
};
