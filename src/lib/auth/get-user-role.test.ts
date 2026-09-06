import { describe, expect, it, vi } from "vitest";

import { getUserRole, type UsersRoleClient } from "./get-user-role";

/**
 * `getUserRole` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the minimal
 * `.from().select().eq().maybeSingle()` surface it actually calls. No
 * network, no `@supabase/ssr` boundary to mock.
 */
function stubClient(
  maybeSingle: () => Promise<{
    data: { role?: string | null } | null;
    error: unknown;
  }>,
): UsersRoleClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  };
}

describe("getUserRole", () => {
  it("role='admin' → 'admin'", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: { role: "admin" }, error: null }),
    );

    await expect(getUserRole(client, "user-1")).resolves.toBe("admin");
  });

  it("role='member' → 'member'", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: { role: "member" }, error: null }),
    );

    await expect(getUserRole(client, "user-1")).resolves.toBe("member");
  });

  it("role không rõ (giá trị lạ) → fail-open 'member'", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: { role: "superadmin" }, error: null }),
    );

    await expect(getUserRole(client, "user-1")).resolves.toBe("member");
  });

  it("error khác null → fail-open 'member'", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: new Error("boom") }),
    );

    await expect(getUserRole(client, "user-1")).resolves.toBe("member");
  });

  it("data null (không có row) → fail-open 'member'", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: null }),
    );

    await expect(getUserRole(client, "user-1")).resolves.toBe("member");
  });

  it("client ném exception → fail-open 'member'", async () => {
    const client: UsersRoleClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(getUserRole(client, "user-1")).resolves.toBe("member");
  });

  it("truyền đúng bảng/cột/id cho client được inject", async () => {
    const eq = vi.fn(() => ({
      maybeSingle: () =>
        Promise.resolve({ data: { role: "member" }, error: null }),
    }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await getUserRole({ from }, "user-42");

    expect(from).toHaveBeenCalledExactlyOnceWith("users");
    expect(select).toHaveBeenCalledExactlyOnceWith("role");
    expect(eq).toHaveBeenCalledExactlyOnceWith("id", "user-42");
  });
});
