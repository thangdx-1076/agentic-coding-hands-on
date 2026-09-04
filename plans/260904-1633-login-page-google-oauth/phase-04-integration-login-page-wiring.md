---
phase: 04
feature: F001, F002
status: completed
priority: P0
effort: 1.5h
owner: implementer
depends_on: [01, 02, 03]
file_ownership: ["app/login/**", "app/layout.tsx"]
---

# Phase 04 — Integration: /login server page + client wiring

## Context Links

- `phase-01-track-a-presentational-login-ui.md` § Integration contract (props `LoginScreen`, `LoginCopy`)
- `spec/googleoauthlogin/functional-spec.md` (FR-201, FR-202, FR-203, FR-204, FR-601; US001, US005)
- `spec/googleoauthlogin/technical-spec.md` § 3.1 A1, A2 · `spec/googleoauthlogin/screens/SCR-login/spec.md` (E01–E06, § 5 UI States)
- `spec/languageswitch/functional-spec.md` (FR-401; US001, US002) · `clarifications.md` § E2E contract

## Overview

**Priority**: P0 · **Status**: pending · **Features**: F001 + F002
Nối UI của Track A với auth/i18n của Track B: `/login` server component (guard authoritative + dựng `LoginCopy` từ next-intl + đọc `searchParams.error`), client wrapper (`useTransition` → `signInWithOAuth`, `onSelectLocale` → `setLocale`), và đổi font wiring của layout sang `app/fonts.ts` do Track A cung cấp. Sau phase này E2E mới đủ điều kiện GREEN (phase-05 chạy).

## Key Insights
> **Track A đã land (2026-09-04 17:56):** `app/fonts.ts` export `montserrat`, `montserratAlternates`, `loginFontVariables` (string className gộp 2 CSS variable). `LoginScreen` tự apply `loginFontVariables` trên root của nó → `app/layout.tsx` KHÔNG cần đổi font; chỉ cần `NextIntlClientProvider` + `lang={locale}` (phase-02). Props thật: `LoginScreenProps { copy?, locale?, onSelectLocale?, onLoginClick?, loginPending?, errorMessage? }`; `LanguageSelectorProps { label: "VN"|"EN", onSelect? }`; `defaultLoginCopy` trong `components/login/login-copy.ts`.


- `searchParams` là Promise ở Next 16 → `const { error } = await searchParams`.
- `LoginScreen` nhận **function props** (`onLoginClick`, `onSelectLocale`) → phải render từ client boundary; server page chỉ truyền dữ liệu serializable.
- `LoginCopy` không có field lỗi → truyền text lỗi đã dịch qua prop riêng (`errorText`) để client dùng lại cho lỗi phát sinh phía client (DRY, đúng contract Track A).
- `signInWithOAuth` là lời gọi SDK phía client (cần PKCE verifier trong browser) → KHÔNG dùng Server Action / form action; `useTransition` + `onClick` (research § Q5).
- Alt logo/hero và nhãn menu "VN"/"EN" bất biến theo locale — không truyền chuỗi đã dịch cho 2 chỗ này.
- `app/fonts.ts` là file của Track A: chỉ **đọc** tên export rồi import; không sửa, không tạo hộ.

## Requirements

- **FR-201** `/login` render đủ header/hero/footer qua `LoginScreen`.
- **FR-202** click → `signInWithOAuth({ provider:'google', options:{ redirectTo: origin + '/auth/callback?next=/todo' } })`.
- **FR-203** pending → `loginPending` true (Track A đổi `disabled` + `aria-busy`).
- **FR-204 / US005** `?error=<bất kỳ>` → `errorMessage` = message cố định đã dịch (`role="alert"`).
- **FR-601** đã đăng nhập vào `/login` → redirect `/todo` (lớp authoritative, ngoài proxy).
- **FR-401** chọn locale trong menu → `setLocale` → re-render đúng ngôn ngữ, selector đổi nhãn.

## Architecture

```
GET /login → proxy(phase-03) → app/login/page.tsx (server)
   ├─ getUser() → có user ? redirect('/todo')
   ├─ getTranslations('login') + getLocale() + LOCALE_LABEL → LoginCopy
   ├─ (await searchParams).error → hasError
   └─ <LoginClient copy locale errorText hasError />        [client]
         ├─ onLoginClick  → startTransition(signInWithOAuth) → window → GoTrue authorize
         ├─ onSelectLocale→ startTransition(setLocale)       → cookie + re-render
         └─ <LoginScreen ... errorMessage={hasError||clientError ? errorText : undefined} />
```

## Related Code Files

**Create**: `app/login/page.tsx`, `app/login/login-client.tsx`
**Modify**: `app/layout.tsx` (chỉ khối font: import từ `app/fonts.ts` của Track A)
**Delete**: — (`app/page.tsx` đã xử lý ở phase-03)

## Implementation Steps

1. Đọc `components/login/` (Track A) xác nhận đường dẫn + tên export thật của `LoginScreen`, `LoginCopy`. Nếu chưa có → **BLOCKED**, báo orchestrator (không tự viết component thay Track A).
2. `app/login/page.tsx` (Server Component, không `'use client'`):
   - `const { data: { user } } = await (await createClient()).auth.getUser(); if (user) redirect('/todo');` (bọc try/catch: lỗi → coi như chưa đăng nhập, vẫn render form);
   - `const locale = await getLocale(); const t = await getTranslations('login');`
   - `const copy: LoginCopy = { subtitle: t('subtitle'), tagline: t('tagline'), loginButton: t('loginButton'), footer: t('footer'), logoAlt: t('logoAlt'), heroAlt: t('heroAlt'), languageLabel: LOCALE_LABEL[locale] }`;
   - `const { error } = await searchParams` (type `Promise<{ error?: string }>`), `hasError = typeof error === 'string' && error.length > 0`;
   - `return <LoginClient copy={copy} locale={locale} errorText={t('error')} hasError={hasError} />`.
