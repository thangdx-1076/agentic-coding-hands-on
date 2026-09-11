import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultKudosCopy } from "../_shared/kudos-copy";

import { KudosCard } from "./kudos-card";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

/**
 * Content, names, department and timestamp copied verbatim from the frame
 * (`get_design_item_image`/`query_section` on `3127:21871`/`2940:13465`).
 * `hashtags[0]` ("IDOL GIỚI TRẺ") feeds the D.4 featured-tag row; the
 * remaining 2 ("Dedicated"/"Inspring") are the frame's own hashtag-list
 * example. `kudosReceived` values land sender in the Rising Hero bracket and
 * receiver in Legend Hero, matching the frame's own badges.
 */
const baseCard: KudosCardModel = {
  id: "kudo-1",
  content:
    "Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...",
  hashtags: ["IDOL GIỚI TRẺ", "Dedicated", "Inspring"],
  imageUrls: [],
  heartCount: 10,
  createdAt: "2025-10-30T10:00:00Z",
  sender: {
    id: "sender-1",
    fullName: "Huỳnh Dương Xuân Nhật",
    avatarUrl: "/kudos/avatar-sender.png",
    department: "CEVC10",
    kudosReceived: 15,
    kudosSent: 15,
    distinctSenders: 15,
  },
  receiver: {
    id: "receiver-1",
    fullName: "Huỳnh Dương Xuân",
    avatarUrl: "/kudos/avatar-receiver.png",
    department: "CEVC10",
    kudosReceived: 60,
    kudosSent: 60,
    distinctSenders: 60,
  },
};

const feedCard: KudosCardModel = {
  ...baseCard,
  imageUrls: Array.from({ length: 5 }, () => "/kudos/sample-image.png"),
};

const meta = {
  title: "Kudos/KudosCard",
  component: KudosCard,
  args: { copy: defaultKudosCopy, hearted: false },
} satisfies Meta<typeof KudosCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Highlight: Story = {
  args: { card: baseCard, variant: "highlight" },
};

export const Feed: Story = {
  args: { card: feedCard, variant: "feed" },
};

export const Hearted: Story = {
  args: {
    card: { ...baseCard, heartCount: 11 },
    variant: "highlight",
    hearted: true,
  },
};

/** FR-602 — anonymous viewer: heart disabled, title invites sign-in. */
export const Anonymous: Story = {
  args: {
    card: baseCard,
    variant: "highlight",
    heartDisabled: true,
    heartTitle: defaultKudosCopy.signInToHeart,
  },
};

/** BR-002 — sender viewing their own kudo: heart disabled, `data-sender-id="self"`. */
export const OwnKudo: Story = {
  args: {
    card: baseCard,
    variant: "highlight",
    heartDisabled: true,
    heartTitle: "Không thể thả tim cho kudos của chính mình",
    isOwnKudo: true,
  },
};

/** BR-005 — highlight clamps at 3 lines, feed at 5; this repeats the real
 * content 3x to force a cutoff on both variants. */
export const LongContent: Story = {
  args: {
    card: {
      ...baseCard,
      content: `${baseCard.content} ${baseCard.content} ${baseCard.content}`,
    },
    variant: "feed",
  },
};

/** BR-006 — max 5 hashtags/line; repeats the frame's own 2 real tags to 6. */
export const SixHashtags: Story = {
  args: {
    card: {
      ...baseCard,
      hashtags: [
        "IDOL GIỚI TRẺ",
        "Dedicated",
        "Inspring",
        "Dedicated",
        "Inspring",
        "Dedicated",
      ],
    },
    variant: "feed",
  },
};

/** BR-007 — max 5 images, left-aligned; repeats the frame's own single
 * reused thumbnail to 6 to demonstrate the cap. */
export const SixImages: Story = {
  args: {
    card: {
      ...baseCard,
      imageUrls: Array.from({ length: 6 }, () => "/kudos/sample-image.png"),
    },
    variant: "feed",
  },
};
