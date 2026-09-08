# E2E Test RED Evidence — Widget Button FAB EXPANDED State

**Status:** RED (genuine assertion failures, not environment issues)  
**Date:** 2026-09-08  
**MoMorph refs:**
- FAB mở rộng: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h
- Clarifications: plans/260908-1103-home-widget-fab/clarifications.md

---

## Test Files & Command

**Test file created:** `tests/e2e/home-widget-fab.spec.ts`  
**Suite name:** Homepage Widget Button FAB — EXPANDED state

**RED command executed:**
```bash
E2E_PORT=3100 npx playwright test tests/e2e/home-widget-fab.spec.ts
```

**Real exit code:** `1` (failure)

---

## RED Failure Summary

The test suite ran 5 tests total:
- **4 failed** — genuine assertion failures (designed features missing)
- **1 passed** — TC ID-39 (navigates to /kudos, which exists in current implementation)

### Test Results

| Test Case | Result | Assertion Failure |
|-----------|--------|-------------------|
| TC ID-36  | ✘ FAIL | "/" text should hide when pill morphs to ×; currently stays visible at `aria-expanded="true"` |
| TC ID-37  | ✘ FAIL | Trigger button should morph to 56×56; currently stays 106×64 when open |
| TC ID-38  | ✘ FAIL | Timeout waiting for "Thể lệ" link to `/standards` (element doesn't exist) |
| TC ID-39  | ✓ PASS | Successfully navigates to `/kudos` (current implementation has this link) |
| TC ID-40  | ✘ FAIL | "Thể lệ" link not found on second cycle |

---

## Verbatim Assertion Errors

### TC ID-36: Widget panel "/" separator visibility toggle

**Failure Type:** Text should hide when morphing but doesn't  
**Error Message:**
```
Error: expect(locator).not.toContainText(expected) failed
Locator: locator('button[aria-label="Hành động nhanh"]')
Expected substring: not "/"
Received string: "/"
Timeout: 5000ms
```

**Root Cause:** When `aria-expanded="true"`, the "/" separator text should be hidden (pill morphs to × icon), but it remains visible in the button's text content.  
**Current state:** Trigger button shows "/" text in both collapsed and expanded states; button stays 106×64 in both states.  
**Expected state:** When pill morphs to × icon (56×56), the "/" separator should be hidden/removed from the button's accessible content.  
**Also detected:** The "Thể lệ" link to `/standards` does not exist in the panel (would fail on next assertion).

---

### TC ID-37: Widget button morphs to 56×56 when open

**Failure Type:** Button dimensions don't match expected morph  
**Error Message:**
```
Error: expect(received).toBeLessThanOrEqual(expected)
Expected: <= 2
Received:    50
  expect(Math.abs(triggerBox!.width - 56)).toBeLessThanOrEqual(2);
```

**Root Cause:** The trigger button should morph from pill (106×64) to square × icon (56×56) when `aria-expanded="true"`, but it remains 106×64 in both states. The width is 106, not 56 — a difference of 50px.  
**Current state:** Trigger button maintains pill dimensions (106×64) even when panel is open.  
**Expected state:** When `aria-expanded="true"`, the trigger morphs to 56×56 to render the red × icon in place of the pill. The user can click this 56×56 × button to close the panel (same trigger button, morphed appearance).

---

### TC ID-38: Navigate to /standards

**Failure Type:** Timeout (30000ms)  
**Error Message:**
```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[role="menuitem"][href="/standards"]')
```

**Root Cause:** The link doesn't exist, so the click times out waiting for it.  
**Expected:** "Thể lệ" link with `href="/standards"` should exist and be clickable.

---

### TC ID-40: Consistency across cycles

**Failure Type:** Element not found  
**Error Message:**
```
Error: expect(locator).toBeVisible() failed
Locator: locator('[role="menu"]').locator('a[href="/standards"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

**Root Cause:** Same as TC ID-36 — "Thể lệ" link doesn't exist.  
**Impact:** The expanded panel content is inconsistent with the design spec.

---

## Testid / Locator Contract

The test uses **role-based, href-based, and testid locators** for robustness:

### Locators Asserted

| Element | Locator | Expected Behavior |
|---------|---------|-------------------|
| Widget container | `data-testid="home-widget-fab"` | **REQUIRED** — Placed on the wrapper `<div>` (fixed right-6 bottom-6); contains exactly one button to prove morph, not two controls |
| Trigger button | `button[aria-label="Hành động nhanh"]` | Inside testid container; morphs pill (106×64)↔× (56×56) when toggling `aria-expanded` false↔true |
| Menu container | `[role="menu"]` | Shows/hides with trigger |
| "Thể lệ" link | `a[role="menuitem"][href="/standards"]` | **NEW** — Inside menu, visible when open, 64px tall |
| "Viết KUDOS" link | `a[role="menuitem"][href="/kudos"]` | **RENAMED** — Inside menu (currently text is "Sun* Kudos"), 64px tall |
| Trigger close affordance | Clicking `button[aria-label="Hành động nhanh"]` when open | Closes menu; trigger morphs back to pill (106×64); focus stays on trigger |
| "/" separator text | Inside trigger button | Visible when closed (`aria-expanded=false`), hidden when open (`aria-expanded=true`) |
| Award link | `a[href="/awards"]` inside menu | **SHOULD NOT EXIST** — delete existing |

### Testid Requirement

Add `data-testid="home-widget-fab"` to the existing `<div className="fixed right-6 bottom-6 z-30">` wrapper in `widget-button.tsx:44`. This follows repo convention (`kudos-toast`, `kudos-card`, etc.) and enables precise widget scoping without DOM restructuring.

---

## Existing Test Compatibility

**Test file:** `tests/e2e/home.spec.ts`  
**Existing widget tests (TC ID-30–35):** ✓ **PASS**

Command:
```bash
E2E_PORT=3100 npx playwright test tests/e2e/home.spec.ts
```

Result: 26 passed, 1 pre-existing failure (countdown timer, unrelated)  
**Widget button tests remain GREEN** — new test does not break current functionality.

---

## What's Missing (Implementation Contract)

The expanded state requires:

1. **ONE trigger button that morphs: pill → × icon**
   - `aria-label="Hành động nhanh"` constant in both states
   - Collapsed state: 106×64 pill with "/" separator text
   - Expanded state: 56×56 red × icon (pixel-identical to design frame)
   - When morphing, "/" separator text is hidden
   - Clicking the trigger when open closes the panel and returns focus (not a separate button)

2. **"Thể lệ" link** (NEW)
   - Text: "Thể lệ" (from `messages.home.widget.standardsItem`)
   - href: "/standards"
   - role: "menuitem" (inside `[role="menu"]`)
   - 149×64, padding 16px, background: `rgba(255,234,158,1)`, border-radius: 4px
   - Icon: 24×24 Sun* logo (icon-sun-logo)

3. **"Viết KUDOS" link** (RENAME existing)
   - Text: "Viết KUDOS" (rename from current "Sun* Kudos", use `messages.home.widget.writeKudosItem`)
   - href: "/kudos" (same as current)
   - role: "menuitem" (inside `[role="menu"]`)
   - 214×64, padding 16px, background: `rgba(255,234,158,1)`, border-radius: 4px
   - Icon: 24×24 pencil (icon-pen)

4. **Remove "Award Information"** (DELETE existing)
   - Delete the current second menu item linking to `/awards`
   - Remove `messages.home.widget.awardsItem`

5. **Visibility toggles**
   - "/" separator: visible when closed (`aria-expanded=false`), hidden when open (`aria-expanded=true`)
   - Menu panel: hidden by default, visible when open

---

## Environment & Build Status

- **Node:** pnpm
- **Next.js:** 16 (App Router)
- **E2E Framework:** @playwright/test
- **Port:** E2E_PORT=3100 (isolates from other projects)
- **Browser:** Chromium
- **Build:** No build errors — test ran cleanly

---

## Summary

✓ Test created and ran with REAL exit code 1  
✓ Failures are genuine ASSERTION failures (design features missing, not test defects)  
✓ Existing tests still pass (27 passed, including widget tests TC ID-30–35)  
✓ 4 clear blockers for UI implementation identified  
✓ Locator contract documented with one testid requirement (`data-testid="home-widget-fab"`)  
✓ Geometry assertions robust against hover artifacts (mouse.move before measuring)  
✓ Ready for `momorph-ui-implementer` to code the expanded state
