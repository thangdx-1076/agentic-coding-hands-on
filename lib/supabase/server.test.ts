import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "./server";

/**
 * Cả `@supabase/ssr` lẫn `next/headers` đều bị mock — mục tiêu là khoá lại
 * cách cookie adapter được nối vào SDK, không phải dựng một Supabase client
 * thật. Adapter đó là tham số thứ 3 (index 2) truyền cho `createServerClient`,
 * nên lấy ra qua `mock.calls[0][2].cookies` để gọi trực tiếp `getAll`/`setAll`
 * mà không cần đi qua toàn bộ client thật.
 */
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

/**
 * Kiểu tối thiểu của cookie adapter mà `server.ts` thực sự dựng — chỉ đúng
 * 2 phương thức nó định nghĩa. Kiểu thật từ `@supabase/ssr` khai `setAll`
 * với tham số thứ 2 và có thể là optional (hợp đồng cho phong cách cookie
 * method cũ `get/set/remove`); ép qua `unknown` để gọi đúng như implementation
 * thật gọi — 1 tham số, luôn tồn tại — thay vì phải giả tham số thứ 2 không
 * ai dùng.
 */
type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookiesToSet: {
      name: string;
      value: string;
      options: Record<string, unknown>;
    }[],
  ) => void;
};

describe("createClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() uỷ thác về cookieStore.getAll()", async () => {
    const fakeCookies = [{ name: "sb-token", value: "abc" }];
    const cookieStore = {
      getAll: vi.fn(() => fakeCookies),
      set: vi.fn(),
    };
    vi.mocked(cookies).mockResolvedValueOnce(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await createClient();

    const cookieConfig = vi.mocked(createServerClient).mock.calls[0][2]
      .cookies as unknown as CookieAdapter;
    expect(cookieConfig.getAll()).toBe(fakeCookies);
    expect(cookieStore.getAll).toHaveBeenCalledTimes(1);
  });

  it("setAll() nuốt exception khi cookieStore.set ném — Server Component chỉ đọc được cookies", async () => {
    const cookieStore = {
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error(
          "Cookies can only be modified in a Server Action or Route Handler",
        );
      }),
    };
    vi.mocked(cookies).mockResolvedValueOnce(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await createClient();

    const cookieConfig = vi.mocked(createServerClient).mock.calls[0][2]
      .cookies as unknown as CookieAdapter;

    // `cookieStore.set` ném vì đây là render Server Component (cookies() ở
    // đây chỉ đọc được) — `proxy.ts` đã refresh session cookie ở lớp
    // middleware rồi, nên setAll phải nuốt lỗi ở đây, không phải rò ra
    // ngoài làm crash render. Đây là nhánh catch{} rỗng duy nhất của file.
    expect(() =>
      cookieConfig.setAll([{ name: "sb-token", value: "xyz", options: {} }]),
    ).not.toThrow();
    expect(cookieStore.set).toHaveBeenCalledTimes(1);
  });
});
