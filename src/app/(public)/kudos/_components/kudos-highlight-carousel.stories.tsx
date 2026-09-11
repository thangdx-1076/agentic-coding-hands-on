import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultKudosCopy } from "../_shared/kudos-copy";

import {
  KudosHighlightCarousel,
  type KudosHighlightCarouselItem,
} from "./kudos-highlight-carousel";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

/** Content copied verbatim from the frame (same source `kudos-card.stories`
 * uses — `query_section` on `2940:13465`/`3127:21871`) — one literal Figma
 * sample repeated across slots, matching how the design itself reuses one
 * `KUDO - Highlight` component instance for every card. */
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

function makeItems(count: number): KudosHighlightCarouselItem[] {
  return Array.from({ length: count }, (_, i) => ({
    card: { ...baseCard, id: `kudo-${i + 1}`, heartCount: 20 - i * 2 },
    hearted: false,
  }));
}

const meta = {
  title: "Kudos/KudosHighlightCarousel",
  component: KudosHighlightCarousel,
  args: {
    copy: defaultKudosCopy,
    emptyLabel: "Hiện tại chưa có Kudos nào.",
    prevLabel: "Xem kudo trước",
    nextLabel: "Xem kudo tiếp theo",
  },
} satisfies Meta<typeof KudosHighlightCarousel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** BR-001 — top 5 by heart count, counter reads `1/5`. */
export const FiveItems: Story = {
  args: { items: makeItems(5) },
};

/** BR-003 — a hashtag/department filter can shrink the board below 5;
 * counter reads `1/3`, not a hardcoded `1/5`. */
export const FilteredToThree: Story = {
  args: { items: makeItems(3) },
};

/** Both nav buttons disabled — nowhere to go with only one slide. */
export const SingleItem: Story = {
  args: { items: makeItems(1) },
};

/** BR-011/C07 — no kudos at all renders the exact copy string, no
 * carousel chrome. */
export const Empty: Story = {
  args: { items: [] },
};
