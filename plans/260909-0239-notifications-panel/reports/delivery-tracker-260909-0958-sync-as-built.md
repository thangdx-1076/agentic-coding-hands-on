# Delivery Tracker: F012 Notifications Panel — As-Built Sync

**Date:** 2026-09-09 | **Plan:** 260909-0239-notifications-panel | **Branch:** feat/notifications-panel

---

## Scope Completed

**All 9 phases delivered.** 12 commits, 796 unit tests (100% coverage, 4 suites), E2E 214 pass / 5 skip / 0 fail. Migrations applied + verified: `0012` (schema+RLS+realtime), `0013` (2 emitters). DB baseline stable (users=21, kudos=12, hearts=31, notifications=0).

---

## Deviation Log

### 1. Phase 04 → Phase 05: Browser API Path
**Plan said:** `src/dal/notifications-browser*.ts`  
**As-built:** `src/api/notifications.ts` (like `src/api/auth.ts`)  
**Why:** `src/dal/*` must carry `import "server-only"` to prevent client bundle leak. Phase 04 logic proved this constraint → shifted read/subscribe to `src/api/` from start.

### 2. Phase 07: Scope Expansion +8 Files
**Plan said:** "0 file màn phải sửa" (4 page.tsx only)  
**As-built:** +8 files (4 screen.tsx + 4 client.tsx each have `unreadCount?: number = 0`)  
**Why:** Hardcoded zeros in every screen/client pair were root cause of badge=0 bug. Fixed by making `SiteViewer.unreadCount` mandatory; TS now enforces supply everywhere. 13 story/test literals updated.

### 3. Phase 06: Message Construction
**Plan said:** No `t.rich` yet (authoritative clarification)  
**Reality:** Message built at client via `formatNotificationMessage()` + `splitLinkTemplate()` (phase 04). Template stored i18n, no client bundle bloat.

---

## Beyond Plan

- **Phase 03 backend bug:** Hook realtime subscribe 2x with empty `userId` (fixed commit 3782cd1). New `globalTeardown` for cascade delete when seed user deletes (commit 08fad89).
- **Out-of-scope explicit:** TC-F007-014 skipped (admin moderation); emitter for `kudos_hidden`/`secret_box_available` deferred (no event source); `profile/page.tsx` refactor noped (grit debt → next PR).

---

## Files Touched

Only within `plans/260909-0239-notifications-panel/`. Code in `src/`, `supabase/`, `tests/`, `docs/` owned by prior agents.

---

**Status:** DONE
