---
phase: 02
feature: F002
status: completed
priority: P1
effort: 1.5h
owner: implementer
depends_on: []
file_ownership: ["next.config.ts", "i18n/request.ts", "messages/*.json", "lib/i18n/**", "app/layout.tsx", "app/actions/locale.ts", "vitest.config.ts", "package.json"]
---

# Phase 02 — i18n foundation (next-intl, cookie NEXT_LOCALE)

## Context Links

- `spec/languageswitch/functional-spec.md` (FR-001, FR-101, FR-201, FR-401, FR-402; BR-001, BR-002; US001, US002)
- `spec/languageswitch/technical-spec.md` § 3.1 A1, § 4.6, § 5.3 (resolved)
- `clarifications.md` § E2E contract (menu VN/EN, cookie path=/ 1 năm), § gap resolution (invalid cookie → `vi`)
- `research/researcher-01-supabase-google-oauth-nextjs16.md` § Q3 (next-intl 4.14.2, no-routing, Server Action)

## Overview

**Priority**: P1 · **Status**: pending · **Feature**: F002_LanguageSwitch
Dựng nền i18n cookie-based cho toàn app: next-intl no-routing, locale từ cookie `NEXT_LOCALE` (default `vi`, whitelist `{vi,en}`), 2 file messages, provider trong root layout, Server Action `setLocale`. Chưa gắn UI (phase-04 nối `onSelectLocale`).

## Key Insights

- next-intl v4 plugin mặc định đọc `./i18n/request.ts` — repo chưa có `src/`, đặt ở root.
- `cookies()` là async ở Next 16 → mọi chỗ đọc/ghi cookie phải `await`.
- Cookie chỉ được ghi trong Server Action / Route Handler / proxy — KHÔNG ghi từ Server Component.
- Nhãn "VN"/"EN" là nhãn **locale code**, cố định cả 2 ngôn ngữ (design + E2E) → không đưa vào messages, để trong `LOCALE_LABEL` (1 nguồn duy nhất, DRY).
- Alt của logo/hero bất biến theo locale (E2E assert chuỗi tiếng Việt gốc) — giữ y nguyên ở `en.json`.

## Requirements

- **FR-001** next-intl đọc locale từ `NEXT_LOCALE`, default `vi`, không URL prefix.
- **FR-401** chọn locale → set cookie `NEXT_LOCALE` (path=`/`, maxAge 31536000) + re-render.
- **BR-001** chỉ `vi`|`en`; giá trị khác → `vi`. **BR-002** copy `/login` + `/todo` lấy từ `messages/{locale}.json`; "LOGIN With Google" giữ nguyên 2 locale.
- Non-functional: file ≤200 dòng, kebab-case, không secret trong repo.

## Architecture

```
request → proxy.ts (phase-03, chuẩn hoá cookie) → i18n/request.ts
            ↓ normalizeLocale(cookie NEXT_LOCALE)
        messages/{vi|en}.json → RootLayout <html lang={locale}> + NextIntlClientProvider
client menu → setLocale('en') [Server Action] → cookies().set(NEXT_LOCALE) → server re-render
```

## Related Code Files

**Create**: `lib/i18n/locale.ts`, `lib/i18n/locale.test.ts`, `i18n/request.ts`, `messages/vi.json`, `messages/en.json`, `app/actions/locale.ts`, `vitest.config.ts`
**Modify**: `next.config.ts`, `app/layout.tsx`, `package.json`
**Delete**: —

## Implementation Steps

