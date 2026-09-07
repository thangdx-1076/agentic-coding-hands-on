import { describe, expect, it, vi } from "vitest";

import { toKudosStatsClient } from "./kudos-stats-client";

type ShimInput = Parameters<typeof toKudosStatsClient>[0];

describe("toKudosStatsClient", () => {
  it("forwards the exact from/select/eq chain and returns the SDK thenable", async () => {
    const result = { data: [{ heart_count: 3 }], error: null };
    const eq = vi.fn(() => Promise.resolve(result));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudosStatsClient(fakeSupabase);
    const awaited = await shim
      .from("kudos")
      .select("heart_count")
      .eq("sender_id", "user-1");

    expect(from).toHaveBeenCalledWith("kudos");
    expect(select).toHaveBeenCalledWith("heart_count");
    expect(eq).toHaveBeenCalledWith("sender_id", "user-1");
    expect(awaited).toBe(result);
  });
});
