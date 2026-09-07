import { describe, expect, it, vi } from "vitest";

import { getViewer } from "./get-viewer";

import { getCurrentUser } from "@/dal/auth";
import { getUserRole } from "@/dal/users";
import { createClient } from "@/lib/supabase/server";

/**
 * Mirrors `src/dal/auth.test.ts`'s mocking shape: `getViewer` only ever
 * touches `getCurrentUser()`, `createClient()` (for the role read's
 * client) and `getUserRole()` — every boundary already has its own
 * coverage elsewhere, so this test only exercises `getViewer`'s own
 * branches (no user → `null`; user with a role → `{email, isAdmin}`;
 * user with no `email` → falls back to `""`; thrown error → `null`),
 * hoisted from `(home)/page.tsx` (phase-02).
 */
vi.mock("@/dal/auth", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/dal/users", () => ({
  getUserRole: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getViewer", () => {
  it("trả về null khi không có user đăng nhập", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    await expect(getViewer()).resolves.toBeNull();
  });

  it("trả về { email, isAdmin } khi có user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "user-1",
      email: "admin@sun-asterisk.com",
      // Minimal shape `getViewer` actually touches — casting the whole
      // Supabase `User` here would fight its full generic surface for no
      // benefit (same trade-off documented in `dal/users-role-client.ts`).
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(getUserRole).mockResolvedValueOnce("admin");

    await expect(getViewer()).resolves.toEqual({
      email: "admin@sun-asterisk.com",
      isAdmin: true,
    });
  });

  it("email rơi về '' khi user không có email", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "user-2",
      email: undefined,
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(getUserRole).mockResolvedValueOnce("member");

    await expect(getViewer()).resolves.toEqual({
      email: "",
      isAdmin: false,
    });
  });

  it("trả về null khi có lỗi ném ra (fail-open)", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("boom"));

    await expect(getViewer()).resolves.toBeNull();
  });
});
