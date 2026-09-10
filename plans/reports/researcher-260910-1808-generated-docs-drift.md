# Generated docs vs code — drift audit

Scope: 9 files under `docs/vi/generated/`. Read-only, no fixes applied.
Ground truth read: all `src/app/**/page.tsx`/`route.ts` (9 files), `src/proxy.ts`, `src/dal/**`,
`src/api/**`, `src/domain/**`, `supabase/migrations/0001-0013`, `src/app/_components/notifications/**`.

Preflight: no `.codegraph/` index present; `tkm:help` checked, neither `tkm:research` nor
`tkm:search-docs` applies (internal docs-vs-code, not external library docs) — used Bash+Read directly.

## Severity legend
BLOCKING = factually wrong or entirely missing. MINOR = stale scope/header line, cosmetic, doesn't mislead an implementer.

---

## 1. route-list.md

| # | Sev | Finding |
|---|-----|---------|
| 1 | BLOCKING | Line 29 `### File: app/page.tsx` — no such path exists. Real file: `src/app/(public)/(home)/page.tsx`. |
| 2 | BLOCKING | Line 77 `### File: app/login/page.tsx` — real file: `src/app/(public)/login/page.tsx`. |
| 3 | BLOCKING | Line 85 `### File: app/todo/page.tsx` — real file: `src/app/(protected)/todo/page.tsx`. |
| 4 | MINOR | Line 19 `### File: app/auth/callback/route.ts` — missing `src/` prefix; real path `src/app/auth/callback/route.ts`. |

Contrast: rows for `/awards`, `/standards`, `/profile`, `/kudos`, `/prelaunch` (lines 37, 45, 53, 69, 93) already use full, correct `src/app/(public)/...`/`src/app/(protected)/...` paths — only the 4 oldest rows (wave-0, pre route-group refactor) were never updated. Everything else in this file (9 frontend pages + 1 backend route, proxy matcher narrative, redirect matrix) checked against `src/proxy.ts`/`src/domain/prelaunch-lock.ts` and matches code — no other drift found here.

---

## 2. screen-list.md

| # | Sev | Finding |
|---|-----|---------|
| 5 | MINOR | Line 5 header: `**Analysis Scope**: ... 2 screens (\`/login\`, \`/todo\`) + SCR003-SCR005 bổ sung` — stale; body (line 351: "Total Screens: 9") already covers SCR001-SCR009. Quote correct value: 9 screens, SCR001-SCR009. |
| 6 | BLOCKING | SCR001 Components table line 49: `LoginClient (`app/login/login-client.tsx`)` — real path `src/app/(public)/login/_components/login-client.tsx` (`ls` confirmed). |
| 7 | BLOCKING | SCR001 Components table line 50: `LoginScreen (`components/login/login-screen.tsx`)` — real path `src/app/(public)/login/_components/login-screen.tsx`. |
| 8 | BLOCKING | SCR003 Components table line 119: `HomeClient (`app/home-client.tsx`)` — real path `src/app/(public)/(home)/_components/home-client.tsx`. |
| 9 | BLOCKING | SCR003 Components table line 120: `HomeScreen (`components/home/home-screen.tsx`)` — real path `src/app/(public)/(home)/_components/home-screen.tsx`. |
| 10 | BLOCKING | SCR003 Components table line 122: `Header (`components/home/header.tsx`)` — **this file does not exist anywhere in the repo** (`find src -iname header.tsx` returns nothing). Actual code (`src/app/(public)/(home)/_components/home-screen.tsx:5,83`) imports the shared `SiteHeader` from `src/app/_components/site-header.tsx` — the SAME component this same doc correctly calls "SiteHeader" for SCR004/SCR006/SCR007 (lines 168, 248, 320). Internal contradiction: SCR003 should say `SiteHeader (src/app/_components/site-header.tsx)`, not invent a bespoke "Header". |
| 11 | BLOCKING | SCR003 Components table line 124: `CountdownTimer (`components/home/countdown-timer.tsx`)` — real path `src/app/(public)/(home)/_components/countdown-timer.tsx`. |
| 12 | BLOCKING | SCR002_TodoScreen Components table line 90: `Logout form/button ... Submit Server Action logoutAction (`app/todo/actions.ts`)` — `app/todo/actions.ts` does not exist. `logoutAction` now lives at `src/app/_actions/logout.ts` (confirmed by its own doc comment: "Logout Server Action bound to the `/todo` page's logout form") and is a SHARED cross-cutting action imported by `todo`, `profile`, `home`, `awards`, `kudos` pages (grep hit in 6+ files) — not todo-specific anymore. |

