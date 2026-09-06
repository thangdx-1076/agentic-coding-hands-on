import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { AccountMenu } from "./account-menu";

const meta = {
  component: AccountMenu,
  args: {
    label: "Tài khoản",
    profileLabel: "Hồ sơ",
    adminLabel: "Trang quản trị",
    logoutLabel: "Đăng xuất",
    logoutAction: fn(),
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
} satisfies Meta<typeof AccountMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Menu tài khoản cho thành viên thường (mm:I2167:9091;186:1597) — 2 item:
 * Hồ sơ, Đăng xuất. Không có "Trang quản trị".
 */
export const Member: Story = {
  args: {
    isAdmin: false,
  },
};

/**
 * Menu tài khoản cho admin — thêm item "Trang quản trị", chỉ hiện khi
 * `role='admin'` (clarifications.md § Header).
 */
export const Admin: Story = {
  args: {
    isAdmin: true,
  },
};

/**
 * Trạng thái menu đang mở — mở bằng `play` (click thật), theo đúng pattern
 * của `language-selector.stories.tsx` `Open` story: `open` là state nội bộ
 * của `useMenuKeyboardNav`, ép mở từ ngoài sẽ là dựng lại trạng thái giả.
 */
export const Open: Story = {
  args: {
    isAdmin: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { expanded: false });

    await userEvent.click(trigger);

    await expect(canvas.getByRole("menu")).toBeInTheDocument();
  },
};
