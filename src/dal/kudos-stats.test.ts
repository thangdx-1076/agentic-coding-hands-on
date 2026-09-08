import { describe, expect, it, vi } from "vitest";

import { getKudosStats, type KudosStatsClient } from "./kudos-stats";

/**
 * `getKudosStats` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the minimal
 * `.from().select().eq()` surface it actually calls. No network, no
 * `@supabase/ssr` boundary to mock.
 *
 * Keyed by the `eq()` column, not by table: `sender_id`/`receiver_id`
 * (against `kudos`) and `user_id` (against `secret_box_openings`) never
 * collide, so one lookup table covers all three reads `getKudosStats`
 * fires in parallel.
 */
function stubClient(
  byColumn: Partial<
    Record<
      "sender_id" | "receiver_id" | "user_id",
      () => Promise<{
        data: Array<{ heart_count: number } | { user_id: string }> | null;
        error: unknown;
      }>
    >
  >,
): KudosStatsClient {
  return {
    from: () => ({
      select: () => ({
        eq: (column) => {
          const handler = byColumn[column];
          if (!handler) {
            throw new Error(`stubClient: no handler stubbed for ${column}`);
          }
          return handler();
        },
      }),
    }),
  };
}

const ALL_ZERO = {
  received: 0,
  sent: 0,
  hearts: 0,
  secretBoxOpened: 0,
  secretBoxUnopened: 0,
};

describe("getKudosStats", () => {
  it("tính received/sent/hearts từ hai lượt đọc riêng biệt, cùng secret box từ lượt đọc thứ ba", async () => {
    const client = stubClient({
      receiver_id: () =>
        Promise.resolve({
          data: [{ heart_count: 0 }, { heart_count: 0 }, { heart_count: 0 }],
          error: null,
        }),
      sender_id: () =>
        Promise.resolve({
          data: [{ heart_count: 7 }, { heart_count: 5 }],
          error: null,
        }),
      user_id: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual({
      received: 3,
      sent: 2,
      hearts: 12,
      secretBoxOpened: 0,
      secretBoxUnopened: 2,
    });
  });

  it("không kudo nào, không opening nào → mọi field đều 0", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () => Promise.resolve({ data: [], error: null }),
      user_id: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual(ALL_ZERO);
  });

  it("viewerId rỗng → fail-open mọi field 0, không gọi client", async () => {
    const from = vi.fn();
    const client: KudosStatsClient = { from };

    await expect(getKudosStats(client, "")).resolves.toEqual(ALL_ZERO);
    expect(from).not.toHaveBeenCalled();
  });

  it("error khác null ở lượt đọc receiver_id → fail-open mọi field 0", async () => {
    const client = stubClient({
      receiver_id: () =>
        Promise.resolve({ data: null, error: new Error("boom") }),
      sender_id: () => Promise.resolve({ data: [], error: null }),
      user_id: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual(ALL_ZERO);
  });

  it("data null ở lượt đọc sender_id → fail-open mọi field 0", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () => Promise.resolve({ data: null, error: null }),
      user_id: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual(ALL_ZERO);
  });

  it("client ném exception → fail-open mọi field 0", async () => {
    const client: KudosStatsClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(getKudosStats(client, "user-1")).resolves.toEqual(ALL_ZERO);
  });

  it("truyền đúng bảng/cột/giá trị cho cả ba lượt đọc, gồm secret_box_openings", async () => {
    const eqReceiver = vi.fn(() =>
      Promise.resolve({ data: [{ heart_count: 0 }], error: null }),
    );
    const eqSender = vi.fn(() =>
      Promise.resolve({ data: [{ heart_count: 3 }], error: null }),
    );
    const eqOpenings = vi.fn(() =>
      Promise.resolve({ data: [{ user_id: "user-42" }], error: null }),
    );
    const eq = vi.fn((column: "sender_id" | "receiver_id" | "user_id") => {
      if (column === "receiver_id") return eqReceiver();
      if (column === "sender_id") return eqSender();
      return eqOpenings();
    });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await getKudosStats({ from }, "user-42");

    expect(from).toHaveBeenCalledWith("kudos");
    expect(from).toHaveBeenCalledWith("secret_box_openings");
    expect(select).toHaveBeenCalledWith("heart_count");
    expect(select).toHaveBeenCalledWith("user_id");
    expect(eq).toHaveBeenCalledWith("receiver_id", "user-42");
    expect(eq).toHaveBeenCalledWith("sender_id", "user-42");
    expect(eq).toHaveBeenCalledWith("user_id", "user-42");
  });

  it("5 tim, 0 opening đã mở → 1 box chưa mở", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () =>
        Promise.resolve({ data: [{ heart_count: 5 }], error: null }),
      user_id: () => Promise.resolve({ data: [], error: null }),
    });

    const stats = await getKudosStats(client, "user-1");
    expect(stats.secretBoxOpened).toBe(0);
    expect(stats.secretBoxUnopened).toBe(1);
  });

  it("5 tim, 1 opening đã mở → 0 box chưa mở", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () =>
        Promise.resolve({ data: [{ heart_count: 5 }], error: null }),
      user_id: () =>
        Promise.resolve({ data: [{ user_id: "user-1" }], error: null }),
    });

    const stats = await getKudosStats(client, "user-1");
    expect(stats.secretBoxOpened).toBe(1);
    expect(stats.secretBoxUnopened).toBe(0);
  });

  it("4 tim (chưa đủ 5) → 0 box chưa mở", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () =>
        Promise.resolve({ data: [{ heart_count: 4 }], error: null }),
      user_id: () => Promise.resolve({ data: [], error: null }),
    });

    const stats = await getKudosStats(client, "user-1");
    expect(stats.secretBoxOpened).toBe(0);
    expect(stats.secretBoxUnopened).toBe(0);
  });

  it("dữ liệu lệch (0 tim nhưng 2 opening đã ghi) → kẹp unopened về 0, không âm", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () => Promise.resolve({ data: [], error: null }),
      user_id: () =>
        Promise.resolve({
          data: [{ user_id: "user-1" }, { user_id: "user-1" }],
          error: null,
        }),
    });

    const stats = await getKudosStats(client, "user-1");
    expect(stats.secretBoxOpened).toBe(2);
    expect(stats.secretBoxUnopened).toBe(0);
  });

  it("lỗi ở lượt đọc secret_box_openings → fail-open mọi field 0", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () =>
        Promise.resolve({ data: [{ heart_count: 5 }], error: null }),
      user_id: () => Promise.resolve({ data: null, error: new Error("boom") }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual(ALL_ZERO);
  });

  it("hàng kudos thiếu heart_count (hình dạng lạ) → fail-open mọi field 0", async () => {
    // Không cần ép kiểu gì cả — khai thác chính union `HeartRow | OpeningRow`
    // mà `KudosStatsClient` đã khai báo: một hàng `{user_id}` hợp lệ về type
    // nhưng thiếu `heart_count`, đúng thứ `selectHeartRows` phải phát hiện
    // và throw ở boundary.
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () =>
        Promise.resolve({
          data: [{ user_id: "not-a-heart-row" }],
          error: null,
        }),
      user_id: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual(ALL_ZERO);
  });
});
