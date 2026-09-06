import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { logoutAction } from "./actions";

import { createClient } from "@/lib/supabase/server";

/**
 * `@/lib/supabase/server` được mock toàn bộ: `logoutAction` chỉ cần biết
 * `signOut()` thành công hay ném, một `createClient` thật (chạm mạng qua
 * MSW) không thêm gì cho hai nhánh này — khác với `route.test.ts`, nơi bắt
 * buộc phải đi qua `@supabase/ssr` + MSW thật vì đó là cách duy nhất chứng
 * minh FR-003 cho nhánh trao đổi mã PKCE. Giữ file này đơn giản, có chủ đích.
 *
 * `next/navigation`'s `redirect()` được mock RIÊNG và PHẢI NÉM: hành vi thật
 * của nó là ném một exception đặc biệt để unwind cây render, không return
 * bình thường. Nếu mock chỉ ghi nhận lời gọi rồi return, một bug kiểu "code
 * sau redirect() vẫn chạy" sẽ không bị test này bắt được — nó sẽ pass giả.
 */
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

/** Sentinel ném thay cho hành vi NEXT_REDIRECT thật của Next. */
class RedirectSentinel extends Error {
  constructor(public readonly destination: string) {
    super("NEXT_REDIRECT");
  }
}

type SignOutMock = ReturnType<typeof vi.fn>;

/**
 * `as unknown as` thay vì `as any`: mock chỉ dựng đúng phần bề mặt
 * (`auth.signOut`) mà `logoutAction` chạm tới, nên không khớp trọn kiểu
 * `SupabaseClient` — ép qua `unknown` giữ được rule cấm `any` của dự án.
 */
function stubSignOut(signOut: SignOutMock) {
  vi.mocked(createClient).mockResolvedValueOnce({
    auth: { signOut },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe("logoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redirect).mockImplementation((destination: string) => {
      throw new RedirectSentinel(destination);
    });
  });

  it("gọi signOut() rồi redirect('/login') khi thành công", async () => {
    const signOut = vi.fn().mockResolvedValueOnce({ error: null });
    stubSignOut(signOut);

    await expect(logoutAction()).rejects.toThrow(RedirectSentinel);

    expect(signOut).toHaveBeenCalledExactlyOnceWith();
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/login");
  });

  it("vẫn redirect('/login') khi signOut() ném — best-effort, không để user kẹt ở /todo", async () => {
    const signOut = vi
      .fn()
      .mockRejectedValueOnce(new Error("session already expired"));
    stubSignOut(signOut);

    await expect(logoutAction()).rejects.toThrow(RedirectSentinel);

    expect(signOut).toHaveBeenCalledExactlyOnceWith();
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/login");
  });
});
