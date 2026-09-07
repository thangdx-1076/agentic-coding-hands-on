import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createKudo } from "./create-kudo";

import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/constants/routes";

/**
 * `@/lib/supabase/server` and `next/cache` are mocked entirely, same
 * reasoning `toggle-kudo-heart.test.ts` gives. `upload-kudo-images.ts` is
 * deliberately NOT mocked: the stub client below implements
 * `storage.from().upload/getPublicUrl/remove` directly, so the REAL
 * `uploadKudoImages`/`removeKudoImages` run — this is what lets the
 * upload-failure and insert-failure tests below assert on `.remove()`
 * actually being called with the right paths, not just on this action's
 * own return value.
 */
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type SupabaseStub = Awaited<ReturnType<typeof createClient>>;

function makeFile(
  overrides: Partial<{ name: string; type: string }> = {},
): File {
  const { name = "photo.jpg", type = "image/jpeg" } = overrides;
  return new File(["data"], name, { type });
}

type UploadCallResult =
  { data: { path: string }; error: null } | { data: null; error: unknown };

function stubSupabase(opts: {
  user: { id: string } | null;
  insertError?: unknown;
  /** Queue consumed one entry per `upload()` call; once exhausted (or when
   * omitted entirely), every further call succeeds. */
  uploadResults?: UploadCallResult[];
}): {
  supabase: SupabaseStub;
  insert: ReturnType<typeof vi.fn>;
  upload: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  const getUser = vi
    .fn()
    .mockResolvedValue({ data: { user: opts.user }, error: null });

  const insert = vi.fn(() =>
    Promise.resolve({ error: opts.insertError ?? null }),
  );
  const from = vi.fn((table: string) => {
    if (table === "kudos") {
      return { insert };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  const uploadQueue = [...(opts.uploadResults ?? [])];
  const upload = vi.fn(() =>
    Promise.resolve(
      uploadQueue.shift() ?? { data: { path: "unused" }, error: null },
    ),
  );
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://storage.example/kudo-images/${path}` },
  }));
  const remove = vi.fn(() => Promise.resolve({ data: [], error: null }));
  const storageFrom = vi.fn(() => ({ upload, getPublicUrl, remove }));

  const supabase = {
    auth: { getUser },
    from,
    storage: { from: storageFrom },
  } as unknown as SupabaseStub;

  return { supabase, insert, upload, remove };
}

