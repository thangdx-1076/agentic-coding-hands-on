import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleAwards } from "../_shared/awards-copy";

import { AwardsScreen } from "./awards-screen";

/**
 * Story route cho `/awards` (F004_AwardSystemPage) — dựng từ `AwardsScreen`,
 * component trình bày thuần. Repo quy ước mỗi route chính có 1 story dựng từ
 * component trình bày (`/` → `HomeScreen`), dù `AwardsScreen` là composition
 * component không bắt buộc theo skill. `logoutAction` no-op cho Storybook,
 * mirror `home-screen.stories.tsx`.
 */
const meta = {
  title: "Screens/AwardsScreen",
  component: AwardsScreen,
  args: {
    awards: sampleAwards,
    onSelectLocale: () => {
      // no-op cho Storybook — route thật đổi locale qua next-intl
    },
    logoutAction: async () => {
      // no-op cho Storybook — route thật dùng Server Action `logoutAction`
    },
  },
} satisfies Meta<typeof AwardsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Khách chưa đăng nhập — header hiện link `/login`, KHÔNG có bell
 * (clarifications.md: `/awards` là public, không gác đăng nhập).
 */
export const Anonymous: Story = {
  args: {
    viewer: null,
  },
};

/**
 * Thành viên đã đăng nhập — bell + menu tài khoản.
 */
export const Member: Story = {
  args: {
    viewer: { email: "member@sun-asterisk.com", isAdmin: false },
    unreadCount: 2,
  },
};

/**
 * Supabase fail-open (`awards: []`) — hero/header/Kudos/footer vẫn còn,
 * KHÔNG render `<nav>` hay section nào, hiện `AwardsEmptyState` thay vào đó.
 */
export const Empty: Story = {
  args: {
    awards: [],
    viewer: null,
  },
};
