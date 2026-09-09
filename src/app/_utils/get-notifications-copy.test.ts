import { describe, expect, it, vi } from "vitest";
import { getTranslations } from "next-intl/server";

import { getNotificationsCopy } from "./get-notifications-copy";

/**
 * `getTranslations` resolves to a callable translator function that also
 * carries a `.raw` method (next-intl's real shape) — mocked here as a plain
 * function with `.raw` attached, the minimal stand-in `getNotificationsCopy`
 * actually touches.
 */
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
}));

describe("getNotificationsCopy", () => {
  it("map namespace `notifications` vào đúng shape SiteChromeCopy['notifications']", async () => {
    const rawTypes = {
      kudos_received: "**{senderName}** đã gửi Kudos cho bạn",
      heart_received: "**{actorName}** đã thả tim Kudos của bạn",
      secret_box_available: "Bạn có một Hộp bí mật mới, mở ngay nhé!",
      kudos_hidden:
        "Kudos của bạn đã bị ẩn do vi phạm <link>Tiêu chuẩn cộng đồng ↗</link>",
    };

    const t = Object.assign(
      vi.fn((key: string) => {
        const values: Record<string, string> = {
          empty: "Bạn chưa có thông báo",
          title: "Thông báo",
          markAllRead: "Đánh dấu đọc tất cả",
          loadMore: "Xem thêm",
        };
        return values[key] ?? "";
      }),
      { raw: vi.fn(() => rawTypes) },
    );
    vi.mocked(getTranslations).mockResolvedValueOnce(
      t as unknown as Awaited<ReturnType<typeof getTranslations>>,
    );

    await expect(getNotificationsCopy()).resolves.toEqual({
      empty: "Bạn chưa có thông báo",
      title: "Thông báo",
      markAllRead: "Đánh dấu đọc tất cả",
      loadMore: "Xem thêm",
      types: rawTypes,
    });
    expect(getTranslations).toHaveBeenCalledWith("notifications");
    expect(t.raw).toHaveBeenCalledWith("types");
  });
});
