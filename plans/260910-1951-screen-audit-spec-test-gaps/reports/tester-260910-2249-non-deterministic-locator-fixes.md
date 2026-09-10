# Non-Deterministic Locator Fixes — kudos.spec.ts

## Executive Summary

Fixed two non-deterministic locators in `tests/e2e/kudos.spec.ts` that caused cross-file interference under `fullyParallel: true`:

1. **Defect 1 (sendKudo)**: Recipient selection used `.first()` on search results, could pick transient test users created/deleted by kudos-compose.spec.ts
2. **Defect 2 (C14)**: Hashtag filter selection used `.first()` on dynamically-ordered DB-derived option list

## Changes Made

### Defect 1: sendKudo() Function (Lines 32-62)

**Before:**
```typescript
const recipientInput = dialog.locator("[data-testid=kudos-recipient-input]");
await recipientInput.fill("Test");
const recipientOptions = dialog.locator("[data-testid=kudos-recipient-option]");
await expect(recipientOptions.first()).toBeVisible();
await recipientOptions.first().click();
```

**After:**
```typescript
const recipientInput = dialog.locator("[data-testid=kudos-recipient-input]");
// Pin to partial name "Huỳnh" — only seeded "Huỳnh Dương Xuân" matches
await recipientInput.fill("Huỳnh");
const recipientOptions = dialog.locator("[data-testid=kudos-recipient-option]");
// MUST find the seeded recipient; fail loudly if not present
await expect(recipientOptions).toHaveCount(1);
await recipientOptions.first().click();
```

**Rationale:**
- Seeded recipient "Huỳnh Dương Xuân" (0008_kudos_demo_seed.sql:75) is guaranteed to always exist
- Searching "Huỳnh" matches ONLY that seeded user (no other seeded user has this name)
- kudos-compose.spec.ts creates test users with `full_name: "Test User"`, which would also match "Test"
- Assert count = 1 to fail loudly if the seeded user is missing or multiple matches exist
- Deterministic: same result every run, same locator matches exactly one user

**Evidence:**
- Seeded recipient: 0008_kudos_demo_seed.sql, lines 75, 169 (auth.users and public.users)
- Full name: "Huỳnh Dương Xuân"
- kudos-compose.spec.ts test users: line 853, `{ full_name: "Test User" }`

### Defect 2: C14 Test (Lines 460-496)

**Before:**
```typescript
const hashtagFilter = page.locator("[data-testid=kudos-filter-hashtag]");
await hashtagFilter.click();

// Select first option (assuming dropdown has options)
const firstOption = page
  .locator("[data-testid=kudos-filter-hashtag-option]")
  .first();
const hashtagValue = await firstOption.getAttribute("data-value");
await firstOption.click();
```

**After:**
```typescript
const hashtagFilter = page.locator("[data-testid=kudos-filter-hashtag]");
await hashtagFilter.click();

// Find the seeded "Dedicated" option — MUST exist, fail loudly if not
const dedicatedOption = page
  .locator("[data-testid=kudos-filter-hashtag-option]")
  .filter({ hasText: "Dedicated" });
await expect(dedicatedOption).toHaveCount(1);
const hashtagValue = await dedicatedOption.getAttribute("data-value");
await dedicatedOption.click();
```

**Rationale:**
- Filter options are DB-derived distinct values (0014_kudos_filter_options.sql, lines 34-36)
- Seeded hashtags: "IDOL GIỚI TRẺ", "Dedicated", "Inspring" (0008_kudos_demo_seed.sql:117-180)
- sendKudo creates kudos with "TeamWork" tag (lines 74-75), adding a new option to the filter list
- Order of options is not guaranteed across test runs (depends on DB query order)
- Pin to "Dedicated" which is guaranteed in the seed, NOT to ephemeral "TeamWork"
- Assert count = 1 to fail loudly if not exactly one "Dedicated" option
- Deterministic: same hashtag selected every run, same assertions on URL/carousel/feed/counter

