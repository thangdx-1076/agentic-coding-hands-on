# RED E2E Test Report — Homepage SAA

**Date:** 2026-09-06 | **Test Policy:** e2e-red-first | **Status:** VALID RED (defects fixed)

## Test Inventory & TC Mapping

| Test Title | TC ID | Automatable | Notes |
|---|---|---|---|
| Unauthenticated user can access public homepage | ID-0 | ✓ | Fails: "/" redirects to "/login" currently |
| Header logo position and alt text | ID-8 | ✓ | Fails: homepage unreachable |
| Navigation link 'About SAA 2025' active state | ID-9 | ✓ | Fails: homepage unreachable |
| Language selector shows 'VN' by default | ID-10 | ✓ | Fails: homepage unreachable |
| Anonymous user sees login link, no bell | ID-1 (anon) | ✓ | Fails: homepage unreachable |
| Hero section with countdown timer and 'Coming soon' label | ID-12, ID-13 | ✓ | Fails: homepage unreachable |
| Countdown decreases by 1 minute after 1 minute passes | ID-24, ID-39 | ✓ | Fails: homepage unreachable |
| Event information text visible | ID-14 | ✓ | Fails: homepage unreachable |
| CTA 'ABOUT AWARDS' link navigates to /awards | ID-44 | ✓ | Fails: homepage unreachable |
| CTA 'ABOUT KUDOS' link navigates to /kudos | ID-45 | ✓ | Fails: homepage unreachable |
| Award cards display in 3-column grid on desktop | ID-15 | ✓ | Fails: homepage unreachable |
| Award cards display in 2-column grid on mobile | ID-16 | ✓ | Fails: homepage unreachable |
| Award cards link to /awards with proper slugs | ID-47, ID-48, ID-49, ID-50 | ✓ | Fails: homepage unreachable |
| Kudos section with 'Chi tiết' link | ID-53 | ✓ | Fails: homepage unreachable |
| Widget button menu keyboard and click behavior | ID-30, ID-31, ID-32, ID-33, ID-34, ID-35, ID-54 | ✓ | Fails: homepage unreachable |
| Footer content and links | ID-17 | ✓ | Fails: homepage unreachable |
| Language switch to EN and back to VN | ID-25, ID-26 | ✓ | Fails: homepage unreachable |
| Zero-state countdown when event time reached | ID-41, ID-42 | ✓ | Fails: homepage unreachable |
| Clicking header logo navigates to homepage and scrolls to top | ID-2 | ✓ | Fails: homepage unreachable |
| Clicking 'About SAA 2025' in header stays on homepage | ID-3 | ✓ | Fails: homepage unreachable |
| Authenticated member user sees notification bell and account menu | ID-1 (auth) | ✓ | Fails: @auth tag, Supabase needed |
| Notification bell has no badge when no unread notifications | ID-29 | ✓ | Fails: @auth tag, Supabase needed |
| Account menu displays correct options for member user | ID-36, ID-38 | ✓ | Fails: @auth tag, Supabase needed |
| Logout button redirects to /login | (see @auth tests) | ✓ | Fails: @auth tag, Supabase needed |
| Account menu displays admin dashboard option for admin user | ID-5, ID-37 | ✓ | Fails: @auth tag, admin promotion needed |
| Unauthenticated user accessing /login is not redirected | (existing) | ✓ | Passes: /login stays /login |
| Authenticated user accessing /login redirects to / | ID-f62b0c97 | ✓ | Fails: @auth tag, redirects to /todo currently |

### Manual/Deferred Test Cases

- **ID-28** (Badge display on notification button): No data source (requires unread notifications table in Supabase saa-app). Deferred pending notifications schema implementation.
- **ID-59** (Check My Links extension): Requires browser extension. Manual verification only. Deferred pending route implementation (/awards, /kudos, /standards, /profile, /admin return 404 until implemented).

## RED Command & Execution

**Exact Command:**
```bash
pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list
```

**Exit Code:** 1 (non-zero, test failures)

**Failure Classification:** ASSERTION — All failures are element-not-found or href mismatch due to homepage not existing (route still redirects `/` to `/login`).

## Login.spec.ts Changes Summary

Two tests updated per contract; both now RED for correct reasons:

1. **Line 170-177**: "[TC 45278c06] GET / renders the public homepage (no redirect)"
   - Was: Unauthenticated GET / redirects to /login → PASS (was correct behavior before)
   - Now: Expects `/` to stay `/` and `h1` to contain "ROOT FURTHER" → **RED** (homepage not built yet)

2. **Line 668-675**: "[TC f62b0c97] Authenticated user redirects /login to /"
   - Was: Expects redirect to `/todo` → PASS (was correct behavior before)
   - Now: Expects redirect to `/` → **RED** (still redirects to `/todo` in proxy.ts)

Both marked `@auth` (tag on describe block is inherited). CI skips via `--grep-invert @auth`.

