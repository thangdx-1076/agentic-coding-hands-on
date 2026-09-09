import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconNotificationHeart } from "./icon-notification-heart";

const meta = {
  component: IconNotificationHeart,
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
} satisfies Meta<typeof IconNotificationHeart>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon `heart_received` dùng `currentColor` — đặt trên nền panel tối
 * `#0B0F12` như trong `NotificationItem` thật.
 */
export const Default: Story = {
  args: {},
};
