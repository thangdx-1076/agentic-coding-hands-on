import { describe, expect, it, vi } from "vitest";

import { toSunnerSearchClient } from "./sunner-search-client";

type ShimInput = Parameters<typeof toSunnerSearchClient>[0];

describe("toSunnerSearchClient", () => {
  it("forwards the exact from/select/ilike/order/limit chain and returns the SDK thenable", async () => {
    const result = {
      data: [{ id: "user-1", full_name: "A", avatar_url: null }],
      error: null,
    };
    const limit = vi.fn(() => Promise.resolve(result));
    const order = vi.fn(() => ({ limit }));
    const ilike = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ ilike }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toSunnerSearchClient(fakeSupabase);
    const awaited = await shim
      .from("profile_cards")
      .select("id,full_name,avatar_url,department")
      .ilike("full_name", "%thang%")
      .order("full_name", { ascending: true })
      .limit(8);

    expect(from).toHaveBeenCalledWith("profile_cards");
    expect(select).toHaveBeenCalledWith("id,full_name,avatar_url,department");
    expect(ilike).toHaveBeenCalledWith("full_name", "%thang%");
    expect(order).toHaveBeenCalledWith("full_name", { ascending: true });
    expect(limit).toHaveBeenCalledWith(8);
    expect(awaited).toBe(result);
  });
});
