import { describe, expect, it, vi } from "vitest";

import { getViewer } from "./get-viewer";

import { getCurrentUser } from "@/dal/auth";
import { getUserRole } from "@/dal/users";
import { getUnreadCount } from "@/dal/notifications";
import { createClient } from "@/lib/supabase/server";

/**
 * Mirrors `src/dal/auth.test.ts`'s mocking shape: `getViewer` only ever
 * touches `getCurrentUser()`, `createClient()` (for the role/unread-count
 * reads' client), `getUserRole()`, and `getUnreadCount()` — every boundary
 * already has its own coverage elsewhere, so this test only exercises
 * `getViewer`'s own branches (no user → `null`; user with a role →
 * `{email, isAdmin, unreadCount}`; user with no `email` → falls back to
 * `""`; a broken count that has already failed open to `0` → viewer still
 * returns, not `null`; thrown error → `null`), hoisted from `(home)/page.tsx`
 * (phase-02) and extended in phase-07.
 *
 * `toNotificationsClient` is NOT mocked — `getUnreadCount` is mocked
 * directly, so the real `toNotificationsClient(supabase)` call just wraps
 * the `{}` stand-in `createClient()` resolves to; nothing meaningful runs.
 */
vi.mock("@/dal/auth", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/dal/users", () => ({
  getUserRole: vi.fn(),
}));
vi.mock("@/dal/notifications", () => ({
  getUnreadCount: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getViewer", () => {
  it("trả về null khi không có user đăng nhập", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    await expect(getViewer()).resolves.toBeNull();
  });

  it("trả về { email, isAdmin, unreadCount } khi có user", async () => {
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
    vi.mocked(getUnreadCount).mockResolvedValueOnce(5);

    await expect(getViewer()).resolves.toEqual({
      email: "admin@sun-asterisk.com",
      isAdmin: true,
      unreadCount: 5,
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
    vi.mocked(getUnreadCount).mockResolvedValueOnce(0);

    await expect(getViewer()).resolves.toEqual({
      email: "",
      isAdmin: false,
      unreadCount: 0,
    });
  });

  it("đếm hỏng (getUnreadCount đã fail-open về 0) ⇒ unreadCount: 0, viewer vẫn trả về", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "user-3",
      email: "member@sun-asterisk.com",
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(getUserRole).mockResolvedValueOnce("member");
    // `getUnreadCount` already fails open to `0` internally
    // (`src/dal/notifications.ts`) — from `getViewer`'s perspective this is
    // just a normal resolved value, not a thrown error, so the viewer must
    // still come back whole, not `null`.
    vi.mocked(getUnreadCount).mockResolvedValueOnce(0);

    await expect(getViewer()).resolves.toEqual({
      email: "member@sun-asterisk.com",
      isAdmin: false,
      unreadCount: 0,
    });
  });

  it("trả về null khi có lỗi ném ra (fail-open)", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("boom"));

    await expect(getViewer()).resolves.toBeNull();
  });
});
