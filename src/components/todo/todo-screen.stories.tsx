import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import viMessages from "../../../messages/vi.json";

import { TodoScreen } from "./todo-screen";

/**
 * Story route cho `/todo` (FR-005, US004) — dựng từ `TodoScreen`, component
 * trình bày thuần được tách ra khỏi `app/todo/page.tsx`. Copy lấy nguyên từ
 * `messages/vi.json` (`todo.greeting`, `todo.logout`); placeholder
 * `{email}` trong `greeting` được thay bằng một địa chỉ demo, không phải
 * email thật của ai.
 */
const demoEmail = "demo@example.com";

const meta = {
  title: "Screens/TodoScreen",
  component: TodoScreen,
  args: {
    greeting: viMessages.todo.greeting.replace("{email}", demoEmail),
    logoutLabel: viMessages.todo.logout,
    logoutAction: async () => {
      // no-op cho Storybook — route thật dùng Server Action `logoutAction`
    },
  },
} satisfies Meta<typeof TodoScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