3. `app/login/login-client.tsx` (`'use client'`):
   - `const [pending, startTransition] = useTransition(); const [clientError, setClientError] = useState(false);`
   - `handleLogin = () => startTransition(async () => { try { const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=/todo` } }); if (error) setClientError(true) } catch { setClientError(true) } })`;
   - `handleSelectLocale = (next: AppLocale) => startTransition(() => { void setLocale(next) })`;
   - render `<LoginScreen copy={copy} locale={locale} loginPending={pending} errorMessage={hasError || clientError ? errorText : undefined} onLoginClick={handleLogin} onSelectLocale={handleSelectLocale} />`.
4. `app/layout.tsx`: đổi 2 khối `Geist(...)`/`Geist_Mono(...)` sang import từ `@/app/fonts` **đúng tên export Track A đã đặt**; giữ `LayoutProps<"/">`, `lang={locale}`, `NextIntlClientProvider` của phase-02. Không chạm `app/globals.css`.
5. Verify allow-list GoTrue trước khi kết luận xong: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://127.0.0.1:55321/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%3Fnext%3D%2Ftodo"` → phải 302 tới `accounts.google.com`. Nếu GoTrue rơi về SITE_URL/400 → báo orchestrator: fallback bỏ `?next=/todo` (callback vẫn default `/todo` theo BR-002); đây là lệch § E2E contract nên **cần ký duyệt**, không tự đổi im lặng.
6. `npx tsc --noEmit`, `npm run lint`, `npm run build` exit 0. Sanity thủ công: mở `/login` thấy đủ header/hero/nút/footer; `/login?error=x` thấy `role="alert"`; chọn EN → footer đổi "Copyright © Sun* 2025".
7. KHÔNG chạy `npx playwright test` ở phase này — GREEN là việc của `tester` (phase-05).

## Todo List

- [x] Đọc & xác nhận export của Track A (`components/login/**`, `app/fonts.ts`)
- [x] `app/login/page.tsx` (guard + copy + searchParams.error)
- [x] `app/login/login-client.tsx` (useTransition, signInWithOAuth, setLocale)
- [x] `app/layout.tsx` đổi sang `app/fonts.ts` — **superseded, không sửa**: đúng như Key Insights đã ghi, `LoginScreen` tự apply `loginFontVariables` trên root của nó, `app/layout.tsx` chỉ cần `NextIntlClientProvider` + `lang={locale}` (đã có từ phase-02) → file này không bị chạm ở phase-04 (đúng ràng buộc "app/layout.tsx must NOT be edited" từ orchestrator).
- [x] Verify allow-list `redirect_to` + `next` — `curl` authorize local GoTrue → `302` tới `accounts.google.com` với `redirect_to`+`next` giữ nguyên (không cần fallback).
- [x] typecheck / lint / build xanh + sanity 3 luồng thủ công — xem báo cáo `reports/implementer-phase-04-login-wiring.md`.

## Success Criteria

- `npm run build` exit 0, không lỗi serialization prop qua client boundary.
- `/login` (chưa auth) render `header img[alt="Sun* Annual Awards 2025"]`, `img[alt="ROOT FURTHER"]`, `button` "LOGIN With Google", `footer` bản quyền, `button[aria-haspopup="menu"]` name chứa "VN".
- `/login?error=auth` → có đúng 1 `[role="alert"]` chứa "Đăng nhập không thành công".
- Chọn "EN" trong `[role="menu"]` → cookie `NEXT_LOCALE=en` (path=/, ~1 năm) và copy đổi sang EN.
- Đã auth vào `/login` → landing `/todo` (proxy hoặc redirect authoritative).

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Track A chưa xong / props lệch contract | M×H | Step 1 kiểm trước; lệch → gửi bounded fix cho `momorph-ui-implementer`, tuyệt đối không sửa `components/login/**` |
| Tên export `app/fonts.ts` khác dự kiến → build fail | M×M | Đọc file thật rồi mới import; chưa có file → giữ font hiện tại, ghi DONE_WITH_CONCERNS |
| GoTrue từ chối `redirect_to` kèm query `next` | M×H | Step 5 verify + fallback đã định nghĩa, cần ký duyệt |
| Async transition + navigation làm `pending` nhảy về false trước khi rời trang (TC 37eae882 flaky) | M×M | Không `finally { setPending(false) }`; để transition kết thúc tự nhiên khi unmount/navigate |
| `getUser()` trong page thêm 1 round-trip mỗi lần load `/login` | L×L | Chấp nhận: FR-601 yêu cầu lớp authoritative; chỉ 1 lần/request |

## Security Considerations

- `redirectTo` dựng từ `window.location.origin` (không lấy từ query/param người dùng) → không mở đường open-redirect ở bước kickoff.
- Không render lại giá trị `searchParams.error` ra UI (chỉ dùng như boolean) → tránh XSS/reflected content; message là chuỗi cố định đã dịch.
- Chỉ publishable key phía client; không import `lib/supabase/server.ts` vào file `'use client'`.
- PKCE verifier do `@supabase/ssr` quản lý; không đọc/log.

## Next Steps

Phase-05: `tester` chạy GREEN (`npx playwright test tests/e2e/login.spec.ts --reporter=list` exit 0), tạo `auth.setup.ts`, bật 2 test `fixme`, visual diff, rồi `momorph-ui-implementer` polish responsive/hover/focus.
