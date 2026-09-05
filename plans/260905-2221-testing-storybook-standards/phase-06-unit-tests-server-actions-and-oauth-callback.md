# Phase 06 — Test Server Action + route callback (MSW thật)

## Context Links

- [`plan.md`](./plan.md) · [`vitest-hooks-coverage`](../reports/researcher-260905-2221-vitest-hooks-coverage.md) § Q4, Q6
- Spec: FR-003 + US002 acceptance criteria của [`functional-spec.md`](./spec/testing-storybook-standards/functional-spec.md)
- Giải câu chưa chốt § 5.3 **#4** (`NextResponse.redirect()` và request-context)

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 2h · **Depends on**: 03

**Deviation note (Phase 07):** The unresolved question #2 about `msw-storybook-addon@3.0.0` API surface was resolved during Phase 07 by introspecting the package's export map and runtime exports rather than reading `node_modules/` docs directly (environment restriction). Finding: v3.0.0 exports **no `initialize()` at all**, and `mswLoader` is a **factory** `(setup?) => LoaderFunction` that must be called. This was applied correctly in preview.tsx.

Phase rủi ro cao nhất của plan. Ba file logic đang **không có test nào**, và đây là nơi duy
nhất MSW thật sự được dùng — nếu không, `mocks/handlers.ts` thành code chết và FR-003 chỉ là
trang trí.

## Key Insights

- **CHỮA LỖI TRONG REPORT NGUỒN:** report § Q6 viết `logoutAction(signOut)`. Sai. Chữ ký thật
  là `logoutAction()` — **không tham số**, nó tự gọi `createClient()` bên trong. Test phải mock
  `@/lib/supabase/server`, không truyền hàm vào.
- **`redirect()` của `next/navigation` ném để unwind render — mock cũng phải ném.** Không ném
  thì test "code sau redirect không chạy" pass giả.
