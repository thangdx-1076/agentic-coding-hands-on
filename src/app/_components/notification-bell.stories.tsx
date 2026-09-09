import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { defaultSiteChromeCopy } from "../_shared/site-chrome";

import { NotificationBell } from "./notification-bell";

const meta = {
  component: NotificationBell,
  args: {
    label: "Thông báo",
    copy: defaultSiteChromeCopy.notifications,
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
} satisfies Meta<typeof NotificationBell>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Không có thông báo chưa đọc (mm:I2167:9091;186:2101) — không có badge đỏ.
 */
export const NoUnread: Story = {
  args: {
    unreadCount: 0,
  },
};

/**
 * Có thông báo chưa đọc — badge số hiện ở góc trên-phải icon chuông
 * (phase-08: dot → số, FR-002/TC-004).
 */
export const WithUnread: Story = {
  args: {
    unreadCount: 3,
  },
};

/**
 * Badge cap "9+" khi vượt quá 9 thông báo chưa đọc (TC-005).
 */
export const WithUnreadCapped: Story = {
  args: {
    unreadCount: 12,
  },
};

/**
 * Trạng thái panel đang mở — mở bằng `play` (click thật) rồi assert
 * `role="dialog"`. Không có backend thật trong Storybook nên
 * `useNotifications`'s fetch fail → panel rơi vào cùng nhánh hiển thị với
 * trạng thái trống thật (`notification-panel.tsx`'s `showEmptyState`),
 * nên nội dung vẫn là `copy.empty`.
 */
export const Open: Story = {
  args: {
    unreadCount: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { expanded: false });

    await userEvent.click(trigger);

    const dialog = canvas.getByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    await expect(dialog).toHaveTextContent("Bạn chưa có thông báo");
  },
};
