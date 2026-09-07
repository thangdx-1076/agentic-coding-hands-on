# doc-writer — F006_ProfilePage docs impact

Read the shipped code (`src/proxy.ts`, `src/constants/routes.ts`, `src/app/(protected)/layout.tsx`,
`src/app/(protected)/profile/**`, `src/dal/profile-cards*.ts`, `supabase/migrations/0005_profile_cards_view.sql`),
the promoted F006 specs, the forward-draft delta at `plans/260907-1224-profile-page/spec/system/permissions.md`,
and the evidence dir (`red-evidence.md`, `green-evidence.md`, `temper-phase-summary.md`) before touching anything.
`pnpm format:check` → exit 0.

## Changed (9 files)

1. **`docs/vi/system/permissions.md`** (curated, human-editable prose) — patched in place, +29 lines.
   - Fixed the pre-F006 drift: header said `/standards` "CHƯA tồn tại"; it shipped PUBLIC in F005
     (commits `4893a2f`/`310bd00`) and this file was never updated. Rewrote Analysis Scope to list
     `/`, `/awards`, `/standards` as PUBLIC and `/profile` as the new protected route.
   - Added F006 delta (finalized, not draft-marked): `/profile` joins `(protected)` group, no new
     gate; `public.profile_cards` view as the system's 2nd read boundary; fail-open note for
     `getProfileCard`; trimmed the "routes not yet built" bullet from 4→2 (`/kudos`, `/admin`).

2. **`docs/vi/screens/SCR006_Profile/spec.md`** (new, 11-section screen spec, matches SCR005's
   template/shape) — built from the real components (`profile-screen.tsx`, `profile-hero.tsx`,
   `profile-statistics-card.tsx`, `badge-collection.tsx`, `kudos-direction-select.tsx`,
   `parse-profile-id.ts`), not from the spec draft alone — the design/build diverged in one place
   worth flagging below.

3. **`docs/vi/generated/route-list.md`** — added `/profile` frontend-route entry + prose; updated
   the proxy matcher block/redirect table for `PROTECTED_ROUTES`; Summary 6→7 pages, 7→8 total.

4. **`docs/vi/generated/screen-list.md`** — added SCR006_Profile index row + full section; Total
   Screens 5→6; Cross-Reference Validation lines updated.

5. **`docs/vi/generated/feature-list.md`** — added F006 to the hierarchy table + full Feature
   Details block (components, screens, models, perms); Analysis Scope, Summary, and
   Cross-Reference Validation counts all bumped (5→6 features, 3→3 models unchanged count but
   `ProfileCard` added to the TBD list, etc).

6. **`docs/vi/generated/entities.md`** — added `PROFILE_ProfileCard` entity (view `profile_cards`,
   3 columns, fail-open note, no FK drawn but 1:1-derived-from note on `MODEL002_SupabaseUser.id`);
   honest-scope note and Summary count 4→5.

7. **`docs/vi/generated/permissions-matrix.md`** — added a `/profile` section mirroring the
   `/awards`/`/standards` "no PERM### assigned yet" sections, but marked PROTECTED (not public) —
   it extends PERM003_TodoRouteGuard's mechanism via the widened `PROTECTED_ROUTES` array, no new
   gate. Documented the `profile_cards` read boundary. Updated Analysis Scope + Cross-Reference
   Validation.

8. **`docs/vi/generated/screen-flow.md`** — added SCR006 to the nav-map mermaid, a Feature Entry
   Points block, Screen Access Paths rows, a full Screen Transitions subsection, an Authentication
   Flow row, 3 Error Handling rows, a new GUARD-005 (mirrors GUARD-003, same layout), and updated
   GUARD-001's pseudocode for the `PROTECTED_ROUTES` array. Updated Analysis Scope + Circular
   Dependencies note.

9. **`docs/vi/system/architecture.md`** — this was the one with real (not just missing) drift:
   the mermaid diagram and prose still said chrome (`SiteHeader`/`SiteFooter`/`get-viewer.ts`/etc.)
   lived at `src/app/(public)/_components/` and `(public)/_utils/`. It moved to root `src/app/_*`
   in this delivery (confirmed via `find` — 31 files) because `(protected)/profile` needs it and
   the repo's `no-restricted-imports` rule forbids a route group importing another group's `_*`
   folder sideways. Fixed the diagram nodes, the Zone B route-segment list, the DAL paragraph (new
   `profile-cards.ts`/`profile-cards-client.ts`, contrasted against `security_invoker=false` vs.
   `awards`'s open RLS), the guard-layer prose (`PROTECTED_ROUTES` array replacing the single
   `startsWith` check), and the Tech Stack Database row.

