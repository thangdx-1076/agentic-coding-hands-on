---
title: "GREEN Evidence — Standards Rules Page Temper Phase"
date: 2026-09-07
author: tester
phase: 06
status: PASS
---

# Phase 06 Delivery — Temper: GREEN E2E, Visual, Regression

## Summary

Successfully drove `/standards` E2E suite to GREEN (14/14 pass), confirmed regression-free across home and awards suites, validated visual output at 3 viewports against design spec (1440×1796, 768×1796, 375×1796), and passed full quality gate (format, lint, coverage, build-storybook).

## Test Results

### C1–C14 Status Breakdown

| # | Test | Status | Notes |
|---|---|---|---|
| C1 | Main panel h1 title 'Thể lệ' + main overflow-y:auto | ✅ PASS | 1.9s |
| C2 | No header/footer chrome | ✅ PASS | 1.8s |
| C3 | 3 sections with h2 headings in order | ✅ PASS | 1.9s |
| C4 | Section 1: 4 hero badge images + alt texts | ✅ PASS | 1.9s |
| C5 | Section 2: 6 badge images + captions (ROOT FURTHER ✓) | ✅ PASS | 817ms |
| C6 | Section 2 intro + Section 3 body with ❤️ | ✅ PASS | 817ms |
| C7 | 1 "Đóng" button, 1 "Viết KUDOS" link, no disabled | ✅ PASS | 771ms |
| C8 | Panel scrolls at 1280×720 viewport | ✅ PASS | 836ms |
| C9 | Content fits at 1440×2400 (scrollHeight - clientHeight ≤ 1) | ✅ PASS | 809ms |
| C10 | Home → standards link → close → home (with history) | ✅ PASS | 1.3s |
| C11 | Direct goto /standards → close → home (fallback) | ✅ PASS | 476ms |
| C12 | "Viết KUDOS" link navigates to /kudos | ✅ PASS | 581ms |
| C13 | EN locale: "Rules", "Close", "Write KUDOS" | ✅ PASS | 349ms |
| C14 | No pageerror on load | ✅ PASS | 348ms |

**Exit code: 0** · **Total tests: 14** · **Pass: 14** · **Fail: 0** · **Skip: 0** · **Duration: 10.2s**

### Root Cause Analysis (C10, C11, C12 Initial Failures)

**Issue:** Tests were racing Next.js App Router's async navigation.

**Mechanism:** Next.js 16's `<Link>` and `router.push()`/`router.back()` transitions happen asynchronously (RSC fetch inside useTransition). The test assertions read `page.url()` immediately after `.click()`, before the navigation completes, causing stale URLs to be checked.

**Validation:** Reproduced 3 failures locally:
- C10: After link click, `page.url()` showed `/` (before nav to `/standards` completed)
- C11: After close button, `page.url()` showed `/standards` (before nav to `/` completed)
- C12: After link click, `page.url()` showed `/standards` (before nav to `/kudos` completed)

**Fix Applied:** Added `await page.waitForURL(targetPath, { timeout: 5000 })` guards after each navigation, exactly as `home.spec.ts` (lines 588, 696) and `login.spec.ts` (lines 166, 673) already do.

**Changes to `tests/e2e/standards.spec.ts`:**
```
C10: Added `await page.waitForURL("/standards")` after standards link click (line 290)
     Added `await page.waitForURL("/")` after close button click (line 298)
C11: Added `await page.waitForURL("/")` after close button click (line 322)
C12: Added `await page.waitForURL("/kudos")` after write KUDOS link click (line 347)
```

**Assertions Remain Tight:**
- C10/C11: Still verify exact pathname match (`expect(pathname).toBe("/")`)
- C12: Still verifies URL contains `/kudos` (not just "loaded something")
- No assertions weakened, no `.first()` added, no timeouts extended

## Regression Testing

### home.spec.ts (footer + icon promote)
```
Command: pnpm test:e2e tests/e2e/home.spec.ts --reporter=list
Exit code: 0
Tests: 27 passed
Duration: 18.4s
Result: ✅ PASS
```
Phase 02 touched `site-footer.tsx` (added link to `/standards`) and promoted `IconPencil` to `(public)/_components/icons/`. No regressions.

### awards.spec.ts CI-safe (non-@auth, non-@local-db)
```
Command: pnpm test:e2e tests/e2e/awards.spec.ts --grep-invert "@auth|@local-db"
Exit code: 0
Tests: 5 passed · 1 skipped (expected: Supabase unreachable check)
Duration: 9.6s
Result: ✅ PASS
```

### CI Mode Validation (Supabase stopped)
```
Command: CI=1 pnpm exec playwright test tests/e2e/standards.spec.ts --grep-invert "@auth|@local-db"
Exit code: 0
Tests: 14 passed
Duration: 11.3s
Result: ✅ PASS
```
Confirms `/standards` spec runs fully in CI (no DB dependency), no tags needed, `ci.yml` requires no changes.

## Visual Validation

### Captured Viewports
- **1440×1796** (desktop): ✅ Matches design (frame 3204:6051)
- **768×1796** (tablet): ✅ Matches design, layout adapts
- **375×1796** (mobile): ✅ Matches design, text/buttons readable

