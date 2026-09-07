# Delivery Tracker Report: Profile Page Reconciliation
**Date**: 2026-09-07 · **Feature**: F006_ProfilePage · **Branch**: `feat/profile-page`

---

## Summary

All 8 phases of F006 delivered. **22/22 e2e tests pass, 100% unit coverage**, 4 regression specs green (81 tests), gates clean. Feature is ready for merge and release.

---

## Delivered — Evidence by Gate

### Phase 01: RED Contract ✅
- `tests/e2e/profile.spec.ts` — 17 test cases (C1-C17), 1 CI-safe
- Contract ghi 3 DOM assertions (header, footer, heading name, 6 badge, 5-or-0 stats, dropdown 2-or-1 option, 0 chip)
- Data trap fix: `sign-in.ts` corrected `options: { data }` → `data:` (top-level) so trigger reads `raw_user_meta_data` properly

### Phase 02: Chrome Promotion ✅
- 31 files moved from `src/app/(public)/_{components,shared,utils,hooks}/` to `src/app/_{components,shared,utils,hooks}/`
- 4 consumers rewritten: `home`, `awards`, `standards`, `login`
- **Gain a 10th consumer**: `login-header.tsx` granted exception (import-line-only)
- **`award-name-graphics.ts` left at source** (YAGNI — `/awards` only consumer)
- Regression e2e: 81 passed, 3 skipped. Coverage allowlist includes `get-viewer.ts` + `use-select-locale.ts` (no glob hault)

### Phase 03: Profile Cards View + DAL ✅
- Migration `0005_profile_cards_view.sql` — view **3 columns only** (`id`, `full_name`, `avatar_url`), no `email`/`role`/`locale`
- `security_invoker = false` (BYPASSRLS owner) — definer view bypasses RLS
- **Escalation fixed**: Plan liệt kê `REVOKE ALL FROM anon, PUBLIC`. Supabase default grants `authenticated` INSERT/UPDATE/DELETE on new objects. Since `profile_cards` is auto-updatable view with BYPASSRLS owner, authenticated user could mutate other users' `full_name`/`avatar_url` (bypassing `users_update_own` RLS). **Fixed**: REVOKE expanded to `authenticated`, then `GRANT SELECT` only.
- `src/dal/profile-cards.ts` + `profile-cards-client.ts` + tests — fail-open `null`, 100% coverage

### Phase 04: Route, Proxy, i18n, Assets ✅
- `src/constants/routes.ts` — `/profile` constant added
- `src/proxy.ts` — middleware routing
- `messages/vi.json` + `messages/en.json` — `profile.*` keys (parity verified)
- `public/profile/**` — SVG badges, dimensions recorded

### Phase 05: Track A — UI ✅
- 5 components + stories: `profile-screen`, `profile-hero`, `badge-collection`, `profile-statistics-card`, `kudos-direction-select`
- `profile-copy.ts` type extends `SiteChromeCopy`, includes `BADGE_SLOTS`, `STATISTICS_ROWS`, `KUDOS_DIRECTIONS`
- **Corrections made**:
  1. Frame references: Plan cited `362:5064` as badge container; live MoMorph verify shows `362:5064` is department/tier/stars line (correctly OUT OF SCOPE per C3/GUI_009). Badges at `362:5066-5071`, stats at `362:5073` (plan was accurate, live scan needed reordering).
  2. Type rename: `ProfileCopy.kudos` → `ProfileCopy.kudosDirection` to avoid TS2322 collision with `SiteChromeCopy.kudos`
- `"use client"` in `kudos-direction-select.tsx` only; no useEffect, fetch, DAL
- 11 files (5 components + 5 stories + copy), all ≤200 lines

### Phase 06: parseProfileId ✅
- `src/app/(protected)/profile/_utils/parse-profile-id.ts` — UUID validation, canonicalization
- Test: 100% coverage, 4 branches

### Phase 07: Integration ✅
- `page.tsx` — Server Component, reads query param via `parseProfileId`, calls DAL
- `profile-client.tsx` — Client boundary, passes data to `ProfileScreen`
- `build-profile-copy.ts` — runtime copy builder
- Layout + frame = 1 Server + 1 Client, no extra boundaries

