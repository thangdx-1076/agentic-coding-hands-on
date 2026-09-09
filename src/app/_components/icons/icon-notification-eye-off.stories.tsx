import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconNotificationEyeOff } from "./icon-notification-eye-off";

const meta = {
  component: IconNotificationEyeOff,
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
} satisfies Meta<typeof IconNotificationEyeOff>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon `kudos_hidden` dùng `currentColor` (qua `stroke`) — đặt trên nền
 * panel tối `#0B0F12` như trong `NotificationItem` thật.
 */
export const Default: Story = {
  args: {},
};
