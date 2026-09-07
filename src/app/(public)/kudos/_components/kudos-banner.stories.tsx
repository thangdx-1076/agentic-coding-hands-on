import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosBanner } from "./kudos-banner";

const meta = {
  title: "Kudos/KudosBanner",
  component: KudosBanner,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof KudosBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Copy verbatim from `messages/vi.json` § `kudos.banner` — same string the
 * C02 e2e assertion checks. */
export const Default: Story = {
  args: {
    title: "Hệ thống ghi nhận lời cảm ơn",
    logoAlt: "SAA 2025 KUDOS",
  },
};
