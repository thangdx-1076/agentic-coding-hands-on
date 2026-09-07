import { describe, expect, it, vi } from "vitest";

import { getProfileCard, type ProfileCardsClient } from "./profile-cards";

/**
 * `getProfileCard` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the minimal
 * `.from().select().eq().maybeSingle()` surface it actually calls. No
 * network, no `@supabase/ssr` boundary to mock.
 */
function stubClient(
  maybeSingle: () => Promise<{
    data: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    error: unknown;
  }>,
): ProfileCardsClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  };
}

describe("getProfileCard", () => {
  it("row hợp lệ → map snake_case sang camelCase ProfileCard", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: {
          id: "user-1",
          full_name: "Dang Xuan Thang",
          avatar_url: "https://example.com/avatar.png",
        },
        error: null,
      }),
    );

    await expect(getProfileCard(client, "user-1")).resolves.toEqual({
      id: "user-1",
      fullName: "Dang Xuan Thang",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("full_name/avatar_url null → giữ nguyên null, không throw", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: { id: "user-2", full_name: null, avatar_url: null },
        error: null,
      }),
    );

    await expect(getProfileCard(client, "user-2")).resolves.toEqual({
      id: "user-2",
      fullName: null,
      avatarUrl: null,
    });
  });

  it("error khác null → fail-open null", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: new Error("boom") }),
    );

    await expect(getProfileCard(client, "user-1")).resolves.toBeNull();
  });

  it("data null (không có hàng) → fail-open null", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: null }),
    );

    await expect(getProfileCard(client, "user-1")).resolves.toBeNull();
  });

  it("client ném exception → fail-open null", async () => {
    const client: ProfileCardsClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(getProfileCard(client, "user-1")).resolves.toBeNull();
  });

  it("truyền đúng bảng/cột/id cho client được inject", async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: { id: "user-42", full_name: "A", avatar_url: null },
        error: null,
      }),
    );
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await getProfileCard({ from }, "user-42");

    expect(from).toHaveBeenCalledExactlyOnceWith("profile_cards");
    expect(select).toHaveBeenCalledExactlyOnceWith("id,full_name,avatar_url");
    expect(eq).toHaveBeenCalledExactlyOnceWith("id", "user-42");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });
});
