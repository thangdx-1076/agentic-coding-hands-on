import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconUpRight } from "./icon-up-right";

const meta = {
  component: IconUpRight,
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
} satisfies Meta<typeof IconUpRight>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Mũi tên "đi tới" dùng `currentColor` — xuất hiện lặp lại ở CTA hero, mọi
 * link "Chi tiết" và menu Widget nên đặt trên nền tối để thấy màu trắng kế
 * thừa mặc định.
 */
export const Default: Story = {
  args: {},
};
