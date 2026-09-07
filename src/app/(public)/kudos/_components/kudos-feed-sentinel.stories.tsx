import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { KudosFeedSentinel } from "./kudos-feed-sentinel";

const meta = {
  title: "Kudos/KudosFeedSentinel",
  component: KudosFeedSentinel,
  args: { sentinelRef: fn() },
} satisfies Meta<typeof KudosFeedSentinel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Mounted while `hasMore` is true — non-zero height so the real scroll
 * observer (see `use-infinite-feed.ts`) can actually catch it (C18). Never
 * rendered by the caller once the feed runs out of pages (C19) — there is
 * intentionally no "exhausted" story here, the exhausted state IS this
 * component being absent from the DOM. */
export const Default: Story = {};
