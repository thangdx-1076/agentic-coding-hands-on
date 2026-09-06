import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultHomeCopy } from "../_shared/home-copy";

import { HomeScreen } from "./home-screen";
import { CountdownTiles } from "./countdown-tiles";

/**
 * Story route cho `/` (F003 Homepage) — dựng từ `HomeScreen`, component trình
 * bày thuần. `logoutAction` là no-op cho Storybook, mirror
 * `(protected)/todo/_components/todo-screen.stories.tsx` (route thật dùng
 * Server Action `logoutAction` từ `app/_actions/logout.ts`, xem
 * clarifications.md § Route & điều hướng).
 */
const meta = {
  title: "Screens/HomeScreen",
  component: HomeScreen,
  args: {
    onSelectLocale: () => {
      // no-op cho Storybook — route thật đổi locale qua next-intl
    },
    logoutAction: async () => {
      // no-op cho Storybook — route thật dùng Server Action `logoutAction`
    },
  },
} satisfies Meta<typeof HomeScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Khách chưa đăng nhập (TC ID-0) — header hiện link `/login`, KHÔNG có bell.
 */
export const Anonymous: Story = {
  args: {
    viewer: null,
  },
};

/**
 * Thành viên đã đăng nhập — bell + menu tài khoản 2 item (Hồ sơ, Đăng xuất),
 * KHÔNG có "Trang quản trị".
 */
export const Member: Story = {
  args: {
    viewer: { email: "member@sun-asterisk.com", isAdmin: false },
    unreadCount: 2,
  },
};

/**
 * Admin — menu tài khoản thêm "Trang quản trị" (clarifications.md § Header).
 */
export const Admin: Story = {
  args: {
    viewer: { email: "admin@sun-asterisk.com", isAdmin: true },
  },
};

/**
 * Đã qua mốc sự kiện (TC ID-41/42): 3 ô giữ nguyên "00", nhưng "Coming soon"
 * bị ẩn — khác với default slot của `HomeScreen` (luôn hiện "Coming soon"
 * cho trạng thái "chưa biết ngày"). Slot này minh hoạ nhánh còn lại mà
 * `countdown-timer.tsx` (phase tích hợp sau) sẽ tái tạo bằng state thật.
 */
export const ZeroState: Story = {
  args: {
    viewer: null,
    countdown: (
      <CountdownTiles
        days="00"
        hours="00"
        minutes="00"
        daysLabel={defaultHomeCopy.hero.days}
        hoursLabel={defaultHomeCopy.hero.hours}
        minutesLabel={defaultHomeCopy.hero.minutes}
      />
    ),
  },
};
