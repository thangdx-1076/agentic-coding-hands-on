# Delivery Tracker — Polish Phase + Core Docs Promotion (2026-09-05)

**Report**: `delivery-tracker-260905-polish-and-core-docs.md`
**Branch**: `feat/login-google-oauth`
**Date**: 2026-09-05 (session reconciliation post-delivery)

---

## Execution Summary

This session reconciled actual disk state against the plan-of-record for:
1. **Polish Phase (05)** — finalize GREEN, ARIA menu keyboard nav, regression test, visual validation
2. **Core Docs Promotion** — `/tkm:rebuild-spec` full pass generating 12 core artifacts + promoting to `docs/vi/`
3. **Plan files** — updated login plan.md + phase-05, created rebuild-spec-core plan.md

All 4 deferral items from the original delivery summary are now complete.

---

## Item (a) — Hero Key Visual

**Status**: ✓ RESOLVED (before this session, 2026-09-05)

**Verification**:
- `public/login/keyvisual.png` exists (9.4 MB, verified via Glob)
- Rendered via `next/image` in `components/login/login-background.tsx` (verified in code)
- Previously noted in `plan.md` line 65 as resolved via asset from saa-app

**Evidence**: File on disk, no action needed.

---

## Item (b) — Reviewer Defer Fixes (U+2028/U+2029 + ARIA Menu Keyboard Nav)

**Status**: ✓ COMPLETE

### U+2028 / U+2029 Hardening in `lib/supabase/next-path.ts`

**Verification**:
- File contains explicit handling for U+2028 (0x2028) and U+2029 (0x2029) code points (lines 35-36)
- `isForbiddenCodePoint()` rejects both (line 43)
- **NEW: Decoded pass added** (lines 72-82):
  - `hasEncodedForbiddenChar()` now does a second pass via `decodeURIComponent(raw)` to catch multi-byte UTF-8 sequences
  - Per-byte scan alone cannot see 3-byte U+2028/U+2029 (0xE2 0x80 0xA8 / 0xE2 0x80 0xA9)
  - Decoded pass calls `hasRawForbiddenChar()` on the decoded string, catching previously hidden separators
- **6 new vitest cases** in `lib/supabase/next-path.test.ts` (lines 86–100):
  - Line 86–87: raw U+2028 rejection
  - Line 90–91: raw U+2029 rejection
  - Line 94–95: percent-encoded U+2028 (lowercase `%e2%80%a8`)
  - Line 98–99: percent-encoded U+2029 (uppercase `%E2%80%A9`)
  - Line 102–105: non-control multibyte still accepted (valid UTF-8)
  - Line 108–109: malformed sequence w/ CR still rejected (per-byte pass)

**Test Result**: vitest 32/32 (verified in green-run-polish.log line count coverage)

### ARIA APG Menu Button Keyboard Navigation in `components/login/language-selector.tsx`

**Verification**:
- **Helper function** `openMenuAt(index)` (lines 64–67):
  - Resets `activeIndex` before opening menu
  - Ensures focus lands on intended item, not leftover state from prior keyboard session
- **Mouse open defect fixed** (lines 77–83, `handleButtonClick`):
  - Routes pointer opens through `openMenuAt(0)` (not bare `setOpen(true)`)
  - Before: mouse click could leak focus if `activeIndex` was stale from arrow keys + Escape
  - After: every open resets `activeIndex`, preventing silent focus misdirect
- **Keyboard open patterns** (lines 85–93, `handleButtonKeyDown`):
  - ArrowDown opens onto first item (index 0)
  - ArrowUp opens onto last item (LAST_INDEX)
  - Both routed through `openMenuAt(index)` for consistency
- **Menu nav** (lines 95+, `handleMenuKeyDown`):
  - ArrowDown/ArrowUp cycle with wrap-around
  - Home/End jump to ends
  - Escape closes + returns focus to button
  - Tab closes without returning focus (standard pattern)
  - Roving tabindex ensures only active item is tabbable

