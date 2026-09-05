import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconGoogle } from "./icon-google";

const meta = {
  component: IconGoogle,
} satisfies Meta<typeof IconGoogle>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Logo "G" của Google dùng trong nút đăng nhập — bảng màu gốc từ Figma,
 * hiển thị được trên cả nền sáng lẫn nền tối.
 */
export const Default: Story = {
  args: {},
};
