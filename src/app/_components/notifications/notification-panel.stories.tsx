import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";

import { defaultSiteChromeCopy } from "../../_shared/site-chrome";

import { NotificationPanel } from "./notification-panel";

import type { NotificationRow } from "@/domain/notifications/types";

/**
 * Storybook fixtures (phase-08 Implementation Step 6). Fixture rows are
 * built from `domain/notifications/types.ts`'s real payload shapes — the
 * same "seed a row directly" approach `clarifications.md` documents for
 * `kudos_hidden`/`secret_box_available` (no emitter in v1). Not "invented
 * data" per the MoMorph rule: these are the ACTUAL 4 enum values and their
 * ACTUAL payload contracts, just authored by hand instead of read live.
 */
function makeRow(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: "n-1",
    type: "kudos_received",
    payload: {},
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const meta = {
  component: NotificationPanel,
  args: {
    copy: defaultSiteChromeCopy.notifications,
    locale: "vi",
    loading: false,
    error: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onLoadMore: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: "32rem", width: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Trạng thái trống (FR-006/TC-008) — không có nút "Xem thêm". */
export const Empty: Story = {
  args: {
    items: [],
    nextCursor: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("dialog")).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Xem thêm/ }),
    ).not.toBeInTheDocument();
  },
};

/** 3 mục, 1 mục chưa đọc (chấm đỏ) — 2 mục còn lại đã đọc. */
export const ThreeItemsOneUnread: Story = {
  args: {
    items: [
      makeRow({
        id: "n-1",
        type: "kudos_received",
        payload: { kudosId: "k-1", senderName: "Nguyễn Văn A" },
        isRead: false,
      }),
      makeRow({
        id: "n-2",
        type: "heart_received",
        payload: { kudosId: "k-1", actorId: "a-1", actorName: "Trần Thị B" },
        isRead: true,
      }),
      makeRow({
        id: "n-3",
        type: "secret_box_available",
        payload: { boxId: "b-1", sourceKudosId: null },
        isRead: true,
      }),
    ],
    nextCursor: null,
  },
};

/** 10 mục + nút "Xem thêm" (FR-101/102, TC-018). */
export const TenItemsWithLoadMore: Story = {
  args: {
    items: Array.from({ length: 10 }, (_, index) =>
      makeRow({
        id: `n-${index}`,
        type: "kudos_received",
        payload: { kudosId: `k-${index}`, senderName: `Sunner ${index}` },
        isRead: index > 0,
      }),
    ),
    nextCursor: "cursor-11",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Xem thêm/ }),
    ).toBeVisible();
  },
};

/** `kudos_hidden` — message nhúng link `/standards` (FR-202, TC-015). */
export const KudosHiddenWithLink: Story = {
  args: {
    items: [
      makeRow({
        id: "n-1",
        type: "kudos_hidden",
        payload: { kudosId: "k-1" },
        isRead: false,
      }),
    ],
    nextCursor: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link");
    await expect(link).toHaveAttribute("href", "/standards");
  },
};
