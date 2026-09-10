import { describe, expect, it, vi } from "vitest";

import { toRecentGiftRecipientsClient } from "./recent-gift-recipients-client";

type ShimInput = Parameters<typeof toRecentGiftRecipientsClient>[0];

/**
 * Same shape as `kudos-client.test.ts`: the shim only forwards, so each test
 * drives a real call shape through it and asserts BOTH that the underlying
 * builder saw the right arguments and that the resolved value came back
 * untouched.
 *
 * `getRecentGiftRecipients` issues exactly one chain —
 * `from("recent_gift_recipients").select(columns).order("opened_at",
 * {ascending:false}).limit(n)` — and the ordering argument is load-bearing:
 * the panel is "10 SUNNER NHẬN QUÀ MỚI NHẤT" (F007 FR-219), so `ascending:
 * false` is the difference between newest and oldest openers. A shim that
 * dropped or flipped that option would still type-check.
 */
describe("toRecentGiftRecipientsClient", () => {
  it("forwards the full select/order/limit chain and returns the resolved value", async () => {
    const result = {
      data: [
        {
          id: "user-1",
          full_name: "Huỳnh Dương Xuân",
          avatar_url: null,
          badge_key: "stay-gold",
          opened_at: "2026-09-10T10:00:00.000Z",
        },
      ],
      error: null,
    };
    const limit = vi.fn(() => Promise.resolve(result));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toRecentGiftRecipientsClient(fakeSupabase);
    const awaited = await shim
      .from("recent_gift_recipients")
      .select("id,full_name,avatar_url,badge_key,opened_at")
      .order("opened_at", { ascending: false })
      .limit(10);

    expect(from).toHaveBeenCalledExactlyOnceWith("recent_gift_recipients");
    expect(select).toHaveBeenCalledExactlyOnceWith(
      "id,full_name,avatar_url,badge_key,opened_at",
    );
    expect(order).toHaveBeenCalledExactlyOnceWith("opened_at", {
      ascending: false,
    });
    expect(limit).toHaveBeenCalledExactlyOnceWith(10);
    expect(awaited).toEqual(result);
  });

  // No test asserts that `ascending: false` cannot be flipped, because
  // `RecentGiftRecipientsClient` types that option as the literal `false` and
  // the column list as one exact string — `{ ascending: true }` or a trimmed
  // `select("id")` fail to compile. The newest-first contract is enforced by
  // the type, so a runtime test of it would only restate what tsc already
  // refuses. (Found the hard way: the first draft of this file asserted both
  // and did not type-check.)
  it("forwards a different limit unchanged — the 10 is the caller's, not the shim's", async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toRecentGiftRecipientsClient(fakeSupabase);
    await shim
      .from("recent_gift_recipients")
      .select("id,full_name,avatar_url,badge_key,opened_at")
      .order("opened_at", { ascending: false })
      .limit(3);

    expect(order).toHaveBeenCalledExactlyOnceWith("opened_at", {
      ascending: false,
    });
    expect(limit).toHaveBeenCalledExactlyOnceWith(3);
  });

  it("surfaces a PostgREST error object rather than throwing — getRecentGiftRecipients reads `error` itself", async () => {
    const result = {
      data: null,
      error: { message: 'relation "recent_gift_recipients" does not exist' },
    };
    const limit = vi.fn(() => Promise.resolve(result));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toRecentGiftRecipientsClient(fakeSupabase);
    const awaited = await shim
      .from("recent_gift_recipients")
      .select("id,full_name,avatar_url,badge_key,opened_at")
      .order("opened_at", { ascending: false })
      .limit(10);

    expect(awaited).toEqual(result);
  });
});
