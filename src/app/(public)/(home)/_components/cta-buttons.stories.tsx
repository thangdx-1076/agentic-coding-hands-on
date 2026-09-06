import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultHomeCopy } from "../_shared/home-copy";

import { CtaButtons } from "./cta-buttons";

const meta = {
  component: CtaButtons,
  args: {
    aboutAwardsLabel: defaultHomeCopy.cta.aboutAwards,
    aboutKudosLabel: defaultHomeCopy.cta.aboutKudos,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#00101A",
          padding: "24px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CtaButtons>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Hai nút CTA hero mặc định (mm:2167:9062): "ABOUT AWARDS" nền vàng đặc
 * → `/awards`, "ABOUT KUDOS" viền vàng nền trong suốt → `/kudos`.
 */
export const Default: Story = {
  args: {},
};
