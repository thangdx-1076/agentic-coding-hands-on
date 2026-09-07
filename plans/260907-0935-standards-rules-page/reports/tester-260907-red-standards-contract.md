---
title: "RED Evidence — Standards Rules Page E2E Test"
date: 2026-09-07
author: tester
phase: 01
status: RED
---

# Phase 01 Delivery — RED Contract Test

## Summary

Created `tests/e2e/standards.spec.ts` with 14 screen assertions (C1–C14) covering DOM contract, scroll behavior, navigation, localization, and error handling. Test suite compiles clean (14 tests listed), executes successfully, and produces **valid RED via screen assertion failure** (not infrastructure).

## DOM Contract Assertions (C1–C14)

| # | Contract | Status | Rationale |
|---|---|---|---|
| C1 | 1 `<main>` with `overflow-y:auto`, h1 = "Thể lệ" | RED ✗ | `/standards` returns 404; h1 is "404" not "Thể lệ" |
| C2 | 0 `<header>`, 0 `<footer>` | GREEN ✓ | Page returns 404 with no chrome wrapping |
| C3 | 3 `<section>` with correct h2 headings | RED ✗ | Sections not found (0 elements); h1 404 blocks render |
| C4 | Section 1: 4 hero images + conditions | RED ✗ | Images not found; section missing due to 404 |
| C5 | Section 2: 6 badge images + captions | RED ✗ | Captions "ROOT FURTHER" (correct spelling) not found; section missing |
| C6 | Section 2 intro + Section 3 body with ❤️ | RED ✗ | Heart emoji content not found; sections missing |
| C7 | 1 "Đóng" button, 1 "Viết KUDOS" link, no disabled | RED ✗ | Footer elements not found |
| C8 | Scroll at 1280×720: scrollHeight > clientHeight | RED ✗ | Timeout waiting for `<main>`; page returns 404 |
| C9 | At 1440×2400: scrollHeight - clientHeight ≤ 1 | RED ✗ | Timeout waiting for `<main>` |
| C10 | Navigate / → standards → close → back to / | RED ✗ | Timeout; footer link "Tiêu chuẩn chung" times out waiting for close button |
| C11 | Direct goto /standards, close → / (fallback) | RED ✗ | h1 is "404"; no fallback logic to test yet |
| C12 | "Viết KUDOS" link navigates to /kudos | RED ✗ | Link not found on 404 page |
| C13 | EN locale: "Rules", "Close", "Write KUDOS" | RED ✗ | h1 is "404", not "Rules" |
| C14 | No page errors on load | GREEN ✓ | No pageerror events; 404 page loads cleanly |

## RED Validity

**Status:** VALID RED (screen assertion, not infrastructure)

### Exit Code
```
Command: pnpm test:e2e tests/e2e/standards.spec.ts --reporter=list
Exit code: 1 (failure)
Tests: 14 total · 12 failed · 2 passed
```

### Failure Origin
Primary failure: `expect(locator).toContainText("Thể lệ")` timeout after 5000ms.
- Locator: `locator('h1')`
- Expected: "Thể lệ"
- Received: "404"
- Source: `/standards` route does not exist (404 page render)

This is a **screen assertion failure**, not:
- ✗ webServer timeout (dev server started successfully at :3000)
- ✗ browserType.launch failure (Chromium initialized)
- ✗ Cannot find module (spec compiles, `--list` succeeds)

### Passing Tests (2)
- `[C2] No header or footer chrome elements` — Confirms page returns 404 with no wrapping chrome
- `[C14] No page errors on load` — 404 page loads cleanly without JS console errors

## Key Measurement: `window.history.length`

**Critical finding for C11 fallback heuristic:**

```
[MEASUREMENT] window.history.length on direct goto: 2
```

On direct `page.goto("/standards")` in a fresh context, `window.history.length === 2` (not 1).
- Expected heuristic: `history.length > 1` → use `router.back()`; `history.length === 1` → fallback to `ROUTES.HOME`
- Measured reality: `history.length === 2`, which means the heuristic will trigger `router.back()` on direct-load, not fallback

**Implication:** Phase 04/06 implementation must account for this: the fallback branch (C11 nhánh fallback) may not trigger as written in clarifications.md. Either:
1. Adjust the heuristic threshold (e.g., `history.length > 2`)
2. Use a different signal (e.g., sessionStorage marker for "first load")
3. Accept that fallback doesn't apply in Playwright context (ok — just don't test it)

**Decision deferred to phase 04/06:** Document assumption; if C11 fails GREEN, adjust the close handler.

## Test Quality

- ✓ 14 tests authored (≥10 required)
- ✓ No `.skip()` or tag directives
- ✓ `pnpm exec playwright test --list` compiles clean
- ✓ Correct spelling: "ROOT FURTHER" (not "ROOT FUTHER")
- ✓ Correct character: en-dash "10–20" (not hyphen "10-20")
- ✓ No `.playwright-mcp/` artifacts left behind
- ✓ Empty `storageState` (anonymous user, no tags)
- ✓ Out-of-scope tests documented (GUI_003, FUN_005, GUI_004)

## Out-of-Scope Notices

### TC_THELE_GUI_003 (disabled state)
No test authored. Reason: BR-005 — no runtime condition on static page produces disabled state; implement disabled = YAGNI.
*Comment added to spec file: lines 47–52.*

### TC_THELE_FUN_005 (disabled button click rejection)
No test authored. Same rationale as GUI_003.
*Comment added to spec file: lines 47–52.*

### TC_THELE_GUI_004 (hover styling)
No test authored. Reason: Hover state cannot be asserted reliably in Playwright; visual validation in phase 06.
*Comment added to spec file: lines 47–52.*

## Phase-01 Deliverables

| Deliverable | Status | Path |
|---|---|---|
| Test file (create) | ✓ DONE | `tests/e2e/standards.spec.ts` |
| Spec compiles (--list) | ✓ DONE | 14 tests listed |
| Valid RED | ✓ DONE | `exit 1`, 12 failures due to h1 "404" |
| Evidence recorded | ✓ DONE | `evidence/red-e2e-standards.txt` |
| `history.length` measured | ✓ DONE | 2 (documented above) |
| Report file | ✓ DONE | This file |

## Next Steps

Phase 02/03 unlocked (can proceed in parallel).
Phase 04 receives read-only spec file; implements per DOM contract C1–C14.
Phase 06 will rerun same command with GREEN; measure real viewport sizes and history behavior with actual route implementation.

## Raw Evidence

See `evidence/red-e2e-standards.txt` for full `pnpm test:e2e` output.

**Key excerpt:**
```
Exit code: 1

✘   3 [chromium] › tests/e2e/standards.spec.ts:39:7 › [C1] Main panel renders…

Error: expect(locator).toContainText(expected) failed
Locator: locator('h1')
Expected substring: "Thể lệ"
Received string:    "404"
Timeout: 5000ms
```

---

**Status:** VALID RED — screen assertion, 12 failed, 2 passed, exit code 1.
Ready to unlock downstream phases.
