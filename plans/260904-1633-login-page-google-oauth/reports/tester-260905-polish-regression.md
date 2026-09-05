# Regression Coverage & Re-temper Report

## Defect Summary

**Component:** `components/login/language-selector.tsx`  
**Issue:** Focus-leak on mouse open after keyboard navigation  
**Root Cause:** `handleButtonClick` used bare `setOpen(!open)` instead of `openMenuAt(0)`, leaving stale `activeIndex` from prior keyboard session

**Reproduction:** ArrowUp (open → last item EN) → Escape (close, focus to trigger) → Click trigger → focus lands on EN instead of VN

**Fix:** Route all opens through `openMenuAt(0)` helper (lines 77-82), ensuring `activeIndex` resets on every open.

---

## Regression Test Added

**File:** `tests/e2e/login.spec.ts` (lines 410–430)  
**Test ID:** `[REG 2026-09-05] Focus resets to first item on mouse open after keyboard navigation`

**Location:** Inside existing `Language selector keyboard navigation (ARIA APG)` describe block

**Sequence:**
1. Focus trigger button
2. Press ArrowUp → menu opens, focus on last item (EN) ✓
3. Press Escape → menu closes, focus returns to trigger ✓
4. Mouse click trigger → menu opens
5. Assert first item (VN) is focused, not last item (EN)

**Locators Used:** (matches existing convention)
- `header button[aria-haspopup="menu"]` for trigger
- `[role="menu"]` for menu container
- `[role="menuitem"]` with `.nth(0)` and `.nth(1)` for VN/EN items
- Standard Playwright focus assertions

---

## Test Results

### E2E Suite: `npx playwright test tests/e2e/login.spec.ts --reporter=list`

**Exit Code:** `0`  
**Passed:** 23 (22 pre-existing + 1 regression)  
**Failed:** 0  
**Duration:** 7.2s

**New test result:** ✓ PASSED (606ms)

### Unit Suite: `npm run test:unit`

**Exit Code:** `0`  
**Passed:** 32  
**Failed:** 0  
**Duration:** 314ms  
**Test Files:** 2

---

## Coverage Assessment

- **Focus-leak path:** Covered by new regression test (keyboard open → escape → mouse open → focus assertion)
- **Keyboard open paths:** Covered by existing 9 keyboard navigation tests (ArrowDown, ArrowUp, Home, End, Escape, Tab, wrap-around)
- **Mouse open path:** Covered by new test + existing click test `[TC 20d87e28]`
- **All critical paths:** No new gaps

---

**Status:** DONE  
**Summary:** 23 E2E passed (exit 0), 32 unit passed (exit 0). Regression test added and GREEN. No defects or loose assertions.  
**Concerns/Blockers:** None.
