import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "./locale";

/**
 * `next/headers` được mock toàn bộ — `setLocale` chỉ được gọi từ Server
 * Action/Route Handler context trong thực tế, vitest chạy ngoài context đó
 * nên `cookies()` thật sẽ ném. Ba nhánh cần phủ: ghi cookie hợp lệ, input
 * rác bị `normalizeLocale` chặn trước khi ghi, và `cookieStore.set` ném lỗi
 * (cả `Error` lẫn giá trị không phải `Error`, vì code rẽ nhánh theo
 * `instanceof Error`).
 */
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

function stubCookieStore(set: ReturnType<typeof vi.fn>) {
  vi.mocked(cookies).mockResolvedValueOnce({
    set,
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe("setLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ghi cookie NEXT_LOCALE đúng tên/giá trị/options khi locale hợp lệ", async () => {
    const set = vi.fn();
    stubCookieStore(set);

    await setLocale("en");

    expect(set).toHaveBeenCalledExactlyOnceWith("NEXT_LOCALE", "en", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  });

  // Chốt chặn bảo mật: `locale` là input từ client (tham số Server Action),
  // đi thẳng vào `normalizeLocale` trước khi có cơ hội chạm cookie. Giá trị
  // này sau đó nuôi `import(\`messages/${locale}.json\`)` trong
  // `i18n/request.ts` — một input rác lọt qua tới đó là path traversal /
  // cookie injection. Test này khoá chốt: input không nằm trong
  // SUPPORTED_LOCALES phải luôn được ghi xuống cookie dưới dạng "vi", không
  // bao giờ ghi nguyên văn.
  it("normalize input rác về vi trước khi ghi cookie (chặn path traversal)", async () => {
    const set = vi.fn();
    stubCookieStore(set);

    await setLocale("../../etc/passwd");

    expect(set).toHaveBeenCalledExactlyOnceWith("NEXT_LOCALE", "vi", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  });

  it("bọc lỗi kèm tên cookie khi cookieStore.set ném Error", async () => {
    const set = vi.fn(() => {
      throw new Error("store unavailable");
    });
    stubCookieStore(set);

    await expect(setLocale("vi")).rejects.toThrow(
      "setLocale: failed to persist NEXT_LOCALE cookie: store unavailable",
    );
  });

  it("vẫn bọc được lỗi khi cookieStore.set ném giá trị không phải Error", async () => {
    const set = vi.fn(() => {
      // Cố ý ném giá trị non-Error để phủ nhánh `error instanceof Error ===
      // false` của setLocale (code rơi về String(error) trong nhánh đó).
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "boom-string";
    });
    stubCookieStore(set);

    await expect(setLocale("vi")).rejects.toThrow(
      "setLocale: failed to persist NEXT_LOCALE cookie: boom-string",
    );
  });
});
