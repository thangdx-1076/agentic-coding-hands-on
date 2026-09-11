import { describe, expect, it, vi } from "vitest";

import { searchSunners, type SunnerSearchClient } from "./sunner-search";

type SunnerRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
};
type LimitResult = { data: SunnerRow[] | null; error: unknown };

/**
 * `searchSunners` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the minimal
 * `.from().select().ilike().order().limit()` surface it actually calls. No
 * network, no `@supabase/ssr` boundary to mock — mirrors
 * `profile-cards.test.ts`'s `stubClient`.
 */
function stubClient(limit: () => Promise<LimitResult>): SunnerSearchClient {
  return {
    from: () => ({
      select: () => ({
        ilike: () => ({
          order: () => ({ limit }),
        }),
      }),
    }),
  };
}

describe("searchSunners", () => {
  it("query hợp lệ → map snake_case sang camelCase SunnerSuggestion[]", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [
          {
            id: "user-1",
            full_name: "Dang Xuan Thang",
            avatar_url: "https://a.png",
            department: "CEVC1",
          },
        ],
        error: null,
      }),
    );

    await expect(searchSunners(client, "thang")).resolves.toEqual([
      {
        id: "user-1",
        fullName: "Dang Xuan Thang",
        avatarUrl: "https://a.png",
        department: "CEVC1",
      },
    ]);
  });

  it("full_name/avatar_url null → giữ nguyên null, không throw", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [
          {
            id: "user-2",
            full_name: null,
            avatar_url: null,
            department: "CEVC1",
          },
        ],
        error: null,
      }),
    );

    await expect(searchSunners(client, "a")).resolves.toEqual([
      { id: "user-2", fullName: null, avatarUrl: null, department: "CEVC1" },
    ]);
  });

  it("nhiều hàng → giữ đúng thứ tự trả về", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [
          { id: "u1", full_name: "An", avatar_url: null, department: "CEVC1" },
          {
            id: "u2",
            full_name: "Binh",
            avatar_url: null,
            department: "CEVC1",
          },
        ],
        error: null,
      }),
    );

    await expect(searchSunners(client, "n")).resolves.toEqual([
      { id: "u1", fullName: "An", avatarUrl: null, department: "CEVC1" },
      { id: "u2", fullName: "Binh", avatarUrl: null, department: "CEVC1" },
    ]);
  });

  it("error khác null → fail-open []", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: new Error("boom") }),
    );

    await expect(searchSunners(client, "thang")).resolves.toEqual([]);
  });

  it("data null (không có hàng) → fail-open []", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: null }),
    );

    await expect(searchSunners(client, "thang")).resolves.toEqual([]);
  });

  it("client ném exception → fail-open []", async () => {
    const client: SunnerSearchClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(searchSunners(client, "thang")).resolves.toEqual([]);
  });

  it("query rỗng → [] không gọi Supabase", async () => {
    const from = vi.fn();
    const client: SunnerSearchClient = { from };

    await expect(searchSunners(client, "")).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("query chỉ có khoảng trắng → [] không gọi Supabase", async () => {
    const from = vi.fn();
    const client: SunnerSearchClient = { from };

    await expect(searchSunners(client, "   ")).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("query không phải string ở runtime (bỏ qua kiểu TS) → [] không gọi Supabase", async () => {
    const from = vi.fn();
    const client: SunnerSearchClient = { from };

    await expect(
      searchSunners(client, 12345 as unknown as string),
    ).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("truyền đúng bảng/cột/limit mặc định và thứ tự cho client được inject", async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const ilike = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ ilike }));
    const from = vi.fn(() => ({ select }));

    await searchSunners({ from }, "  thang  ");

    expect(from).toHaveBeenCalledExactlyOnceWith("profile_cards");
    expect(select).toHaveBeenCalledExactlyOnceWith(
      "id,full_name,avatar_url,department",
    );
    expect(ilike).toHaveBeenCalledExactlyOnceWith("full_name", "%thang%");
    expect(order).toHaveBeenCalledExactlyOnceWith("full_name", {
      ascending: true,
    });
    expect(limit).toHaveBeenCalledExactlyOnceWith(8);
  });

  it("limit tuỳ chỉnh được chuyển tiếp thay cho mặc định", async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const ilike = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ ilike }));
    const from = vi.fn(() => ({ select }));

    await searchSunners({ from }, "thang", { limit: 3 });

    expect(limit).toHaveBeenCalledExactlyOnceWith(3);
  });

  it("escape %/_ trong query trước khi đưa vào ilike, để không thành wildcard", async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const ilike = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ ilike }));
    const from = vi.fn(() => ({ select }));

    await searchSunners({ from }, "100% off_score");

    expect(ilike).toHaveBeenCalledExactlyOnceWith(
      "full_name",
      "%100\\% off\\_score%",
    );
  });

  it("escape ký tự \\ trong query trước khi đưa vào ilike", async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const ilike = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ ilike }));
    const from = vi.fn(() => ({ select }));

    await searchSunners({ from }, "back\\slash");

    expect(ilike).toHaveBeenCalledExactlyOnceWith(
      "full_name",
      "%back\\\\slash%",
    );
  });
});
