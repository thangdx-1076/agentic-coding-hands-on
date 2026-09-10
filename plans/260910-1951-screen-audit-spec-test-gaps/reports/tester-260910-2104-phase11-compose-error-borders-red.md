# Phase 11 RED: Compose Error Borders Test

**Status: DONE**

## Test Written
Extended `tests/e2e/kudos-compose.spec.ts` case `[C20]` with RED assertions for error border colors on 4 required compose fields.

## Command & Exit Code
```bash
pnpm test:e2e tests/e2e/kudos-compose.spec.ts
```
**Exit Code: 1** (real non-zero, process failed)

## Test Case Location
File: `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/tests/e2e/kudos-compose.spec.ts`
Lines: 730–827 (extended [C20] test case)

## Failure Details

### Primary Failure (First Assertion)
**Line 789–792** — recipient field border-color check

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  locator('[data-testid=kudos-compose-dialog]')
          .locator('[data-testid=kudos-recipient-field]')
          .locator('div')
          .first()

Expected: "rgb(255, 138, 128)"  ← #FF8A80 (error red)
Received: "rgb(153, 140, 95)"   ← #998C5F (normal tan)
```

**Element Found:**
```html
<div class="flex w-full items-center justify-between rounded-lg border border-[#998C5F] bg-white px-6 py-4">
```

The element's border is currently hardcoded to `border-[#998C5F]` with no conditional error state.

## Test Assertions Added
**7 new `await expect()` calls** in the extended [C20] case:

1. **Line 789–792**: Recipient field border-color (FAILED HERE)
2. **Line 793–794**: Title input border-color
3. **Line 795–797**: Content textarea border-color  
4. **Line 810–812**: Anonymous name input border-color (after checkbox checked)
5. **Line 816**: Anonymous name input visibility check
6. **Line 819–820**: Title input border-color recovery path (after typing text)

## Fields Tested (4 Required)
| Field | Element | Selector | Expected Error Color |
|-------|---------|----------|----------------------|
| Người nhận (recipient) | Inner wrapper div | `[data-testid=kudos-recipient-field]` > div | rgb(255, 138, 128) |
| Danh hiệu (title) | Input element | `[data-testid=kudos-title-input]` | rgb(255, 138, 128) |
| Nội dung (content) | Textarea element | `[data-testid=kudos-content-textarea]` | rgb(255, 138, 128) |
| Tên ẩn danh (anon name) | Input element | `[data-testid=kudos-anonymous-name-input]` | rgb(255, 138, 128) |

## Full Test Run Results

```
Running 27 tests using 4 workers

  ✓ 26 passed
  ✘ 1 failed  ← [C20] with new border assertions
  
Total: 27 tests
Time: 22.3s
```

### Breakdown
- **CI-safe tests (C01–C02)**: 2 passed ✓
- **@auth tests (C03–C19)**: 17 passed ✓, **1 failed ✘ (C20)**
- **@auth @local-db tests (C21–C27)**: 7 passed ✓

## Why This is Valid RED

✓ **Real assertion failure** — border-color mismatch, not a setup issue  
✓ **Correct reason** — fields lack error border styling  
✓ **Non-zero exit** — process exited with code 1  
✓ **No selector issues** — locator found the element on 14 attempts  
✓ **No timeout** — assertion ran to completion  
✓ **No pre-existing failure** — all 26 other tests pass  

The RED proves that without the error border styling, the assertion correctly fails. A later `GREEN` run will verify the implementation fixed it.

## Test Integrity
- No vacuous assertions (every expect has a real condition that can fail)
- No existing assertions weakened or deleted
- Only `tests/e2e/kudos-compose.spec.ts` was modified (no component files touched)
- Recovery path included (typing text → border reverts to normal)
- Anonymous field tested when mounted (after checkbox checked)

## Implementation Contract
After the UI agent implements error borders per phase 11 spec:

1. Recipient field `.flex.items-center.border` div class becomes:  
   `border-[${error ? "#FF8A80" : "#998C5F"}]` or similar conditional

2. Title input, content textarea, anonymous name input:  
   Same conditional pattern on their own `className`

3. Rerun: `pnpm test:e2e tests/e2e/kudos-compose.spec.ts` → should pass GREEN

---

**Summary:**  
Written 7 new border-color assertions across 4 required fields in extended [C20] test. Test fails correctly at first assertion (recipient field: expected error-red `#FF8A80`, received normal `#998C5F`). No setup/selector/timeout issues. Ready for UI implementation.
