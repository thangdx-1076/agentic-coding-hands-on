# E2E Refactor Verification Report

**Date:** 2026-09-05 | **Test Run:** pnpm test:e2e | **Exit Code:** 0

## Executive Summary

The Playwright E2E suite ran clean with **28 passed, 2 skipped, 0 failed**. All language-selector keyboard navigation cases executed and passed, confirming the behavior-preserving refactor preserved all runtime behavior. The extraction of keyboard/focus logic into `useMenuKeyboardNav` hook and `roving-index` utilities introduced no behavioral regressions.

## Test Command & Execution

```bash
pnpm test:e2e
# Translates to: playwright test
```

**Real exit code:** `0`
**Duration:** 11.2s
**Workers:** 4 (chromium)

## Test Results Summary

| Category | Count |
|----------|-------|
| **Passed** | 28 |
| **Skipped** | 2 |
| **Failed** | 0 |
| **Total** | 30 |

## Language-Selector Keyboard Navigation Cases

All keyboard navigation tests for the refactored component executed and **PASSED**:

### Keyboard Tests (9 total)

1. **✓ `[KB a1f8c2d1]` ArrowDown on trigger opens menu and focuses first item** (616ms)
   - Verifies opening the menu with ArrowDown lands focus on first (VN) item
   - **Status:** PASSED

2. **✓ `[KB c4e7d9f2]` ArrowUp on trigger opens menu and focuses last item** (660ms)
   - Verifies opening the menu with ArrowUp lands focus on last (EN) item
   - **Status:** PASSED

3. **✓ `[KB f7b2a4e8]` ArrowDown wraps from last to first item in menu** (598ms)
   - Verifies wrap-around: last → first on ArrowDown
   - **Status:** PASSED

4. **✓ `[KB e3c9b1a5]` ArrowUp wraps from first to last item in menu** (618ms)
   - Verifies wrap-around: first → last on ArrowUp
   - **Status:** PASSED

5. **✓ `[KB d6f1c3b9]` Home key jumps to first item in menu** (765ms)
   - Verifies Home key focuses first item from any position
   - **Status:** PASSED

6. **✓ `[KB b8e2d7a4]` End key jumps to last item in menu** (799ms)
   - Verifies End key focuses last item from any position
   - **Status:** PASSED

7. **✓ `[KB c5a9f2d3]` Escape closes menu and returns focus to trigger** (791ms)
   - Verifies Escape closes menu and focus returns to button
   - **Status:** PASSED

8. **✓ `[KB a2d8e6f1]` Tab closes menu without returning focus to trigger** (726ms)
   - Verifies Tab closes menu and focus moves forward (normal tab flow)
   - **Status:** PASSED

9. **✓ `[REG 2026-09-05]` Focus resets to first item on mouse open after keyboard navigation** (463ms)
   - Regression guard: verifies roving index resets when menu reopens via mouse
   - **Status:** PASSED

### Non-Keyboard Tests (2 total)

1. **✓ `[TC 8415b629]` Language selector top-right** (1.2s)
   - Verifies accessible name contains "VN"
   - **Status:** PASSED

2. **✓ `[TC 20d87e28]` Language dropdown opens on click** (1.0s)
   - Verifies menu opens and shows VN and EN menuitems
   - **Status:** PASSED

---

## Skipped Tests (2 total)

Both skips are in the "Supabase unavailable" describe block and are intentional:

1. `-  `[PERM002 fail-open]` GET /login renders form even when Supabase is unreachable`
   - **Reason:** Test skipped because Supabase is reachable (guard: `test.skip(!process.env.CI && isReachable, "Supabase is up — outage path not applicable")`)
   - **Note:** This is expected behavior in non-CI environments with a live Supabase connection

2. `-  `[PERM003 fail-closed]` GET /todo does not render todo content when Supabase is unreachable`
   - **Reason:** Same guard; skipped because Supabase is up
   - **Note:** CI pipeline always runs these when Supabase is unreachable

---

## Other Passed Tests

All remaining E2E tests passed cleanly:

- `[TC b9805e65]` Logo top-left position (1.2s)
- `[TC 5fbe2a18]` Hero artwork presence (1.3s)
- `[TC 42b82364]` Hero title and description text (1.2s)
- `[TC 6ae76d15]` LOGIN With Google button (691ms)
- `[TC 33a1dacf]` Footer fixed bottom position (682ms)
- `[TC 45278c06]` Error alert on /login?error=* (654ms)
- `[TC 45278c06]` Unauthenticated GET /todo redirects to /login (584ms)
- `[TC 45278c06]` Unauthenticated GET / redirects to /login (592ms)
- `[TC 60bc5bbb]` Google button triggers OAuth flow (abort) (751ms)
- `[TC 37eae882]` Button disabled during authentication (704ms)
- `[ROUTE001]` GET /auth/callback?error=access_denied redirects (695ms)
- `[ROUTE001]` GET /auth/callback (no code, no error) redirects (697ms)
- `[PERM004]` GET /auth/callback?next=https://evil.com stays within origin (577ms)
- `[ROUTE001]` GET /auth/callback?code=<unusable> falls back (598ms)
- `[TC f62b0c97]` Authenticated user redirects /login to /todo @auth (821ms)
- `[TC e76aa170]` /todo shows user email and logout button @auth (812ms)
- `[US003, BL002 signOut]` Click logout button, verify redirect to /login, re-check guard (969ms)

---

## Analysis

### Refactor Coverage

The refactor extracted three key concerns:

1. **`hooks/use-menu-keyboard-nav.ts`** — state (open/roving index), effects (outside-click, focus trap), keyboard handlers
2. **`lib/ui/roving-index.ts`** — pure wrap-around logic for `nextIndex`, `prevIndex`, `lastIndex`
3. **`components/login/language-selector.tsx`** — now JSX-only, calls the hook and destructures its return

### Behavior Preservation Verdict

**✓ VERIFIED** — All 11 language-selector test cases (9 keyboard + 2 click/accessible-name) executed successfully without any failures:

- **Menu opening behavior** (ArrowDown/ArrowUp): ✓ Preserved
- **Focus management** (roving index, wrap-around): ✓ Preserved
- **Home/End navigation**: ✓ Preserved
- **Escape/Tab close behavior**: ✓ Preserved
- **Focus reset on mouse reopen**: ✓ Preserved
- **Click to open**: ✓ Preserved
- **Accessible name**: ✓ Preserved

No environmental blockers (dev server, browser binary, Supabase) affected the language-selector tests — all executed in the normal "Unauthenticated" test suite with full success.

---

## Pre-Existing Test State (for reference)

Before this refactor, the following work was already verified green:

- `pnpm lint` → exit 0
- `pnpm typecheck` → exit 0
- `pnpm test:unit` → 44/44 passed (includes 10 new roving-index unit tests)

This E2E run completes the integration verification.

---

## Conclusion

The behavior-preserving refactor is **validated**. No source files required edits to pass tests. The keyboard/focus logic extraction worked correctly, and the refactored component's runtime behavior is identical to the original.

**No regressions detected.**
