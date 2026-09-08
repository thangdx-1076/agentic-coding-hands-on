import { beforeEach, describe, expect, it, vi } from "vitest";

import { searchSunners } from "./search-sunners";

import { searchSunners as searchSunnerProfiles } from "@/dal/sunner-search";
import { createClient } from "@/lib/supabase/server";

/**
 * `@/dal/sunner-search` and `@/lib/supabase/server` are mocked entirely —
 * same reasoning `load-more-kudos.test.ts` gives: this action only needs to
 * know what the DAL/auth layer return (data, or an error), a real
 * Supabase/DB adds nothing to the purely-logic branches exercised here
 * (`searchSunners`'s (the DAL's) own test already covers the query
 * construction). `@/dal/sunner-search-client`'s `toSunnerSearchClient` is
 * NOT mocked — like `toKudosClient` in `load-more-kudos.test.ts`, it just
 * builds an object that is never invoked because the mocked DAL function
 * never calls back into it.
 */
vi.mock("@/dal/sunner-search", () => ({ searchSunners: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type SupabaseStub = Awaited<ReturnType<typeof createClient>>;

function stubSupabase(user: { id: string } | null): SupabaseStub {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
  return { auth: { getUser } } as unknown as SupabaseStub;
}

describe("searchSunners (server action)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("query rỗng → [] không gọi createClient", async () => {
    await expect(searchSunners("")).resolves.toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("query chỉ có khoảng trắng → [] không gọi createClient", async () => {
    await expect(searchSunners("   ")).resolves.toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("query không phải string ở runtime (bỏ qua kiểu TS) → [] không gọi createClient", async () => {
    await expect(searchSunners(12345 as unknown as string)).resolves.toEqual(
      [],
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("query dài hơn 128 ký tự → cắt còn 128 ký tự trước khi gọi DAL", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      stubSupabase({ id: "user-1" }),
    );
    vi.mocked(searchSunnerProfiles).mockResolvedValueOnce([]);

    const longQuery = "a".repeat(200);
    await searchSunners(longQuery);

    expect(searchSunnerProfiles).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      "a".repeat(128),
      { limit: 8 },
    );
  });

  it("chưa đăng nhập → [] không gọi DAL", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(stubSupabase(null));

    await expect(searchSunners("thang")).resolves.toEqual([]);
    expect(searchSunnerProfiles).not.toHaveBeenCalled();
  });

  it("đã đăng nhập, query hợp lệ → trả đúng kết quả từ DAL, đã trim query", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      stubSupabase({ id: "user-1" }),
    );
    const suggestions = [
      { id: "u1", fullName: "Dang Xuan Thang", avatarUrl: null },
    ];
    vi.mocked(searchSunnerProfiles).mockResolvedValueOnce(suggestions);

    await expect(searchSunners("  thang  ")).resolves.toEqual(suggestions);
    expect(searchSunnerProfiles).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      "thang",
      { limit: 8 },
    );
  });

  it("createClient() ném lỗi → fail-open []", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("no cookies"));

    await expect(searchSunners("thang")).resolves.toEqual([]);
  });

  it("auth.getUser() ném lỗi → fail-open []", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockRejectedValue(new Error("boom")) },
    } as unknown as SupabaseStub;
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(searchSunners("thang")).resolves.toEqual([]);
  });

  it("DAL searchSunners ném lỗi (phòng hờ, dù DAL tự fail-open) → fail-open []", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      stubSupabase({ id: "user-1" }),
    );
    vi.mocked(searchSunnerProfiles).mockRejectedValueOnce(new Error("boom"));

    await expect(searchSunners("thang")).resolves.toEqual([]);
  });
});
