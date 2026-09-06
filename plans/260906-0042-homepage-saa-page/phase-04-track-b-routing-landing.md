---
phase: 04
feature: F003, F001
status: completed
priority: P0
test_policy: e2e-red-first
effort: 1h
owner: implementer
file_ownership: ["proxy.ts", "lib/supabase/next-path.ts", "lib/auth/sign-in-with-google.test.ts", "app/login/login-client.tsx", "app/login/page.tsx"]
---

# Phase 04 — Track B: routing & landing `/`

## Context Links

- `spec/homepage/technical-spec.md` § 4.4 Bin 3 (A0 — FR-001, PERM001 lỗi thời) · `spec/homepage/functional-spec.md` FR-001, FR-101
- `spec/system/permissions.md` (Route Access Matrix) · `spec/system/architecture.md` (guards)
- `clarifications.md` § Route & điều hướng, § E2E contract → mục "Guard"
- `research/researcher-02-supabase-local-role-notifications.md` § 4 (proxy predicate), § 6 (6 call site `/todo` → `/`)
- `tests/e2e/login.spec.ts` (tester đã cập nhật 2 assertion, hiện RED)

## Overview

**Priority**: P0 · **Status**: pending
`/` thôi làm redirect và trở thành trang công khai; đích sau đăng nhập đổi từ `/todo` sang `/`. Phase này chỉ đổi **định tuyến**, không render gì (phase 05 mới có UI) — nên sau phase này `home.spec.ts` vẫn RED, đó là đúng. `/todo` giữ nguyên là placeholder được bảo vệ, không xoá, không đụng UI.

## Key Insights

- **Giữ `/` trong `config.matcher`**: proxy vẫn phải chạy trên `/` để refresh session cookie (GoTrue rotation). Bỏ `/` khỏi matcher là bug ngầm — khách ở homepage không bao giờ được làm mới token cho tới khi vào `/todo`.
- Chỉ thu hẹp 2 predicate, không viết lại proxy: `isAuthPage = pathname === "/login"`, `isProtectedPage = pathname.startsWith("/todo")`. Nhánh `getUserOrNull()` + copy cookie sang redirect response giữ nguyên.
- Đổi default `safeNextPath(raw, fallback = "/")` **làm đỏ test cũ**: `lib/auth/sign-in-with-google.test.ts:106-133` assert fallback `/todo` (3 case). Phải sửa cùng phase, không để CI đỏ.
- `lib/supabase/next-path.test.ts` truyền `fallback` tường minh ở mọi case → không cần sửa; thêm 1 case cho default mới (`safeNextPath(null)` → `/`).
- `app/auth/callback/route.ts` **không cần sửa** — kế thừa default mới.
- PERM001 (Root Route Guard) hết hiệu lực; nó thuộc F001, cập nhật thật ở `docs/` lúc Delivery, không sửa docs trong phase này.

## Requirements

- **FR-001 / A0** — `/` public: anon lẫn authed đều nhận 200, không redirect nào.
- **FR-101** — đăng nhập thành công về `/`; `/login` khi đã authed → `/`.
- **FR-402 / BR-002 (F001)** — `safeNextPath` vẫn chặn open-redirect: `//host`, `/\host`, absolute URL, ký tự điều khiển; chỉ **giá trị fallback** đổi.
- Guard `/todo` cho anon → `/login` giữ nguyên.

## Architecture

```
GET /            → proxy: normalizeLocale + getUserOrNull (refresh cookie) → KHÔNG nhánh redirect nào → next(response)
GET /login       → authed ? 307 "/" : render
GET /todo/*      → !authed ? 307 "/login" : render (không đổi)
GET /auth/callback?code → exchange → safeNextPath(next)  // default nay là "/"
login-client     → NEXT_PATH = "/" → signInWithGoogle({origin, next}) → redirectTo /auth/callback?next=/
```

## Related Code Files

**Modify**: `proxy.ts` (2 predicate + đích redirect `/todo` → `/`, JSDoc redirect matrix), `lib/supabase/next-path.ts:88` (default `"/todo"` → `"/"`), `lib/auth/sign-in-with-google.test.ts` (3 assertion fallback), `app/login/login-client.tsx:22` (`NEXT_PATH`), `app/login/page.tsx` (`redirect("/todo")` → `redirect("/")`)
**Create**: — · **Delete**: —

## Implementation Steps

