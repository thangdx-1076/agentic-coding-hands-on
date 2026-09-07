import { describe, expect, it, vi } from "vitest";

import { getKudosStats, type KudosStatsClient } from "./kudos-stats";

/**
 * `getKudosStats` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the minimal
 * `.from().select().eq()` surface it actually calls. No network, no
 * `@supabase/ssr` boundary to mock.
 */
function stubClient(
  byColumn: Record<
    "sender_id" | "receiver_id",
    () => Promise<{ data: { heart_count: number }[] | null; error: unknown }>
  >,
): KudosStatsClient {
  return {
    from: () => ({
      select: () => ({
        eq: (column) => byColumn[column](),
      }),
    }),
  };
}

describe("getKudosStats", () => {
  it("tính received/sent/hearts từ hai lượt đọc riêng biệt", async () => {
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
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual({
      received: 3,
      sent: 2,
      hearts: 12,
    });
  });

  it("không kudo nào → received/sent/hearts đều 0", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual({
      received: 0,
      sent: 0,
      hearts: 0,
    });
  });

  it("viewerId rỗng → fail-open 0/0/0, không gọi client", async () => {
    const from = vi.fn();
    const client: KudosStatsClient = { from };

    await expect(getKudosStats(client, "")).resolves.toEqual({
      received: 0,
      sent: 0,
      hearts: 0,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("error khác null ở lượt đọc receiver_id → fail-open 0/0/0", async () => {
    const client = stubClient({
      receiver_id: () =>
        Promise.resolve({ data: null, error: new Error("boom") }),
      sender_id: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual({
      received: 0,
      sent: 0,
      hearts: 0,
    });
  });

  it("data null ở lượt đọc sender_id → fail-open 0/0/0", async () => {
    const client = stubClient({
      receiver_id: () => Promise.resolve({ data: [], error: null }),
      sender_id: () => Promise.resolve({ data: null, error: null }),
    });

    await expect(getKudosStats(client, "user-1")).resolves.toEqual({
      received: 0,
      sent: 0,
      hearts: 0,
    });
  });

  it("client ném exception → fail-open 0/0/0", async () => {
    const client: KudosStatsClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(getKudosStats(client, "user-1")).resolves.toEqual({
      received: 0,
      sent: 0,
      hearts: 0,
    });
  });

  it("truyền đúng bảng/cột/giá trị cho client được inject", async () => {
    const eqReceiver = vi.fn(() =>
      Promise.resolve({ data: [{ heart_count: 0 }], error: null }),
    );
    const eqSender = vi.fn(() =>
      Promise.resolve({ data: [{ heart_count: 3 }], error: null }),
    );
    const eq = vi.fn((column: "sender_id" | "receiver_id") =>
      column === "receiver_id" ? eqReceiver() : eqSender(),
    );
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await getKudosStats({ from }, "user-42");

    expect(from).toHaveBeenCalledWith("kudos");
    expect(select).toHaveBeenCalledWith("heart_count");
    expect(eq).toHaveBeenCalledWith("receiver_id", "user-42");
    expect(eq).toHaveBeenCalledWith("sender_id", "user-42");
  });
});