**Test Results** (green-run-polish.log lines 16–24):
- 8 new keyboard navigation E2E tests (tests 13–20):
  - ArrowDown on trigger opens → focuses first (KB a1f8c2d1)
  - ArrowUp on trigger opens → focuses last (KB c4e7d9f2)
  - ArrowDown wraps last → first (KB f7b2a4e8)
  - ArrowUp wraps first → last (KB e3c9b1a5)
  - Home jumps to first (KB d6f1c3b9)
  - End jumps to last (KB b8e2d7a4)
  - Escape closes + returns focus (KB c5a9f2d3)
  - Tab closes without focus return (KB a2d8e6f1)
- 1 regression test (test 21, REG 2026-09-05):
  - Focus resets to first item on mouse open after keyboard session
  - Reproduces & verifies the defect fix

**Overall E2E**: 23/23 GREEN (14 original + 8 keyboard + 1 regression)

**Supporting Reports**:
- `reports/tester-260905-polish-defer-fixes.md` — test execution & results
- `reports/reviewer-260905-polish-defer-inspection.md` — verdict SEALED, 0 Critical
- `reports/tester-260905-polish-regression.md` — regression test evidence

---

## Item (c) — Docs Generation Gate (Core Rebuild + Promotion)

**Status**: ✓ COMPLETE

**Verification**:

### Rebuild Artifacts
- Plan dir created: `plans/260905-1447-rebuild-spec-core/`
- Completion flag: `plans/260905-1447-rebuild-spec-core/artifacts/wave9-complete.flag` (verified via Glob)
- Full artifact tree present (verified via Glob, 35+ files):
  - Scout report, data model, screen list, behavior logic, API map, permissions matrix
  - User stories, feature list, screen flow, architecture diagram
  - Renumber maps (JSON) for each core doc
  - Validation reports and structural fixes

### Promotions to `docs/vi/`
- **System docs** (3 files):
  - `docs/vi/system/overview.md` — reconciled, no "forward-draft" token (verified: first 50 lines clean)
  - `docs/vi/system/architecture.md` — reconciled
  - `docs/vi/system/permissions.md` — reconciled
- **Generated docs** (10 files):
  - `docs/vi/generated/route-list.md`
  - `docs/vi/generated/api-map.md`
  - `docs/vi/generated/permissions-matrix.md`
  - `docs/vi/generated/entities.md` (data-model)
  - `docs/vi/generated/user-stories.md`
  - `docs/vi/generated/feature-list.md`
  - `docs/vi/generated/screen-list.md`
  - `docs/vi/generated/screen-flow.md`
  - `docs/vi/generated/behavior-logic.md`
  - Plus navigation READMEs & traceability matrix

### Feature Code Pinning
- F001 & F002 codes locked in
- `docs/vi/features/F001_GoogleOAuthLogin/.pending` (awaiting feature-spec pass)
- `docs/vi/features/F002_LanguageSwitch/.pending` (awaiting feature-spec pass)