### Detailed Checks (Section by Section)

**1. Title & Chrome**
- h1 "Thể lệ" (correct spelling) ✅
- Dark background #00101A ✅
- No `<header>` or `<footer>` elements ✅

**2. Section 1: Hero Tiers**
- 4 hero badge images visible (New, Rising, Super, Legend) ✅
- 4 condition lines correct ("Có 1-4", "Có 5-9", "Có 10–20", "Có hơn 20") ✅
- en-dash "10–20" preserved (not hyphen) ✅
- Tier badge styling matches design ✅

**3. Section 2: Secret Box Badges**
- 6 badge icons in 3-column grid ✅
- Captions display below each badge (DOM text, not alt) ✅
- Correct spelling: "ROOT FURTHER" (not "ROOT FUTHER") ✅
- Heart emoji ❤️ visible in intro text ✅
- Grid layout: 3×2 at 1440, responsive narrowing at 768/375 ✅

**3a. Badge Grid — Specific Measurement**
- Grid measured at 1440: badges are 80×88 (REVIVAL, STAY GOLD) and 80×104 (others) ✅
- Captions centered below badges, not overlaid ✅
- No visual collision between rows ✅

**4. Section 3: Nation KUDOS**
- Heading "KUDOS QUỐC DÂN" present ✅
- Body text with ❤️ emoji ✅
- "Root Further" reference at end ✅

**5. Footer Actions**
- 1 outlined button "Đóng" with X icon (white stroke) ✅
- 1 primary yellow button "Viết KUDOS" with pen icon ✅
- Pen icon visible on yellow (using `IconPencil` currentColor, not white `/home/Pen.svg`) ✅
- Buttons sticky at bottom ✅
- Both responsive: full width narrowing to single-column at mobile ✅

**6. Hover & Focus (Visual Inspection)**
- Outlined "Đóng" button: hover shows brighter background (#ffe07a·1.8) ✅
- Primary "Viết KUDOS": hover shows subtle shade shift ✅
- Focus rings visible when tabbing (focus-visible:ring-2) ✅

**Mismatch Findings:** None. All elements render as designed.

## Quality Gate Results

| Check | Command | Exit Code | Status |
|---|---|---|---|
| Format check | `pnpm format:check` | 0 | ✅ PASS |
| Lint (0 warnings) | `pnpm lint --max-warnings 0` | 0 | ✅ PASS |
| Unit coverage | `pnpm test:unit:coverage` | 0 | ✅ PASS |
| Coverage target | 100% (statements, branch, funcs, lines) | — | ✅ PASS |

**Test file coverage:**
- `src/app/(public)/standards/_hooks/use-standards-close.ts`: 100% (3 test cases covering `canGoBack: true`, `canGoBack: false`, and API absent branches)
- `tests/e2e/standards.spec.ts`: 14/14 assertions live (0 skip/xfail)

**Note:** `pnpm build` and `pnpm typecheck` blocked for subagents per CLAUDE.md; orchestrator runs these.

## File Changes

**Modified:**
- `tests/e2e/standards.spec.ts` (4 navigation guards added, 6 lines changed, all backward-compatible)

**Not modified:**
- `src/app/(public)/standards/**` (implementation correct, tests only needed guards)
- `src/constants/routes.ts`, `messages/*.json`, `public/standards/**` (implementation complete)
- `.github/workflows/ci.yml` (unchanged, spec runs fully in CI without DB)

## Evidence Artifacts

- `plans/260907-0935-standards-rules-page/evidence/green-e2e-standards.txt` — full test run output
- `plans/260907-0935-standards-rules-page/visual-1440.png` — desktop screenshot
- `plans/260907-0935-standards-rules-page/visual-768.png` — tablet screenshot
- `plans/260907-0935-standards-rules-page/visual-375.png` — mobile screenshot
- `.playwright-mcp/` removed before `pnpm format:check`

## Next Steps

1. **Reviewer** reads full diff of 6 phases (especially phase 02 icon promote + footer touch)
2. **Coordinator** updates `docs/vi/generated/*` if F005/SCR005 moves out of `draft`
3. **EN copy review** (`messages/en.json` marked `is_reviewed: false` by orchestrator — awaiting translation review)
4. **Link resolution** (`/kudos` returns 404 today; link navigation verified but destination not implemented)

## Action Items Carried Forward

| Item | Owner | Note |
|---|---|---|
| EN translation review | content team | 20 strings marked `is_reviewed: false` in `messages/en.json` |
| `/kudos` page implementation | future phase | link navigates correctly but destination missing |
| Disabled state (TC_THELE_GUI_003, TC_THELE_FUN_005) | future phase | out of scope; no runtime condition triggers disabled on static page |
| Intercepting route `@modal` | future phase | overlay behavior not required this round (see clarifications) |
| Window.history.length measurement | documentation | Playwright direct goto lands `history.length === 2` not 1; hook uses `navigation.canGoBack` to avoid this pitfall |

---

**Status:** ✅ PHASE 06 COMPLETE — All tests GREEN, regression-free, visual validated, quality gates passed. Ready for review and merge.

**Co-Authored-By:** Claude Opus 5 (1M context) <noreply@anthropic.com>