**Evidence:**
- Seeded hashtags: 0008_kudos_demo_seed.sql, lines 117-180 (5 of 12 kudos include "Dedicated")
- Filter options view: 0014_kudos_filter_options.sql, lines 34-36 (distinct hashtags from kudos)
- sendKudo creates "TeamWork": kudos.spec.ts:74
- Counter assertions preserved: line 492-495 unchanged

## Contract Preservation

Both changes preserve all existing assertions in the DOM Contract (lines 88-130):

| Test | Assertion | Change? |
|------|-----------|---------|
| C26  | Heart button disabled on self kudo | ❌ None (uses sendKudo) |
| C34  | Heart button disabled on anonymous self kudo | ❌ None (uses sendKudo) |
| C14  | URL param, carousel/feed filter, counter reset | ❌ None (assertion logic unchanged) |

### Unchanged Assertions in sendKudo
- Dialog closes after submit (line 85)
- Title filled with "E2E" (line 64)
- Content filled (line 67)
- Hashtag "TeamWork" added (line 74)
- Anonymous optional (lines 77-82)

### Unchanged Assertions in C14
- URL includes `?hashtag=` param (line 489)
- Parameter value matches selected hashtag (line 490)
- Counter matches `/^1\/\d+$/` (line 495)
- Carousel and feed filtering (implied by counter reset, line 492)

## Cross-File Interference Root Causes

**Before (failing under fullyParallel):**
1. kudos-compose.spec.ts creates test user "Test User" in beforeEach
2. kudos.spec.ts C26/C34 searches "Test" and clicks `.first()` → selects "Test User" (or seeded "Visual Tester" if it existed)
3. kudos-compose.spec.ts deletes "Test User" in afterEach
4. sendKudo's recipient is deleted mid-flight → insert fails → dialog never closes
5. C26:79 `expect(dialog).not.toHaveAttribute("open", "")` fails (dialog still open because recipient was deleted)
6. C14 selects `.first()` from filter options which can include "TeamWork" added by concurrent C26/C34
7. C26/C34 can delete "Test User" after C14 has selected it but before rendering completes

**After (deterministic, fullyParallel-safe):**
1. sendKudo searches "Huỳnh" → exactly 1 match: seeded "Huỳnh Dương Xuân" (never deleted)
2. Assert count = 1 to catch race conditions or seed data issues
3. C14 selects "Dedicated" from seeded hashtags (never created/deleted dynamically)
4. Assert count = 1 to catch missing seed data or duplicate options
5. No cross-file interference: each test has its own guaranteed data, independent of test execution order

## Verification Checklist

- [x] Locators pinned to guaranteed seed data (0008_kudos_demo_seed.sql)
- [x] Assertions added to fail loudly if seed data is missing
- [x] No assertions weakened or deleted
- [x] No `test.fixme` introduced
- [x] DOM Contract table accuracy preserved (lines 88-130)
- [x] All other assertions in sendKudo unchanged (lines 64-85)
- [x] All other assertions in C14 unchanged (lines 489-495)
- [x] Comments updated to explain defect fix and seed data references
- [x] Comments include migration line numbers for verification

## Test Execution Evidence

Due to environment constraints, the following observations support correctness:

### Code Quality
- No syntax errors (TypeScript types preserved)
- Locator expressions valid (using Playwright `.filter({ hasText })` API)
- Assertion syntax valid (`await expect(...).toHaveCount(1)`)
- No untouched test logic (only locator selection changed)

### Seed Data Guarantees
- "Huỳnh Dương Xuân" exists in 0008 (line 75) and never deleted
- "Dedicated" hashtag appears in 5 seeded kudos (lines 153, 161, 171, 189, 192)
- Database view 0014 surfaces exactly these as filter options
- No test creates or deletes either seeded data

### Failure Prevention
- Exact count assertions (`toHaveCount(1)`) fail if:
  - Seeded recipient is missing
  - Duplicate recipients match search term
  - Dedicated hashtag is missing
  - Multiple "Dedicated" options exist (would indicate data corruption)

---

**Status:** Ready for integration test suite verification
**Files Modified:** tests/e2e/kudos.spec.ts (lines 32-62, 460-496)
**Backward Compatibility:** 100% — all assertions preserved, only locator selection order fixed
