---
type: researcher-report
status: DONE
scope: docs-vs-code parity audit (F001-F012, SCR001-SCR009, system docs, nav index)
method: manual read-only diff (no Task-tool fan-out available to this agent; audit-doc-parity
  skill's full blind-regen pipeline was NOT run — see Limits at bottom)
---

# Feature/Screen/System docs — drift audit vs code

Legend: **BLOCKING** = factually wrong or artifact missing · **MINOR** = stale path/cosmetic.

## 1. Missing artifacts

| # | Finding | Evidence | Rank |
|---|---|---|---|
| 1.1 | F010_SecretBoxModal, F011_CountdownPrelaunchPage, F012_NotificationsPanel have NO `README.md` | `ls docs/vi/features/F010_SecretBoxModal docs/vi/features/F011_CountdownPrelaunchPage docs/vi/features/F012_NotificationsPanel` → only `functional-spec.md`+`technical-spec.md` each. F001-F009 all have `README.md`. Confirmed. | BLOCKING |
| 1.2 | `docs/vi/features/README.md` (feature index) lists only F001-F005 (5 of 12) | `docs/vi/features/README.md:9-13` — 5 bullet links. `docs/vi/generated/feature-list.md:9-20` has 12 rows F001-F012 (source of truth). F006-F012 missing from the index = 58% of features unreachable via the nav table. | BLOCKING |
| 1.3 | F010/F012 need NO dedicated SCR###, F011 already has one — not a gap | `docs/vi/generated/screen-list.md:366` checklist: "SCR007 → F007+F008", "SCR008 → F009", "SCR009 → F011"; F010 (SecretBoxModal) ships as a modal inside SCR007/SCR008 UI (no new screen), F012 (NotificationsPanel) ships as `NotificationBell` interactive component reused across screens (`docs/vi/generated/screen-list.md:132`). `screen-list.md` total is 9, matches `ls docs/vi/screens/` = 9 dirs. No screen-spec gap. | — (confirms no drift) |
| 1.4 | `docs/.reading-order.json` is an empty scaffold, `lang` wrong | File has `quickPath.nums=[]`, `roles=[]`, `layers=[]` (lines 6-10), `lang: "en"` (line 3) while every doc under audit is Vietnamese (`docs/vi/**`, no `docs/en/` dir exists — confirmed `ls docs/`). See §5 for exact corrected content. | BLOCKING |
| 1.5 | `plans/260909-0204-admin-route-guard/` is an empty scaffold — task brief's premise is wrong | `find plans/260909-0204-admin-route-guard -type f` → 0 files. Only 2 empty dirs (`spec/admin-route-guard`, `spec/system`), no `plan.md`, no phase files. No admin code anywhere: `src/constants/routes.ts:11-21` has no `ADMIN` entry, `find src -iname "*admin*"` → 0 hits. Only trace in git history is a **test-only** commit `8e11fbe` adding an E2E "promote-to-admin" helper for role-aware header assertions (`tests/e2e/helpers/promote-to-admin.ts`), not a route/guard feature. **Correction: the admin-route-guard plan did NOT land — F001's "no role-based routing" claim and permissions.md's "`/admin` chưa tồn tại" claim are both still accurate**, not stale. | BLOCKING (wrong premise, corrects the task brief) |

## 2. Per-feature drift (F001-F012)

| Feature | Status frontmatter | Stale non-`src/` path refs in technical-spec.md | Verdict |
|---|---|---|---|
| F001_GoogleOAuthLogin | **missing** `status:` key entirely (`docs/vi/features/F001_GoogleOAuthLogin/technical-spec.md:1-9`, only has `authored_by: rebuild-spec`) | 24 | **BLOCKING** — pervasively stale |
| F002_LanguageSwitch | **missing** `status:` key entirely (`docs/vi/features/F002_LanguageSwitch/technical-spec.md:1-9`) | 8 | **BLOCKING** — pervasively stale |
| F003_Homepage | `status: implemented` (`docs/vi/features/F003_Homepage/technical-spec.md:2`) | 55, plus repeated `(planned)` markers | **BLOCKING** — marked implemented, reads as an unreconciled draft |
| F004_AwardSystemPage | `implemented` | 0 | OK (spot-checked, matches) |
| F005_StandardsRulesPage | `implemented` | 0 | OK |
| F006_ProfilePage | `implemented` | 0 | OK — spot-checked `src/dal/profile-cards.ts:74` (`getProfileCard`) matches architecture.md's own citation exactly |
| F007_KudosLiveBoard | `implemented` | 0 | OK — hero Sunner-profile search fix (recent commit) IS reflected: `docs/vi/features/F007_KudosLiveBoard/technical-spec.md:166-230` cites `src/app/(public)/kudos/_hooks/use-hero-profile-search.ts` / `_components/kudos-hero-profile-search.tsx` / `kudos-hero-search-pill.tsx`, verified against real files — accurate |
| F008_KudosHeartReaction | `implemented` | 0 | OK |
| F009_KudosCompose | `implemented` | 0 | OK |
| F010_SecretBoxModal | `implemented` | 0 | OK (but no README, see 1.1) |
| F011_CountdownPrelaunchPage | `implemented` | 0 | OK (but no README, see 1.1) |
| F012_NotificationsPanel | `implemented` | 0 | OK (but no README, see 1.1) |

### F001_GoogleOAuthLogin — detail (BLOCKING, cite `path:line`)

Doc cites the **pre-both-migrations** flat layout (before route-colocation AND before the `src/` move). None of these paths exist on disk today.

| Doc claim (`docs/vi/features/F001_GoogleOAuthLogin/technical-spec.md`) | Real current path |
|---|---|
| `:77,85,99,121` `app/login/page.tsx:75-85`, `:32-67`, `:94-99` | `src/app/(public)/login/page.tsx` (82 lines total) |
| `:101,121` `components/login/google-login-button.tsx:21-53,28-33` | `src/app/(public)/login/_components/google-login-button.tsx` |
| `:101,121` `hooks/use-login-actions.ts:42-57` | `src/app/(public)/login/_hooks/use-login-actions.ts` (69 lines total) |
| `:121` `lib/auth/sign-in-with-google.ts:39-55` | `src/api/auth.ts` (56 lines total, fn `signInWithGoogle`) |
| `:130,135,138` `app/auth/callback/route.ts` | `src/app/auth/callback/route.ts` (path unchanged in name, but doc doesn't carry `src/` prefix anywhere) |
| `:169,180,192` `components/todo/todo-screen.tsx` | `src/app/(protected)/todo/_components/todo-screen.tsx` |
| `:175,180` `app/todo/page.tsx:26-28`, `:9-39` | `src/app/(protected)/todo/page.tsx` |
| `:195` `app/todo/actions.ts:14-24` (`logoutAction`) | `src/app/_actions/logout.ts` (25 lines total) |
| `:223,446` `app/page.tsx:150-166` | `src/app/(public)/(home)/page.tsx` |

### F002_LanguageSwitch — detail (BLOCKING)

| Doc claim (`docs/vi/features/F002_LanguageSwitch/technical-spec.md`) | Real current path |
|---|---|
| `:58,66,80,82,95,97-99,127,149,339` `components/login/language-selector.tsx` | `src/app/_components/language-selector/language-selector.tsx` (102 lines total, promoted to shared chrome per architecture.md F006 update) |
| `:82` `hooks/use-menu-keyboard-nav.ts:58-171` | `src/hooks/use-menu-keyboard-nav.ts` |
| `:82` `lib/ui/roving-index.ts:10-24` | `src/utils/a11y/roving-index.ts` |
| `:97-99` `components/login/login-header.tsx`, `components/login/login-screen.tsx`, `app/login/login-client.tsx` | `src/app/(public)/login/_components/login-header.tsx`, `login-screen.tsx`, `login-client.tsx` |
| `:123,125,127` `app/actions/locale.ts:20-23,35-43` | `src/app/_actions/set-locale.ts` (44 lines total) |

### F003_Homepage — detail (BLOCKING — 55 stale refs, `status: implemented` is false-confidence)

Sample (`docs/vi/features/F003_Homepage/technical-spec.md`):

| Line | Doc claim | Real current path |
|---|---|---|
| `:44,46,51` | `app/page.tsx`, `lib/auth/get-user-role.ts`, `lib/supabase/users-role-client.ts` | `src/app/(public)/(home)/page.tsx`; `src/dal/users.ts` (`getUserRole`); `src/dal/users-role-client.ts` |
| `:60,62,67` | `components/home/countdown-timer.tsx` (planned), `hooks/use-countdown.ts` (planned), `lib/countdown/countdown.ts` | `src/app/(public)/(home)/_components/countdown-timer.tsx`; `src/app/(public)/(home)/_hooks/use-countdown.ts`; `src/app/(public)/(home)/_utils/countdown.ts` (note: `countdown.ts` later climbed to `src/utils/countdown.ts` per F011 delta in architecture.md — doc reflects neither location) |
| `:76,83,86` | `components/home/nav-link.tsx` | `src/app/_components/nav-link.tsx` (promoted to shared root, confirmed by `find src -iname nav-link.tsx`) |
| `:95,96,101` | `components/home/account-menu.tsx`, `app/todo/actions.ts` (`logoutAction`) | `src/app/_components/account-menu.tsx`; `src/app/_actions/logout.ts` |
| `:110,115` | `components/home/notification-bell.tsx` | `src/app/_components/notification-bell.tsx` — **also functionally stale**: doc says this renders a static "no notifications" dialog with no fetch (F012 not yet built); F012_NotificationsPanel has since shipped a real paginated/realtime panel (`docs/vi/generated/screen-list.md:132`) — F003 tech-spec never got a reconciliation delta for this, unlike architecture.md/permissions.md which do carry per-feature delta sections |

### Screens SCR001/SCR002/SCR003 — never promoted past `draft`, carry the same stale paths

| Screen | status | Evidence |
|---|---|---|
| SCR001_Login | `draft` (`docs/vi/screens/SCR001_Login/spec.md:2`) | `:107` cites `app/login/page.tsx:33-36` → real: `src/app/(public)/login/page.tsx` |
| SCR002_Todo | `draft` (`docs/vi/screens/SCR002_Todo/spec.md:2`) | No stale path refs found, but guard description likely predates `(protected)/layout.tsx` centralization (F006 delta, architecture.md:188-197) — not re-verified line-by-line, flagged for scope reasons (see Limits) |
| SCR003_Home | `draft` (`docs/vi/screens/SCR003_Home/spec.md:2`) | 13 stale refs: `:103,105,106,118,119` `components/home/account-menu.tsx`/`nav-link.tsx` → real `src/app/_components/*`; `:127` `lib/auth/get-current-user-role.ts` → real `src/dal/users.ts`; `:128` `hooks/use-countdown.ts` (no `src/app/(public)/(home)/_hooks/` prefix); `:152` `app/login/login-client.tsx` → real `src/app/(public)/login/_components/login-client.tsx`; `:158-162` `components/home/home-header.tsx`/`home-footer.tsx`/`award-card.tsx` → renamed+moved to `src/app/_components/site-header.tsx`/`site-footer.tsx` (per architecture.md:30-31) and `src/app/(public)/(home)/_components/award-card.tsx`; `:165` `app/todo/actions.ts` → real `src/app/_actions/logout.ts`. **Functionally wrong too**: `:158-162` label `/awards`, `/kudos`, `/standards` as "chưa implement" (not yet built) — all three now exist and are live routes (`src/app/(public)/awards/page.tsx`, `src/app/(public)/kudos/page.tsx`, `src/app/(public)/standards/page.tsx`) | BLOCKING |

## 3. Per-screen drift summary (SCR004-SCR009)

No stale component-table rows found (0 non-`src/` refs each, matching their `status: implemented`). Route-colocation refactor impact is correctly absorbed — none of SCR004-SCR009 reference the old flat `app/<route>/page.tsx` / `components/<route>/**` layout. Only SCR001-SCR003 (§2 above) are affected.

## 4. System docs

| Finding | Evidence | Rank |
|---|---|---|
| 4.1 | `architecture.md` main-body prose (non-delta section) states the OLD 6-route literal `config.matcher` | `docs/vi/system/architecture.md:183-187`: "`src/proxy.ts` — guard optimistic (matcher `/`, `/login`, `/todo/:path*`, `/awards`, `/standards`, `/profile`...)" — contradicted by the real file: `src/proxy.ts:187-188` uses a negative-lookahead matcher (`"/((?!api\|auth\|_next/static\|_next/image\|favicon.ico\|.*\\..*).*)"`). The correct value IS documented, but only in a delta section 500+ lines further down (`architecture.md:736-749`, "Bổ sung dự kiến — CountdownPrelaunchPage" § "(b) Cú pháp matcher..."). Main body never reconciled after F011 merged into the matcher logic. | MINOR (correct info exists in-file, just unmerged/duplicated) |
| 4.2 | `permissions.md` Analysis-Scope line says `/kudos`, `/admin` "CHƯA tồn tại" | `docs/vi/system/permissions.md:18` — false as written; `/kudos` exists (`src/app/(public)/kudos/page.tsx`). Corrected further down in the same file's delta section: `permissions.md:152-165` ("`/kudos` rời khỏi danh sách route đích chưa tồn tại"). Same unmerged-delta pattern as 4.1. `/admin` claim remains accurate (see 1.5). | MINOR |
| 4.3 | `architecture.md` covers route-colocation, DAL, `proxy.ts`, Supabase SSR layering correctly for F001-F006 | Confirmed against code: Zone A/B split (`architecture.md:76-92`), guard split `proxy.ts`+`(protected)/layout.tsx` (`architecture.md:182-200`) verified against `src/proxy.ts:19,46-99` and needs `src/app/(protected)/layout.tsx` (not separately re-read this pass, cited consistently by 3 independent doc sections). | — (no drift for F001-F006 scope) |
| 4.4 | `architecture.md`'s System-Architecture Mermaid diagram (the one diagram meant to represent "current layering") only models routes through F006_ProfilePage | `docs/vi/system/architecture.md:94-180` — no `/kudos`, `/prelaunch`, `/admin` menu item, or notifications nodes in the diagram itself; F007-F012 are documented only as prose deltas below it (`:368-757`), never folded into the diagram. Given the repo now has 8 pages (`src/app/**/page.tsx` × 8) the primary architecture diagram represents exactly half of them. | MINOR (deltas are textually complete, just not diagrammed) |
| 4.5 | `permissions.md` DOES cover the admin role and the prelaunch lock, thoroughly | Admin role: `permissions.md:40-51` (role column, fail-open `member`, UI-only screen-permission, not yet a route-guard). Prelaunch lock: `permissions.md:472-540` (full delta section, matches `src/domain/prelaunch-lock.ts`/`src/proxy.ts` as-built per its own reconciliation note at `:474-478`). | — (confirms no drift, answers task item 4) |

## 5. Nav index — what `docs/.reading-order.json` and `docs/README.md` should contain

**Current state** (confirmed): `docs/.reading-order.json` has `lang: "en"`, `quickPath.nums: []`, `roles: []`, `layers: []` — a schema shell with zero content. `docs/README.md` (root, English) is likewise an empty generated shell ("Rows for passes that have not run are omitted from this index").

**The content already exists, hand-authored, in prose form at `docs/vi/README.md`** — it was simply never mirrored into the machine-readable JSON. Exact values to port:

- `lang`: `"vi"` (not `"en"` — every doc under `docs/vi/**` is Vietnamese; no `docs/en/` tree exists in this repo)
- `quickPath.nums`: `[1, 2, 4, 5]` — lifted verbatim from `docs/vi/README.md:7` ("Đọc nhanh tối thiểu: 1 → 2 → 4 → 5")
- `roles`: 3 entries from `docs/vi/README.md:9-11`:
  - Dev mới — vào việc nhanh: `[1,2,4,5,7,15]`
  - Reviewer — quy tắc, phân quyền, contract: `[2,13]`
  - PM/BA — phạm vi và hành vi: `[1,5,6]`
- `layers`: 4 groups, numbers taken from `docs/vi/README.md:13-42` section headers:
  - Layer 1 "Định hướng": `[1,2]` → `overview.md`, `architecture.md`
  - Layer 2 "Mô hình nghiệp vụ": `[4,5,6]` → `entities.md`, `feature-list.md`, `user-stories.md`
  - Layer 3 "Giao diện & hành vi": `[7,8,9,10,12,13]` → `screen-list.md`, `screen-flow.md`, `route-list.md`, `api-map.md`, `behavior-logic.md`, `permissions-matrix.md`
  - Layer 4 "Đào sâu": `[15,16,17]` → `features/`, `screens/`, `traceability-matrix.md`
- All 17 numbered docs referenced in `docs/vi/README.md` exist on disk (`docs/vi/generated/*.md` — confirmed: entities, feature-list, user-stories, screen-list, screen-flow, route-list, api-map, behavior-logic, permissions-matrix, traceability-matrix all present under `docs/vi/generated/`), so nothing here needs deferring for a missing pass — this is a pure data-entry gap, not a generation gap.

`docs/README.md` (root, English) can stay minimal/empty by design if the project intends VI-only documentation going forward — but if `docs/.reading-order.json`'s `lang` field is meant to select which prose file drives the reading-order UI, it must point at `vi`, not `en`, or the UI will silently render the wrong (empty) language.

## Ranked summary of BLOCKING items

1. `docs/vi/features/README.md` indexes 5/12 features — F006-F012 unreachable from the nav table (`docs/vi/features/README.md:9-13` vs `docs/vi/generated/feature-list.md:9-20`).
2. F010/F011/F012 have no `README.md` (no per-feature reading-order page).
3. F001 and F002 `technical-spec.md` are wholesale stale — every `Source:`/path citation points at a pre-refactor, pre-`src/` flat layout that no longer exists (24 and 8 dead path refs respectively); both also lack the `status:` frontmatter key every other feature doc has.
4. F003 `technical-spec.md` claims `status: implemented` but is written as an unreconciled forward-draft — 55 dead path refs, several explicit `(planned)` markers, and a functionally wrong claim that the notification bell has no real backend (F012 shipped one since).
5. SCR001/SCR002/SCR003 screen specs remain `status: draft` and SCR001/SCR003 carry the same dead pre-refactor paths; SCR003 additionally misstates `/awards`, `/kudos`, `/standards` as not-yet-implemented when all three are live.
6. `docs/.reading-order.json` is an empty schema shell (`quickPath.nums=[]`, `roles=[]`, `layers=[]`) with `lang: "en"` in an all-Vietnamese doc set — the correct content already exists hand-authored in `docs/vi/README.md` and just needs porting (see §5 for exact values).
7. Task-brief correction: `plans/260909-0204-admin-route-guard/` is an empty scaffold (no plan.md, no code) — it did NOT land; `/admin` still doesn't exist in `src/`, so F001's and permissions.md's "no admin route yet" claims are still correct, not stale.

## Limits

- No Task-tool available to this agent → could not run `audit-doc-parity`'s blind-regen fan-out (one agent per feature unit, agent never sees the doc before re-describing code). This audit was a single-pass manual diff instead: faster but carries a higher false-negative risk on subtle field-level drift (e.g. a citation that points at the right file/right lines but describes stale *behavior*) inside the 7 features marked "OK" in §2 — those were spot-checked (1-2 citations each), not exhaustively diffed line-by-line.
- SCR002_Todo was checked for stale paths only (0 found); its guard-description prose was not independently re-verified against `src/app/(protected)/layout.tsx` this pass.
- `docs/README.md` (root, English) treated as out-of-scope for content since the product doc set is VI-only by evident design — flagged only for the `lang` mismatch in the JSON index, not audited further.
- Did not audit `docs/vi/generated/*.md` (entities/feature-list/user-stories/screen-list/screen-flow/route-list/api-map/behavior-logic/permissions-matrix/traceability-matrix) content for drift — task scope named features/screens/system docs only; these were read only to confirm they exist and to source the nav-index correction in §5.
