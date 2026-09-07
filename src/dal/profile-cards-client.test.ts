import { describe, expect, it, vi } from "vitest";

import { toProfileCardsClient } from "./profile-cards-client";

type ShimInput = Parameters<typeof toProfileCardsClient>[0];

describe("toProfileCardsClient", () => {
  it("forwards the exact from/select/eq/maybeSingle chain and returns the SDK thenable", async () => {
    const result = {
      data: { id: "user-1", full_name: "A", avatar_url: null },
      error: null,
    };
    const maybeSingle = vi.fn(() => Promise.resolve(result));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toProfileCardsClient(fakeSupabase);
    const awaited = await shim
      .from("profile_cards")
      .select("id,full_name,avatar_url")
      .eq("id", "user-1")
      .maybeSingle();

    expect(from).toHaveBeenCalledWith("profile_cards");
    expect(select).toHaveBeenCalledWith("id,full_name,avatar_url");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    expect(awaited).toBe(result);
  });
});
