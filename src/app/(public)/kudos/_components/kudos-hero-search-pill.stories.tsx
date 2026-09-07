import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosHeroSearchPill } from "./kudos-hero-search-pill";

const meta = {
  title: "Kudos/KudosHeroSearchPill",
  component: KudosHeroSearchPill,
  parameters: { backgrounds: { default: "dark" } },
} satisfies Meta<typeof KudosHeroSearchPill>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Placeholder taken from the design node's `character`
 * (mm:I2940:13450;186:2760), mirrored into `messages/vi.json` §
 * `kudos.heroSearch.placeholder`. That node's `itemName` is a stale
 * `"Awards Information Navigation Links"` — `character` is what ships. */
export const Default: Story = {
  args: {
    placeholder: "Tìm kiếm profile Sunner",
    ariaLabel: "Tìm kiếm profile Sunner",
  },
};
