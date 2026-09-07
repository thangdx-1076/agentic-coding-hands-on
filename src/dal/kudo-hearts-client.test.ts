import { describe, expect, it, vi } from "vitest";

import { toKudoHeartsClient } from "./kudo-hearts-client";

type ShimInput = Parameters<typeof toKudoHeartsClient>[0];

describe("toKudoHeartsClient", () => {
  it("forwards the exact from/select/eq/in chain and returns the SDK thenable", async () => {
    const result = { data: [{ kudo_id: "kudo-1" }], error: null };
    const inFn = vi.fn(() => Promise.resolve(result));
    const eq = vi.fn(() => ({ in: inFn }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudoHeartsClient(fakeSupabase);
    const awaited = await shim
      .from("kudo_hearts")
      .select("kudo_id")
      .eq("user_id", "user-1")
      .in("kudo_id", ["kudo-1", "kudo-2"]);

    expect(from).toHaveBeenCalledWith("kudo_hearts");
    expect(select).toHaveBeenCalledWith("kudo_id");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(inFn).toHaveBeenCalledWith("kudo_id", ["kudo-1", "kudo-2"]);
    expect(awaited).toBe(result);
  });
});
