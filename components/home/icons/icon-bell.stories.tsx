import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconBell } from "./icon-bell";

const meta = {
  component: IconBell,
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
} satisfies Meta<typeof IconBell>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon chuông thông báo dùng `currentColor` — trong thực tế kế thừa màu
 * trắng từ header, nên story đặt trên nền tối `#00101A` cho thấy được.
 */
export const Default: Story = {
  args: {},
};
