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

const selfProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  fullName: "Huỳnh Dương Xuân Nhật",
  avatarUrl: "https://i.pravatar.cc/400",
};

const otherProfile = {
  id: "22222222-2222-2222-2222-222222222222",
  fullName: "Nguyễn Văn A",
  avatarUrl: "https://i.pravatar.cc/401",
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
