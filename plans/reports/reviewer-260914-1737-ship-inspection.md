# Review: Secret Box demo-data + Profile stats/empty-copy + docs (pre-PR inspection)

## Scope
- Files reviewed: full `git diff HEAD` (30 tracked + 5 untracked files) — Secret Box components, Profile screen/statistics/DAL wiring, i18n, routes, migration 0023, `scripts/grant-secret-boxes.mjs`, `docs/data-migration.md`, `docs/login-flow.md`, `docs/README.md`, `docs/deployment.md`, all four touched e2e spec files.
- Lines: ~828 insertions / 116 deletions (tracked) + ~880 lines of new docs + ~170-line migration/script.
- Depth: full diff read; cross-checked migration/script claims against `supabase/migrations/0001,0006,0007,0008,0011,0012,0013,0019` source; cross-checked new e2e TC IDs (`C28`, `S16`, `C6b`, `C7b`, `C10b`) against every other spec file for collisions (none found).

## Assessment
This is unusually well-self-documented work — every non-obvious decision (idempotency choice, why a column isn't touched, why a fixed px broke at a given viewport, why an inference in copy was wrong) is justified inline and matches what I verified against the actual schema/trigger source. I found no critical issues. Two real (but low-blast-radius) defects and a handful of polish items below.

## Critical
None.

## High
None.

## Medium

1. **`docs/data-migration.md:149-151` misattributes the notifications dedupe unique index to migration `0013`.** The rule text says "Hai trigger ở 0013 là writer duy nhất, và có unique index dedupe... " — the triggers are indeed in `0013`, but `uq_notifications_heart_received_dedupe` is created in `0012` (`supabase/migrations/0012_notifications.sql:110`), not `0013`. Low real-world impact (an operator reading the wrong file to check the index will just find it one file over) but worth a one-line fix since this doc explicitly exists to be trusted over memory.
   - Fix: change "Hai trigger ở 0013" language to separate the index (0012) from the triggers (0013), e.g. "unique index dedupe (0012) + hai trigger ghi (0013)".

2. **`scripts/grant-secret-boxes.mjs:158-165` — the `kudo_hearts` bulk insert has no `Prefer: return=representation` and no error-shape check per row, but more importantly it is not atomic with the `kudos` insert.** If the `kudos` POST at line 148 succeeds and the script crashes/network-fails before the `kudo_hearts` POST at line 158, the loop condition `issued < wantedBoxes` (line 144) will insert an *extra* orphan kudo on the next invocation without ever completing the heart credit for the first one — the script has no compensating cleanup and no transaction (PostgREST does not span multiple table calls transactionally). This is a real risk given the file's own warning that it "fabricates engagement," but the script is explicitly dev/local-only (correctly gated by nothing checking `SUPABASE_URL` host, see Low #2) and its own header documents this is acceptable for a demo DB. Flagging as Medium rather than High because: (a) it's non-production per the doc and migration header, (b) worst case is an orphan test kudo, not data loss, (c) re-running the script is safe (step 1 always clears+recomputes first).
   - Fix if desired: wrap steps in a single `rpc()` call server-side, or accept the documented risk explicitly in the header (currently the header only documents *what* it does, not *what happens on partial failure*).

## Low

1. **`scripts/grant-secret-boxes.mjs` has no runtime guard against being pointed at a production Supabase URL.** The header says "Point it at a local Supabase — it fabricates engagement, which is fine for a demo DB and not for a real one," and `docs/data-migration.md:99-103` repeats the warning in bold — but nothing in the script itself checks the URL host or requires an explicit `--i-know-this-is-not-production` flag. A copy-pasted `.env.production` locally, or a `SERVICE_ROLE_KEY` accidentally exported from a production shell session, would let this run against prod with no code-level stop sign — only documentation. Given `SERVICE_ROLE_KEY` bypasses RLS (confirmed: table docs/data-migration.md:93-97, and 0011's RLS-only-SELECT grant on `secret_box_openings`), a simple guard (e.g., refuse if `SUPABASE_URL` doesn't contain `localhost`/`127.0.0.1`, or require a `--force-remote` flag) would convert a documentation-only safety net into an enforced one.

2. **`src/app/(public)/kudos/_components/secret-box-launcher.tsx:88-95` — `wantsAutoOpen` never clears the `?secretbox=open` query param after opening.** Reloading, or a subsequent client-side navigation back to `/kudos` with the browser history still holding `secretbox=open` in the URL, re-triggers `open()` if `canMount` is still true (e.g., the reader closed the dialog then hit browser back/forward). Low severity — `open()` on an already-closed dialog is idempotent UX (just reopens it), not a data hazard — but it means the URL is a one-shot intent that doesn't self-clean, which could surprise a user who expects "closed means closed" after a refresh. Consider `router.replace` to strip the param once consumed, mirroring how one-shot deep links are usually handled.

3. **`docs/data-migration.md` illustrative migration numbers `0024`/`0025` (§ 7.1, § 7.3) are hypothetical future examples**, not files that exist in this diff (confirmed: `ls supabase/migrations/` tops out at `0023`). This is clearly framed as a worked example ("Khi có danh sách thật từ HR"), not a false claim of present state, so this is a non-issue — flagging only so a fast skim doesn't mistake it for an inconsistency with the file list above.

## Edge Cases Turned Up (scouting pass, beyond the diff)
- **Migration 0023 re-run safety**: confirmed idempotent — `NOT EXISTS` guard is per `user_id`, and the three hardcoded UUIDs are demo accounts from `0008` that cannot sign in, so no interaction with real user data. Confirmed it writes only to `secret_box_openings`, never `heart_count` (owned by `0007`'s trigger) or `notifications` (owned by `0013`'s triggers) — matches the plan's stated constraint.
- **`getKudosStats` (`src/dal/kudos-stats.ts`) fails open to all-zero stats** on any Supabase error (lines 137-139) — correct choice for a page with no additional auth implication (viewer only ever queries their own id from `page.tsx`'s `isSelf` branch), but worth noting for future callers: a caller that assumes a thrown error means "definitely no boxes" would be wrong on a transient network blip vs. genuine zero. Not exploitable here since it only ever suppresses your own number down, never up.
- **`KudosPersonHoverCard`**: the anchor-vs-button branch (`person.id === null`) correctly keeps anonymous senders on an inert `<button>`, verified against the e2e assertion in `secret-box.spec.ts`'s sibling `kudos.spec.ts` C25/C29 (checked `a[href*="/profile"]` count 0 for anonymous). Ref callback pattern for the union `HTMLElement` ref is a correct, if slightly unusual, TS workaround — no issue.
- **`profile-statistics-card.tsx` open/disabled branch**: correctly guards on `stats && stats.secretBoxUnopened > 0`, so a `null` stats (not-self view never reaches this component at all per the early `!isSelf` return) or a `0` count both render the disabled button — no state where a self-viewer with /actually/ zero boxes gets a live link.
- **i18n parity**: every new key added to `en.json` (`openSecretBoxDisabledTitle`, `emptyReceivedOther`, `emptySentOther`, `secretBox.titleRevealed`/`instruction` rewording) has an exact vi.json counterpart at the same path, verified line-by-line in the diff — no asymmetry.
- **E2E TC ID collisions**: grepped every `[C28]`/`[S16]`/`[C6b]`/`[C7b]`/`[C10b]` tag across all four spec files — no cross-file duplicate IDs (a known recurring failure mode in this repo per prior sessions).
- **C6b concurrency invariant**: the test comment claims no other test in `profile.spec.ts` may write kudos rows for `selfUserId` since `fullyParallel` runs tests concurrently and the delta assertion would flake. Verified by grep: only `[C6b]` itself writes to `selfUserId`'s received kudos in this file — invariant currently holds. This is a **fragile contract** worth flagging: it depends on every future test author reading and honoring a comment rather than a structural guard (e.g., a lint rule or a dedicated throwaway account). Not a blocker, but likely to bite someone adding a test row 600 without reading row 100-107.

## Done Well
- Migration 0023's header is a model of "why," including a documented **rejected approach** (hearting every non-demo kudo) and the exact test IDs (C13/C16/C35) it broke — this is exactly the kind of trace that keeps a future maintainer from re-introducing the same mistake.
- `scripts/grant-secret-boxes.mjs` correctly excludes the target account from the demo-Sunner heart pool (line 120-124) to prevent a self-heart/self-kudo, and documents why (RLS's `kudos_insert_own` doesn't apply under `SERVICE_ROLE_KEY`).
- The C6 test rewrite is a genuinely good regression-test fix: the old assertion (`value === "0"`) would have passed against a component that never read the database at all, and the new C6b explicitly calls that out and closes the gap with a real DB-delta assertion.
- `kudos-leaderboard.tsx`'s `rowKey` vs `id` split is a correct, minimal fix for a real React key collision (one Sunner opening multiple boxes), with a matching unit test asserting the exact failure scenario.
- Deployment/data-migration cross-links (`docs/deployment.md:109,577`) are precise pointers to specific sections (§ 7.3, § 4, § 10) rather than vague "see docs" refs.

## Actions In Order
1. Fix the `0012` vs `0013` index attribution in `docs/data-migration.md` (Medium #1) — trivial, one line.
2. Consider a host guard in `scripts/grant-secret-boxes.mjs` before it's used more than once by hand (Low #1) — not blocking this PR.
3. Optional: strip `?secretbox=open` from the URL after consuming it in `secret-box-launcher.tsx` (Low #2).

## Numbers
- Type coverage: not measured here (orchestrator already ran `pnpm typecheck` green).
- Test coverage: not measured here (tester agent running suites separately).
- Lint findings: 0 (orchestrator-verified `pnpm lint --max-warnings 0` green).

## Still Unresolved
- None blocking. The two Medium items are documentation/defense-in-depth polish, not defects in the shipped behavior.

**Status:** DONE
**Summary:** Secret Box demo-seed migration, grant script, and Profile stats/empty-copy wiring are correct, idempotent, and well-tested against the actual trigger/RLS ownership rules; only a doc-attribution nit and a missing prod-guard on a dev-only script are worth follow-up.
**Concerns/Blockers:** none
