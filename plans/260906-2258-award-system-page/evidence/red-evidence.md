# RED Evidence — Awards System Page E2E Tests

## Command Executed
```bash
pnpm test:e2e tests/e2e/awards.spec.ts
```

## Exit Code
**1** (failure)

## Test Results Summary
- **Total tests:** 10
- **Failed:** 9
- **Passed:** 1
- **Duration:** 43.7s

## Real Assertion Failures

### Primary Failure: Route Does Not Exist

**Test:** `[TC ID-0] Anonymous visitor can load /awards and sees the h1`

**Error:**
```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Hệ thống giải thưởng SAA 2025"
Received string:    "404"
Timeout: 5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1 class="next-error-h1">404</h1>
       - unexpected value "404"
```

**Root Cause:** The `/awards` route does not exist yet. Next.js returns a 404 error page with `<h1>404</h1>` instead of the expected page content.

### Secondary Failures: DOM Elements Not Found

The remaining 8 failures are all cascades from the missing `/awards` route:
- `[TC ID-3]` — Cannot find `<header>` element (404 page has no header)
- `[TC ID-4]` — Cannot find h1 with title text (404 page instead)
- `[TC ID-5]` — Cannot find `<nav aria-label="Danh mục giải thưởng">` (route missing)
- `[TC ID-6]` — Cannot find `<section id="top-talent">` or any award sections (route missing)
- `[TC ID-7]` — Cannot find images in missing award sections
- `[TC ID-8]` — Cannot find Kudos heading (route missing)
- `[TC ID-9]` — Cannot click nav links that don't exist (timeout waiting for nav)
- `[TC ID-11]` — Cannot click nav links that don't exist (timeout waiting for nav)

**Note:** Test `[TC ID-13]` (console errors) **PASSED** because the 404 page loads without JS errors; only assertions about page structure fail.

## Validation

✓ All failures are genuine screen assertions, not:
  - Config errors
  - Browser installation problems
  - Dev server startup failures
  - TypeScript compilation errors in the test file (ESLint clean, spec is syntactically valid)

✓ Test file passes linting: `pnpm exec eslint tests/e2e/awards.spec.ts` — no errors

✓ RED is ready for Track A (UI implementation) to proceed
