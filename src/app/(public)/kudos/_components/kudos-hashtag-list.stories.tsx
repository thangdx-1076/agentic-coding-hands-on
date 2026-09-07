import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosFeaturedHashtag, KudosHashtagList } from "./kudos-hashtag-list";

/**
 * "Dedicated"/"Inspring" copied verbatim from the frame's own hashtag
 * example (`I3127:21871;256:5158`, spelling "Inspring" kept as-is per the
 * "don't rename design node text" rule from commit `b6920ec`). The
 * `sixHashtags` fixture repeats those same 2 real tags to reach 6 — the
 * design's own mock content already repeats them 3x for the same reason
 * (filling one line to demonstrate truncation), so this extends that
 * pattern rather than inventing new tag names.
 */
const twoHashtags = ["Dedicated", "Inspring"];
const sixHashtags = [
  "Dedicated",
  "Inspring",
  "Dedicated",
  "Inspring",
  "Dedicated",
  "Inspring",
];

const meta = {
  title: "Kudos/KudosHashtagList",
  component: KudosHashtagList,
} satisfies Meta<typeof KudosHashtagList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { hashtags: twoHashtags },
};

export const SixHashtagsTruncated: Story = {
  args: { hashtags: sixHashtags },
};

export const Empty: Story = {
  args: { hashtags: [] },
};

/** mm:D.4_hashtag (`I3127:21871;2234:33038`) — feed variant, with pen icon. */
export const FeaturedFeed: StoryObj<typeof KudosFeaturedHashtag> = {
  render: (args) => <KudosFeaturedHashtag {...args} />,
  args: { tag: "IDOL GIỚI TRẺ", showIcon: true },
};

/** mm:B.4 highlight variant occurrence — same text, no pen icon child. */
export const FeaturedHighlight: StoryObj<typeof KudosFeaturedHashtag> = {
  render: (args) => <KudosFeaturedHashtag {...args} />,
  args: { tag: "IDOL GIỚI TRẺ", showIcon: false },
};
