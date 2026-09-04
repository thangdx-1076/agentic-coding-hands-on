---
phase: 03
feature: F001
status: completed
priority: P0
effort: 2.5h
owner: implementer
depends_on: [02]
file_ownership: ["lib/supabase/**", "proxy.ts", "app/auth/callback/route.ts", "app/todo/**", "app/page.tsx", "package.json"]
---

# Phase 03 — Supabase auth foundation, guard, callback, /todo

## Context Links

- `spec/googleoauthlogin/functional-spec.md` (FR-001, FR-101, FR-301, FR-302, FR-401, FR-402, FR-601, FR-602, FR-603; BR-001, BR-002, BR-003; DEC-001, DEC-002; US002, US003, US004)
- `spec/googleoauthlogin/technical-spec.md` § 3.1 A3/A4/A5, § 4.4 Bin 3 (A0 guard)
- `spec/googleoauthlogin/screens/SCR-todo/spec.md` (E01, E02) · `spec/system/permissions.md` (Route Access Matrix)
- `clarifications.md` § E2E contract (`/todo`, `/`, `/auth/callback`), § gap resolution (chuẩn hoá `NEXT_LOCALE` trong proxy)
- `research/researcher-01-supabase-google-oauth-nextjs16.md` § Q1, Q2, Q5

## Overview

**Priority**: P0 · **Status**: pending · **Feature**: F001_GoogleOAuthLogin
Dựng nền auth phía server: 2 factory Supabase client, guard `proxy.ts` (refresh session + redirect theo trạng thái + chuẩn hoá `NEXT_LOCALE`), route handler `/auth/callback` (đổi PKCE code, sanitize `next`), `/todo` placeholder được bảo vệ + Server Action logout, `/` redirect authoritative. Chưa có `/login` (phase-04) — E2E còn RED sau phase này.

## Key Insights

- `proxy.ts` (KHÔNG phải `middleware.ts`), export tên `proxy`; `export const config = { matcher }` giữ nguyên cú pháp.
- @supabase/ssr yêu cầu proxy gọi `supabase.auth.getUser()` để **refresh token** và ghi cookie mới vào response — spec § 5.2 giả định "không gọi API mỗi request" cần điều chỉnh: vẫn là lớp *optimistic* theo Next.js (không phải phòng vệ duy nhất), nhưng có gọi GoTrue. Ghi nhận lệch giả định này, không bỏ `getUser()` ở `/todo` (FR-603).
- Cookie trong proxy phải ghi **cả** `request.cookies.set` (để render cùng pass thấy giá trị mới) **và** `response.cookies.set` — áp dụng cho cả session refresh và chuẩn hoá `NEXT_LOCALE`.
- `exchangeCodeForSession` chạy server-side đọc PKCE code-verifier từ cookie do browser client ghi → phải dùng server client của `@supabase/ssr`, không phải `supabase-js` trần.
- `publishable key` là drop-in của anon key; **không** đưa service-role key vào repo/`NEXT_PUBLIC_*`.

## Requirements

- **FR-001** đọc `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (từ `.env.local`, gitignored).
- **FR-101 / FR-601 / FR-602 / BR-003** guard `/`, `/login`, `/todo` theo trạng thái đăng nhập.
- **FR-401 / DEC-001** `?code` hợp lệ → `exchangeCodeForSession` → redirect `next`.
- **FR-402 / BR-002** `next` chỉ nhận path nội bộ bắt đầu `/`, ngược lại dùng `/todo`.
- **DEC-002** `?error` hoặc exchange lỗi → `/login?error=<code>`.
- **FR-301 / FR-302 / FR-603 / US004** `/todo`: `getUser()` authoritative → `<h1>` chứa email + nút logout → Server Action `signOut()` → `/login`.

## Architecture

```
GET /(login|todo|/)  → proxy.ts ─ createProxyClient(req,res) ─ getUser()
                                 ├─ normalizeLocale(NEXT_LOCALE) sai → set lại vi (req+res)
                                 ├─ user && path ∈ {/, /login}      → 307 /todo
                                 ├─ !user && path ∈ {/, /todo}      → 307 /login
                                 └─ else next(res)  (cookie refresh giữ lại)
