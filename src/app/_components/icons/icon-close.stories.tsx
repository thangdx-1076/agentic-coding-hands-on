import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconClose } from "./icon-close";

const meta = {
  component: IconClose,
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
} satisfies Meta<typeof IconClose>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon dấu × dùng `currentColor` — trong Widget Button FAB nó kế thừa màu
 * trắng từ nút tròn đỏ `#D4271D`, story đặt trên nền tối để nhìn rõ hình
 * dạng icon, theo đúng pattern của `icon-pencil.stories.tsx`.
 */
export const Default: Story = {
  args: {},
};