1. `proxy.ts`: `const isAuthPage = pathname === "/login";` và `const isProtectedPage = pathname.startsWith("/todo");`; nhánh `user && isAuthPage` → `redirectPreservingCookies(request, response, "/")`. Giữ nguyên `matcher: ["/", "/login", "/todo/:path*"]`, giữ nguyên `getUserOrNull` + `normalizeLocaleCookie`.
2. Cập nhật JSDoc "Redirect matrix" ở đầu `proxy.ts` cho khớp thực tế mới (`/` không còn trong bảng; `/` chỉ refresh cookie).
3. `lib/supabase/next-path.ts:88`: `export function safeNextPath(raw: string | null, fallback = "/"): string` — thân hàm KHÔNG đổi.
4. `lib/supabase/next-path.test.ts`: thêm 1 case default (`safeNextPath(null)` → `"/"`, `safeNextPath("//evil.com")` → `"/"`). Không sửa 20+ case cũ (đều truyền fallback tường minh).
5. `lib/auth/sign-in-with-google.test.ts`: sửa 3 assertion fallback `/todo` → `/` (tên test "rơi về /todo khi next rỗng" → "rơi về / khi next rỗng"; 2 case chặn hostile input). Đây là **đổi spec có chủ đích**, không phải nới assertion.
6. `app/login/login-client.tsx`: `const NEXT_PATH = "/";` (giữ comment giải thích đích quay về).
7. `app/login/page.tsx`: `redirect("/")` khi đã có user.
8. `pnpm test:unit`, `pnpm test:unit:coverage`, `pnpm typecheck`, `pnpm lint --max-warnings 0`, `pnpm build` — exit 0.
9. Sanity thủ công: `curl -sI http://localhost:3000/` → **200** (không 307); `curl -sI http://localhost:3000/todo` → 307 `/login`.

## Todo List

- [x] `proxy.ts` thu hẹp 2 predicate + đích `/`, matcher giữ nguyên
- [x] JSDoc redirect matrix cập nhật
- [x] `safeNextPath` default `/` + 2 case test mới
- [x] `sign-in-with-google.test.ts` 3 assertion đổi sang `/`
- [x] `login-client.tsx` `NEXT_PATH` + `login/page.tsx` redirect
- [x] unit / typecheck / lint / build exit 0 + curl sanity

## Success Criteria

- `GET /` (anon **và** authed) → 200, không `location` header (FR-001).
- `GET /login` khi đã authed → 307 `/` (FR-101); `GET /todo` khi anon → 307 `/login` (không đổi).
- `GET /auth/callback?code=fake&next=https://evil.com` không bao giờ rời origin (FR-402 giữ nguyên).
- `pnpm test:unit` exit 0 — không còn assertion nào đòi fallback `/todo`.
- `home.spec.ts` vẫn RED sau phase này (chưa có UI) — đúng kỳ vọng, không được "chữa" bằng cách sửa test.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Bỏ `/` khỏi matcher → session không được refresh trên homepage | M×H | Matcher giữ nguyên 3 pattern; chỉ predicate đổi; review diff của `config` |
| Vòng lặp `/` ↔ `/login` khi cookie session hỏng | L×H | `/` không còn nhánh redirect nào; `/login` chỉ redirect khi `user` khác null thật |
| Đổi default `safeNextPath` làm đỏ test ở file khác chưa lường | M×M | Chạy full `pnpm test:unit` (không chỉ file vừa sửa) ở step 8 |
| `/todo` bị đụng nhầm (route này không có E2E render coverage trên CI) | M×M | File ownership không gồm `app/todo/**`; giữ nguyên tuyệt đối |
| Redirect làm rơi cookie vừa refresh | L×H | `redirectPreservingCookies` giữ nguyên, không viết lại |

## Security Considerations

- Chống open-redirect không suy giảm: chỉ đổi **giá trị fallback**, mọi kiểm tra `//`, `/\`, `://`, ký tự điều khiển, U+2028/2029 giữ nguyên + có test.
- `/` public không lộ dữ liệu người dùng: phase 05 chỉ render email/role của **chính** viewer, đọc server-side qua RLS own-row.
- `/todo` vẫn `getUser()` authoritative — proxy chỉ là lớp optimistic (FR-603 của F001 không đổi).

## Next Steps

Phase 05 dựa vào `/` không còn redirect để render Server Component thật. Ghi vào `plans/action-items.md` ở Delivery: PERM001 lỗi thời, cần cập nhật `docs/vi/.../permissions-matrix.md` thuộc F001.
