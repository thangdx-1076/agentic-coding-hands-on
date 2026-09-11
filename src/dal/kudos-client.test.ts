import { describe, expect, it, vi } from "vitest";

import { toKudosClient } from "./kudos-client";

type ShimInput = Parameters<typeof toKudosClient>[0];

/**
 * Matches `kudos-cards-query.ts`'s private `CARD_COLUMNS` literal
 * exactly — duplicated here the same way `awards-client.test.ts`
 * duplicates `AwardColumns`'s literal, since the type itself is not
 * exported.
 */
const CARD_COLUMNS =
  "id,content,hashtags,image_urls,heart_count,created_at,sender_id,sender_full_name,sender_avatar_url,sender_department,sender_kudos_received,sender_kudos_sent,sender_distinct_senders,receiver_id,receiver_full_name,receiver_avatar_url,receiver_department,receiver_kudos_received,receiver_kudos_sent,receiver_distinct_senders,is_own";

describe("toKudosClient", () => {
  it("forwards a bare select() as a directly-awaitable thenable (the totals read's shape)", async () => {
    const result = { data: [{ id: "kudo-1" }], error: null };
    const select = vi.fn(() => Promise.resolve(result));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudosClient(fakeSupabase);
    const awaited = await shim.from("kudos_cards").select(CARD_COLUMNS);

    expect(from).toHaveBeenCalledWith("kudos_cards");
    expect(select).toHaveBeenCalledWith(CARD_COLUMNS);
    expect(awaited).toEqual(result);
  });

  it("forwards the full contains/eq/lt/order/limit chain and returns the final resolved value", async () => {
    const result = { data: [{ id: "kudo-2" }], error: null };
    const builder = {
      contains: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      then: (onFulfilled: unknown, onRejected: unknown) =>
        Promise.resolve(result).then(onFulfilled as never, onRejected as never),
    };
    builder.contains.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.lt.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.limit.mockReturnValue(builder);

    const select = vi.fn(() => builder);
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudosClient(fakeSupabase);
    const awaited = await shim
      .from("kudos_cards")
      .select(CARD_COLUMNS)
      .contains("hashtags", ["#Dedicated"])
      .eq("receiver_department", "CEVC10")
      .lt("created_at", "2025-10-30T09:00:00.000Z")
      .order("heart_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    expect(from).toHaveBeenCalledWith("kudos_cards");
    expect(select).toHaveBeenCalledWith(CARD_COLUMNS);
    expect(builder.contains).toHaveBeenCalledExactlyOnceWith("hashtags", [
      "#Dedicated",
    ]);
    expect(builder.eq).toHaveBeenCalledExactlyOnceWith(
      "receiver_department",
      "CEVC10",
    );
    expect(builder.lt).toHaveBeenCalledExactlyOnceWith(
      "created_at",
      "2025-10-30T09:00:00.000Z",
    );
    expect(builder.order).toHaveBeenNthCalledWith(1, "heart_count", {
      ascending: false,
    });
    expect(builder.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
    });
    expect(builder.limit).toHaveBeenCalledExactlyOnceWith(5);
    expect(awaited).toEqual(result);
  });
});
