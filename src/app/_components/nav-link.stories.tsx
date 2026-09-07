import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NavLink } from "./nav-link";

const meta = {
  component: NavLink,
  args: {
    href: "/",
    children: "About SAA 2025",
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
} satisfies Meta<typeof NavLink>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Trạng thái active (mm:I2167:9091;186:1579) — route hiện tại trùng `href`.
 * Route được mock qua `parameters.nextjs.navigation.pathname`, tham số
 * `@storybook/nextjs(-vite)` đọc để giả lập `usePathname()`/`useRouter()`
 * trong App Router (cùng namespace `nextjs` project đã dùng ở
 * `preview.tsx` cho `appDirectory: true`).
 */
export const Active: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/",
      },
    },
  },
};

/**
 * Trạng thái thường (mm:I2167:9091;186:1587) — route hiện tại khác `href`.
 */
export const Inactive: Story = {
  args: {
    href: "/awards",
    children: "Award Information",
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/",
      },
    },
  },
};
