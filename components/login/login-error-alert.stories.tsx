import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LoginErrorAlert } from "./login-error-alert";

const meta = {
  component: LoginErrorAlert,
} satisfies Meta<typeof LoginErrorAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Trạng thái có lỗi OAuth — hiển thị dưới nút đăng nhập Google với
 * `role="alert"`. Thiết kế không vẽ trạng thái này, tông màu/vị trí đã
 * chốt ở clarifications.md.
 */
export const WithMessage: Story = {
  args: {
    message: "Đăng nhập thất bại. Vui lòng thử lại.",
  },
};

/**
 * Trạng thái không có lỗi — component chủ động render `null`.
 */
export const Empty: Story = {
  args: {
    message: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Canvas trống là ĐÚNG theo thiết kế: khi `message` rỗng, component render `null` thay vì một khối trống có style — đây không phải story bị lỗi.",
      },
    },
  },
};
