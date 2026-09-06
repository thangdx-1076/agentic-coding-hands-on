import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LogoLink } from "./logo-link";

const meta = {
  component: LogoLink,
  args: {
    ariaLabel: "Sun* Annual Awards 2025",
  },
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
} satisfies Meta<typeof LogoLink>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Logo link dùng chung cho header và footer (mm:I2167:9091;178:1033,
 * mm:I5001:14800;342:1408) — story chỉ cần chứng minh nó nhận children tuỳ ý
 * (ở đây là chữ thay cho ảnh) và không lỗi khi render ngoài Next router thật.
 */
export const Default: Story = {
  args: {
    children: <span style={{ color: "#FFFFFF" }}>LOGO</span>,
  },
};