/** Every required field filled, no images — the smallest valid submission. */
function makeValidFormData(
  overrides: Record<string, string | string[]> = {},
): FormData {
  const fields = {
    recipientId: "sunner-1",
    title: "Người truyền động lực cho tôi",
    content: "Cảm ơn bạn rất nhiều",
    hashtags: ["teamwork"],
    isAnonymous: "false",
    anonymousName: "",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("recipientId", fields.recipientId);
  formData.set("title", fields.title);
  formData.set("content", fields.content);
  for (const tag of fields.hashtags) {
    formData.append("hashtags", tag);
  }
  formData.set("isAnonymous", fields.isAnonymous);
  formData.set("anonymousName", fields.anonymousName);
  return formData;
}

describe("createKudo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chưa đăng nhập → {ok:false, reason:'unauthenticated'}, không chạm Storage lẫn .insert (ID-1)", async () => {
    const { supabase, insert, upload } = stubSupabase({ user: null });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    await expect(createKudo(makeValidFormData())).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("thiếu cả 4 trường bắt buộc → validation với 4 mã lỗi, không ghi gì (ID-56)", async () => {
    const { supabase, insert, upload } = stubSupabase({
      user: { id: "user-1" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData({
      recipientId: "",
      title: "",
      content: "",
      hashtags: [],
    });

    await expect(createKudo(formData)).resolves.toEqual({
      ok: false,
      reason: "validation",
      fieldErrors: {
        recipientId: "required",
        title: "required",
        content: "required",
        hashtags: "required",
      },
    });
    expect(insert).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("gọi thẳng Server Action với FormData rỗng (trường thiếu hẳn, không phải chuỗi rỗng) → coi như rỗng, validation (phòng thủ ở biên)", async () => {
    const { supabase, insert } = stubSupabase({ user: { id: "user-1" } });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const result = await createKudo(new FormData());

    expect(result).toEqual({
      ok: false,
      reason: "validation",
      fieldErrors: {
        recipientId: "required",
        title: "required",
        content: "required",
        hashtags: "required",
      },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("6 hashtag → validation với hashtags:'tooMany'", async () => {
    const { supabase, insert } = stubSupabase({ user: { id: "user-1" } });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData({
      hashtags: ["a", "b", "c", "d", "e", "f"],
    });

    const result = await createKudo(formData);

    expect(result).toEqual({
      ok: false,
      reason: "validation",
      fieldErrors: { hashtags: "tooMany" },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("bật ẩn danh nhưng bỏ trống tên → validation với anonymousName:'required' (D001)", async () => {
    const { supabase, insert } = stubSupabase({ user: { id: "user-1" } });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData({
      isAnonymous: "true",
      anonymousName: "",
    });

    const result = await createKudo(formData);

    expect(result).toEqual({
      ok: false,
      reason: "validation",
      fieldErrors: { anonymousName: "required" },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("file .txt (sai định dạng) → validation với images:'invalidType' (ID-55)", async () => {
    const { supabase, insert, upload } = stubSupabase({
      user: { id: "user-1" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData();
    formData.append(
      "images",
      new File(["x"], "notes.txt", { type: "text/plain" }),
    );

    const result = await createKudo(formData);

    expect(result).toEqual({
      ok: false,
      reason: "validation",
      fieldErrors: { images: "invalidType" },
    });
    expect(insert).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("6 ảnh hợp lệ → validation với images:'tooMany'", async () => {
    const { supabase, insert, upload } = stubSupabase({
      user: { id: "user-1" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData();
    for (let index = 0; index < 6; index += 1) {
      formData.append("images", makeFile({ name: `photo-${index}.jpg` }));
    }

    const result = await createKudo(formData);

    expect(result).toEqual({
      ok: false,
      reason: "validation",
      fieldErrors: { images: "tooMany" },
    });
    expect(insert).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("upload ảnh thứ 3 lỗi giữa chừng → {ok:false, reason:'upload'}, remove() dọn đúng 2 ảnh đã lên, không có .insert nào", async () => {
    const { supabase, insert, upload, remove } = stubSupabase({
      user: { id: "user-1" },
      uploadResults: [
        { data: { path: "p1" }, error: null },
        { data: { path: "p2" }, error: null },
        { data: null, error: { message: "storage down" } },
      ],
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData();
    formData.append("images", makeFile({ name: "a.jpg" }));
    formData.append("images", makeFile({ name: "b.jpg" }));
    formData.append("images", makeFile({ name: "c.jpg" }));

    await expect(createKudo(formData)).resolves.toEqual({
      ok: false,
      reason: "upload",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("INSERT bị RLS từ chối sau khi upload thành công → {ok:false, reason:'error'}, remove() dọn ảnh mồ côi", async () => {
    const { supabase, insert, remove } = stubSupabase({
      user: { id: "user-1" },
      insertError: { message: "permission denied", code: "42501" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData();
    formData.append("images", makeFile());

    await expect(createKudo(formData)).resolves.toEqual({
      ok: false,
      reason: "error",
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0]).toHaveLength(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("happy path 0 ảnh → hashtags[0] là title, is_anonymous false, revalidate /kudos", async () => {
    const { supabase, insert, upload } = stubSupabase({
      user: { id: "user-1" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData({
      title: "Người truyền cảm hứng",
      hashtags: ["teamwork", "culture"],
    });

    const result = await createKudo(formData);

    if (!result.ok) {
      throw new Error(`expected ok:true, got ${JSON.stringify(result)}`);
    }
    expect(typeof result.kudoId).toBe("string");
    expect(upload).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        sender_id: "user-1",
        receiver_id: "sunner-1",
        content: "Cảm ơn bạn rất nhiều",
        hashtags: ["Người truyền cảm hứng", "teamwork", "culture"],
        image_urls: [],
        is_anonymous: false,
        anonymous_name: null,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith(ROUTES.KUDOS);
  });

  it("happy path 2 ảnh + ẩn danh → image_urls từ Storage, anonymous_name lưu đúng", async () => {
    const { supabase, insert, upload } = stubSupabase({
      user: { id: "user-1" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData({
      isAnonymous: "true",
      anonymousName: "Một Sunner",
    });
    formData.append("images", makeFile({ name: "a.jpg" }));
    formData.append("images", makeFile({ name: "b.png", type: "image/png" }));

    const result = await createKudo(formData);

    if (!result.ok) {
      throw new Error(`expected ok:true, got ${JSON.stringify(result)}`);
    }
    expect(typeof result.kudoId).toBe("string");
    expect(upload).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledTimes(1);
    const insertArg = insert.mock.calls[0]?.[0] as {
      is_anonymous: boolean;
      anonymous_name: string | null;
      image_urls: string[];
    };
    expect(insertArg.is_anonymous).toBe(true);
    expect(insertArg.anonymous_name).toBe("Một Sunner");
    expect(insertArg.image_urls).toHaveLength(2);
    for (const url of insertArg.image_urls) {
      expect(url).toMatch(/^https:\/\/storage\.example\/kudo-images\/user-1\//);
    }
  });

  it("hashtag chip trùng/khoảng trắng và ảnh rác lẫn trong FormData → bị chuẩn hoá/lọc bỏ trước khi ghi", async () => {
    const { supabase, insert, upload } = stubSupabase({
      user: { id: "user-1" },
    });
    vi.mocked(createClient).mockResolvedValueOnce(supabase);

    const formData = makeValidFormData({
      hashtags: ["teamwork", " teamwork ", "culture"],
    });
    // Giá trị rác lẫn vào field "images": một File 0 byte (placeholder của
    // input multi-file khi một ô chưa chọn file) và một entry không phải
    // File — cả hai phải bị lọc bỏ trước khi tới validateKudoImages.
    formData.append(
      "images",
      new File([], "empty.jpg", { type: "image/jpeg" }),
    );
    formData.append("images", "not-a-file");

    const result = await createKudo(formData);

    if (!result.ok) {
      throw new Error(`expected ok:true, got ${JSON.stringify(result)}`);
    }
    expect(typeof result.kudoId).toBe("string");
    expect(upload).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        hashtags: ["Người truyền động lực cho tôi", "teamwork", "culture"],
        image_urls: [],
      }),
    );
  });

  it("createClient() ném lỗi → {ok:false, reason:'error'}", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("network down"));

    await expect(createKudo(makeValidFormData())).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });
});
