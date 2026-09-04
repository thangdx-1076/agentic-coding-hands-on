# Phase 04 — /login integration wiring

## Files
- `app/login/page.tsx` (+93 lines, new) — server component: authoritative `getUser()` guard → `/todo`, `LoginCopy` from `getTranslations('login')`+`getLocale()`, `searchParams.error` boundary check.
- `app/login/login-client.tsx` (+78 lines, new) — `'use client'`: `useTransition` for `signInWithOAuth` (PKCE, `redirectTo` = origin + `/auth/callback?next=/todo`) and `setLocale` Server Action; merges client SDK error with server `?error=` message.
- `app/layout.tsx` — **not touched** (Key Insights note confirmed correct: `LoginScreen` self-applies `loginFontVariables`; layout only needed `NextIntlClientProvider`+`lang`, already landed in phase-02).
- `plans/.../phase-04-integration-login-page-wiring.md` — Todo boxes ticked, `status: completed`.

## Checks (commands + exit codes)
1. `npx tsc --noEmit` → 0
2. `npm run lint` → 0 (1 pre-existing warning in `tests/e2e/login.spec.ts`, unrelated)
3. `npx vitest run` → 0 (17/17 passing)
4. `npm run build` → 0 (`/login` listed as dynamic route ƒ)
5. GoTrue allow-list curl: `302` → `accounts.google.com...redirect_to=...%2Fauth%2Fcallback%3Fnext%3D%2Ftodo` intact — no fallback needed.

## Dev smoke (`npm run dev`, curl, then killed — port 3000 confirmed free)
- `/login`: "LOGIN With Google" ✓, "Bản quyền thuộc về Sun* © 2025" ✓, `alt="ROOT FURTHER"` ✓, `aria-haspopup="menu"` ✓
- `/login?error=x`: `role="alert"` ✓, "Đăng nhập không thành công" ✓
- `/login` with `Cookie: NEXT_LOCALE=en`: "Copyright © Sun* 2025" ✓

## Playwright self-check (informational — `npx playwright test tests/e2e/login.spec.ts --reporter=list`, exit 1)
17 passed, 7 failed, 4 skipped (2 `test.fixme` × 2 projects, as expected) of 28.
Failing titles + root cause (none caused by `app/login/**`; not editing tests):
- `[TC 8415b629] Language selector top-right` (chromium), `[TC 20d87e28] Language dropdown opens on click` (both projects): `button[aria-haspopup="menu"]` locator is unscoped and also matches Next.js's dev-mode "Open Next.js Dev Tools" indicator button (`id="next-logo"`), which carries the same attribute. Fix belongs in `tests/e2e/login.spec.ts` — scope to `header button[aria-haspopup="menu"]`.
- `[TC 45278c06] Error alert on /login?error=*` (both projects): `[role="alert"]` locator also matches Next.js's built-in `#__next-route-announcer__` div (framework a11y feature, always present). Fix: scope to `p[role="alert"]` or filter by text.
- `[TC 37eae882] Button disabled during authentication` (both projects, 30s timeout): `signInWithOAuth` triggers a real full-page navigation to the local GoTrue authorize URL per spec (FR-202); the test's `route.abort()` after 500ms fails the in-flight top-level navigation and the button locator becomes unresolvable. Pre-flagged as expected flakiness in the phase's own Risk Assessment (`TC 37eae882 flaky`) — countermeasure already applied (no `finally` pending reset). GREEN strategy is tester's scope (phase-05).

## Deviations
- `LoginClient` takes `errorText` (always-translated fixed string) alongside `errorMessage` (server `?error=`-derived) so client-only SDK failures can display the same fixed copy — a small addition beyond the task's literal 3-prop example, required to satisfy "if (error) setLocalError(copyErrorMessage)" since `LoginCopy` has no `error` field.
