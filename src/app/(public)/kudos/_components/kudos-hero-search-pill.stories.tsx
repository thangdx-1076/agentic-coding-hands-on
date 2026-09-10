import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { KudosHeroSearchPill } from "./kudos-hero-search-pill";

const meta = {
  title: "Kudos/KudosHeroSearchPill",
  component: KudosHeroSearchPill,
  parameters: { backgrounds: { default: "dark" } },
  args: {
    placeholder: "Tìm kiếm profile Sunner",
    ariaLabel: "Tìm kiếm profile Sunner",
    query: "",
    maxLength: 128,
    options: [],
    loading: false,
    isOpen: false,
    loadingLabel: "Đang tìm kiếm…",
    emptyLabel: "Không tìm thấy Sunner phù hợp",
    onQueryChange: fn(),
    onSelect: fn(),
    onDismiss: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof KudosHeroSearchPill>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Placeholder taken from the design node's `character`
 * (mm:I2940:13450;186:2760), mirrored into `messages/vi.json` §
 * `kudos.heroSearch.placeholder`. That node's `itemName` is a stale
 * `"Awards Information Navigation Links"` — `character` is what ships. */
export const Default: Story = {};

/** Dropdown open over the KV artwork with settled results — picking a row
 * navigates to `/profile?id=`. */
export const WithResults: Story = {
  args: {
    query: "Nguyễn",
    isOpen: true,
    options: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        fullName: "Nguyễn Văn A",
        avatarUrl: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        fullName: "Nguyễn Thị B",
        avatarUrl: null,
      },
    ],
  },
};

/** Debounced search in flight (AD-6, 250ms). */
export const Loading: Story = {
  args: { query: "Ngu", isOpen: true, loading: true },
};

/** Signed-out visitor: `profile_cards` is `authenticated`-only, so the wrapper
 * passes the sign-in hint as `emptyLabel` instead of a "no match" claim. */
export const SignedOutHint: Story = {
  args: {
    query: "Nguyễn",
    isOpen: true,
    emptyLabel: "Đăng nhập để tìm profile Sunner",
  },
};
