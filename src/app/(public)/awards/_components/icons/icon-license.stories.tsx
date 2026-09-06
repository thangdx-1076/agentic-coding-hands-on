import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconLicense } from "./icon-license";

const meta = {
  component: IconLicense,
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
} satisfies Meta<typeof IconLicense>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon `currentColor` — nền tối #00101A + màu vàng gold (#FFEA9E) như khi
 * đứng cạnh nhãn "Giá trị giải thưởng:".
 */
export const Default: Story = {
  args: {},
};
