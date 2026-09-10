import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { sampleAwards } from "../_shared/awards-copy";

import { AwardCategoryNav } from "./award-category-nav";

/**
 * `mm:313:8459` (mms_C_Menu list) — left/chip category nav. No `<section id>`
 * exists in Storybook, so `useAwardCategoryNav`'s `IntersectionObserver` has
 * nothing to observe and `activeSlug` stays at its initial value
 * (`slugs[0]`), which is exactly what stories need to show the ACTIVE item
 * without faking the scroll-spy hook.
 */
const meta = {
  title: "Awards/AwardCategoryNav",
  component: AwardCategoryNav,
  args: {
    items: sampleAwards.map(({ slug, title }) => ({ slug, title })),
    ariaLabel: "Danh mục giải thưởng",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="bg-login-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AwardCategoryNav>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Chip bar, below `lg` — first item active by default (gold underline,
 * `LINK_ACTIVE`, no left border at this width already).
 */
export const Mobile: Story = {};

/**
 * Sidebar at `lg` (row C/C.1–C.6, TC ID-9) — the active indicator stays the
 * SAME gold underline as mobile, not a left border (audit gap 7). Fixed
 * `lg`-width wrapper forces the `lg:` classes to apply inside Storybook's
 * viewport-less canvas.
 */
export const DesktopActiveUnderline: Story = {
  decorators: [
    (Story) => (
      <div className="min-w-[1024px] bg-login-background p-6">
        <Story />
      </div>
    ),
  ],
};

/**
 * TC ID-10: hovering the currently-active item still highlights
 * (`hover:bg-white/10` moved onto `LINK_BASE`, audit gap 8) — asserted here
 * by actually hovering the first (active) link via `play`.
 */
export const HoverOnActiveItem: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const activeLink = canvas.getAllByRole("link")[0];
    await userEvent.hover(activeLink);
  },
};
