import { describe, expect, it, vi } from "vitest";
import type { getTranslations } from "next-intl/server";

import { buildGiftRecipientItems } from "./build-gift-recipient-items";

import type { GiftRecipient } from "@/dal/recent-gift-recipients";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/** Minimal stand-in for a `standards`-scoped translator — the only method
 * `buildGiftRecipientItems` calls is the bare function itself. Cast is the
 * same one-line pattern `get-notifications-copy.test.ts` already uses for
 * this exact next-intl type. */
function stubTranslator(values: Record<string, string>): Translator {
  return vi.fn((key: string) => values[key] ?? key) as unknown as Translator;
}

function recipient(overrides: Partial<GiftRecipient> = {}): GiftRecipient {
  return {
    userId: "user-1",
    fullName: "Đỗ hoàng Hiệp",
    avatarUrl: "https://a.png",
    badgeKey: "stay-gold",
    openedAt: "2026-09-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildGiftRecipientItems", () => {
  it("badge hợp lệ → map sang KudosLeaderboardItemData với caption đúng namespace", () => {
    const t = stubTranslator({
      "secretBoxSection.badges.stayGold.caption": "STAY GOLD",
    });

    expect(buildGiftRecipientItems([recipient()], t)).toEqual([
      {
        id: "user-1",
        name: "Đỗ hoàng Hiệp",
        description: "STAY GOLD",
        avatarSrc: "https://a.png",
      },
    ]);
  });

  it("badge nhiều từ (kebab-case) → chuyển đúng camelCase trước khi tra caption", () => {
    const t = stubTranslator({
      "secretBoxSection.badges.beyondTheBoundary.caption":
        "BEYOND THE BOUNDARY",
    });

    const items = buildGiftRecipientItems(
      [recipient({ badgeKey: "beyond-the-boundary" })],
      t,
    );

    expect(items[0]?.description).toBe("BEYOND THE BOUNDARY");
  });

  it("badgeKey không hợp lệ → loại bỏ hàng đó, không render caption bịa", () => {
    const t = stubTranslator({});

    expect(
      buildGiftRecipientItems([recipient({ badgeKey: "not-a-real-badge" })], t),
    ).toEqual([]);
  });

  it("fullName null → tên rỗng thay vì throw", () => {
    const t = stubTranslator({
      "secretBoxSection.badges.stayGold.caption": "STAY GOLD",
    });

    const items = buildGiftRecipientItems([recipient({ fullName: null })], t);

    expect(items[0]?.name).toBe("");
  });

  it("avatarUrl null → dùng ảnh đại diện mặc định", () => {
    const t = stubTranslator({
      "secretBoxSection.badges.stayGold.caption": "STAY GOLD",
    });

    const items = buildGiftRecipientItems([recipient({ avatarUrl: null })], t);

    expect(items[0]?.avatarSrc).toBe("/kudos/avatar-gift-recipient.png");
  });

  it("mảng rỗng → trả về mảng rỗng", () => {
    const t = stubTranslator({});

    expect(buildGiftRecipientItems([], t)).toEqual([]);
  });

  it("nhiều hàng → giữ đúng thứ tự đầu vào", () => {
    const t = stubTranslator({
      "secretBoxSection.badges.stayGold.caption": "STAY GOLD",
      "secretBoxSection.badges.revival.caption": "REVIVAL",
    });

    const items = buildGiftRecipientItems(
      [
        recipient({ userId: "u1", badgeKey: "stay-gold" }),
        recipient({ userId: "u2", badgeKey: "revival" }),
      ],
      t,
    );

    expect(items.map((item) => item.id)).toEqual(["u1", "u2"]);
  });
});
