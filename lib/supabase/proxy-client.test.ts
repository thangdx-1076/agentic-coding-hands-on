import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProxyClient } from "./proxy-client";

/**
 * `@supabase/ssr` bị mock toàn bộ; `request`/`response` là object giả chỉ
 * dựng đúng phần bề mặt `.cookies.getAll`/`.cookies.set` mà
 * `createProxyClient` chạm tới — ép qua `unknown` (`as unknown as`) thay vì
 * implement trọn `NextRequest`/`NextResponse` thật, giữ đúng rule cấm `any`
 * của dự án. Cookie adapter lấy ra từ tham số thứ 3 (index 2) của
 * `createServerClient`, cùng cách với `server.test.ts`.
 */
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

/**
 * Kiểu tối thiểu của cookie adapter mà `proxy-client.ts` thực sự dựng — chỉ
 * đúng 2 phương thức nó định nghĩa. Kiểu thật từ `@supabase/ssr` khai
 * `setAll` với tham số thứ 2 và có thể là optional (hợp đồng cho phong cách
 * cookie method cũ `get/set/remove`); ép qua `unknown` để gọi đúng như
 * implementation thật gọi — 1 tham số, luôn tồn tại — thay vì phải giả tham
 * số thứ 2 không ai dùng.
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

describe("createProxyClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() uỷ thác về request.cookies.getAll()", () => {
    const fakeCookies = [{ name: "sb-token", value: "abc" }];
    const requestCookies = { getAll: vi.fn(() => fakeCookies), set: vi.fn() };
    const responseCookies = { set: vi.fn() };
    const request = { cookies: requestCookies } as unknown as NextRequest;
    const response = { cookies: responseCookies } as unknown as NextResponse;

    createProxyClient(request, response);

    const cookieConfig = vi.mocked(createServerClient).mock.calls[0][2]
      .cookies as unknown as CookieAdapter;
    expect(cookieConfig.getAll()).toBe(fakeCookies);
  });

  it("setAll() ghi lên CẢ request.cookies (2 tham số) LẪN response.cookies (3 tham số)", () => {
    const requestCookies = { getAll: vi.fn(() => []), set: vi.fn() };
    const responseCookies = { set: vi.fn() };
    const request = { cookies: requestCookies } as unknown as NextRequest;
    const response = { cookies: responseCookies } as unknown as NextResponse;

    createProxyClient(request, response);

    const cookieConfig = vi.mocked(createServerClient).mock.calls[0][2]
      .cookies as unknown as CookieAdapter;
    cookieConfig.setAll([
      { name: "sb-token", value: "xyz", options: { path: "/" } },
    ]);

    // Bỏ nửa nào cũng làm mất session refresh: request để phần còn lại của
    // cùng lượt xử lý thấy giá trị mới, response để browser thực sự nhận
    // cookie đã xoay vòng. Bất đối xứng 2-tham-số/3-tham-số chính là nội
    // dung cần khoá lại, không phải chi tiết ngẫu nhiên.
    expect(requestCookies.set).toHaveBeenCalledExactlyOnceWith(
      "sb-token",
      "xyz",
    );
    expect(responseCookies.set).toHaveBeenCalledExactlyOnceWith(
      "sb-token",
      "xyz",
      { path: "/" },
    );
  });
});
