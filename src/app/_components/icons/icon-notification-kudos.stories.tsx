import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconNotificationKudos } from "./icon-notification-kudos";

const meta = {
  component: IconNotificationKudos,
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#0B0F12",
          color: "#998C5F",
          padding: "16px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconNotificationKudos>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon `kudos_received` dùng `currentColor` — đặt trên nền panel tối
 * `#0B0F12` như trong `NotificationItem` thật.
 */
export const Default: Story = {
  args: {},
};
