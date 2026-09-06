# Src/ Route-Colocation Migration — Quality Gate Report

**Branch:** `refactor/src-route-colocation` (HEAD 580e45f)  
**Date:** 2026-09-06  
**Tester:** Claude (tester agent)

## Gate Results

| Command | Exit Code | Status | Summary |
|---------|-----------|--------|---------|
| `pnpm lint --max-warnings 0` | 0 | PASS | ESLint clean, no warnings |
| `pnpm format:check` | 0 | PASS | All files match Prettier style |
| `pnpm test:unit:coverage` | 0 | PASS | 19 test files, 124 tests, 100% on all axes |
| `pnpm build-storybook` | 0 | PASS | Build succeeded (37 stories found) |
| `pnpm exec playwright test --grep-invert @auth` | 0 | PASS | 46 e2e passed, 2 skipped |
| `pnpm exec playwright test --grep @auth` | 0 | PASS | 9 @auth tests passed |
| Static boundary checks | 1 | FAIL | (d) 3 files exceed 200 lines |

## Coverage Files (18 total)

100% coverage across all axes (statements, branches, functions, lines):

1. `src/api/auth.ts`
2. `src/app/(public)/(home)/_hooks/use-countdown.ts`
3. `src/app/(public)/(home)/_utils/countdown.ts`
4. `src/app/(public)/_hooks/use-select-locale.ts`
5. `src/app/(public)/login/_hooks/use-login-actions.ts`
6. `src/app/_actions/logout.ts`
7. `src/app/_actions/set-locale.ts`
8. `src/app/auth/callback/route.ts`
9. `src/dal/auth.ts`
10. `src/dal/users-role-client.ts`
11. `src/dal/users.ts`
12. `src/hooks/use-menu-keyboard-nav.ts`
13. `src/lib/i18n/locale.ts`
14. `src/lib/supabase/client.ts`
15. `src/lib/supabase/proxy-client.ts`
16. `src/lib/supabase/server.ts`
17. `src/utils/a11y/roving-index.ts`
18. `src/utils/url/next-path.ts`

## E2E Test Summary

**Non-auth suite** (`--grep-invert @auth`):
- 46 passed
- 2 skipped: Supabase unavailable tests (network isolation, expected)
- Duration: 13.6s

**Auth suite** (`--grep @auth`):
- 9 passed
- Supabase instance reachable and auth flow verified
- Duration: 9.0s

## Boundary Check Findings

✓ (a) No client component imports `@/dal`  
✓ (b) No `auth.getUser` calls in `src/app`  
✓ (c) DAL modules import `server-only`: auth.ts, users.ts, users-role-client.ts  
✗ (d) **3 files exceed 200-line limit:**
  - `src/hooks/use-menu-keyboard-nav.test.ts` (382 lines)
  - `src/app/auth/callback/route.test.ts` (221 lines)
  - `src/app/(public)/(home)/_shared/home-copy.ts` (202 lines)  
✓ (e) No root-level `app/`, `components/`, `hooks/`, `lib/`, `mocks/`, `i18n/`, or `proxy.ts`

## Discrepancies

**Storybook story count:** 37 discovered, spec expected 22.  
Indicates either: (1) spec was outdated, (2) stories were added during implementation, or (3) glob changed. All 37 stories build and load successfully.

## Unresolved Questions

- Are the 3 oversized files acceptable? (test files and shared copy may warrant exemption)
- Should the story count be updated to 37 in spec/acceptance criteria?
- Are the 2 skipped Supabase tests acceptable as a permanent fixture?
