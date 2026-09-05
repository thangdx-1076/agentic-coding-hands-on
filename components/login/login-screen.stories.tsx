import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LoginScreen } from "./login-screen";

/**
 * Story route cho `/login` (FR-005, US004) — `LoginScreen` đã là component
 * trình bày thuần với mọi prop có default là copy `vi` của Figma
 * (`defaultLoginCopy`), nên `Default` chỉ cần override hai callback để
 * click không ném lỗi trong Storybook. Đăng nhập được mock qua prop
 * `onLoginClick` (BR-003) — không dùng handler MSW `/auth/v1/authorize`.
 */
const meta = {
  title: "Screens/LoginScreen",
  component: LoginScreen,
  args: {
    onLoginClick: () => {
      // no-op cho Storybook — route thật điều hướng OAuth qua Supabase
    },
    onSelectLocale: () => {
      // no-op cho Storybook — route thật đổi locale qua next-intl
    },
  },
} satisfies Meta<typeof LoginScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
