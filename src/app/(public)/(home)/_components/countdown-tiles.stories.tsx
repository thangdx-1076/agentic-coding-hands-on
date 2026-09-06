import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CountdownTiles } from "./countdown-tiles";

const meta = {
  component: CountdownTiles,
  args: {
    daysLabel: "DAYS",
    hoursLabel: "HOURS",
    minutesLabel: "MINUTES",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#00101A",
          padding: "24px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CountdownTiles>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Zero-state (mm:2167:9037) — hết hạn / chưa có mốc thời gian hợp lệ, mỗi ô
 * 2 chữ số "00" (clarifications.md § Hero/Countdown).
 */
export const Default: Story = {
  args: {
    days: "00",
    hours: "00",
    minutes: "00",
  },
};

/**
 * Trạng thái sống — chứng minh `days` KHÔNG bị kẹp ở 2 chữ số khi mốc sự
 * kiện còn xa (>=100 ngày hiện 3 chữ số), theo clarifications.md §
 * Hero/Countdown.
 */
export const Live: Story = {
  args: {
    days: "120",
    hours: "05",
    minutes: "32",
  },
};
