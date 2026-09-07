import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toggleKudoHeart } from "./toggle-kudo-heart";

import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/constants/routes";

/**
 * `@/lib/supabase/server` và `next/cache` được mock toàn bộ — cùng lý do
 * `logout.test.ts` đưa ra: `toggleKudoHeart` chỉ cần biết Postgres trả gì
 * (dữ liệu, hay lỗi kèm `code`), một `createClient`/`revalidatePath` thật
 * không thêm gì cho các nhánh thuần logic ở đây.
 */
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type SupabaseStub = Awaited<ReturnType<typeof createClient>>;

type HeartsSelectResult = { data: { id: string } | null; error: unknown };
type KudosSelectResult = {
  data: { heart_count: number } | null;
  error: unknown;
};

/**
 * Dựng một Supabase client giả chỉ có đúng bề mặt `toggleKudoHeart` chạm
 * tới: `auth.getUser()`, `from("kudo_hearts").select("id").eq().eq()
 * .maybeSingle()` (gọi lại một lần nữa sau khi đụng 23505), `.delete().eq()`,
 * `.insert()`, và `from("kudos").select("heart_count").eq().maybeSingle()`.
 *
 * `heartsSelectResults` là một HÀNG ĐỢI — lần gọi `maybeSingle()` đầu tiên
 * (kiểm tra trạng thái hiện có) lấy phần tử đầu, lần đọc lại sau 23505 (nếu
 * xảy ra) lấy phần tử kế tiếp.
 */
function stubSupabase(opts: {
  user: { id: string } | null;
  heartsSelectResults?: HeartsSelectResult[];
  insertError?: { code?: string } | null;
  deleteError?: unknown;
  kudosSelectResult?: KudosSelectResult;
}): {
  supabase: SupabaseStub;
  eqHearts: ReturnType<typeof vi.fn>;
  deleteEq: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  eqKudos: ReturnType<typeof vi.fn>;
} {
  const getUser = vi
    .fn()
    .mockResolvedValue({ data: { user: opts.user }, error: null });

  const heartsQueue = [...(opts.heartsSelectResults ?? [])];
  const maybeSingleHearts = vi.fn(() =>
    Promise.resolve(heartsQueue.shift() ?? { data: null, error: null }),
  );
  const eqHeartsSecond = vi.fn(() => ({ maybeSingle: maybeSingleHearts }));
  const eqHearts = vi.fn(() => ({ eq: eqHeartsSecond }));

  const deleteEq = vi.fn(() =>
    Promise.resolve({ error: opts.deleteError ?? null }),
  );
  const insert = vi.fn(() =>
    Promise.resolve({ error: opts.insertError ?? null }),
  );

  const eqKudos = vi.fn(() => ({
    maybeSingle: () =>
      Promise.resolve(
        opts.kudosSelectResult ?? { data: { heart_count: 0 }, error: null },
      ),
  }));

  const from = vi.fn((table: string) => {
    if (table === "kudo_hearts") {
      return {
        select: () => ({ eq: eqHearts }),
        delete: () => ({ eq: deleteEq }),
        insert,
      };
    }
    if (table === "kudos") {
      return { select: () => ({ eq: eqKudos }) };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  const supabase = { auth: { getUser }, from } as unknown as SupabaseStub;
  return { supabase, eqHearts, deleteEq, insert, eqKudos };
}

describe("toggleKudoHeart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("kudoId rỗng → {ok:false, reason:'error'}, không gọi createClient", async () => {
    await expect(toggleKudoHeart("")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("chưa đăng nhập → {ok:false, reason:'unauthenticated'}, không ghi", async () => {
    const { supabase, insert, deleteEq } = stubSupabase({ user: null });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(deleteEq).not.toHaveBeenCalled();
  });

  it("chưa có lượt tim → INSERT, trả hearted:true + heartCount, revalidate /kudos", async () => {
    const { supabase, insert } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [{ data: null, error: null }],
      kudosSelectResult: { data: { heart_count: 3 }, error: null },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: true,
      hearted: true,
      heartCount: 3,
    });
    expect(insert).toHaveBeenCalledExactlyOnceWith({
      kudo_id: "kudo-1",
      user_id: "user-1",
    });
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith(ROUTES.KUDOS);
  });

  it("đã có lượt tim → DELETE, trả hearted:false", async () => {
    const { supabase, deleteEq, insert } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [{ data: { id: "heart-1" }, error: null }],
      kudosSelectResult: { data: { heart_count: 2 }, error: null },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: true,
      hearted: false,
      heartCount: 2,
    });
    expect(deleteEq).toHaveBeenCalledExactlyOnceWith("id", "heart-1");
    expect(insert).not.toHaveBeenCalled();
  });

  it("INSERT đụng UNIQUE (23505, race hai click) → đọc lại thay vì ném, ok:true hearted:true", async () => {
    const { supabase } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [
        { data: null, error: null }, // lần đọc đầu: chưa thấy row
        { data: { id: "heart-1" }, error: null }, // đọc lại sau 23505: row đã có
      ],
      insertError: { code: "23505" },
      kudosSelectResult: { data: { heart_count: 5 }, error: null },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: true,
      hearted: true,
      heartCount: 5,
    });
  });

  it("lỗi khi đọc trạng thái lượt tim hiện có → {ok:false, reason:'error'}, không throw", async () => {
    const { supabase } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [{ data: null, error: new Error("rls denied") }],
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });

  it("lỗi DELETE → {ok:false, reason:'error'}", async () => {
    const { supabase } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [{ data: { id: "heart-1" }, error: null }],
      deleteError: new Error("boom"),
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });

  it("lỗi INSERT không phải 23505 (vd RLS chặn người gửi tự thả tim) → {ok:false, reason:'error'}", async () => {
    const { supabase } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [{ data: null, error: null }],
      insertError: { code: "42501" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });

  it("đọc heart_count thất bại sau khi ghi thành công → {ok:false, reason:'error'}", async () => {
    const { supabase } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [{ data: null, error: null }],
      kudosSelectResult: { data: null, error: null },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });

  it("heart_count trả về không phải number (dữ liệu hỏng) → {ok:false, reason:'error'}, không throw ra ngoài", async () => {
    const { supabase } = stubSupabase({
      user: { id: "user-1" },
      heartsSelectResults: [{ data: null, error: null }],
      kudosSelectResult: {
        data: { heart_count: "not-a-number" as unknown as number },
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });

  it("createClient ném exception → {ok:false, reason:'error'}", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("network down"));

    await expect(toggleKudoHeart("kudo-1")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });

  it("truyền đúng kudo_id/user_id khi tra trạng thái lượt tim", async () => {
    const { supabase, eqHearts } = stubSupabase({
      user: { id: "user-42" },
      heartsSelectResults: [{ data: null, error: null }],
      kudosSelectResult: { data: { heart_count: 1 }, error: null },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await toggleKudoHeart("kudo-99");

    expect(eqHearts).toHaveBeenCalledExactlyOnceWith("kudo_id", "kudo-99");
  });
});
