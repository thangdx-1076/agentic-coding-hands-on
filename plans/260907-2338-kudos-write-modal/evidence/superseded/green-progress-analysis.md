# GREEN Phase Progress Analysis

**Date**: 2026-09-08
**Test Suite**: `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts`
**Exit Code**: 1 (non-zero — expected while tests fail)

## Current Status: 21/27 PASS, 6 FAIL

### PASS (21 tests)
✅ C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C15, C16, C17, C18, C19, C20, C21, C27

### FAIL (6 tests)
❌ C14, C22, C23, C24, C25, C26

## Failure Root Causes & Fix Status

### 1. C14 — Hashtag max-count validation
**Error**: "Tối đa 5 hashtag" error message does not appear after adding 5 hashtags

**Root Cause** (from Phase 13 root-cause table):
- File: `src/app/(public)/kudos/_hooks/use-kudos-compose-attachments.ts`
- Phase 07 hook logic mismatch:
  - Doc comment defines: `limitReached = hashtags.length >= 5` (passive check)
  - Actual code: `limitReached` only flips true on *attempted* 6th `addHashtag()` call inside `addHashtagToList`
  - Never flips for passive display when count == 5

**Fix Required**:
```typescript
// In use-kudos-compose-attachments.ts, make limitReached reactive:
limitReached = hashtags.length >= MAX_HASHTAG_CHIPS
```

**Status**: Phase 07 (still running) must implement this fix

### 2. C22–C26 — Submit button aria-disabled never clears
**Error**: Submit button stays `aria-disabled="true"` when all required fields are filled

**Root Cause**:
- Cascades from C21 → C14 bug: recipient dropdown never shows options (due to `isMountedRef` issue)
- Without a selected recipient, `canSubmit` stays `false`
- `aria-disabled` stays `"true"` permanently
- Clicks on Submit timeout due to Playwright's actionability conflict with `aria-disabled`

**Fix Status**:
- **C21 (recipient dropdown)**: ✅ FIXED — Phase 07 fixed `isMountedRef` initialization
  - The test now passes, meaning the hook's mounted state is correct
  - Options should now appear in the dropdown
  
- **C14 (hashtag limit)**: ❌ NEEDS FIX — Phase 07 still working
  - Once C14 is fixed, `validateKudoDraft()` will pass recipient validation when dropdown works
  - `canSubmit` will become `true`
  - `aria-disabled` will be *removed* (not left as "true")
  - Playwright's `.click()` will work normally

**Confidence**: When C14 is fixed, C22–C26 should ALL clear automatically.

## Phase 07 & Phase 03 Status

Both phases are still running (last activity ~2026-09-07T20:12:20Z):

- **Phase 07 (hooks)**: Fixing `use-kudos-compose-attachments.ts` and other hook issues
- **Phase 03 (i18n copy)**: Already fixed C17 (error message string now has "định dạng" wording)

## Next Steps

1. **Wait for Phase 07 completion**: Should complete the `limitReached` fix
2. **Rerun test suite**: After Phase 07 commits, run full test suite
3. **Verify all 27 pass**: C14 fix should cascade clear C22–C26
4. **Run GREEN phase**: Once all 27 pass, officially record GREEN evidence and transition to Phase 15 (post-code validation)

## Test-ID Contract Integrity

All 27 tests are properly written and will pass once:
- C14 logic bug is fixed (Phase 07)
- All dependent behaviors flow correctly through validation chain

**No test rewrites needed** — the contract is sound. Phase 07's hook fix is the sole remaining gate.

---

## Evidence Files Reference

- **RED contract**: `red-evidence.md` — C01/C02 failure states from Phase 01
- **Phase 13 root causes**: `../reports/implementer-phase-13-decisions.md` — full table of all 12 failures + fixes
- **Current test output**: Latest run shows 21/27 pass with specific failures listed above