### Phase 08: Green E2E + Regression ✅
- **22/22 tests pass** (exit 0)
- Vacuous tests fixed: C12 (404 response status) and C16 (network response body scan) had false positives → corrected assertions
- Stale dev server caveat: `reuseExistingServer: true` served old build; prefix kill added
- **`playwright.config.ts` updated**: accepts `E2E_PORT` env var (default 3000) to avoid false flakiness
- 4 regression specs: `home` (16 tests), `awards` (32 tests), `standards` (26 tests), `login` (7 tests) → 81 passed, 3 skipped
- Unit coverage: 175 tests across 28 files, **100%** allowlist
- Build, typecheck, lint (--max-warnings 0), format, storybook → clean
- Security recheck: view 3 cols, `authenticated` has SELECT only, anon key rejected, response body lacks email/role

---

## Deferred — 10 Test Cases to F007+ (Kudos Domain)

These test cases require the Kudos table/board/logic which are out of scope for F006:

| TC ID | Name | Reason | Defer to |
|-------|------|--------|----------|
| FUN_006 | Chip display when feed present | Feed always empty (no kudos table) | F007 |
| FUN_007 | Positive/Negative chip styling | Feed behavior | F007 |
| FUN_010 | Load feed from API | Requires kudos domain | F007 |
| FUN_013 | Parse markdown in kudos text | Kudos domain logic | F007 |
| FUN_014 | Render kudos card layout | Card model depends on kudos table | F007 |
| FUN_015 | Filter by reaction/hashtag | Kudos analytics | F007+ |
| GUI_006 | Feed card visual layout | Kudos domain UI | F007 |
| GUI_007 | Spam chip appearance | Kudos moderation | F007 |
| SEC_002 | Anon cannot see kudos feed | Feed access control | F007 |
| SEC_003 | Cannot read other's DM in kudos | Privacy boundary | F007 |

Ghi lại trong `clarifications.md` § Test-case disposition.

---

## Product Decisions Deferred

### Department, Hero Tier, Star Count (C3 / GUI_009)
Plan and contract explicitly exclude the `362:5064` line (department + Hero tier + star count). These fields have no source column in the current schema.
- **Spec location**: `technical-spec.md` § 4.2, C3 assert "không có dòng `362:5064`"
- **Decision needed**: Does the product want these fields? If yes, which columns source them?
- **Path forward**: Add schema columns, extend view, update phase 05 UI. Out of scope for F006.

### Merge Delta F006 to `docs/vi/system/permissions.md`
Phase 03 widened the REVOKE to include `authenticated` (escalation fix). Documentation of Supabase access boundaries should be updated by the owner after code review.

---

## CI Caveat — Green Check ≠ Feature Validation

**21 of 22 tests are tagged `@auth` and do NOT run in CI.**

- `ci.yml` filters: `--grep-invert "@auth|@local-db"` (2 places: count + run)
- Only **C17** (anonymous redirect to `/login`) is CI-safe
- Green CI check proves: `/profile` exists and redirects unauthenticated users. Nothing more.
- **Full validation requires local run**: `supabase start` + `E2E_PORT=3100 pnpm test:e2e tests/e2e/profile.spec.ts`

---

## Facts Not Yet Recorded — Now Captured

### Phase 01 Discovery
- Initial RED failed because `sign-in.ts` sent `options: { data: metadata }` (SDK concept) instead of top-level `data: metadata` (REST API). `raw_user_meta_data` field stayed NULL, trigger couldn't populate `full_name`. Fixture users stayed broken (`ON CONFLICT DO NOTHING` made it irreparable).
- **Fixed in phase 08**: Corrected `sign-in.ts`, used never-seen-before email, re-ran. All 22 tests GREEN.

### Phase 02 Scope Drift
- Plan enumerated 9 consumers of promoted chrome. Actual implementation: 10 consumers. `login-header.tsx` imported icons and was allowed as an import-line-only exception (no component re-export).
- `award-name-graphics.ts` deliberately NOT promoted (YAGNI — only `/awards` uses it). Stays at `(public)/_shared/`.

