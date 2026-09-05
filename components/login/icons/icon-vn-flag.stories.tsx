import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconVnFlag } from "./icon-vn-flag";

const meta = {
  component: IconVnFlag,
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#00101A",
          padding: "16px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconVnFlag>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Cờ Việt Nam dùng trong bộ chọn ngôn ngữ — bảng màu gốc từ Figma, đặt trên
 * nền tối `#00101A` giống ngữ cảnh thật trong header đăng nhập.
 */
export const Default: Story = {
  args: {},
};