- **`NextResponse.redirect()` KHÁC hoàn toàn `redirect()`** — nó trả về một object response,
  không ném. Report đánh dấu chỗ này *lower confidence* vì không đọc được doc Next 16 bundled.
  → Bước 1 của phase này là smoke-test chính nó (giải câu #4).
- **FR-003 chỉ có nghĩa nếu ít nhất một test đi qua MSW thật.** Nếu mọi test đều mock
  `@/lib/supabase/server` thì handler MSW không bao giờ được gọi ở runtime Node, và
  "module dùng chung cho 2 runtime" chỉ đúng trên giấy.
- **Cạm bẫy PKCE:** `exchangeCodeForSession(code)` đọc code-verifier từ cookie trước khi bắn
  request. Không có cookie đó thì supabase-js trả lỗi **trước khi** chạm mạng — MSW không bao
  giờ được gọi, test "pass" mà chứng minh sai thứ. Tên cookie suy ra từ URL project, phải tra
  công thức thật trong `node_modules/@supabase/ssr/`, không đoán.
- `app/auth/callback/route.test.ts` nằm ngay trong `app/`. Next chỉ coi tên file **đúng bằng**
  `route.ts`/`page.tsx` là route — `route.test.ts` không phải, nên `next build` bỏ qua. Vẫn
  phải verify.

## Requirements

- FR-001, FR-002: 3 file đạt 100%.
- **FR-003 / US002 AC-1**: ít nhất một unit test mock lời gọi xác thực **qua `mocks/handlers.ts`**.
- Non-functional: không sửa file logic nào.

## Architecture

```
app/actions/locale.test.ts      mock next/headers                → không mạng
app/todo/actions.test.ts        mock @/lib/supabase/server
                                mock next/navigation (redirect PHẢI ném)  → không mạng
app/auth/callback/route.test.ts mock next/headers CHỈ VẬY THÔI
                                @supabase/ssr chạy THẬT
                                MSW chặn POST /auth/v1/token   ← đây là chỗ FR-003 sống
```

**Ma trận nhánh `route.ts`** (4 nhánh, phải phủ hết):

| Input | Đường đi | Kết quả mong đợi |
|---|---|---|
| `?error=access_denied&error_description=X` | không chạm Supabase | redirect `/login?error=X` (đã encode) |
| không code, không error | không chạm Supabase | redirect `/login?error=auth_code_error` |
| `?code=ok&next=/todo` | `createClient()` thật → MSW trả session | redirect `${origin}/todo` |
| `?code=bad` | MSW override trả 400 `invalid_grant` | redirect `/login?error=auth_code_error` |
| `?code=x` + `cookies()` reject | `createClient()` ném → `catch{}` | redirect `/login?error=auth_code_error` |

## Related Code Files

**Tạo**
- `app/actions/locale.test.ts`
- `app/todo/actions.test.ts`
- `app/auth/callback/route.test.ts`

**Sửa / Xoá**: không có.

## Implementation Steps

1. **Smoke test trước (giải câu #4).** Viết đúng một case: `GET(new Request("http://x/auth/callback"))`
   → khẳng định `response.status === 307|308` và `response.headers.get("location")` kết thúc bằng
   `/login?error=auth_code_error`. Chạy. Nếu `NextResponse.redirect` đòi request context thì
   phát hiện ngay tại đây, trước khi viết 200 dòng còn lại. Ghi kết quả vào doc comment của file.
2. `locale.test.ts` — mock `next/headers`. Ba case: ghi cookie đúng
   (`NEXT_LOCALE`, `path:"/"`, `maxAge`, `sameSite:"lax"`) · input rác (`"../../etc"`) →
   normalize về `"vi"` · `cookieStore.set` ném → `rejects.toThrow(/failed to persist NEXT_LOCALE/)`.
3. `todo/actions.test.ts` — mock `@/lib/supabase/server` + `next/navigation` (redirect ném
   `"NEXT_REDIRECT"`). Hai case: `signOut()` thành công → redirect `/login`; `signOut()` reject
   → **vẫn** redirect `/login`. Dùng `toHaveBeenCalledExactlyOnceWith("/login")`.
4. `route.test.ts` — mở rộng từ bước 1, thêm nhánh `?error=` và nhánh `cookies()` reject.
5. **Nhánh MSW (timebox 45 phút).**
   - 5a. Tra công thức tên cookie: `grep -rn "code-verifier\|storageKey\|projectRef" node_modules/@supabase/ssr/dist/`
     và `node_modules/@supabase/auth-js/dist/`. Lấy công thức thật, không đoán.
   - 5b. `getAll()` của mock `next/headers` trả về cookie verifier tự dựng theo công thức đó.
   - 5c. Chạy. Handler `POST /auth/v1/token` trong `mocks/handlers.ts` phải được gọi (khẳng
     định bằng một `vi.fn()` spy gắn vào handler qua `server.use`, hoặc đếm request).
   - 5d. Nhánh lỗi: `server.use(http.post(..., () => HttpResponse.json({error:"invalid_grant"}, {status:400})))`.
   - **Nếu hết 45 phút mà chưa qua**: chuyển `route.test.ts` sang mock `@/lib/supabase/server`
     (đủ 100% nhánh), báo **DONE_WITH_CONCERNS**, và ghi vào `plans/action-items.md` § Nợ lại:
     *"FR-003 mới chứng minh được nửa Storybook; nửa Node chưa có test nào đi qua `mocks/handlers.ts`."*
     Không được bịa một test giả để tick FR-003.
6. Verify `pnpm build` — Next không được coi `route.test.ts` là route. Nếu nó phàn nàn, chuyển
   sang `app/auth/callback/__tests__/route.test.ts` (glob `app/**/*.test.ts` vẫn khớp,
   allowlist coverage không đổi).
7. `pnpm test:unit:coverage` → 3 file 100%. Cửa xanh.

## Todo List

- [x] Smoke test `NextResponse.redirect` (câu #4) — ghi kết quả vào doc comment
- [x] `locale.test.ts` — 3 case gồm nhánh throw
- [x] `todo/actions.test.ts` — 2 case, redirect mock PHẢI ném
- [x] `route.test.ts` — nhánh `?error=`, no-code, `cookies()` reject
- [x] Tra công thức tên cookie verifier trong `node_modules/@supabase/ssr`
- [x] Nhánh MSW: success + `invalid_grant`, có bằng chứng handler được gọi
- [x] `pnpm build` xanh với `route.test.ts` nằm trong `app/`
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
pnpm test:unit                                   # exit 0
pnpm test:unit:coverage 2>&1 | grep -E "(locale|actions|route)\.ts"   # 100 cả 4 cột
pnpm build                                       # exit 0 — Next bỏ qua route.test.ts
pnpm lint --max-warnings 0 && pnpm format:check && pnpm typecheck     # exit 0
# FR-003: bằng chứng handler dùng chung thật sự chạy ở runtime Node
grep -q "mocks/handlers\|mocks/node" app/auth/callback/route.test.ts || echo "FR-003 CHƯA ĐẠT"
```

**Kiểm định độc lập (SC-002 của spec)**: ngắt mạng máy, chạy `pnpm test:unit` — mọi test liên
quan Supabase vẫn pass.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| **PKCE verifier chặn đường MSW** — supabase-js trả lỗi trước khi chạm mạng | **Cao** | Cao (FR-003 không chứng minh được ở runtime Node) | Bước 5a tra công thức thật + timebox 45' + đường lùi đã ghi rõ. Ưu tiên báo trung thực hơn là tick giả |
| MSW "pass" nhưng handler chưa từng được gọi → test chứng minh sai thứ | **Cao** | Cao | Bắt buộc có spy/counter khẳng định handler ĐÃ chạy (bước 5c). Không có bằng chứng thì coi như chưa đạt |
| `redirect()` mock không ném → test pass giả | Trung bình | Cao | Mock ném `"NEXT_REDIRECT"`; test dùng `rejects.toThrow`, không dùng `await` trần |
| `NextResponse.redirect` cần request context (câu #4) | Thấp | Cao | Bước 1 là smoke test riêng, phát hiện trước khi đầu tư |
| Next coi `route.test.ts` là file route | Thấp | Trung bình | Bước 6 verify; đường lùi `__tests__/` đã ghi |
| `"use server"` directive làm vitest lỗi khi import | Thấp | Trung bình | Directive chỉ là string literal ở top module, bundler bỏ qua. Phát hiện ngay lần chạy đầu |
| Placeholder key làm `createServerClient` từ chối | Trung bình | Cao | Nếu nó validate format, đổi `test.env` sang chuỗi đúng format (`sb_publishable_*`) — sửa ở `vitest.config.ts` thuộc phase 03, cần phối hợp lại thứ tự |

## Security Considerations

- `code` và `error_description` **không bao giờ được log** — test không được in chúng ra
  console, và không được khẳng định qua log.
- Handler MSW trả token giả. Không copy access token thật từ `saa-app` vào repo.
- Nhánh lỗi phải khẳng định client **không** nhận được raw error: chỉ đúng chuỗi
  `auth_code_error`.
- `locale.test.ts` phải có case input rác để khoá chốt chặn path-traversal của `normalizeLocale`
  (nó bảo vệ dynamic `import(messages/${locale}.json)`).

## Next Steps

Phase 10 bật ngưỡng. Nếu bước 5 phải dùng đường lùi, ghi nợ vào `plans/action-items.md` và
nêu trong báo cáo Delivery — đừng để nó chìm.
