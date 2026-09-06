import { http, HttpResponse } from "msw";
import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

import { server } from "@/mocks/node";

/**
 * BƯỚC 1 (bắt buộc theo phase-06, giải câu chưa chốt §5.3 #4): smoke-test
 * `NextResponse.redirect()` NGOÀI request context của Next đã chạy TRƯỚC khi
 * viết phần còn lại của file này (xem test đầu tiên bên dưới).
 *
 * KẾT QUẢ: `NextResponse.redirect()` hoạt động bình thường trong vitest
 * `environment: "node"` — nó chỉ dựng một `Response` chuẩn (status 307 +
 * header `Location`), không đọc AsyncLocalStorage / request context nào của
 * Next runtime. Khác hẳn `redirect()` của `next/navigation` (dùng trong
 * `app/_actions/logout.ts`) — hàm đó NÉM để unwind render và đòi request
 * context. Route Handler này an toàn để gọi trực tiếp như một hàm thường,
 * không cần dựng request context giả nào.
 *
 * Chỉ `next/headers` bị mock ở file này — `@/lib/supabase/server` chạy
 * THẬT (createServerClient thật của @supabase/ssr) để nhánh `?code=ok` đi
 * qua MSW thật, đúng tinh thần FR-003 (xem test "?code= hợp lệ" bên dưới).
 */
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

/** Khớp `NEXT_PUBLIC_SUPABASE_URL` khai báo trong vitest.config.ts. */
const SUPABASE_URL = "http://127.0.0.1:54321";

/**
 * CẠM BẪY PKCE (đã tra công thức thật, không đoán — xem chi tiết dưới):
 * `exchangeCodeForSession(code)` đọc code-verifier từ cookie TRƯỚC khi bắn
 * request. Thiếu cookie này, @supabase/ssr trả lỗi trước khi chạm mạng và
 * MSW không bao giờ được gọi — test "pass" nhưng chứng minh sai thứ.
 *
 * Công thức tên cookie tra được bằng cách tải mã nguồn THẬT của đúng bản đã
 * ghim trong package.json (không phải suy đoán từ quy ước công khai):
 * `@supabase/supabase-js@2.115.0` (SupabaseClient.ts):
 *   `defaultStorageKey = sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`
 * Với "http://127.0.0.1:54321", hostname là "127.0.0.1" → split(".")[0] là
 * "127" — KHÔNG phải một project ref thật (không có domain `*.supabase.co`
 * ở local/test), chỉ là hệ quả của việc chạy qua IP. => storageKey thật sự
 * dùng ở runtime này là "sb-127-auth-token", KHÁC quy ước "sb-<ref>-..." hay
 * thấy trong tài liệu công khai.
 *
 * `@supabase/auth-js@2.115.0` (helpers.ts's retrievePKCEVerifier, gọi từ
 * GoTrueClient's _exchangeCodeForSession với requestedFlowId=null vì code
 * gọi `exchangeCodeForSession(code)` không kèm flowId và không chạy trong
 * browser): đọc thẳng khoá cố định `${storageKey}-code-verifier` — không
 * cần dựng flow-id slot hay flow index, một cookie duy nhất là đủ.
 */
const PKCE_VERIFIER_COOKIE_NAME = "sb-127-auth-token-code-verifier";
const FAKE_CODE_VERIFIER = "test-pkce-code-verifier-static-000000000000";

/**
 * Mã hoá giá trị cookie đúng như @supabase/ssr@0.12.5 (cookies.js) làm:
 * auth-js's setItemAsync trước tiên JSON.stringify giá trị, rồi tầng cookie
 * của ssr base64url-encode (UTF-8) kèm tiền tố "base64-" (cookieEncoding
 * mặc định "base64url"). Thuật toán base64url riêng của gói này
 * (utils/base64url.js, bảng chữ RFC4648 §5, không padding) đã được đọc và
 * xác nhận tương đương byte-for-byte với `Buffer#toString("base64url")` của
 * Node cho input ASCII thuần — verifier giả ở đây chỉ gồm ký tự an toàn.
 */
function toSupabaseSsrCookieValue(rawValue: string): string {
  return `base64-${Buffer.from(JSON.stringify(rawValue), "utf-8").toString("base64url")}`;
}

/**
 * Dựng cookie jar giả một phiên PKCE đang chờ exchange: một cookie
 * code-verifier hợp lệ + `set()` no-op để `applyServerStorage` (chạy sau
 * khi exchange thành công, qua onAuthStateChange) có chỗ ghi session mới
 * mà không ném.
 *
 * `as unknown as` thay vì `as any`: mock chỉ dựng đúng phần bề mặt
 * (`getAll`/`set`) mà @supabase/ssr chạm tới, không khớp trọn kiểu
 * `ReadonlyRequestCookies` — ép qua `unknown` giữ được rule cấm `any`.
 */
