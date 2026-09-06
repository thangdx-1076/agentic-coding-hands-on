import { describe, expect, it, vi } from "vitest";

import { getCurrentUser } from "./auth";

import { createClient } from "@/lib/supabase/server";

/**
 * `@/lib/supabase/server` is mocked wholesale — `getCurrentUser` only ever
 * touches `createClient().auth.getUser()`, and that boundary already has
 * its own coverage (`src/lib/supabase/server.test.ts`, the route/page
 * call sites). Every branch here mirrors the fail-open shape the four
 * rewired call sites relied on before this module existed.
 */
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

type FakeUser = { id: string; email: string };

function stubGetUser(getUser: ReturnType<typeof vi.fn>) {
  vi.mocked(createClient).mockResolvedValueOnce({
    auth: { getUser },
    // Minimal shape `getCurrentUser` actually touches — casting the whole
    // `SupabaseClient` here would fight its generic builder types for no
    // benefit (see `dal/users-role-client.ts`'s own comment on the same
    // trade-off).
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe("getCurrentUser", () => {
  it("trả về user khi phiên hợp lệ", async () => {
    const fakeUser: FakeUser = { id: "user-1", email: "a@example.com" };
    stubGetUser(
      vi.fn().mockResolvedValueOnce({ data: { user: fakeUser }, error: null }),
    );

    await expect(getCurrentUser()).resolves.toEqual(fakeUser);
  });

  it("trả về null khi không có phiên đăng nhập", async () => {
    stubGetUser(
      vi.fn().mockResolvedValueOnce({ data: { user: null }, error: null }),
    );

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("trả về null khi getUser() trả error", async () => {
    stubGetUser(
      vi.fn().mockResolvedValueOnce({
        data: { user: null },
        error: new Error("boom"),
      }),
    );

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("trả về null khi createClient() ném exception", async () => {
    vi.mocked(createClient).mockImplementationOnce(() => {
      throw new Error("client factory failed");
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("trả về null khi getUser() ném exception", async () => {
    stubGetUser(vi.fn().mockRejectedValueOnce(new Error("network down")));

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