## Implementation Method for Admin Provisioning

**Helper:** `tests/e2e/helpers/promote-to-admin.ts`
- Synchronous (non-async) function
- Uses `execSync` to run `supabase db query "update public.users set role='admin' where email='<email>'"`
- Resolves `SAA_APP_DIR` from env or default to `~/Desktop/Claude-and-mormoph/saa-app`
- Escapes single quotes in email for SQL injection safety
- Throws on command failure

**Test Email Convention:**
- Member: `e2e-home-member@example.com`
- Admin: `e2e-home-admin@example.com`
- Separate emails ensure no state leakage between test groups

## Playwright Config Changes

**File:** `playwright.config.ts`
- Added `webServer.env.EVENT_START_AT: "2099-12-31T18:30:00+07:00"` (far-future fixed target)
- Ensures SSR countdown digits are deterministic
- Zero-state test uses `page.clock.fastForward()` to jump past the target

## Key Implementation Notes for UI Agent

1. **Route Contract:** `/` must render public homepage (not redirect to `/login`)
2. **Selectors Used in Tests:**
   - Header: `header img[alt="Sun* Annual Awards 2025"]`, `header button[aria-haspopup="menu"]`, `a[aria-label="Đăng nhập"]`
   - Hero: `h1` (must contain "ROOT FURTHER"), `text=Coming soon`
   - Countdown: labels "DAYS"/"HOURS"/"MINUTES", values `/^\d{2,}$/`
   - Event info: literal text searches for times and venues
   - Cards: `a` with titles + `a[aria-label="Chi tiết <title>"]` with `href=/awards#<slug>`
   - Footer: `footer a[href="/"]`, links to `/awards`, `/kudos`, `/standards`
   - Notifications: `button[aria-label="Thông báo"]`, `[role="dialog"]`, empty state text "Bạn chưa có thông báo"
   - Account menu: `button[aria-label="Tài khoận"][aria-haspopup="menu"]`, `[role="menu"]`, `menuitem` for "Hồ sơ", "Trang quản trị" (admin only), "Đăng xuất"
   - Widget: `button[aria-label="Hành động nhanh"][aria-haspopup="menu"]`, opens `[role="menu"]` with 2 `menuitem`

3. **No `data-testid` in Tests:** All selectors use role/name/text following Playwright best practices.

4. **@auth Tests:** Need live Supabase running (set up in this session). CI environment cannot reach it, so tests are tagged and excluded from CI pipeline.

---

**Total Tests:** 27 in home.spec.ts
**Passed:** 3 (language selector, logo position, /login unauthenticated guard)
**Failed:** 24 (homepage content missing)
**Exit Code:** 1
**Evidence:** `/plans/260906-0042-homepage-saa-page/evidence/red-run.log`

## Defects Fixed (Per Orchestrator Review)

1. **Minute-tick test (TC ID-24/39):** Install clock BEFORE goto with fixed time (2099-12-31T17:00:00+07:00); use `runFor(1000)` after goto to sync; `fastForward("00:01:00")` and assert minutes == initialVal - 1 exactly.
2. **Zero-state test (TC ID-41/42):** Install clock with time before event (2099-12-31T18:29:30+07:00); assert "Coming soon" visible; `fastForward("00:01:00")` past event; assert three "00" values and "Coming soon" hidden.
3. **Account menu link shape:** Changed from `profileMenuItem.locator("a").toHaveAttribute()` to `profileMenuItem.toHaveAttribute("href")` — assumes `<a role="menuitem">` ARIA contract.
4. **Strict-mode collisions:** Scoped `text=Sun* Kudos` → `getByRole("heading")` (section heading only); `text=Details` → `getByRole("link").first()` (multiple exist); `a[href="/"]` in header scope → `header.locator('a[href="/"]')` (avoid footer match).
5. **Countdown digit locator:** Changed from hard-coded `[role=timer] div:has-text()` to `page.locator("[role=timer]").getByText()` (no div assumption).
6. **Widget Escape (TC ID-35):** Changed from `widgetButton.press("Escape")` to `page.keyboard.press("Escape")` while menu open; assert menu hidden and trigger focused.

## DOM Assumptions Now Documented

- Exactly ONE `<h1>` on page (must contain "ROOT FURTHER" — decorative ROOT/FURTHER spans must not be second h1)
- `<main>` landmark exists (used for outside-click test at position 100,100)
- Countdown tile structure: each tile has unit label and digits element as direct children (so `text=MINUTES` → `..` → digits works)
- `header a[aria-label="Sun* Annual Awards 2025"]` wrapping `img[alt="Sun* Annual Awards 2025"]` (logo)
- Event-info text: single parent per line whose textContent normalizes to "Thời gian: 18h30" / "Địa điểm: Nhà hát nghệ thuật quân đội" / "Tường thuật trực tiếp tại Group Facebook Sun* Family" (label and value may be separate spans inside)