## Also touched, and why (beyond the assignment's explicit list)

- **`docs/vi/features/F006_ProfilePage/README.md`** — its own status line still said `draft`,
  "chưa implement, chưa promote vào docs/", and its allocation-log table still called F###/SCR###
  "chưa đăng ký" — directly contradicting the sibling `functional-spec.md`/`technical-spec.md` in
  the same directory (already flipped to `status: implemented` by the orchestrator). Fixed the
  status header and the two now-false registry rows.
- **`docs/vi/features/F006_ProfilePage/functional-spec.md` § 14** and
  **`technical-spec.md`**'s § 5.1 "Kết quả Delivery" line — both still read "CHƯA CÓ, đây là spec
  draft" even though `green-evidence.md` records a genuine 22/22 GREEN run. Patched both to state
  the real result (22/22, regression counts, CI-only-runs-C17 caveat) instead of leaving a
  contradiction between the frontmatter (`implemented`) and the body (`draft`). This is a factual
  status fill-in inside an existing section, not a restructure — no code family (FR/BR/SM/etc.) or
  heading touched.

I did not touch `docs/vi/_canonical-fcodes.json` (already correct — orchestrator registered F006/
SCR006_Profile before I started) or `docs/vi/generated/{user-stories,behavior-logic,api-map}.md`
(checked all three: F006 doesn't register new US### — same precedent as F003-F005 — doesn't add a
new BL### client type, and doesn't add a backend route or PostgREST-table api-map row, same as
`public.awards` never got one).

## Checked, found already correct

- `docs/vi/_canonical-fcodes.json` — F006/SCR006_Profile present, matches `feature-list.md`/
  `screen-list.md` I just wrote.
- `src/proxy.ts`, `src/constants/routes.ts`, `supabase/migrations/0005_profile_cards_view.sql`,
  `src/dal/profile-cards*.ts` — all match what the promoted technical-spec.md § 3.1 claims,
  verified by reading the actual files, not by trusting the spec.
- `docs/vi/generated/behavior-logic.md`, `api-map.md`, `user-stories.md` — no F006-shaped gap;
  confirmed no new BL###/route/US### was warranted (F006's own README already says so, and I
  checked it against the actual DAL pattern, which reuses `SupabaseServerClient`).

## Flagged but left alone (outside a surgical edit's remit)

- **`docs/vi/features/F006_ProfilePage/technical-spec.md` § 5.2** ("Assumptions & Unresolved")
  still frames 3 things as open that the implementation actually resolved: the empty-state Kudos
  copy (`emptyReceived`/`emptySent`) shipped as *"Bạn chưa có Kudos nào được nhận/gửi."*, not the
  placeholder text quoted in § 4.3/§ 5.2 (*"Bạn chưa nhận Kudos nào."*); the 6 badge slots reused
  F005's existing PNG assets (`public/standards/badge-*.png`) rather than new profile-specific
  artwork; slugs came out as `badgeSlot1..6`. None of this is wrong, but § 5.2 isn't a coded
  BR/SM/ALG/INT/DEC row — it's a prose assumptions list — so rewriting it crosses from "factual
  status fill-in" into "narrative edit" territory I wasn't asked to do here. Flagging for whoever
  next opens `technical-spec.md` with full-content authority (`rebuild-spec` Wave 9, or an explicit
  ask).
- **Accessibility gap**: SCR006's Kudos-direction empty-state copy change has no `aria-live` region
  — noted in the new `SCR006_Profile/spec.md` § 8 as `[PARTIAL]`, not blocking (not one of the 18
  in-scope MoMorph test cases).

## Unresolved

- None — the two items above are informational flags, not blockers.

**Status:** DONE
**Summary:** Reconciled the pre-existing `/standards` drift in `permissions.md`, added the F006
delta across the curated doc + 6 generated inventories + architecture.md's chrome-promotion
description, wrote the missing `SCR006_Profile/spec.md`, and fixed 3 files (F006's own README +
functional-spec §14 + technical-spec's delivery line) that still contradicted their own
`status: implemented` frontmatter. `pnpm format:check` exit 0.
**Verdict:** updated 12 files (9 assigned + 3 self-consistency fixes), created 1 file.