No drift found for item 5 of the task brief (SCR### coverage of F010/F012): screen-list.md/feature-list.md already correctly state F010_SecretBoxModal has no standalone SCR### (its dialog renders inside SCR007_KudosLiveBoard via `KudosStatList` → `SecretBoxLauncher`, confirmed at `src/app/(public)/kudos/_components/kudos-stat-list.tsx:96`), and F012_NotificationsPanel cross-references SCR003/004/006/007 via shared `SiteHeader`'s `NotificationBell` (screen-list.md line 132 already documents this correctly). The kudos "add-link" dialog (`kudos-compose-link-dialog.tsx` wrapping `kudos-link-dialog.tsx`, wired in `src/app/(public)/kudos/_components/kudos-compose-form.tsx:14,192`) is already documented as region R4 of SCR008_KudosCompose in `docs/vi/screens/SCR008_KudosCompose/spec.md:32,113,180,189,206` — correct, not drift. Home widget FAB (`WidgetButton`, `src/app/(public)/(home)/_components/widget-button.tsx`) is already listed under SCR003 (line 130) — correct.

---

## 3. feature-list.md

| # | Sev | Finding |
|---|-----|---------|
| 13 | MINOR | Line 6 header: `**Analysis Scope**: ... 6 screen (`/`, `/awards`, `/login`, `/profile`, `/standards`, `/todo`)...` — stale (wave-1 snapshot). Body (Feature Hierarchy table lines 13-24, Summary line 350) correctly lists all 12 features F001-F012 and 9 screens — only the header line was never refreshed. |

Feature Hierarchy table, per-feature detail sections, and Summary/Cross-Reference checklist (lines 349-373) are otherwise internally consistent and match code (F001-F012 all present, F010/F012 SCR### non-assignment reasoning verified above). No other drift found.

---

## 4. entities.md

| # | Sev | Finding |
|---|-----|---------|
| 14 | BLOCKING | Entire file has **zero mentions** of `secret_box_openings` (migration `supabase/migrations/0011_secret_box.sql:68`, F010_SecretBoxModal) or `notifications` (migration `supabase/migrations/0012_notifications.sql:45`, F012_NotificationsPanel). `grep -in "secret_box\|notification" docs/vi/generated/entities.md` → 0 hits. The file's own Summary (line 328: "Total Entities: 7") and last-touched note (lines 330-335) stop at F009 (2026-09-08) — it was never revisited for F010 (2026-09-0x) or F012 (2026-09-09), even though `route-list.md`, `screen-list.md`, `feature-list.md`, `permissions-matrix.md` all already reference both tables. Missing rows to add, mirroring the file's existing "not-yet-MODEL###-coded" convention (like `AWARD_Award`, `PROFILE_ProfileCard`): `SECRETBOX_SecretBoxOpening` (`id, user_id→users.id, badge_key CHECK IN 6 values, opened_at`, `secret_box_openings` table, migration 0011) and `NOTIFICATIONS_Notification` (`id, user_id→users.id, type CHECK IN 4 values, payload jsonb, is_read, created_at`, `notifications` table, migration 0012). |
| 15 | MINOR | Line 4 header: `**Project**: SAA 2025 — Login` — inconsistent placeholder vs. every other generated doc's `**Project**: agentic-coding-hands-on`. |

---

## 5. api-map.md

| # | Sev | Finding |
|---|-----|---------|
| 16 | BLOCKING | Server Actions table (lines 39-46) lists only 6 actions (`setLocale`, `logoutAction`, `toggleKudoHeart`, `loadMoreKudos`, `createKudo`, `searchSunners`) and Summary (line 62: "Server Actions (non-HTTP) \| 6") matches only that count. Missing 3 real Server Actions that exist in code: `openSecretBoxAction()` (`src/app/(public)/kudos/_actions/open-secret-box.ts:29`, calls `.rpc("open_secret_box")`, F010), `markReadAction(id)` (`src/app/_actions/notifications.ts:27`, F012), `markAllReadAction()` (`src/app/_actions/notifications.ts:59`, F012). Real total = 9, not 6. |
| 17 | BLOCKING | Line 41: `setLocale(locale)` \| `app/actions/locale.ts` — path does not exist. Real path: `src/app/_actions/set-locale.ts` (confirmed via `grep -rl "export.*function setLocale"`). |
| 18 | BLOCKING | Line 21: `Owner F### để trống trong route-list.md vì feature-list.md chưa tồn tại ở wave này` — this claim is now false. `route-list.md`'s own Backend Routes table (line 22) already fills `Owner F###` = `F001`, and `feature-list.md` exists with 12 features. |
| 19 | BLOCKING | Header note (line 9) enumerates feature coverage only through F009 ("F004/F005/F006/F007/F008/F009 đều KHÔNG thêm route BE nào") — never updated to mention F010/F011/F012, whose Server Actions (`openSecretBoxAction`, `markReadAction`, `markAllReadAction`) are the exact kind of item this note is supposed to enumerate. |

---

## 6. permissions-matrix.md

Mostly current (already covers F010/F011/F012 axes, dated header claims aside). Two findings:

| # | Sev | Finding |
|---|-----|---------|
| 20 | MINOR | Line 5 header: `+ 2 trục phân quyền GHI ở tầng RLS Postgres, cùng route \`/kudos\` (F008_KudosHeartReaction — thả tim; F009_KudosCompose ...)` — undercounts: F010's write axis (`open_secret_box()` RPC, `GRANT EXECUTE ... TO authenticated` at `supabase/migrations/0011_secret_box.sql:187`, `REVOKE EXECUTE ... FROM anon, PUBLIC` at line 186) is a 3rd write-permission axis under `/kudos`, referenced only in passing at lines 463/473 (inside the F012 section) and in the Cross-Reference checklist (line 545), but never given its own `##` subsection the way F009 got one (line 319: `### F009_KudosCompose — trục phân quyền GHI thứ ba`). |
| 21 | MINOR | Lines 108-109, 140-141: PERM002/PERM003 "Related Modules" list `app/login/page.tsx`, `app/todo/page.tsx`, `app/todo/actions.ts` — same stale pre-route-group paths as route-list.md findings #2/#3/#12. Real paths: `src/app/(public)/login/page.tsx`, `src/app/(protected)/todo/page.tsx`, `src/app/_actions/logout.ts`. |

---

## 7. behavior-logic.md

| # | Sev | Finding |
|---|-----|---------|
| 22 | BLOCKING | § "Realtime (WebSocket / SSE / EventSource)" (line 207-211) states: `N/A — no realtime patterns detected.` This is factually wrong. `src/api/notifications.ts:154-176` (`subscribeToNotifications`) opens a Supabase Realtime channel: `.channel(\`notifications:${userId}\`).on("postgres_changes", ...).subscribe()` (line 159-173), consumed by `src/app/_hooks/use-notifications-realtime.ts:42`. This matches the doc's own stated extraction signature for this section verbatim (`subscribe(channel)`). F012_NotificationsPanel is the source. |
| 23 | MINOR | Cross-Reference Validation checklist lines 169-170 still read `[ ] ... user-stories.md chưa tồn tại ở wave này` / `[ ] ... feature-list.md chưa tồn tại ở wave này (Wave 5)` — both files now exist (confirmed: `docs/vi/generated/user-stories.md`, `docs/vi/generated/feature-list.md` are both present with real content). Not corrected since generation. (BL001-003 count of 3 itself is legitimate — see note below, not drift.) |

Note (not drift): `feature-list.md` line 354 explicitly justifies why F004-F012 add zero new BL### — the RPC/trigger logic for F010/F012 lives in Postgres (`SECURITY DEFINER` functions/triggers in migrations 0011/0013), which is out of behavior-logic.md's client-side BL### scope by the doc's own type taxonomy. That reasoning is sound; only the Realtime section (finding #22) is an actual factual error, and the checklist (finding #23) is stale.

---

## 8. user-stories.md

| # | Sev | Finding |
|---|-----|---------|
| 24 | MINOR | Line 5 header: `**Analysis Scope**: ... 2 screens (\`/login\`, \`/todo\`), 3 interaction points` — stale scope, unchanged since wave 0. This is legitimately still accurate for what THIS document covers (only US001-US003 exist; `feature-list.md` itself says "F003-F012 chưa có US### chính thức (TBD)" at its own line 351), so the 3-story count is not drift — but the scope-line wording implies the whole app only has 2 screens, which is false (9 screens exist). |
| 25 | BLOCKING | Line 180: `[ ] All US### codes are referenced in FeatureList.md — feature-list.md chưa tồn tại ở wave này (Wave 5, chạy sau)` — false. `feature-list.md` exists and does reference US001/US002/US003 (`feature-list.md` §F001/F002 Related User Stories, confirmed via its own Summary line 351: "US001 (F002), US002 (F001), US003 (F001)"). Checklist row was never re-run. |
| 26 | BLOCKING | Line 21: `Server Action \`setLocale(locale)\` — \`app/actions/locale.ts\`` — same stale path as api-map.md finding #17. Real path: `src/app/_actions/set-locale.ts`. |
| 27 | BLOCKING | Line 23: `Server Action \`logoutAction()\` — \`app/todo/actions.ts\`` and line 137 (Technical Notes, US003): same stale path as screen-list.md finding #12 / permissions-matrix.md finding #21. Real path: `src/app/_actions/logout.ts`. |

---

## 9. traceability-matrix.md — biggest single gap

| # | Sev | Finding |
|---|-----|---------|
| 28 | BLOCKING | The Matrix table (lines 14-19) has rows for **F001 through F005 only**. F006_ProfilePage, F007_KudosLiveBoard, F008_KudosHeartReaction, F009_KudosCompose, F010_SecretBoxModal, F011_CountdownPrelaunchPage, F012_NotificationsPanel — **7 of 12 features — have no row at all.** Every F###↔SCR###↔US###↔BL###↔ROUTE###↔PERM### link for F006-F012 is simply absent, not merely broken. |
| 29 | MINOR | Line 3: `**Project**: Project` — placeholder never replaced (every other generated doc says `agentic-coding-hands-on`). |
| 30 | MINOR | Line 4: `**Generated**: 2026-09-05T08:34:08Z` — predates every later feature wave; file was never regenerated alongside feature-list.md's F006-F012 additions. |

Task item 6 answer, concretely: for F006-F012 every link column (SCR###, US###, BL###, ROUTE###, PERM###) is missing outright. Using the source-of-record files already read in this audit, the rows that should exist (values as currently knowable from other generated docs, several still legitimately TBD per those docs' own text):

| F### | SCR### | US### | BL### | ROUTE### | PERM### |
|---|---|---|---|---|---|
| F006 | SCR006 | TBD | — | — | joins PERM003 mechanism, no own code (permissions-matrix.md:204) |
| F007 | SCR007 | TBD | — | — | TBD, write axis (permissions-matrix.md §`/kudos`) |
| F008 | SCR007 | TBD | — | — | TBD, write axis 2 (permissions-matrix.md §`/kudos`) |
| F009 | SCR008 | TBD | — | — | TBD, write axis 3 (permissions-matrix.md:319) |
| F010 | SCR007 (no own SCR###) | TBD | — | — | TBD, write axis 4 (RPC `open_secret_box`, not yet its own subsection — see finding #20) |
| F011 | SCR009 | TBD | — | `/prelaunch` (frontend page, not ROUTE### backend) | site-wide lock axis, no PERM### (permissions-matrix.md:395) |
| F012 | SCR003, SCR004, SCR006, SCR007 (no own SCR###) | TBD | — | — | own-row READ+Realtime axis, no PERM### (permissions-matrix.md:452) |

---

## Cross-cutting pattern

Two systemic drift classes, not one-off typos:

1. **Pre-route-group file paths never migrated.** Every doc row generated in wave 0 (before the `(public)`/`(protected)` route-group refactor) still cites old flat paths (`app/login/page.tsx`, `app/todo/actions.ts`, `app/actions/locale.ts`, `components/home/*.tsx`, `hooks/*.ts`). Every row generated in later waves (F004+) correctly uses full `src/app/(public)/.../_components/*` paths. Findings #1-3, #6-12, #17, #21, #26-27 are all this one root cause, hit across route-list.md, screen-list.md, permissions-matrix.md, api-map.md, and user-stories.md.
2. **Doc regeneration stops short of the newest features.** `entities.md` stalled at F009, `api-map.md` stalled at F009, `behavior-logic.md`'s Realtime section and checklist stalled at wave 0, `traceability-matrix.md` stalled at F005. `feature-list.md`, `screen-list.md`, `route-list.md`, `permissions-matrix.md` were kept current through F012 — those four are the reliable ones; the other five lag by 3-7 features.

## Ranked severity summary

- **BLOCKING (19)**: #1,2,3,6,7,8,9,10,11,12,14,16,17,18,19,22,25,26,27,28 (20 total, listing corrected)
- **MINOR (11)**: #4,5,13,15,20,21,23,24,29,30

## What this audit did not cover

- `docs/vi/screens/SCR00*/spec.md` files (out of the 9-file scope given) — spotchecked only SCR008's spec.md for the add-link dialog question; did not diff the other 8 spec.md files against code.
- `docs/vi/generated/screen-flow.md` (out of scope) — already flagged stale by screen-list.md's own checklist (SCR007-009 missing); not independently re-verified here.
- No verification of `docs/vi/system/*` narrative docs referenced throughout (e.g. `permissions.md § Bổ sung dự kiến`) — out of the 9-file scope.
- RLS policy SQL was read for 0011/0012/0013 only; did not re-verify every PERM001-004 rule row against 0001-0009 migrations line-by-line (spot-checked headers/GRANTs only).

## Unresolved

- None blocking this report; the F006-F012 traceability-matrix gap (#28) is large enough that regenerating the whole file (rather than patching rows) is likely the right fix — that's an implementation call, not a research one.
