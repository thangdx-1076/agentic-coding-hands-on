import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";

import type { FeedPage } from "../_hooks/use-infinite-feed";

import { KudosFeed } from "./kudos-feed";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

/**
 * Content copied verbatim from `3127:21871`/`22053`/`22375`/`22439` — the
 * frame itself reuses the exact same sender/receiver/time/content/hashtags/
 * heart-count text on all 4 `C.2` card instances (Figma's own mock data has
 * no per-card variation), so these 4 items differ only by the `id` this
 * screen needs for `key`/cursors — never invented copy.
 */
const baseCard: KudosCardModel = {
  id: "kudo-1",
  content:
    "Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...",
  hashtags: ["IDOL GIỚI TRẺ", "Dedicated", "Inspring"],
  imageUrls: Array.from({ length: 5 }, () => "/kudos/sample-image.png"),
  heartCount: 1000,
  createdAt: "2025-10-30T10:00:00Z",
  sender: {
    id: "sender-1",
    fullName: "Huỳnh Dương Xuân Nhật",
    avatarUrl: "/kudos/avatar-sender.png",
    department: "CEVC10",
    kudosReceived: 15,
  },
  receiver: {
    id: "receiver-1",
    fullName: "Huỳnh Dương Xuân",
    avatarUrl: "/kudos/avatar-receiver.png",
    department: "CEVC10",
    kudosReceived: 60,
  },
};

const fourCards: KudosCardModel[] = [
  "kudo-1",
  "kudo-2",
  "kudo-3",
  "kudo-4",
].map((id) => ({ ...baseCard, id }));

const HEADER_ARGS = {
  eyebrow: "Sun* Annual Awards 2025",
  heading: "ALL KUDOS",
  emptyLabel: "Hiện tại chưa có Kudos nào.",
};

const meta = {
  title: "Kudos/KudosFeed",
  component: KudosFeed,
  args: {
    ...HEADER_ARGS,
    loadMore: fn(),
  },
} satisfies Meta<typeof KudosFeed>;

export default meta;

type Story = StoryObj<typeof meta>;

/** C.2's own 4 cards (`3127:21871`/`22053`/`22375`/`22439`), `hasMore: true`
 * so the sentinel (C18) is present. */
export const FirstPage: Story = {
  args: {
    initialPage: { items: fourCards, nextCursor: "2025-10-30T10:00:00Z" },
  },
};

/** Sentinel intersects on mount (nothing scrolls above it in this isolated
 * story) → `useInfiniteFeed` calls the never-resolving `loadMore` and stays
 * `isLoading` — demonstrates the spinner the Key Insights call for
 * ("chỉ báo đang tải khi isLoading"). */
export const Loading: Story = {
  args: {
    initialPage: { items: fourCards, nextCursor: "2025-10-30T10:00:00Z" },
    loadMore: fn(() => new Promise<FeedPage<KudosCardModel>>(() => {})),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByTestId("kudos-feed-loading")).toBeInTheDocument(),
    );
  },
};

/** `nextCursor: null` — C19's "hết dữ liệu": no `kudos-feed-sentinel`, and
 * (unlike `Empty` below) no `kudos-empty` either, because `items.length`
 * is still 4. */
export const Exhausted: Story = {
  args: {
    initialPage: { items: fourCards, nextCursor: null },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByTestId("kudos-feed-sentinel"),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByTestId("kudos-empty")).not.toBeInTheDocument();
  },
};

/** Zero kudos from the very first load (C07) — `KudosEmptyState` renders,
 * no sentinel regardless of `nextCursor` (`items.length === 0` short-
 * circuits the list branch entirely). */
export const Empty: Story = {
  args: {
    initialPage: { items: [], nextCursor: null },
  },
};

/** Same empty render as `Empty` — documents that a hashtag/department
 * filter yielding zero matches (C17) hits the exact same
 * `items.length === 0` branch, not a second "no results" variant (BR-011:
 * one shared empty string for every empty cause). */
export const FilteredEmpty: Story = {
  args: {
    initialPage: { items: [], nextCursor: null },
  },
};