GET /auth/callback?code|error → exchangeCodeForSession → 307 safeNextPath(next) | /login?error=
GET /todo → createClient().getUser() → không user ? redirect('/login') : render h1(email)+logout
```

## Related Code Files

**Create**: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy-client.ts`, `lib/supabase/next-path.ts`, `lib/supabase/next-path.test.ts`, `proxy.ts`, `app/auth/callback/route.ts`, `app/todo/page.tsx`, `app/todo/actions.ts`
**Modify**: `app/page.tsx` (xoá toàn bộ boilerplate create-next-app → redirect theo auth; giữ file, chỉ thay nội dung), `package.json` · **Delete**: —

## Implementation Steps

1. `npm i @supabase/ssr@0.12.5 @supabase/supabase-js@2.115.0`.
2. `lib/supabase/next-path.ts`: `export function safeNextPath(raw: string | null, fallback = '/todo'): string` — nhận chỉ khi `raw` bắt đầu bằng `/` **và** KHÔNG bắt đầu bằng `//` hoặc `/\` (chống protocol-relative), không chứa `://`; ngược lại trả `fallback`.
3. `lib/supabase/next-path.test.ts` (RED trước): `'/todo'→'/todo'`, `'/todo?x=1'→'/todo?x=1'`, `null→'/todo'`, `''→'/todo'`, `'//evil.com'→'/todo'`, `'/\\evil.com'→'/todo'`, `'https://evil.com'→'/todo'`, `'javascript:alert(1)'→'/todo'`, `'todo'→'/todo'`.
4. `lib/supabase/client.ts`: `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)` trong hàm `createClient()`.
5. `lib/supabase/server.ts`: `export async function createClient()` dùng `await cookies()` + `getAll`/`setAll`, `setAll` bọc try/catch (Server Component không ghi được cookie — bỏ qua im lặng theo pattern chính thức).
6. `lib/supabase/proxy-client.ts`: `export function createProxyClient(request: NextRequest, response: NextResponse)` — `getAll: () => request.cookies.getAll()`, `setAll: (cs) => cs.forEach(({name,value,options}) => { request.cookies.set(name,value); response.cookies.set(name,value,options) })`.
7. `proxy.ts`: `export async function proxy(request: NextRequest)` —
   a. `const response = NextResponse.next({ request })`;
   b. chuẩn hoá locale: `const raw = request.cookies.get(LOCALE_COOKIE)?.value; const locale = normalizeLocale(raw); if (raw !== locale) { request.cookies.set(LOCALE_COOKIE, locale); response.cookies.set(LOCALE_COOKIE, locale, { path:'/', maxAge: LOCALE_COOKIE_MAX_AGE, sameSite:'lax' }) }`;
   c. `const { data: { user } } = await createProxyClient(request, response).auth.getUser()` trong try/catch (lỗi mạng → coi như `user = null`, không throw 500);
   d. `const { pathname } = request.nextUrl`; user && (`/` || `/login`) → `NextResponse.redirect(new URL('/todo', request.url))`; !user && (`/` || `/todo`) → redirect `/login`; **copy cookie của `response` sang redirect response** để không mất session/locale vừa refresh;
   e. `return response`;
   f. `export const config = { matcher: ['/', '/login', '/todo/:path*'] }` — KHÔNG match `/auth/callback` (callback tự xử lý) và không match asset/`_next`.
