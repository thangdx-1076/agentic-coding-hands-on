import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconNotificationBox } from "./icon-notification-box";

const meta = {
  component: IconNotificationBox,
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
} satisfies Meta<typeof IconNotificationBox>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Icon `secret_box_available` dùng `currentColor` — ribbon cut-out hardcode
 * `#0B0F12` khớp nền panel thật (`NotificationItem`).
 */
export const Default: Story = {
  args: {},
};
