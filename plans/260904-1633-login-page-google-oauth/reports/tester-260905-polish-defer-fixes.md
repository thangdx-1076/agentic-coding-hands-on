# Tester Report: Polish Deferred Fixes Verification

**Date:** 2026-09-05  
**Test Suite:** tests/e2e/login.spec.ts  
**Project:** agentic-coding-hands-on (SAA 2025 Login)

---

## Summary

Successfully ran the full Playwright E2E suite GREEN after two polish fixes landed:

1. **lib/supabase/next-path.ts** — Unicode rejection (U+2028/U+2029) on top of ASCII control chars. Unit tests: 24/24 passing.
2. **components/login/language-selector.tsx** — ARIA APG menu-button keyboard support (ArrowDown/ArrowUp/Home/End/Escape/Tab).

Added 8 durable E2E tests for new keyboard navigation behavior. All 22 tests (14 original + 8 new) pass GREEN with exit code 0. Unit tests also pass: 32/32.

---

## Test Execution Results

### Playwright E2E Suite

**Initial baseline run (existing tests only):**
```
npx playwright test tests/e2e/login.spec.ts --reporter=list
Running 14 tests using 4 workers
✓ 14 passed (4.1s)
Exit code: 0
```

**Final run (with new keyboard navigation tests):**
```
npx playwright test tests/e2e/login.spec.ts --reporter=list
Running 22 tests using 4 workers
✓ 22 passed (5.4s)
Exit code: 0
```

### Unit Tests

```
npm run test:unit
✓ lib/i18n/locale.test.ts (8 tests)
✓ lib/supabase/next-path.test.ts (24 tests)
Test Files: 2 passed
Tests: 32 passed
Exit code: 0
```

---

## Keyboard Navigation Coverage Added

All tests follow the existing file structure and locator conventions (`header button[aria-haspopup="menu"]`, `[role="menu"]`, `[role="menuitem"]`).

| Test ID | Description | Status |
|---------|-------------|--------|
| KB a1f8c2d1 | ArrowDown on trigger opens menu and focuses first item | ✓ PASS |
| KB c4e7d9f2 | ArrowUp on trigger opens menu and focuses last item | ✓ PASS |
| KB f7b2a4e8 | ArrowDown wraps from last to first item in menu | ✓ PASS |
| KB e3c9b1a5 | ArrowUp wraps from first to last item in menu | ✓ PASS |
| KB d6f1c3b9 | Home key jumps to first item in menu | ✓ PASS |
| KB b8e2d7a4 | End key jumps to last item in menu | ✓ PASS |
| KB c5a9f2d3 | Escape closes menu and returns focus to trigger | ✓ PASS |
| KB a2d8e6f1 | Tab closes menu without returning focus to trigger | ✓ PASS |

### Implementation Verified

- Roving tabindex pattern correctly implemented: only active item has `tabIndex=0`
- Focus management via `useEffect` hook updates DOM focus to active item
- Keyboard handlers (`handleButtonKeyDown`, `handleMenuKeyDown`) dispatch all required actions
- Menu open/close state and active index tracking work as specified in ARIA APG pattern

---

## Changes Made

### File: tests/e2e/login.spec.ts

Added new describe block `Language selector keyboard navigation (ARIA APG)` within the `Unauthenticated` test group (lines 234–407). Contains 8 test cases covering:

- Trigger keyboard interaction (ArrowDown/ArrowUp open menu)
- Menu navigation with wrap-around behavior (ArrowDown/ArrowUp)
- Jump keys (Home/End)
- Menu close triggers (Escape with focus return, Tab without focus return)

All tests use scoped locators to avoid dev tools conflicts and match existing style.

---

## Test Counts

| Category | Count | Status |
|----------|-------|--------|
| Original E2E tests | 14 | ✓ PASS |
| New keyboard E2E tests | 8 | ✓ PASS |
| **Total E2E** | **22** | **✓ PASS** |
| Unit tests | 32 | ✓ PASS |
| **Overall** | **54** | **✓ PASS** |

---

## Exit Codes

| Command | Exit Code |
|---------|-----------|
| `npx playwright test (baseline)` | 0 |
| `npx playwright test (with new tests)` | 0 |
| `npm run test:unit` | 0 |

---

## No Weakening

All 14 original tests continue to pass without modification. No assertions loosened, skipped, or disabled. New tests are durable screen-level assertions that exercise real keyboard behavior without mocking or stubbing.

---

## Evidence Artifacts

- **E2E logs:** `/plans/260904-1633-login-page-google-oauth/evidence/green-run-polish.log`
- **Test file:** `tests/e2e/login.spec.ts` (updated, 441 lines)

---

**Status:** DONE  
**Summary:** All 22 E2E tests pass GREEN with 8 new keyboard navigation tests added. Unit tests pass (32/32). Polish fixes verified working.  
**Concerns/Blockers:** None.
