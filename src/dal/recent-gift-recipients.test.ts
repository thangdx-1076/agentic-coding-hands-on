import { describe, expect, it, vi } from "vitest";

import {
  getRecentGiftRecipients,
  type RecentGiftRecipientsClient,
} from "./recent-gift-recipients";

type GiftRecipientRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  badge_key: string;
  opened_at: string;
};
type LimitResult = { data: GiftRecipientRow[] | null; error: unknown };

/**
 * `getRecentGiftRecipients` never constructs its own Supabase client — the
 * caller injects one, so every branch here is a plain stub of the minimal
 * `.from().select().order().limit()` surface it actually calls. No
 * network, no `@supabase/ssr` boundary to mock — mirrors
 * `sunner-search.test.ts`'s `stubClient`.
 */
function stubClient(
  limit: () => Promise<LimitResult>,
): RecentGiftRecipientsClient {
  return {
    from: () => ({
      select: () => ({
        order: () => ({ limit }),
      }),
    }),
  };
}

describe("getRecentGiftRecipients", () => {
  it("hàng hợp lệ → map snake_case sang camelCase GiftRecipient[]", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [
          {
            id: "user-1",
            full_name: "Đỗ hoàng Hiệp",
            avatar_url: "https://a.png",
            badge_key: "stay-gold",
            opened_at: "2026-09-10T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    await expect(getRecentGiftRecipients(client)).resolves.toEqual([
      {
        userId: "user-1",
        fullName: "Đỗ hoàng Hiệp",
        avatarUrl: "https://a.png",
        badgeKey: "stay-gold",
        openedAt: "2026-09-10T10:00:00.000Z",
      },
    ]);
  });

  it("full_name/avatar_url null → giữ nguyên null, không throw", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [
          {
            id: "user-2",
            full_name: null,
            avatar_url: null,
            badge_key: "revival",
            opened_at: "2026-09-10T09:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    await expect(getRecentGiftRecipients(client)).resolves.toEqual([
      {
        userId: "user-2",
        fullName: null,
        avatarUrl: null,
        badgeKey: "revival",
        openedAt: "2026-09-10T09:00:00.000Z",
      },
    ]);
  });

  it("nhiều hàng → giữ đúng thứ tự client trả về", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [
          {
            id: "u1",
            full_name: "An",
            avatar_url: null,
            badge_key: "stay-gold",
            opened_at: "2026-09-10T11:00:00.000Z",
          },
          {
            id: "u2",
            full_name: "Binh",
            avatar_url: null,
            badge_key: "revival",
            opened_at: "2026-09-10T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const result = await getRecentGiftRecipients(client);
    expect(result.map((r) => r.userId)).toEqual(["u1", "u2"]);
  });

  it("error khác null → fail-open []", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: new Error("boom") }),
    );

    await expect(getRecentGiftRecipients(client)).resolves.toEqual([]);
  });

  it("data null (không có hàng) → fail-open []", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: null }),
    );

    await expect(getRecentGiftRecipients(client)).resolves.toEqual([]);
  });

  it("client ném exception → fail-open []", async () => {
    const client: RecentGiftRecipientsClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(getRecentGiftRecipients(client)).resolves.toEqual([]);
  });

  it("truyền đúng bảng/cột/order/limit mặc định cho client được inject", async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    await getRecentGiftRecipients({ from });

    expect(from).toHaveBeenCalledExactlyOnceWith("recent_gift_recipients");
    expect(select).toHaveBeenCalledExactlyOnceWith(
      "id,full_name,avatar_url,badge_key,opened_at",
    );
    expect(order).toHaveBeenCalledExactlyOnceWith("opened_at", {
      ascending: false,
    });
    expect(limit).toHaveBeenCalledExactlyOnceWith(10);
  });

  it("limit tuỳ chỉnh được chuyển tiếp thay cho mặc định", async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    await getRecentGiftRecipients({ from }, { limit: 3 });

    expect(limit).toHaveBeenCalledExactlyOnceWith(3);
  });
});
