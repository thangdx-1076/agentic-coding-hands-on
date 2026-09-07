import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  SECRET_BOX_BADGES,
  sampleStandardsCopy,
} from "../_shared/standards-copy";

import { SecretBoxBadge } from "./secret-box-badge";

const meta = {
  title: "Standards/SecretBoxBadge",
  component: SecretBoxBadge,
} satisfies Meta<typeof SecretBoxBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Artwork-only 64×64 circle, like all 6 — the caption below is the `<p>`. */
export const Revival: Story = {
  args: {
    badge: SECRET_BOX_BADGES[0],
    caption: sampleStandardsCopy.secretBoxSection.badges.revival.caption,
  },
};

/** Layer name is "ROOT FUTHER" (missing R) — `character` says "ROOT FURTHER". */
export const RootFurther: Story = {
  args: {
    badge: SECRET_BOX_BADGES[5],
    caption: sampleStandardsCopy.secretBoxSection.badges.rootFurther.caption,
  },
};
