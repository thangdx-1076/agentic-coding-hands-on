# RED Evidence — Kudos Add-link Dialog E2E Tests

**Status:** VALID RED (assertion failures on missing dialog implementation)

**Test File:** `tests/e2e/kudos-link-dialog.spec.ts`

**Test Suite:** Kudos Add-link Dialog (@auth) — 11 tests

## Execution Details

- **Command:** `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts --reporter=list`
- **Environment:** macOS darwin, pnpm, Node 24, Playwright Chromium
- **Exit Code:** 1 (FAILURE)
- **Timestamp:** 2026-09-08T09:29:00Z

## Summary

- **Total Tests:** 11
- **Passed:** 0
- **Failed:** 11
- **Run Duration:** ~35 seconds (timeouts on some tests waiting for missing dialog)

## Failures (All Assertion-Based — Dialog Not Found)

Each test failed because the `[data-testid=kudos-link-dialog]` element does not exist in the DOM yet.

| # | Test Name | Assertion Failure |
|---|-----------|------------------|
| L01 | Click Link button → link dialog opens with title, empty inputs, Cancel/Save buttons; compose dialog stays open | `toBeVisible()` failed: element(s) not found for `[data-testid=kudos-link-dialog]` |
| L02 | Escape closes link dialog; compose dialog stays open, textarea unchanged | `toHaveAttribute("open", "")` failed: element(s) not found for `[data-testid=kudos-link-dialog]` |
| L03 | Hủy (Cancel) closes link dialog; compose dialog stays open, textarea unchanged | `toHaveAttribute("open", "")` failed: element(s) not found for `[data-testid=kudos-link-dialog]` |
| L04 | Lưu with both fields empty → both errors visible, dialog stays open | `toHaveAttribute("open", "")` failed: element(s) not found for `[data-testid=kudos-link-dialog]` |
| L05 | Text with only whitespace + valid URL → text error visible | Test timeout waiting for link dialog element |
| L06 | Text 101 chars → error; text 100 chars → no error | Test timeout waiting for link dialog element |
| L07 | Invalid URLs show error: too short, malformed, or non-http protocol | Test timeout waiting for link dialog element |
| L08 | Valid text + URL → dialog closes, textarea contains markdown link | Test timeout waiting for link dialog element |
| L09 | Selected text in textarea prefills link text input; save replaces selection | `toHaveValue("hello")` failed: element(s) not found for `[data-testid=kudos-link-text-input]` |
| L10 | Reopen link dialog → both inputs empty (no draft save) | Test timeout (30000ms) waiting for locator fill on missing dialog |
| L11 | window.prompt is NOT called: no dialog event fired | Test timeout (30000ms) waiting for link button click (button exists, but clicking it does nothing because handler is not implemented) |

## Failure Category

**ASSERTION FAILURES ONLY** — All failures are due to missing DOM elements (`[data-testid=kudos-link-dialog]` and its children), not infrastructure issues (dev server, browser install, config, auth). This is a valid RED.

## Type/Lint Verification

- **Typecheck:** ✅ PASS — `pnpm typecheck` clean (no errors)
- **Lint:** ✅ PASS — `pnpm lint tests/e2e/kudos-link-dialog.spec.ts` clean after fix (2 autofix appliedfor Playwright web-first assertions)

## Next Steps (Implementation)

The `momorph-ui-implementer` should now:

1. Create `src/app/(public)/kudos/_components/kudos-link-dialog.tsx` (native `<dialog>` with required testids)
2. Create `src/app/(public)/kudos/_hooks/use-kudos-link-dialog.ts` (hook to manage open/close state)
3. Create `src/app/(public)/kudos/_utils/validate-link-draft.ts` (URL and text validation)
4. Update `src/app/(public)/kudos/_components/kudos-format-toolbar.tsx` to wire the Link button to open the dialog
5. Update `src/app/(public)/kudos/_utils/insert-markdown-marker.ts` to accept optional linkText and insert `[linkText](url)` format
6. Extract `IconClose` and `IconLink` to `src/app/(public)/kudos/_components/kudos-compose-icons.tsx`

After implementation, the tester will:
1. Run the same command: `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts --reporter=list`
2. Verify all 11 tests pass (exit code 0)
3. Capture visual evidence of the implementation
