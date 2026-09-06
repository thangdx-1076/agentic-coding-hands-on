import { describe, expect, it, vi } from "vitest";

import { toUsersRoleClient } from "./users-role-client";

type ShimInput = Parameters<typeof toUsersRoleClient>[0];

describe("toUsersRoleClient", () => {
  it("forwards the exact from/select/eq/maybeSingle chain and returns the SDK thenable", async () => {
    const result = { data: { role: "admin" }, error: null };
    const maybeSingle = vi.fn(() => Promise.resolve(result));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toUsersRoleClient(fakeSupabase);
    const awaited = await shim
      .from("users")
      .select("role")
      .eq("id", "user-1")
      .maybeSingle();

    expect(from).toHaveBeenCalledWith("users");
    expect(select).toHaveBeenCalledWith("role");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    expect(awaited).toBe(result);
  });
});
