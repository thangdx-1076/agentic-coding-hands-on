import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosComposePill } from "./kudos-compose-pill";

const meta = {
  title: "Kudos/KudosComposePill",
  component: KudosComposePill,
  parameters: { backgrounds: { default: "dark" } },
} satisfies Meta<typeof KudosComposePill>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Placeholder copied byte-for-byte from `messages/vi.json` §
 * `kudos.compose.placeholder` — the same string C03 asserts on. */
export const Default: Story = {
  args: {
    placeholder: "Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?",
    ariaLabel: "Viết Kudo",
    onActivate: () => {},
    dialogOpen: false,
  },
};
