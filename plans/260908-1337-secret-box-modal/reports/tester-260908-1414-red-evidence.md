# E2E RED Evidence — Secret Box Modal (MoMorph J3-4YFIpMM)

**Date:** 260908-1414  
**Policy:** e2e-red-first  
**Status:** VALID RED — Feature not implemented, button hardcoded disabled  

## Test Execution

**Test File:**
```
tests/e2e/secret-box.spec.ts
```

**Exact Command:**
```bash
pnpm run test:e2e tests/e2e/secret-box.spec.ts
```

**Real Exit Code:** `1` (test suite failed)  
**Results:** 14 total | **12 failed** | **2 passed**

---

## Test Results Summary

| Test | Status | Cause | Duration |
|------|--------|-------|----------|
| **[S01] Entitled user: button ENABLED** | ✘ FAILED | Button hardcoded disabled (unopened=0) | 6.8s |
| [S02–S12] Modal behavior (11 tests) | ✘ FAILED | Blocked: can't click disabled button OR feature missing | 30s each |
| **[S13] Zero case: button DISABLED, modal never opens** | ✓ PASSED | Design contract verified (button disabled, doesn't open modal) | 1.8s |
| **[S15] Anonymous viewer: no button** | ✓ PASSED | Regression guard — C09 preserved | 0.4s |

---

## Primary RED Assertion: [S01] FAILED ✘

**Test:** `[S01] Entitled user (unopened=1): kudos-open-gift ENABLED`  
**Location:** `tests/e2e/secret-box.spec.ts:239–254`  
**Setup:** Seeded 5 hearts from sender→viewer (unopened = floor(5/5) = 1)  
**Tag:** `@auth @local-db`

**Failure Output:**
```
Error: expect(locator).toBeEnabled() failed

Locator:  locator('[data-testid=kudos-open-gift]')
Expected: enabled
Received: disabled
Timeout:  5000ms

Call log:
  - locator resolved to <button disabled type="button" 
    data-testid="kudos-open-gift" ... >
     - unexpected value "disabled"
```

**Assertion:**
```typescript
await expect(openGiftBtn).toBeEnabled();
```

**Cause:** Feature not implemented. Button exists, is visible, but `kudos/page.tsx:146-147` hardcodes:
```typescript
secretBoxOpened: 0,
secretBoxUnopened: 0,  // ← Should be real value (1 when 5+ hearts)
```

**Why Valid RED:**
- ✓ Failure caused by missing feature implementation
- ✓ NOT a config/dependency/browser-install error
- ✓ Seeding succeeded (5 hearts stored in real Supabase)
- ✓ Button correctly exists in DOM (hardcoded disabled state)
- ✓ Assertion is correct: unopened=1 → button MUST be enabled
- ✓ Non-zero exit due to assertion failure

---

## Secondary Failures: [S02–S12] Blocked ✘

**Root Cause:** S01 not satisfied (button still disabled)

All 11 remaining feature tests attempt `await openGiftBtn.click()`, which:
- Requires button to be enabled (per Playwright's auto-wait logic)
- Button is disabled → click times out after 30s
- Each test times out waiting for enabled state

**Why they're blocked, not just slow:**
- S02–S06: Also need modal component to exist (`secret-box-dialog.tsx`)
- S07–S10: Also need RPC `open_secret_box()` + state management
- S11–S12: Also need close button + keyboard handler

**Expected behavior after implementation:**
1. Once kudos/page.tsx reads real counts → S01 PASSES
2. Once modal component exists → S02–S12 will execute (may PASS or FAIL depending on backend)

---

## Design Check: [S13] PASSED ✓

**Test:** `[S13] No hearts (unopened=0): button visible but DISABLED, modal never opens`  
**Location:** `tests/e2e/secret-box.spec.ts:514–539`  
**Setup:** Zero hearts seeded (unopened = 0)  
**Tag:** `@auth @local-db`

**Assertions:**
1. Button visible → ✓ PASS (rendered)
2. Button disabled → ✓ PASS (hardcoded unopened=0)
3. Modal doesn't open → ✓ PASS (try/catch on click, toHaveCount(0))

**Why this test MUST PASS:**
- Contract is: when unopened=0, button disabled + modal never opens
- Current code correctly implements this contract (hardcoded 0)
- After feature ships, if button becomes enabled at unopened=0, this test will catch it
- **This test will continue to PASS after implementation** (legitimate zero case)

**Technical note:** Uses try/catch pattern (per `profile.spec.ts:404-410`) to attempt click on disabled button, expect timeout, then verify modal doesn't exist. This is correct behavior, not a bug.

---

## Regression Guard: [S15] PASSED ✓

**Test:** `[S15] Anonymous viewer: no kudos-open-gift button`  
**Location:** `tests/e2e/secret-box.spec.ts:550–568`  
**Status:** PASSED  
**Related:** `kudos.spec.ts:43 [C09]`

**Verification:** Anonymous users see no stat rows, no button (correct)  
**Preservation:** Must keep passing after feature ships (C09 contract)

---

## Seeding Strategy Verified ✓

- Sender→receiver kudo created with `heart_count: 5` ✓
- Backend calculates: `unopened = floor(5/5) - 0 = 1` ✓
- User provably entitled to 1 unopened box ✓
- Entitlement visible in real Supabase data ✓
- Entitled user sees button disabled (feature missing) ✓

---

## Environment & Wiring ✓

**Fixed:** `beforeEach` now reads `NEXT_PUBLIC_SUPABASE_URL` first (per repo convention), then falls back to `SUPABASE_URL` literal. Matches `kudos.spec.ts:615` wiring.

**Dev Server:** Suite correctly reuses existing `:3000` dev server. `reuseExistingServer: true` (playwright.config.ts) + live parent = no need for `E2E_PORT=3100` (Next 16 refuses second instance on same directory).

---

## MoMorph Test-Case Mapping

**Primary RED:** `84a5ba82` — access control: button enabled when unopened > 0

**All 12 blocked assertions map to verified test cases:**

| TC | Description | S01 blocker | S02–S12 blocker |
|----|---|---|---|
| a0cd2f27 | Unopened title | ✓ | Modal missing |
| a891383a / d9d6e01a | Instruction display + hidden | ✓ | Modal missing |
| 4bbf0b67 / 56da7ec8 | Badge image display | ✓ | RPC + modal |
| 3a8ac6b5 / ce44f5ed | Counter label + value | ✓ | Modal missing |
| 632c600b / 982ae7f9 | Close button + closes | ✓ | Modal missing |
| 7c3c912f | Click box → reveal + decrement | ✓ | RPC missing |
| 2a8a63de | Disabled at count=0 | ✓ | S13 ✓ PASS |
| 5cc072ad / 2e7bec78 | Tamper resistance | ✓ | RPC missing |

---

## Implementation Blockers

**Critical (S01):**
- `kudos/page.tsx:146-147` must read real unopened count instead of hardcoding 0

**Secondary (S02–S12):**
- Modal component: `src/app/(public)/kudos/_components/secret-box-dialog.tsx`
- RPC: `open_secret_box(user_id)` (migration 0011)
- Server action + hook to wire RPC

---

## Unresolved Questions

None. All seeding, auth patterns, and acceptance criteria verified against `clarifications.md`.

---

## Next Steps

1. ✓ **RED captured** — [S01] fails because button hardcoded disabled (feature missing)
2. → **Track A (UI):** Implement `secret-box-dialog.tsx` component
3. → **Track B (backend):** Migration 0011, `open_secret_box` RPC, server action
4. → **Main:** Update `kudos/page.tsx:146-147` to read real counts (this triggers S01 GREEN)
5. → **Tester:** Re-run same command → expected result: S01 GREEN, S02–S12 execute (may PASS or FAIL per implementation)

---

## Report Metadata

**Test Suite Duration:** ~1.5 minutes  
**Browser:** Chromium  
**Seeding:** Real Supabase local instance (SERVICE_ROLE_KEY), no mocks  
**Auth:** Real sign-up flow via `createTestSession`  
**Entitlement:** Real heart_count on kudos table, backend calculates unopened count

**Tests that MUST stay green after implementation:**
- S13 (zero case, button disabled)
- S15 (anonymous, no button)

**Generated by:** tester agent (e2e-red-first policy)  
**Date:** 260908-1414
