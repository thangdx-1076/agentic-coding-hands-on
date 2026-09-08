import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";
import { MAX_KUDO_IMAGES } from "../_utils/validate-kudo-images";

import type { KudosImageItem } from "./kudos-image-field";
import { KudosImageField } from "./kudos-image-field";

const copy = defaultKudosComposeCopy;

/** Same static asset the DB seed uses (`0008_kudos_demo_seed.sql`) — real
 * design content, not an invented placeholder image. */
const SAMPLE_IMAGE_URL = "/kudos/sample-image.png";

function makeImages(count: number): KudosImageItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `story-image-${index}`,
    previewUrl: SAMPLE_IMAGE_URL,
    name: `sample-image-${index + 1}.png`,
  }));
}

const meta = {
  title: "Kudos/KudosImageField",
  component: KudosImageField,
  parameters: { backgrounds: { default: "light" } },
  args: {
    label: copy.imageLabel,
    addLabel: copy.imageAdd,
    limitNote: copy.limitNote,
    removeLabel: copy.imageRemove,
    onFilesSelected: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof KudosImageField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** mm:F — no thumbnails yet, "+ Image" visible. */
export const Empty: Story = {
  args: {
    images: [],
  },
};

/** mm:F.2-F.4 — 3 thumbnails, "+ Image" still visible (C15). */
export const ThreeImages: Story = {
  args: {
    images: makeImages(3),
  },
};

/** BR-003/C16 — at `MAX_KUDO_IMAGES` (5), "+ Image" is hidden entirely. */
export const Full: Story = {
  args: {
    images: makeImages(MAX_KUDO_IMAGES),
  },
};

/** No design node for this state (frame `5c7PkAibyD` has no node data) —
 * follows `kudos-compose-field.tsx`'s `WithError` story pattern. */
export const WithError: Story = {
  args: {
    images: makeImages(1),
    error: copy.errorImageInvalid,
  },
};
