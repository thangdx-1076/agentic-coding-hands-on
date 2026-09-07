# C10 & C11 Assertion Verification

## C10: From home via footer link to standards, close button returns to home

**Location:** `tests/e2e/standards.spec.ts:275–299`

### Assertion (Line 298)
```javascript
const pathname = new URL(page.url()).pathname;
expect(pathname).toBe("/");
```

### What Happens When
- ✓ **Pathname is "/":** Test PASSES
- ✗ **Pathname is "/standards":** Test FAILS with `Expected "/" Received "/standards"`
- ✗ **Pathname is "/kudos":** Test FAILS with `Expected "/" Received "/kudos"`
- ✗ **Pathname is anything else:** Test FAILS

### Cannot Pass Vacuously
- ✗ Cannot pass by doing nothing (stays at `/standards` → FAILS)
- ✗ Cannot pass by navigating to wrong place (any path ≠ "/" → FAILS)
- ✓ **ONLY passes if implementation correctly navigates to HOME ("/") **

---

## C11: Direct load to standards, close button fallback to home when no history

**Location:** `tests/e2e/standards.spec.ts:301–328`

### Assertion (Lines 326–327)
```javascript
const pathname = new URL(page.url()).pathname;
expect(pathname).toBe("/");
```

### Measurement (Line 310)
```javascript
const historyLength = await page.evaluate(() => window.history.length);
// [MEASUREMENT] window.history.length on direct goto: 2
```

### Critical Note in Test (Lines 305–307)
```
// CRITICAL: Direct goto in Playwright gives history.length = 2 (not 1), so naive
// history.length > 1 check WILL use router.back() and fail this test. This forces
// implementation to use stricter heuristic (e.g., history.length === 1, or sessionStorage marker).
```

### What Happens When
- ✓ **Pathname is "/":** Test PASSES
- ✗ **Pathname is "/standards":** Test FAILS with `Expected "/" Received "/standards"`
- ✗ **Pathname is "/kudos":** Test FAILS with `Expected "/" Received "/kudos"`
- ✗ **Pathname is anything else:** Test FAILS

### Why Naive `history.length > 1` Implementation Will FAIL
1. On direct `page.goto("/standards")`, `window.history.length === 2` (Playwright behavior)
2. Naive check: `if (history.length > 1) { router.back() }`
3. Condition is TRUE (2 > 1), so `router.back()` is called
4. `router.back()` on fresh page with no previous navigation may:
   - Go to `about:blank` (not "/")
   - Do nothing, stay at `/standards` (not "/")
   - Or other browser-dependent behavior
5. **Result:** Assertion `pathname === "/"` FAILS
6. **Forces implementation to use stricter heuristic** (e.g., `history.length === 1`, sessionStorage marker, or other signal)

### Cannot Pass Vacuously
- ✗ Cannot pass by doing nothing (stays at `/standards` → FAILS)
- ✗ Cannot pass with naive `history.length > 1` (triggers wrong navigation → FAILS)
- ✓ **ONLY passes if implementation uses correct fallback logic to reach "/"**

---

## Coordinator Request: Verified ✓

✓ **C10:** Replaced `toContain("/")` with strict `pathname === "/"` check  
✓ **C11:** Replaced `toContain("/")` with strict `pathname === "/"` check  
✓ **Both will FAIL if pathname is still `/standards`:** Cannot stay on page  
✓ **C11 forces stricter heuristic:** naive `history.length > 1` will fail  
✓ **Both assert discriminatively:** pass only on correct navigation  
