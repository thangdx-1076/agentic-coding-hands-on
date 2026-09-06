import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconPencil } from "./icon-pencil";

const meta = {
  component: IconPencil,
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
} satisfies Meta<typeof IconPencil>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon bút chì dùng `currentColor` — trong Widget Button nó kế thừa màu tối
 * `#00101A` từ nền vàng, nhưng story đặt trên nền tối `#00101A` với chữ
 * trắng để nhìn rõ hình dạng icon, theo đúng pattern của `icon-down.stories.tsx`.
 */
export const Default: Story = {
  args: {},
};
