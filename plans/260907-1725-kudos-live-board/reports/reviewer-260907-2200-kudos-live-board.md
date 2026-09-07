# Review — `/kudos` (F007_KudosLiveBoard + F008_KudosHeartReaction)

## Review Summary

### Scope
- Migrations: `supabase/migrations/0006_kudos.sql`, `0007_kudo_hearts.sql`, `0008_kudos_demo_seed.sql`
- DAL: `src/dal/{kudos,kudos-client,kudos-cards-query,kudo-hearts,kudo-hearts-client,kudos-stats,kudos-stats-client}.ts`
- Route: `src/app/(public)/kudos/**` (page, `_components`, `_hooks`, `_utils`, `_actions`, `_shared`)
- i18n: `messages/{vi,en}.json` (`kudos` namespace)
- Tests: `tests/e2e/kudos.spec.ts` (798 lines), 1-line comment fix in `tests/e2e/standards.spec.ts`
- Evidence: `study-context.json`, `clarifications.md`, `plan.md`, `rls-verification.md`, `seed-transcript.md`, `green-evidence.md`, `red-evidence.md`, `temper-results.json`, `visual/README.md`
- Depth: full — read every migration, every DAL file, every server action/hook that touches auth or the DB, the full e2e contract, and cross-checked all evidence documents against the code rather than trusting their prose.

### Assessment
This is the strongest-engineered feature in the repo to date, and it is also the first one with a real write path, so it earned the closest read. The RLS/grant model on `kudos`, `kudo_hearts`, and the `kudos_cards` view is correct and independently proven with real `psql` output (not just asserted) in `rls-verification.md` — REVOKE-before-GRANT, FORCE RLS, a `SECURITY DEFINER` trigger with a pinned `search_path`, a `WITH CHECK` that blocks self-hearting even via a direct REST call, and a `UNIQUE` constraint that is the actual race-closer, not a UI check. The server action fails closed, never trusts a client-supplied heart state, and re-reads the `23505` race correctly. Nothing here is a security hole.

The gap is scale, not security: `getKudosBoard`'s "totals" read has no `limit`, so it pulls every row of `kudos_cards` (every column, both people's full join) on every single page view and every infinite-scroll page, purely to compute a count and two dedup lists — compounded by two correlated per-row subqueries in the view with no supporting index. At 12 seed rows this is invisible; on a board meant to accumulate real kudos indefinitely, it will not stay invisible. This is the one finding worth fixing before this pattern gets copied into the next feature.

I also caught two evidence-hygiene issues: `study-context.json`'s acceptance criterion #1 cites test IDs that exist in a different file and test different content, and `green-evidence.md` still contains a "C15 is an app bug, unresolved" verdict three sections after the same document already recorded the real (data, not code) root cause and "C15 now PASSES." Neither affects what actually ships — I verified the department-filter code directly and it is correct — but both should be cleaned up so the evidence trail says one true thing.

