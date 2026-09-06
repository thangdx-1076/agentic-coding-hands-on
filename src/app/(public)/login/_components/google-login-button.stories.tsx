import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultLoginCopy } from "../_shared/login-copy";

import { GoogleLoginButton } from "./google-login-button";

const meta = {
  component: GoogleLoginButton,
  args: {
    label: defaultLoginCopy.loginButton,
    onClick: fn(),
  },
} satisfies Meta<typeof GoogleLoginButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Nút đăng nhập Google mặc định (mm:662:14426). Hover đổ bóng/nâng nhẹ
 * (TC c18649fa).
 */
export const Default: Story = {
  args: {},
};

/**
 * Trong lúc chuyển hướng OAuth: nút bị disable, `aria-busy` bật, icon Google
 * đổi thành spinner xoay (TC 37eae882).
 */
export const Pending: Story = {
  args: {
    pending: true,
  },
};
