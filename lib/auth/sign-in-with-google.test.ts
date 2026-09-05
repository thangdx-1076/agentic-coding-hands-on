import { beforeEach, describe, expect, it, vi } from "vitest";

import { signInWithGoogle } from "./sign-in-with-google";

import { createClient } from "@/lib/supabase/client";

/**
 * Supabase client được mock toàn bộ — không gọi mạng, không cần biến môi
 * trường. Bài test phủ mọi nhánh của `signInWithGoogle`: thành công, lỗi
 * do Supabase trả về, và hai đường ném exception. Bất biến quan trọng nhất
 * là `redirectTo` phải được dựng đúng và truyền kèm `provider: "google"`.
 */
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

type OAuthMock = ReturnType<typeof vi.fn>;

/**
 * Gắn một `signInWithOAuth` giả vào `createClient` cho đúng một lần gọi.
 *
 * `as unknown as` thay vì `as any`: mock chỉ dựng đúng phần bề mặt mà
 * `signInWithGoogle` chạm tới, nên không thể khớp trọn kiểu `SupabaseClient`
 * — nhưng ép qua `unknown` giữ được rule cấm `any` của dự án.
 */
function stubOAuth(signInWithOAuth: OAuthMock) {
  vi.mocked(createClient).mockReturnValueOnce({
    auth: { signInWithOAuth },
  } as unknown as ReturnType<typeof createClient>);
}

const ORIGIN = "http://localhost:3000";

describe("signInWithGoogle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trả { ok: true } khi khởi động OAuth thành công", async () => {
    stubOAuth(vi.fn().mockResolvedValueOnce({ error: null }));

    const result = await signInWithGoogle({
      origin: ORIGIN,
      next: "/dashboard",
    });

    expect(result).toEqual({ ok: true });
  });

  it("trả { ok: false } khi Supabase trả về error", async () => {
    stubOAuth(
      vi
        .fn()
        .mockResolvedValueOnce({ error: new Error("Invalid OAuth config") }),
    );

    const result = await signInWithGoogle({
      origin: ORIGIN,
      next: "/dashboard",
    });

    expect(result).toEqual({ ok: false });
  });

  it("trả { ok: false } khi createClient ném lỗi", async () => {
    vi.mocked(createClient).mockImplementationOnce(() => {
      throw new Error("Client factory failed");
    });

    const result = await signInWithGoogle({
      origin: ORIGIN,
      next: "/dashboard",
    });

    expect(result).toEqual({ ok: false });
  });

  it("trả { ok: false } khi signInWithOAuth ném lỗi", async () => {
    stubOAuth(vi.fn().mockRejectedValueOnce(new Error("Network error")));

    const result = await signInWithGoogle({
      origin: ORIGIN,
      next: "/dashboard",
    });

    expect(result).toEqual({ ok: false });
  });

  it("dựng redirectTo đúng dạng ${origin}/auth/callback?next=${next} kèm provider google", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValueOnce({ error: null });
    stubOAuth(signInWithOAuth);

    await signInWithGoogle({
      origin: "https://example.com",
      next: "/profile/settings",
    });

    expect(signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
      provider: "google",
      options: {
        redirectTo: "https://example.com/auth/callback?next=/profile/settings",
      },
    });
  });

  it("rơi về /todo khi next rỗng", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValueOnce({ error: null });
    stubOAuth(signInWithOAuth);

    await signInWithGoogle({ origin: ORIGIN, next: "" });

    expect(signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/todo" },
    });
  });

  // Ba case dưới đây là lý do `next` đi qua `safeNextPath`: ràng buộc "chỉ
  // nhận đường dẫn nội bộ" phải nằm ở code, không nằm ở comment. Một caller
  // sau này nối `next` từ query param cũng không mở được open redirect.
  it.each([
    ["off-origin tuyệt đối", "https://evil.com"],
    ["protocol-relative", "//evil.com"],
    ["header injection", "/todo%0d%0aSet-Cookie:+a=b"],
  ])("chặn %s, rơi về /todo", async (_label, hostile) => {
    const signInWithOAuth = vi.fn().mockResolvedValueOnce({ error: null });
    stubOAuth(signInWithOAuth);

    await signInWithGoogle({ origin: ORIGIN, next: hostile });

    expect(signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/todo" },
    });
  });
});
