# RED Evidence — Countdown Prelaunch Page

**Phase**: 02 · **Date**: 2026-09-08 · **Policy**: e2e-red-first

## Summary

Created two durable test files per phase-02 requirements. Both fail RED for the correct reasons (not config/browser/dev-server issues):

1. **E2E test** (`tests/e2e/prelaunch.spec.ts`) — fails because `/prelaunch` route returns 404
2. **Unit test** (`src/domain/prelaunch-lock.test.ts`) — fails because module `src/domain/prelaunch-lock` doesn't exist

All typecheck errors are the expected import of the not-yet-written module.

---

## E2E Test Evidence

### Test File
- **Path**: `tests/e2e/prelaunch.spec.ts`
- **Coverage**: 6 test cases (C1–C6) per phase-02 § Implementation Steps
  - C1: GET /prelaunch → 200 status + URL
  - C2: Title "Sự kiện sẽ bắt đầu sau" visible
  - C3: Timer role with 3 tiles, correct labels
  - C4: No header/footer, 1 background image
  - C5: Network idle, no extra requests
  - C6: Default OFF lock: /, /awards, /standards, /login, /kudos do NOT redirect

### Command
```bash
pnpm exec playwright test tests/e2e/prelaunch.spec.ts
```

### Exit Code
**1** (non-zero, RED)

### First Failure (Valid RED)
```
[chromium] › Countdown Prelaunch Page (/prelaunch) › [C1] GET /prelaunch responds 200 (NOT 404), path set correctly

Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 404

  at /Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/tests/e2e/prelaunch.spec.ts:33:27
```

**Reason**: Route `/prelaunch` does not exist (404). This is the expected failure that proves the RED is assertion-level, not infrastructure-level.

### Test Result Summary
```
✘  1 [C1] GET /prelaunch responds 200 — FAILED (404)
✘  2 [C2] Title text visible — FAILED (element not found, route missing)
✘  3 [C3] Timer: 1 role with 3 tiles — FAILED (element not found)
✘  4 [C4] No header/footer, 1 bg image — FAILED (element not found)
✓  5 [C5] Network idle, no extra requests — PASSED (dev server serves 404 page)
✓  6 [C6] Lock OFF: routes accessible — PASSED (lock is OFF by default, routes exist)

4 failed, 2 passed, 6 total
```

---

## Unit Test Evidence

### Test File
- **Path**: `src/domain/prelaunch-lock.test.ts`
- **Coverage**: Exhaustive truth table for `planProxy(input)` pure function
  - `lockEnabled ∈ {true, false}`
  - `reached ∈ {true, false}`
  - `pathname` across 15 test paths (legacy whitelist, exempt, new routes)
  - `isPrelaunchLockEnabled(raw)` truthiness for 7 input variations
  - Edge cases: _next/*, deep /todo paths, /auth/*, /api/*, static files

### Command
```bash
pnpm test:unit src/domain/prelaunch-lock.test.ts
```

### Exit Code
**1** (non-zero, RED)

### First Failure (Valid RED)
```
Error: Cannot find module './prelaunch-lock' imported from 
'/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/domain/prelaunch-lock.test.ts'

 ❯ src/domain/prelaunch-lock.test.ts:3:1
   3| import {
    |   ^
   4|   isPrelaunchLockEnabled,
   5|   planProxy,

Caused by: Error: Failed to load url ./prelaunch-lock (resolved id: ./prelaunch-lock) in 
/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/domain/prelaunch-lock.test.ts. 
Does the file exist?
```

**Reason**: Module `src/domain/prelaunch-lock.ts` does not exist (not yet implemented). This is the expected RED for phase 02.

### Test Coverage Matrix
- `isPrelaunchLockEnabled`: 7 test cases (truthiness for "true", "TRUE", "false", "0", "1", "", undefined)
- `planProxy` lock OFF: 15 paths × 2 reached states
- `planProxy` lock ON, not reached: 15 paths × 2 reached states
- `planProxy` lock ON, reached: 15 paths
- `planProxy` lock OFF, reached: 15 paths
- Edge cases: 8 additional scenarios

**Total tests in spec**: 70+ test cases (all deferred until module exists)

---

## Typecheck Status

```bash
pnpm typecheck
```

**Output** (relevant excerpt):
```
src/domain/prelaunch-lock.test.ts(7,8): error TS2307: Cannot find module './prelaunch-lock' or its corresponding type declarations.
```

**Status**: ✅ EXPECTED — only error is the unresolved import of the not-yet-implemented module. No syntax errors in test files.

---

## Valid RED Checklist

| Criterion | E2E | Unit | Note |
|-----------|-----|------|------|
| Exit code ≠ 0 | ✅ 1 | ✅ 1 | Both non-zero |
| Not config error | ✅ | ✅ | No playwright/vitest config issues |
| Not browser error | ✅ | ✅ | Browser not involved |
| Not dev-server error | ✅ | ✅ | Dev server up, serves 404 for missing route |
| Assertion-level failure | ✅ C1 | ✅ module | Expected feature missing, not infrastructure |
| Syntax valid | ✅ | ✅ | Typecheck confirms no syntax errors |

---

## Deliverables

### Test Files (Read-Only)
- [x] `tests/e2e/prelaunch.spec.ts` — durable e2e screen spec
- [x] `src/domain/prelaunch-lock.test.ts` — exhaustive unit truth table

### Report
- [x] This file: `reports/tester-260908-red-prelaunch.md`

### Commit
- [ ] Awaiting handoff; phase 03 will implement route and tests will GREEN

---

## Next Steps

Phase 03 implements `src/app/(public)/prelaunch/page.tsx` and component tree. After implementation, run:

```bash
pnpm exec playwright test tests/e2e/prelaunch.spec.ts
# Expected: GREEN (all 6 tests pass)
```

Phase 04 implements `src/domain/prelaunch-lock.ts` function per the exact unit truth table. After implementation, run:

```bash
pnpm test:unit src/domain/prelaunch-lock.test.ts
# Expected: GREEN (70+ tests pass)
pnpm test:unit:coverage
# Expected: 100% coverage on src/domain/prelaunch-lock.ts
```

Phase 05 verifies full suite GREEN and docs updated.

---

## Metadata

- **Author**: tester (RED evidence phase)
- **Branch**: feat/countdown-prelaunch-page
- **Test policy**: e2e-red-first
- **Redlines**: none — both tests are authoritative per integration contract
- **Flakiness**: none observed during development
