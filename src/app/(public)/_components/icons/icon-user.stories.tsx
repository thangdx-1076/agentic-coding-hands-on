import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconUser } from "./icon-user";

const meta = {
  component: IconUser,
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
} satisfies Meta<typeof IconUser>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon tài khoản dùng `currentColor` — trong thực tế kế thừa màu trắng từ
 * header, nên story đặt trên nền tối `#00101A` cho thấy được.
 */
export const Default: Story = {
  args: {},
};