### Phase 05 Design Corrections
- MoMorph live design references needed recalibration. Frame `362:5064` is the hero line (department/tier/stars to omit, C3), not the badge container. Badges are `362:5066-5071`, stats slot is `362:5073`.
- Copy type collision: `ProfileCopy.kudos` (enum: 'received'|'sent') collided with `SiteChromeCopy.kudos` (string: i18n key). Renamed to `kudosDirection` to clarify intent and resolve TS2322.

### Phase 08 Test Fixes
- **C12 (404 for invalid ID)**: Initial assertion was location-based (URL contains `/profile`), not status-based. False positive — page could reach `/profile` as 200 but with error content. **Fixed**: Assert `response?.status() === 404`.
- **C16 (response leaks no email/role)**: Initial filter scanned all network responses; filter was too broad and caught wrong request. **Fixed**: Scope to `profile_cards` table request body, parse JSON, assert no email/role fields.
- **Stale dev server**: Playwright config `reuseExistingServer: true` reused running dev server. If that server was built from old code, tests looked flaky (failed unpredictably while code was fine). **Fixed**: Added prefix `lsof -ti:3000 | xargs -r kill -9` and `E2E_PORT` env var to `playwright.config.ts`.

---

## Scope vs Plan

| Item | Plan | Actual | Status |
|------|------|--------|--------|
| Phases | 8 | 8 | ✅ 100% |
| Test contracts | 17 (C1-C17) | 17 | ✅ All pass |
| E2E pass rate | All green | 22/22 | ✅ |
| Unit test target | 100% allowlist | 100%, 175 tests, 28 files | ✅ |
| Regression specs | 4 (`home`, `awards`, `standards`, `login`) | 81 passed, 3 skip | ✅ |
| TC in scope | 18 of 30 | 18 (10 deferred to F007+) | ✅ |
| Chrome promotion | 9 consumers | 10 consumers (gain: `login-header.tsx`) | ✅ Logged |
| Vacuous tests | Not anticipated | C12, C16 corrected | ✅ Fixed |

---

## Risk Register — Settled

| Risk | Status | Resolution |
|------|--------|-----------|
| RISK-01: Data trap in `sign-in.ts` | ✅ Closed | Corrected `options` → `data:` at top level |
| RISK-02: Department/tier/stars source undefined | ➡️ Defer | Product decision; not in scope |
| RISK-03: View leaks `email`/`role` via anon/public | ✅ Closed | 3-column view, REVOKE anon/PUBLIC/authenticated, GRANT SELECT only |
| Escalation: Authenticated UPDATE via view | ✅ Closed | REVOKE widened to include `authenticated` |
| Regression from phase 02 (chrome move) | ✅ Closed | 4 specs green, 81 tests pass |
| Stale dev server fakes flakiness | ✅ Closed | Kill :3000 prefix, E2E_PORT env var added |
| Vacuous test C12 (location vs status) | ✅ Closed | Assertion corrected to check `response.status()` |
| Vacuous test C16 (network filter scope) | ✅ Closed | Filter narrowed to `profile_cards` request |

---

## Unresolved Questions

1. **Should `department`, `Hero tier`, and star count be added to the profile display?**
   - Requires: schema columns, view extension, phase 05 UI addition
   - Owner: Product/Design
   - Impact: Medium (UI + data model scope)

2. **Should `docs/vi/system/permissions.md` be updated for the authenticated escalation fix (phase 03)?**
   - Current: `REVOKE ALL ... FROM anon, PUBLIC` only
   - Actual: `REVOKE ALL ... FROM anon, PUBLIC, authenticated`; then `GRANT SELECT`
   - Owner: Docs owner (post-review, not blocker for merge)
   - Impact: Low (documentation accuracy)

3. **Is `E2E_PORT` env var sufficient for the stale dev server issue, or should the config have a hard-coded kill step?**
   - Current workaround: bash prefix before test run
   - Alternative: Playwright hook to kill `:3000` before `webServer` starts
   - Owner: QA/Tester (process, not code)
   - Impact: Low (flakiness prevention)

---

**Status: DONE**

All 8 phases complete, all gates pass, feature ready for review and merge. Data integrity, authentication boundaries, and e2e coverage verified. 10 test cases deferred to F007+ (Kudos domain); 2 product decisions noted for later resolution.