1. `npm i next-intl@4.14.2` và `npm i -D vitest@^3` (unit runner: **vitest**, chọn duy nhất cho toàn plan). Thêm script `"test:unit": "vitest run"`.
2. `vitest.config.ts`: `test: { environment: 'node', include: ['lib/**/*.test.ts'] }` — không cần jsdom, chỉ test helper thuần.
3. `lib/i18n/locale.ts`: `export const SUPPORTED_LOCALES = ['vi','en'] as const; export type AppLocale = ...; export const DEFAULT_LOCALE: AppLocale = 'vi'; export const LOCALE_COOKIE = 'NEXT_LOCALE'; export const LOCALE_COOKIE_MAX_AGE = 31536000; export const LOCALE_LABEL: Record<AppLocale,string> = { vi:'VN', en:'EN' }; export function isSupportedLocale(v: unknown): v is AppLocale; export function normalizeLocale(v?: string | null): AppLocale` (trả `DEFAULT_LOCALE` khi undefined/null/rỗng/không thuộc whitelist).
4. `lib/i18n/locale.test.ts` (RED trước): `normalizeLocale('en')==='en'`, `('vi')==='vi'`, `(undefined)==='vi'`, `(null)==='vi'`, `('')==='vi'`, `('fr')==='vi'`, `('EN')==='vi'` (case-sensitive theo whitelist), `('vi; en')==='vi'`.
5. `i18n/request.ts`: `getRequestConfig(async () => { const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value); return { locale, messages: (await import(`../messages/${locale}.json`)).default } })` — bọc `import` trong try/catch, lỗi → load `vi`.
6. `next.config.ts`: `const withNextIntl = createNextIntlPlugin(); export default withNextIntl(nextConfig)` — giữ nguyên object config hiện có.
7. `messages/vi.json`: `login.subtitle` "Bắt đầu hành trình của bạn cùng SAA 2025." · `login.tagline` "Đăng nhập để khám phá!" · `login.loginButton` "LOGIN With Google" · `login.footer` "Bản quyền thuộc về Sun* © 2025" · `login.error` "Đăng nhập không thành công. Vui lòng thử lại." · `login.logoAlt` "Sun* Annual Awards 2025" · `login.heroAlt` "ROOT FURTHER" · `todo.greeting` "Xin chào {email}" · `todo.logout` "Đăng xuất".
8. `messages/en.json`: cùng key — subtitle "Start your journey with SAA 2025." · tagline "Log in to explore!" · loginButton "LOGIN With Google" (giữ) · footer "Copyright © Sun* 2025" · error "Login failed. Please try again." · logoAlt/heroAlt **giữ y nguyên như vi** · `todo.greeting` "Hello {email}" · `todo.logout` "Log out".
9. `app/actions/locale.ts`: `'use server'` → `export async function setLocale(locale: string) { const next = normalizeLocale(locale); (await cookies()).set(LOCALE_COOKIE, next, { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: 'lax' }); }` — không `redirect()`, để Server Action tự tạo round-trip re-render.
10. `app/layout.tsx`: `const locale = await getLocale()`; `<html lang={locale}>`; bọc `{children}` trong `<NextIntlClientProvider>`; **giữ nguyên font Geist inline hiện tại** (phase-04 mới đổi sang `app/fonts.ts` của Track A) và giữ `LayoutProps<"/">`; đổi `metadata` sang title "SAA 2025".
11. Chạy `npx tsc --noEmit`, `npm run lint`, `npm run test:unit` (phải xanh), `npm run build`.

## Todo List

- [x] Cài `next-intl@4.14.2` + `vitest`, thêm script `test:unit`
- [x] `vitest.config.ts`
- [x] `lib/i18n/locale.ts` + test RED → GREEN
- [x] `i18n/request.ts` (fallback `vi`, try/catch import)
- [x] `next.config.ts` bọc plugin
- [x] `messages/vi.json` + `messages/en.json` (đủ 9 key mỗi file)
- [x] `app/actions/locale.ts`
- [x] `app/layout.tsx`: `lang={locale}` + provider
- [x] typecheck / lint / unit / build xanh

## Success Criteria

- `npm run test:unit` exit 0, phủ đủ 8 case của `normalizeLocale`.
- `npx tsc --noEmit` exit 0; `npm run build` exit 0.
- `messages/vi.json` và `messages/en.json` **cùng tập key** (kiểm bằng mắt hoặc `node -e` so sánh).
- `/login` chưa tồn tại ở phase này → E2E vẫn RED, đúng như mong đợi (không phải regression).

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| `NextIntlClientProvider` v4 báo thiếu prop `locale`/`messages` (research độ tin cậy thấp) | M×M | Provider lỗi → truyền tường minh `locale={locale} messages={await getMessages()}` |
| Plugin next-intl không tìm thấy `i18n/request.ts` | L×H | Nếu build cảnh báo, truyền path tường minh: `createNextIntlPlugin('./i18n/request.ts')` |
| Sửa `app/layout.tsx` xoá mất font wiring mà Track A đang chuẩn bị thay | M×L | Chỉ thêm provider + `lang`, không chạm 2 khối `Geist(...)` |
| Thêm vitest phình dependency (YAGNI) | L×L | Giới hạn đúng 2 helper thuần có ý nghĩa bảo mật/logic; không test component |

## Security Considerations

- Cookie `NEXT_LOCALE` không chứa dữ liệu nhạy cảm → không cần `httpOnly` (client cần đọc được nhãn), nhưng đặt `sameSite: 'lax'`, `path: '/'`.
- `setLocale` nhận input người dùng → luôn qua `normalizeLocale` trước khi ghi (chống cookie injection / path traversal ở `import(messages/${locale}.json)`).
- Không log giá trị cookie; không thêm secret nào vào repo.

## Next Steps

Phase-03 (Supabase auth foundation) phụ thuộc phase này: `proxy.ts` dùng `normalizeLocale`/`LOCALE_COOKIE`, `/todo` dùng `messages.todo.*`.