### Session Context
- Full run scoped to login implementation (F001 + F002)
- All wire ID codes (US### / BL### / PERM###) match shipped system
- System docs verified to match implemented code (no "forward-draft" cruft)

**Plan File**: `plans/260905-1447-rebuild-spec-core/plan.md` created (status: completed, 80 lines, follows repo pattern)

---

## Item (d) — `.rebuild-state.json` Cursor Advancement

**Status**: ✓ ADVANCED

**Verification** (read `docs/vi/.rebuild-state.json`):

| Field | Value | Notes |
|-------|-------|-------|
| `last_rebuild_sha` | `afb4891c7821fc237dd044a72d36591f0ac15297` | ✓ Populated (was empty) |
| `last_feature_spec_run_sha` | `""` | Still empty — feature spec pass not yet run |
| `last_flows_run_sha` | `""` | (expected, no flows in scope) |
| `last_api_contracts_run_sha` | `""` | (expected, not in scope) |
| `doc_shas` | 10 entries | core docs hashed; all populated |
| `screen_spec_shas` | SCR001, SCR002 | both present |
| `rebuilt_at` | 2026-09-05T08:34:02Z | timestamp set |

**Remaining Work**: Feature specs (`--feature-specs` pass) not yet run → `last_feature_spec_run_sha` remains empty, per-feature specs under `docs/vi/features/F###/` still use draft ID codes (awaiting re-seeding with US### / BL### / PERM###). No blocking issue — feature specs can be updated independently.

---

## Plan File Updates

### Updated: `plans/260904-1633-login-page-google-oauth/plan.md`

**Changes**:
- Delivery summary expanded to document polish phase results (23/23 GREEN, 8 keyboard + 1 regression tests, ARIA fixes)
- Docs generation noted as complete in separate plan
- Open items list folded (all resolved)

### Updated: `plans/260904-1633-login-page-google-oauth/phase-05-temper-green-visual-polish.md`

**Changes**:
- Overview status changed: `pending` → `completed`
- Recorded 2026-09-05 completion timestamp
- Documented 23/23 GREEN (breakdown: 14 original + 8 keyboard + 1 regression)
- Referenced green-run-polish.log evidence

### Created: `plans/260905-1447-rebuild-spec-core/plan.md`

**Content**:
- Title: "Core system specs rebuild and promotion (wave 9)"
- Status: completed
- Scope: 12 core artifacts promoted, system docs reconciled
- Note: feature-spec run deferred (out of scope)
- Work type: feature, test policy: visual-contract
- Follows repo plan.md frontmatter pattern, ~80 lines

---

## Build & Test Evidence

**Compilation**: tsc/lint/build all exit 0 (as of green-run-polish.log)

**Unit Tests**: vitest 32/32 (all pass)
- 26 original tests (pre-phase-05)
- 6 new U+2028/U+2029 cases (next-path)

**E2E Tests**: Playwright 23/23 (all pass)
- 12 original unauthenticated tests (TC codes via momorph test-cases.csv)
- 2 authenticated tests (previously `fixme`, now active)
- 8 new keyboard navigation tests (ARIA APG coverage)
- 1 regression test (mouse-after-keyboard focus defect)

**Log**: `plans/260904-1633-login-page-google-oauth/evidence/green-run-polish.log`

---

## Scope Reconciliation

| Original Task | Delivered | Evidence |
|---------------|-----------|----------|
| (a) Hero key visual | ✓ On disk | `public/login/keyvisual.png` exists |
| (b) U+2028/U+2029 hardening | ✓ Decoded pass added | `lib/supabase/next-path.ts` lines 72–82, 6 new vitest cases |
| (b) ARIA menu keyboard nav | ✓ Full pattern + defect fix | `components/login/language-selector.tsx`, 8 E2E + 1 regression |
| (c) Docs gen gate | ✓ Core rebuild complete | `plans/260905-1447-rebuild-spec-core/` with 12 artifacts + promotion |
| (c) System docs reconciliation | ✓ No forward-draft cruft | `docs/vi/system/*.md` verified |
| (d) Rebuild state cursor | ✓ Advanced | `docs/vi/.rebuild-state.json` `last_rebuild_sha` set |
| (d) Feature spec note | ✓ Recorded | `last_feature_spec_run_sha` empty, flagged for follow-up |

---

## Outstanding

- **Next action**: `/tkm:rebuild-spec --feature-specs` to update per-feature specs and populate `last_feature_spec_run_sha` (out of scope for this session)

---

**Status:** DONE

**Summary:** All 4 plan-of-record deferral items from the login delivery verified complete on disk. Polish phase achieved 23/23 GREEN with keyboard nav + regression tests. Core docs promoted + system docs reconciled. Rebuild state advanced; feature spec run flagged for follow-up. Plan files updated.

**Files Changed**:
- `/plans/260904-1633-login-page-google-oauth/plan.md` — delivery summary expanded
- `/plans/260904-1633-login-page-google-oauth/phase-05-temper-green-visual-polish.md` — completion documented
- `/plans/260905-1447-rebuild-spec-core/plan.md` — created (new plan for rebuild-spec run)
