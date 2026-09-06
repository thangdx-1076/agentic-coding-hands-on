import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { NotificationBell } from "./notification-bell";

const meta = {
  component: NotificationBell,
  args: {
    label: "Thông báo",
    emptyStateText: "Bạn chưa có thông báo",
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
 * Có thông báo chưa đọc — badge đỏ hiện ở góc trên-phải icon chuông.
 * `unreadCount` INFERRED cho story minh hoạ; nguồn dữ liệu thật chưa có
 * (clarifications.md § Header, ghi nợ).
 */
export const WithUnread: Story = {
  args: {
    unreadCount: 3,
  },
};

/**
 * Trạng thái panel đang mở — mở bằng `play` (click thật) rồi assert
 * `role="dialog"` chứa nội dung empty-state.
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
