import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconDown } from "./icon-down";

const meta = {
  component: IconDown,
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#00101A",
          color: "#FFFFFF",
          padding: "16px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconDown>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon mũi tên xuống dùng `currentColor` — trong thực tế kế thừa màu trắng
 * từ header đăng nhập, nên story đặt trên nền tối `#00101A` cho thấy được.
 */
export const Default: Story = {
  args: {},
};
