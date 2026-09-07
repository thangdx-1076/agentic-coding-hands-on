---
title: "Audit Report — URL Assertion Defects Fixed"
date: 2026-09-07
author: tester
phase: "01 (revision)"
status: "RED (corrected)"
---

# Audit: URL Assertion Defects & Vacuous Passes

## Defect Fixed: Loose URL Assertions

### Lines 290 & 312 (C10, C11)

**Original (DEFECTIVE):**
```javascript
expect(page.url()).toContain("/");  // ALWAYS true; /standards contains /
```

**Corrected:**
```javascript
const pathname = new URL(page.url()).pathname;
expect(pathname).toBe("/");  // STRICT: fails if pathname is /standards, /kudos, etc.
```

**Rationale:** Every URL contains "/", so `toContain("/")` passes on ANY URL including `/standards`. Now both assertions strictly verify pathname === "/" and will immediately FAIL if close button does nothing or navigates to wrong page.

### C10 Contract (line 290)
- Navigate home → click standards link → click close → pathname must be "/"
- Assertion now fails if implementation leaves user at `/standards` or anywhere else

### C11 Contract (line 312)
- Direct load to `/standards` → click close → pathname must be "/"
- **Critical note added to code:** `history.length === 2` on direct goto (measured). Naive `history.length > 1` check WILL use `router.back()` and likely fail this test. Forces implementation to use stricter heuristic (e.g., `history.length === 1`, sessionStorage marker, or other signal).
- Assertion will FAIL if implementation naively uses `history.length > 1` (which it shouldn't, based on measurement).

---

## Complete Audit: All Assertions vs Vacuous Passing

| Test | Assertion | Type | Vacuous? | Note |
|---|---|---|---|---|
| C1 | `h1.toContainText("Thể lệ")` | Screen | **NO** | Fails because page returns 404 with h1="404". Correct tight assertion. |
| C2 | `header.toHaveCount(0)` · `footer.toHaveCount(0)` | Structure | **OK** | Passes on 404 (correct—page has no chrome). Remains tight on real page (enforce no-chrome decision). |
| C3 | `section.toHaveCount(3)` + h2 texts | Screen | **NO** | Fails because sections missing (404). Correct. |
| C4 | `img.toHaveCount(4)` + alt texts | Screen | **NO** | Fails because images missing (404). Correct. |
| C5 | `img.toHaveCount(6)` + captions | Screen | **NO** | Fails because images missing (404). Correct spelling "ROOT FURTHER" verified. |
| C6 | `heart.toBeVisible()` in 2 sections | Screen | **NO** | Fails because sections missing (404). Correct. |
| C7 | `button.toHaveCount(1)` · `link.toHaveCount(1)` | Screen | **NO** | Fails because elements missing (404). Correct. |
| C8 | Scroll tests on 1280×720 | Behavior | **NO** | Timeout (main missing) = legitimate failure. Correct. |
| C9 | Scroll fit test on 1440×2400 | Behavior | **NO** | Timeout (main missing) = legitimate failure. Correct. |
| C10 | `pathname === "/"` **(FIXED)** | Navigation | **NO** | NOW STRICT. Fails if close doesn't navigate away from /standards. |
| C11 | `pathname === "/"` **(FIXED + NOTE)** | Navigation | **NO** | NOW STRICT + history.length=2 comment forcing stricter heuristic. Will fail naive `history.length > 1` impl. |
| C12 | `toContain("/kudos")` | Navigation | **TIGHT** | Specific enough: `/kudos` unlikely to appear in unrelated URLs. Acceptable. |
| C13 | `h1.toContainText("Rules")` | Localization | **NO** | Fails because h1="404". Correct. |
| C14 | `pageerror` count = 0 | Error | **OK** | Passes on 404 (correct—no errors). Remains meaningful on real page. |

### Summary: Vacuous Assertions Found
- **C2:** Passes on 404 but is NOT vacuous; actively verifies no chrome (supports design decision)
- **C14:** Passes on 404 but is NOT vacuous; actively verifies clean load (supports reliability)
- **C10/C11:** WERE vacuous (`toContain("/")`), NOW FIXED to strict pathname checks

---

## Code Quality Fixes

### Lint Warning (line 155)
**Before:**
```javascript
const wrongSpelling = await page.locator('text="ROOT FUTHER"').count();
expect(wrongSpelling).toBe(0);
```

**After:**
```javascript
const wrongSpelling = page.locator('text="ROOT FUTHER"');
await expect(wrongSpelling).toHaveCount(0);
```

✓ Uses Playwright assertion API consistently; no lint warning.

### Prettier Formatting
✓ Applied `pnpm prettier --write` — all style issues resolved.

### Lint Compliance
✓ `pnpm lint --max-warnings 0 tests/e2e/standards.spec.ts` — passes with 0 warnings.

---

## C11 History Heuristic Discovery

Measured on direct `page.goto("/standards")`:
```
[MEASUREMENT] window.history.length on direct goto: 2
```

**Implication:**
- Naive `history.length > 1` check → true → uses `router.back()`
- Stricter `history.length === 1` check → false → uses fallback `ROUTES.HOME`
- **C11 now forces implementation to NOT use naive heuristic** by asserting `pathname === "/"` strictly

**For phase 04/06:** Implementation must account for this. Options:
1. Use `history.length === 1` (impossible in Playwright with measure=2)
2. Use different signal (sessionStorage marker, ref tracking, etc.)
3. Accept that fallback doesn't trigger in Playwright (document assumption)

**C11 assertion remains as-is:** Strict enough to catch wrong heuristic; phase 04/06 decides final strategy.

---

## RED Validation

**Status:** VALID RED (12 failures, 2 passes, exit 1)

### Failures are Screen Assertions (Not Infrastructure)
- C1, C3–C7, C11–C13: h1 "404", sections/buttons/links not found → correct failures
- C8–C10: Timeout = element not found = screen assertion failure (not webServer/browser issue)

### Key Improvements from Coordinator Request
✓ Lines 290/312: `toContain("/")` → `pathname === "/"` (strict URL checks)  
✓ C10/C11: Will NOW FAIL if close button does nothing or navigates wrong  
✓ C11: Will FAIL if naive `history.length > 1` heuristic used (forces better logic)  
✓ All other assertions audited; C2/C14 are OK (not vacuously passing)  
✓ Lint: 0 warnings  
✓ Format: Prettier applied  

---

## Test Suite Status

```
Total: 14 tests
Passed: 2 (C2, C14) — structural/error checks, meaningful on 404
Failed: 12 — screen assertions (EXPECTED for 404 route)
Exit code: 1 (correct)
```

Ready for phase 02/03 unlock. Phase 04 receives updated spec with strict URL assertions.
