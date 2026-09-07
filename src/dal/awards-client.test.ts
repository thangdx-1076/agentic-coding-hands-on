import { describe, expect, it, vi } from "vitest";

import { toAwardsClient } from "./awards-client";

type ShimInput = Parameters<typeof toAwardsClient>[0];

describe("toAwardsClient", () => {
  it("forwards the exact from/select/eq/order chain and returns the SDK thenable", async () => {
    const result = { data: [{ slug: "top-talent" }], error: null };
    const order = vi.fn(() => Promise.resolve(result));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toAwardsClient(fakeSupabase);
    const awaited = await shim
      .from("awards")
      .select(
        "slug,title,description,quantity_value,quantity_unit,prize_values",
      )
      .eq("locale", "vi")
      .order("sort_order", { ascending: true });

    expect(from).toHaveBeenCalledWith("awards");
    expect(select).toHaveBeenCalledWith(
      "slug,title,description,quantity_value,quantity_unit,prize_values",
    );
    expect(eq).toHaveBeenCalledWith("locale", "vi");
    expect(order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(awaited).toBe(result);
  });
});
