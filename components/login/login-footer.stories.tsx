import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultLoginCopy } from "./login-copy";
import { LoginFooter } from "./login-footer";

const meta = {
  component: LoginFooter,
} satisfies Meta<typeof LoginFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Thanh copyright cố định ở đáy màn hình đăng nhập. Không tương tác
 * (TC 33a1dacf) — chỉ một prop duy nhất, không có biến thể khác.
 */
export const Default: Story = {
  args: {
    copyright: defaultLoginCopy.footer,
  },
};
