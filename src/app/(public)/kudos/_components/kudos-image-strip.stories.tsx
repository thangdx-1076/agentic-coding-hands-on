import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosImageStrip } from "./kudos-image-strip";

/**
 * `sample-image.png` is the one real MoMorph export reused identically
 * across all 5 attachment slots in the frame itself (`asset-dimensions.md`
 * confirms this is a single hash repeated, not distinct photos) — the
 * `sixImages` fixture repeats the same real asset a 6th time to demonstrate
 * the 5-image cap (BR-007), matching the design's own repetition pattern.
 */
const fiveImages = Array.from({ length: 5 }, () => "/kudos/sample-image.png");
const sixImages = Array.from({ length: 6 }, () => "/kudos/sample-image.png");

const meta = {
  title: "Kudos/KudosImageStrip",
  component: KudosImageStrip,
} satisfies Meta<typeof KudosImageStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FiveImages: Story = {
  args: { imageUrls: fiveImages },
};

export const SixImagesCapped: Story = {
  args: { imageUrls: sixImages },
};

export const NoImages: Story = {
  args: { imageUrls: [] },
};
