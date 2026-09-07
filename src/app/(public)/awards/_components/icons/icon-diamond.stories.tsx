import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconDiamond } from "./icon-diamond";

const meta = {
  component: IconDiamond,
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
} satisfies Meta<typeof IconDiamond>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon `currentColor` — nền tối #00101A + màu vàng gold (#FFEA9E) như khi
 * đứng cạnh nhãn "Số lượng giải thưởng:".
 */
export const Default: Story = {
  args: {},
};
