# RED Evidence — Profile Page E2E Contract

**Phase**: 01 — RED e2e-red-first contract  
**Date**: 2026-09-07  
**Tester**: tester agent  

## Test Execution Summary

**redCommand**: `pnpm test:e2e tests/e2e/profile.spec.ts`

**redExitCode**: `1` (non-zero, indicating test failure)

**Test Results**:
- Total tests: 22
- Passed: 5
- Failed: 17
- Skipped: 0

## RED Validity Assessment

✅ **VALID RED** — The failure is caused by assertion failures on the missing `/profile` screen, not infrastructure issues.

**Proof**:
- Existing `/awards` and `/standards` e2e tests all PASS (26 passed)
- Backward compatibility: `pnpm test:e2e home.spec.ts --grep-invert @auth` passes 21 tests
- Playwright webServer starts successfully (`pnpm dev` runs via playwright.config.ts)
- Supabase local is running and healthy (`supabase status` ✓)
- Browser is installed and functional (other e2e tests work)

**Root cause of failures**:
- `/profile` route does not exist (returns undefined or 404)
- Test assertions expecting page elements, headings, buttons, navigation all fail because the page doesn't render
- Some tests timeout waiting for navigation that never happens (e.g., C17 waits for redirect to `/login`)

## Failed Test Breakdown

### CI-safe test (no @auth tag)
**C17**: Anonymous user redirects to `/login`
- Status: TIMEOUT (expected navigation never happens)
- Page navigated to `http://localhost:3000/profile` but route returns nothing
- Test waited 30s for redirect to `/login`, timed out

### @auth tests (require Supabase + authenticated session)
- **C1–C16, C18**: All assertion-based failures
- Common pattern: `Locator: locator('h1, h2, h3').filter({ hasText: '...' })` — Expected: 1, Received: 0
- Tests that properly got 404 responses (C12, C13) **PASSED** as expected
- Tests that don't require page render (C3, C18) **PASSED** as expected

**Sample failure excerpt** (C2a: Self view shows heading with profile name):
```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('h1, h2, h3').filter({ hasText: 'E2E Self Sunner' })
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('h1, h2, h3').filter({ hasText: 'E2E Self Sunner' })
    14 × locator resolved to 0 elements
       - unexpected value "0"
```

**Sample failure excerpt** (C17: Anonymous user redirects to `/login`):
```
Test timeout of 30000ms exceeded.

Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/login" until "load"
  navigated to "http://localhost:3000/profile"
============================================================
```

## Backward Compatibility Verification

All **existing** e2e tests still pass:
- `home.spec.ts` (unauthenticated): 21 ✓
- `awards.spec.ts` (CI-safe + @local-db): 13 ✓
- `standards.spec.ts` (public): 14 ✓

**Change made**: Added optional `metadata: Record<string, unknown> = {}` parameter to `createTestSession` in `tests/e2e/helpers/sign-in.ts` — fully backward compatible.

## Contract Stability

All 18 contracts (C1–C18) in `tests/e2e/profile.spec.ts` are locked and authoritative:
- Contract table with `| # | Contract | TC |` format
- OUT OF SCOPE block documenting 10 deferred TC ids (F007+ Kudos domain)
- 0 tests skipped
- 1 test without `@auth` tag (C17, CI-safe)
- 17 tests with `@auth` tag

No contracts were weakened, deleted, or work-arounded to achieve this RED.

## Known Issues & Blockers for Phase 05

⚠️ **Metadata persistence issue** (INVESTIGATE BEFORE PHASE 05):
- Supabase is not persisting custom metadata sent via `options.data` in signup request
- Expected: `auth.users.raw_user_meta_data->>'full_name'` should be `"E2E Self Sunner"`
- Actual: value is `NULL` in database
- Root cause: Unclear — could be Supabase configuration, API behavior, or trigger issue
- Impact: Tests C2a/C2b (heading assertions) will fail when phase 05 code tries to read `full_name`
- Recommendation: Debug before phase 05 starts; may need to use different metadata storage approach or Supabase configuration

The RED itself is NOT blocked by this — assertions fail for the correct reason (route missing), but phase 05 implementation will need to resolve the metadata persistence before those same test assertions can pass.

## Next Steps

Phase 02, 03, 04 can now proceed in parallel (they do not depend on phase 01 completion).  
Phase 05 (UI implementation) is unblocked by this RED evidence, but should investigate the metadata persistence issue before starting C2a/C2b implementation.
