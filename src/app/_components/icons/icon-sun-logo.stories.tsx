import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconSunLogo } from "./icon-sun-logo";

const meta = {
  component: IconSunLogo,
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
} satisfies Meta<typeof IconSunLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Logo Sun* nhiều màu (không dùng `currentColor` — code-rules §2a ngoại lệ
 * multi-color). Dùng trong pill thu gọn của Widget Button và option "Thể lệ"
 * ở panel mở rộng.
 */
export const Default: Story = {
  args: {},
};