function stubPendingPkceSession() {
  const set = vi.fn();
  vi.mocked(cookies).mockResolvedValueOnce({
    getAll: () => [
      {
        name: PKCE_VERIFIER_COOKIE_NAME,
        value: toSupabaseSsrCookieValue(FAKE_CODE_VERIFIER),
      },
    ],
    set,
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  return { set };
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Dọn riêng listener mà CHÍNH file này gắn qua server.events.on. Không
    // đụng tới server.listen/close/resetHandlers — những cái đó đã dùng
    // chung ở tests/setup/msw-node.ts cho mọi file test.
    server.events.removeAllListeners();
  });

  it("không có code lẫn error → redirect 307 tới /login?error=auth_code_error, không chạm Supabase", async () => {
    const response = await GET(new Request("http://x/auth/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://x/login?error=auth_code_error",
    );
  });

  it("có ?error= → redirect /login?error=<đã encode>, không chạm Supabase", async () => {
    const response = await GET(
      new Request(
        "http://x/auth/callback?error=access_denied&error_description=User%20denied%20access",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://x/login?error=${encodeURIComponent("User denied access")}`,
    );
  });

  // Nhánh phải của `errorDescription ?? error` (route.ts:25). GoTrue/Google có
  // thể trả `?error=` trần, không kèm `error_description` — lúc đó chính mã lỗi
  // được dùng làm thông báo. Thiếu case này thì branch coverage đứng ở 87.5%.
  it("có ?error= nhưng KHÔNG có error_description → dùng chính mã lỗi làm thông báo", async () => {
    const response = await GET(
      new Request("http://x/auth/callback?error=access_denied"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://x/login?error=access_denied",
    );
  });

  it("?code= hợp lệ + verifier cookie đúng → exchangeCodeForSession thật qua MSW → redirect an toàn tới next", async () => {
    const { set } = stubPendingPkceSession();

    // === Bằng chứng FR-003 ===
    // Test này KHÔNG gọi server.use — handler DUY NHẤT có thể trả lời
    // POST /auth/v1/token là handler dùng chung thật trong mocks/handlers.ts.
    // Sự kiện `response:mocked` của msw chỉ bắn khi một request handler đã
    // đăng ký thực sự xử lý request (khác `onUnhandledRequest`, cái đó chỉ
    // phát hiện request KHÔNG khớp handler nào) — nên spy này là bằng chứng
    // dương tính rằng handler dùng chung đã chạy tại runtime Node, qua một
    // @supabase/ssr client THẬT (route.ts không mock @/lib/supabase/server).
    const responseMockedSpy = vi.fn();
    server.events.on("response:mocked", responseMockedSpy);

    const response = await GET(
      new Request("http://x/auth/callback?code=ok&next=/todo"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://x/todo");

    expect(responseMockedSpy).toHaveBeenCalledOnce();
    const [matchedEvent] = responseMockedSpy.mock.calls[0] as [
      { request: Request; response: Response },
    ];
    expect(matchedEvent.request.method).toBe("POST");
    expect(
      matchedEvent.request.url.startsWith(`${SUPABASE_URL}/auth/v1/token`),
    ).toBe(true);
    expect(matchedEvent.response.status).toBe(200);

    // set() được gọi để ghi session cookie mới sau khi exchange thành công.
    // Không assert chi tiết tên/giá trị cookie phiên — đó là hợp đồng nội
    // bộ của @supabase/ssr, không phải hợp đồng mà route.ts sở hữu. Chỉ cần
    // xác nhận đường ghi cookie thật sự chạy (không rơi vào catch nuốt lỗi).
    expect(set).toHaveBeenCalled();
  });

  it("?code= với MSW trả 400 invalid_grant → redirect /login?error=auth_code_error", async () => {
    stubPendingPkceSession();
    const responseMockedSpy = vi.fn();
    server.events.on("response:mocked", responseMockedSpy);
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/token`, () =>
        HttpResponse.json(
          { error: "invalid_grant", error_description: "invalid code" },
          { status: 400 },
        ),
      ),
    );

    const response = await GET(new Request("http://x/auth/callback?code=bad"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://x/login?error=auth_code_error",
    );
    // Xác nhận override thật sự được gọi (không lặng lẽ rơi về handler mặc
    // định rồi tình cờ vẫn redirect đúng vì lý do khác).
    expect(responseMockedSpy).toHaveBeenCalledOnce();
    const [matchedEvent] = responseMockedSpy.mock.calls[0] as [
      { response: Response },
    ];
    expect(matchedEvent.response.status).toBe(400);
  });

  it("cookies() reject (createClient() ném) → catch{} nuốt lỗi → redirect /login?error=auth_code_error", async () => {
    // KHÔNG dùng stubPendingPkceSession: nhánh này ném ngay ở createClient()
    // (chưa từng đọc tới verifier), nên không cần cookie giả.
    vi.mocked(cookies).mockRejectedValueOnce(
      new Error("cookies() unavailable outside request scope"),
    );

    const response = await GET(new Request("http://x/auth/callback?code=x"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://x/login?error=auth_code_error",
    );
  });
});