All 15 acceptance criteria in `study-context.json` are met (12 cleanly, 3 with already-disclosed, already-adjudicated caveats: `CEVC20`'s fabricated department value, the single repeated seed placeholder, and the gray-heart placeholder color). None of the 8 disclosed deviations in the task brief need re-litigating — each has a defensible, minimal-footprint rationale on record, and the team's own process (see `visual/README.md`'s self-correction of a duplicated screenshot and a false "high fidelity" claim) shows real adversarial checking already happened before this reached me.

### Critical
None.

### High

**H1 — Unbounded full-table read on every `/kudos` render and every infinite-scroll page.**
`src/dal/kudos.ts:99-101` calls `selectCards(client, {})` with no `hashtag`/`department`/`cursor`/`sort`/`limit` — every field of every row in `kudos_cards` — solely to derive `spotlightTotal` (`totalsRows.length`), `spotlightNames`, and the two filter-option dedup lists. This read runs on the initial page load AND inside `loadMoreKudos` (`src/app/(public)/kudos/_actions/load-more-kudos.ts:54`) on every scroll-triggered fetch, so a user scrolling through 10 pages issues 10 full-table reads, not 1. Harmless at 12 rows; a hard scaling wall on a board explicitly designed to keep accumulating kudos.
- Fix: replace the totals read with `supabase.from("kudos_cards").select("*", { count: "exact", head: true })` for `spotlightTotal`, and derive `spotlightNames`/filter option lists from a lightweight aggregate (e.g. `SELECT DISTINCT` against a narrower column set, or cache them — they change only when a new kudo/department is added, not on every request) instead of shipping every row over the wire to `.map()`/`.filter()` client-side in the DAL.
- Location: `src/dal/kudos.ts:100`.

**H2 — No index backs the view's per-row correlated subqueries or the stats DAL's filters.**
`kudos_cards` (`supabase/migrations/0006_kudos.sql:89,92`) computes `sender_kudos_received`/`receiver_kudos_received` via `(SELECT count(*) FROM public.kudos WHERE receiver_id = su.id)` — one subquery per side, per row. The only indexes created are on `heart_count`/`created_at`/`hashtags` (`0006_kudos.sql:48-56`); there is none on `kudos.receiver_id` or `kudos.sender_id`. Every one of those subqueries, plus `src/dal/kudos-stats.ts`'s `.eq("sender_id", …)`/`.eq("receiver_id", …)` reads (run on every authenticated `/kudos` view for the sidebar stats), sequential-scans `kudos` as it grows. Combined with H1, a single page view already re-scans the table several times over.
- Fix: `CREATE INDEX idx_kudos_receiver_id ON public.kudos (receiver_id);` and `CREATE INDEX idx_kudos_sender_id ON public.kudos (sender_id);` in a follow-up migration.
- Location: `supabase/migrations/0006_kudos.sql:89`, `:92`.

Neither is Critical — no data loss, no auth bypass, no breaking change — but both are exactly the "no filtered column left without an index" / "no unbounded loop of database calls" pattern this review is chartered to catch before it ships, and this is the first feature where it can compound release over release.

### Medium

**M1 — Heart button has no in-flight guard against a rapid double-click.**
`src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:40-58`'s `toggleHeart` fires the server action on every click with nothing disabling the button while a request is outstanding. Two rapid clicks both read "not yet hearted" server-side before either commits; the loser's `23505` handler re-selects and also reports `hearted:true`. The DB invariant (exactly one `kudo_hearts` row) is never violated — Postgres's `UNIQUE` constraint is doing its job — but a user's actual "heart, then quickly unheart" intent can silently collapse to "still hearted," which reads as a bug from the UI even though the data is correct.
- Fix: track a per-card `pending` set (or disable via `heartOverrides`) and ignore/disable `onToggle` while that card's request is in flight, mirroring the pattern `useInfiniteFeed`'s `isLoadingRef` already uses one hook over.
- Location: `src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:40`.

**M2 — `green-evidence.md` asserts two contradictory outcomes for the department filter.**
Line 65 records the corrected root cause ("Data corruption from cleanup, not app bug... **C15 now PASSES**"), but lines 117, 204, and 242 of the *same file* still list it as `[APP BUG — NOT FIXED]`, "Assigned to: Implementation track," and score the acceptance criterion as failed ("Score: 12/15"). I independently read `src/dal/kudos.ts`'s `filters.departments` derivation and `kudos-filter-menu.tsx` and both are correct; the freshly re-run full e2e suite (0 fail, per the task brief) confirms this. The document just never got reconciled after the correction landed.
- Fix: delete/update the stale "Known Issues" and "Acceptance Criteria Status" sections in `green-evidence.md` so it states one outcome, not two.
- Location: `plans/260907-1725-kudos-live-board/evidence/green-evidence.md:65` vs `:117`, `:204`, `:242`.

**M3 — `study-context.json`'s acceptance criterion #1 cites the wrong file and wrong test IDs.**
It claims GET `/kudos` returning 200 "satisfies awards.spec TC ID-12 and ID-14." `tests/e2e/awards.spec.ts` has no ID-12 or ID-14 — those IDs belong to `tests/e2e/home.spec.ts` (hero countdown timer, event info text — unrelated to `/kudos`'s existence). The actual awards.spec cases about the Kudos section are ID-8 and ID-3 (`tests/e2e/awards.spec.ts:37,165`). The underlying requirement is genuinely met — `tests/e2e/kudos.spec.ts` C01 tests exactly this and passes — so this doesn't block shipping, but the citation is fabricated and should not be trusted as-is for a future audit.
- Fix: correct the citation in `study-context.json` (or drop it — the C01 test is sufficient justification on its own).
- Location: `plans/260907-1725-kudos-live-board/evidence/study-context.json:5`.

### Low

**L1 — Original visual evidence needed a second pass before it was trustworthy.**
`green-evidence.md:185` claimed "Design fidelity: High... No material visual discrepancies," while the two submitted screenshots were byte-identical duplicates (same MD5) that never captured the logged-in state at all. `evidence/visual/README.md` documents the orchestrator catching both the duplicate file and the false fidelity claim, then re-shooting and re-verifying the Spotlight scatter fix via `browser_evaluate`. Already resolved — noted only so the pattern ("tester self-reports high fidelity" isn't free evidence) gets carried into the next feature's review.
- Location: `plans/260907-1725-kudos-live-board/evidence/green-evidence.md:185`.

**L2 — Forward-looking: no `images.remotePatterns` configured, and `image_urls` will eventually be user-supplied.**
`next.config.ts` sets no image remote patterns, and `KudosImageStrip` (`src/app/(public)/kudos/_components/kudos-image-strip.tsx:30`) renders `card.imageUrls` through `next/image` unchecked. Not exploitable today — `kudos.image_urls` has no INSERT/UPDATE path at all in this PR (F007 is read-only, confirmed by `0006_kudos.sql`'s own comment) — but when the deferred Compose-Kudo dialog ships, an unvalidated/unrestricted `image_urls` value handed to the Next.js image optimizer is an SSRF/resource-abuse vector. Flag for that phase's plan, not a blocker now.
- Location: `next.config.ts:1-7`; `src/app/(public)/kudos/_components/kudos-image-strip.tsx:30`.

### Acceptance Criteria — all 15 (from `evidence/study-context.json`)

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | GET /kudos 200 for anon | **Met** (citation in study-context.json wrong — M3 — but behavior verified) | `kudos.spec.ts` C01 |
| 2 | Banner title + logo, non-interactive | Met | `kudos-banner.tsx`, C02 |
| 3 | Input pill exact placeholder + pencil icon | Met | `kudos-compose-pill.tsx`, C03 |
| 4 | Highlight carousel top-5, prev/next disabled at ends, `x/5` | Met | `use-carousel-index.ts` (verified logic), C11/C12 |
| 5 | Hashtag/department filter both sections, resets pagination | Met | `use-kudos-filters.ts`, `use-carousel-index.ts`'s count-triggered reset, C14/C15/C16 |
| 6 | Click hashtag on card sets filter | Met | `kudos-hashtag-list.tsx` → `selectHashtag`, C16 |
| 7 | Infinite scroll without full navigation | Met | `use-infinite-feed.ts` (keyset cursor, in-flight guard), C18/C19 |
| 8 | Empty feed exact string | Met | both locale files, C07 |
| 9 | Empty sidebar leaderboard exact string | Met | both locale files, C08 |
| 10 | Copy Link + exact toast | Met | `handleCopyLink`/`useKudosToast`, C23 |
| 11 | Heart: 1/user/kudo, sender can't self-heart, unheart revokes exact credit | Met | DB-proven (`rls-verification.md` TEST2-4/6, real psql output), UI-proven (`deriveKudosCardState`); C26 e2e assertion honestly `test.fixme()`'d (no compose dialog yet to create the precondition), not silently dropped |
| 12 | Anonymous sees heart rendered but disabled | Met | `deriveKudosCardState`, C22 |
| 13 | Spotlight real names + live count + 100-char search cap | Met | `getKudosBoard`, `use-spotlight-search.ts`, C05/C06/C20/C21 (see H1 for how the count is computed) |
| 14 | Sidebar 5 stats + 2 leaderboards | Met | `buildViewerStats`, C09 (hidden anon per D001) / C27 (shown auth) |
| 15 | Seeded content transcribed, no invented data | Met, with disclosed caveats already adjudicated (department `CEVC20`, single repeated placeholder, gray heart color) | `seed-transcript.md`, `0008_kudos_demo_seed.sql` |

### Edge Cases Turned Up
- Double-click on the heart button races two identical-looking server calls to the same conclusion (`hearted:true`) rather than a clean toggle — M1.
- `loadMoreKudos` re-runs the unbounded totals query on every scroll page, not just on first load — H1.
- A malformed/tampered `cursor` string reaching `loadMoreKudos` fails open to an empty page via `isIsoTimestamp` rather than surfacing a Postgres error through `getKudosBoard`'s broader fail-open (which would blank Highlight/Spotlight too) — correctly scoped, no finding.
- `kudo_hearts_insert_own`'s `WITH CHECK` on a `kudo_id` that doesn't exist evaluates the subquery to `NULL`, and `user_id <> NULL` is unknown, so the insert is rejected — fails closed correctly, verified by reading the policy, not just assumed.

### Done Well
- RLS is proven, not asserted: `rls-verification.md` runs real `psql` against a real local Supabase instance inside a `BEGIN...ROLLBACK`, covering anon-INSERT-denied, self-heart-denied, cross-user-heart-succeeds, double-heart-`23505`, `heart_count` reconciliation, and revoke-on-delete — six real tests with real error strings, not a description of intended behavior.
- `toggleKudoHeart` never trusts the client for identity or for "am I already hearted" — it re-derives both from the server session and a fresh read, and its own unit tests (`toggle-kudo-heart.test.ts`) exercise the `23505` race path explicitly.
- The `heart_count` trigger reads `OLD.special`/`NEW.special` rather than a hardcoded `1`, so a future "+2 on special day" rule needs a value change, not a migration — genuinely forward-compatible design, not overengineering (the column exists, the logic branches on it, nothing else about the feature assumes it's always `false`).
- Every DAL read fails open (`kudos.ts`, `kudo-hearts.ts`, `kudos-stats.ts`) while the one write (`toggle-kudo-heart.ts`) fails closed — this asymmetry is deliberate and correctly reasoned in the code comments, matching how `/awards` already behaves.
- `messages/vi.json` and `messages/en.json` are structurally identical (verified programmatically) and correctly keep the TC-contract strings in Vietnamese in both locales, per the team's own inherited "TC content wins" rule.
- The team's own process caught its own mistakes before I did: a duplicated screenshot, a false "high fidelity" claim, and a stale-data false-positive on the department filter were all found and corrected by the orchestrator, visible in the evidence trail (L1).

### Actions In Order
1. Fix H1 — swap the unbounded totals read for a `count: exact, head: true` total plus lightweight dedup queries (`src/dal/kudos.ts`).
2. Fix H2 — add `idx_kudos_receiver_id`/`idx_kudos_sender_id` in a follow-up migration.
3. Fix M1 — disable/guard the heart button while a toggle request is in flight.
4. Fix M2/M3 — reconcile `green-evidence.md`'s contradictory C15 sections and correct `study-context.json`'s AC#1 citation before this evidence trail is reused as precedent for the next feature.
5. Carry L2 forward into the Compose-Kudo dialog's own plan (image URL validation / `remotePatterns`) — no action needed in this PR.

### Numbers
- Type coverage: not independently re-run (build/typecheck delegated to orchestrator per task instructions); reported clean (0 errors).
- Test coverage: reported 100% on the allowlist, 283/283 unit tests — spot-checked `toggle-kudo-heart.test.ts` directly and confirmed it genuinely exercises the race/error paths, not just the happy path.
- Lint findings: reported 0 (not independently re-run, per task instructions not to run build).
- e2e: 131 pass / 4 skip / 0 fail per the orchestrator's fresh run (28/29 kudos.spec.ts tests pass, 1 honest `test.fixme()` for C26 pending the Compose dialog).

### Still Unresolved
- H1/H2 (query efficiency) — should land before the next feature that adds write volume to `kudos`, not necessarily before this PR merges, since current data volume makes it invisible; team's call on timing.
- M2/M3 (evidence documentation) — low cost, should be cleaned up before this evidence trail is used as a template.
- The heart-credit-to-sender-not-receiver rule (already flagged in `plans/action-items.md` per the task brief) still needs product confirmation — not a code defect, a business-rule ambiguity the team already surfaced correctly.
