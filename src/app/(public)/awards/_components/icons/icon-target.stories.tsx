import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconTarget } from "./icon-target";

const meta = {
  component: IconTarget,
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#00101A",
          color: "#FFEA9E",
          padding: "16px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconTarget>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon `currentColor` — nền tối #00101A + màu vàng gold (#FFEA9E) như khi
 * dùng cạnh tiêu đề nav/section trên `/awards`.
 */
export const Default: Story = {
  args: {},
};