8. `app/auth/callback/route.ts`: `export async function GET(request: Request)` — đọc `code`, `error`, `error_description`, `next`; `error` → redirect `/login?error=${encodeURIComponent(error_description ?? error)}`; `code` → `(await createClient()).auth.exchangeCodeForSession(code)` trong try/catch, thành công → redirect `${origin}${safeNextPath(next)}`; mọi nhánh còn lại → `/login?error=auth_code_error`.
9. `app/todo/page.tsx` (Server Component): `const { data: { user } } = await (await createClient()).auth.getUser(); if (!user) redirect('/login'); const t = await getTranslations('todo');` render `<h1>{t('greeting', { email: user.email ?? '' })}</h1>` + `<form action={logoutAction}><button type="submit">{t('logout')}</button></form>`.
10. `app/todo/actions.ts`: `'use server'` → `export async function logoutAction() { try { await (await createClient()).auth.signOut() } catch {} redirect('/login') }`.
11. `app/page.tsx`: thay toàn bộ boilerplate bằng Server Component `getUser()` → `redirect(user ? '/todo' : '/login')` (lớp authoritative cho FR-101, phòng khi matcher proxy không khớp). Không import asset boilerplate nào nữa.
12. `npx tsc --noEmit`, `npm run lint`, `npm run test:unit`, `npm run build` — tất cả exit 0. Sanity check thủ công: `curl -sI http://localhost:3000/todo` → 307 tới `/login`.

## Todo List

- [x] Cài `@supabase/ssr` + `@supabase/supabase-js` (pin đúng version)
- [x] `safeNextPath` + test RED → GREEN (9 case)
- [x] `lib/supabase/{client,server,proxy-client}.ts`
- [x] `proxy.ts` (refresh + locale normalize + 4 nhánh redirect + matcher)
- [x] `app/auth/callback/route.ts` (DEC-001/DEC-002)
- [x] `app/todo/page.tsx` + `app/todo/actions.ts`
- [x] `app/page.tsx` bỏ boilerplate → redirect theo auth
- [x] typecheck / lint / unit / build xanh + curl sanity

## Success Criteria

- `npm run test:unit` exit 0 (bao gồm 9 case `safeNextPath`, đủ chặn open-redirect).
- `npm run build` exit 0; không cảnh báo `sync-dynamic-apis`.
- `GET /todo` (không session) → 307 `/login`; `GET /` (không session) → 307 `/login` (2 test E2E này chuyển sang PASS sau phase-04 khi `/login` render được).
- `GET /auth/callback?error=access_denied` → 307 `/login?error=access_denied`.
- `GET /auth/callback?code=fake&next=https://evil.com` → không bao giờ redirect ra ngoài origin.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Redirect response làm mất cookie session/locale vừa set (lỗi kinh điển của @supabase/ssr) | H×H | Copy `response.cookies.getAll()` sang redirect response trước khi return; verify bằng curl xem `set-cookie` còn không |
| Matcher quá rộng → proxy chạy trên `_next`/asset, chậm + 500 | M×M | Matcher whitelist đúng 3 pattern ở step 7f, không dùng negative-lookahead phức tạp |
| `getUser()` trong proxy lỗi mạng khi `saa-app` tắt → toàn app 500 | M×H | try/catch → `user = null`; app vẫn render `/login` |
| GoTrue trả payload cancel khác giả định (`error` vs `error_description`) | M×L | Xử lý cả 2 field, luôn có nhánh fallback `auth_code_error` |
| Vòng lặp redirect `/login ↔ /todo` khi cookie session hỏng | L×H | `/todo` authoritative `getUser()` redirect `/login`; proxy chỉ redirect `/login`→`/todo` khi `user` khác null thật |

## Security Considerations

- **Open redirect (FR-402/BR-002)**: `safeNextPath` chặn `//host`, `/\host`, absolute URL, scheme khác — có unit test, không chỉ dựa `startsWith('/')`.
- **Cookie**: session cookie do `@supabase/ssr` quản lý (httpOnly + sameSite theo mặc định của lib) — không tự set thủ công. `NEXT_LOCALE` `sameSite: 'lax'`, path `/`.
- **Key**: chỉ dùng publishable key qua `NEXT_PUBLIC_*`; TUYỆT ĐỐI không đưa service-role key vào client hay repo; `.env.local` đã gitignored (`.env*`).
- **PKCE**: code-verifier nằm trong cookie do browser client ghi; không log `code`/`error_description`. **FR-603**: `/todo` luôn `getUser()` lại, không tin proxy.

## Next Steps

Phase-04 nối `/login` (server component + client wrapper) với `signInWithOAuth` dùng `lib/supabase/client.ts` và `setLocale` của phase-02.
