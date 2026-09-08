# RED Evidence — Viết Kudo Compose Dialog E2E Contract

## Execution Details

**Date**: 2026-09-08
**Port Used**: 3100
**Supabase Health Check**: 200 (confirmed working)

## Test File and Command

**redTestFiles**: `tests/e2e/kudos-compose.spec.ts`

**redCommand**: `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts`

**redExitCode**: 1 (non-zero — tests failed as expected)

## First Assertion Failure (RED Evidence)

**Test**: C01 — Unauthenticated: click pill → redirect to /login, dialog does not open

**Error Message**:
```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login/
Received string: "http://localhost:3100/kudos"
Timeout: 5000ms
```

**Root Cause**: Clicking the pill's input element does not redirect to /login because the click handler has not been implemented yet. The pill remains a read-only input without a handler. This is the correct RED state.

## CI-Safe Tests Verification

**Command**: `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts --grep "CI-safe" --reporter=list`

**Result**: Exactly **2 tests** run and fail:
1. **[C01]** Unauthenticated: click pill → redirect to /login, dialog does not open
   - RED cause: pill click has no handler (no redirect to /login)
2. **[C02]** Unauthenticated: dialog has no `open` attribute; `/kudos` still 200
   - RED cause: dialog element not attached to DOM (not yet implemented)

Both tests fail on real assertion failures validating the correct behavior before implementation.

## Code Quality Verification

**Lint Check**: ✅ PASS
```
pnpm lint tests/e2e/kudos-compose.spec.ts --max-warnings 0
```
Result: No errors, no warnings

**Format Check**: ✅ PASS
```
pnpm format:check tests/e2e/kudos-compose.spec.ts
```
Result: All matched files use Prettier code style

## Test Contract Specification

The test file contains the authoritative C01–C27 contract table in the header comment, defining:
- **27 total test cases**:  2 CI-safe + 20 @auth + 5 @auth @local-db
- **Single DOM contract**: test-id list defines the exact elements the UI implementer must create
- **Binding**: Each test references spec items (A, B, C, etc.) and test case IDs from the MoMorph frame

## Readiness for Implementation

- ✅ RED is genuine — assertion failures caused by missing dialog element, not infrastructure
- ✅ Test file is deployable — lint and format pass
- ✅ CI-safe tests correctly segregated — 2 tests, no `@auth` tags
- ✅ Contract is binding — exact test-id values and expected strings copied from spec
- ✅ Ready for Track A (UI) implementation against this contract
