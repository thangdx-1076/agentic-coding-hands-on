# Review: Secret Box modal (branch feat/secret-box-modal, 975f4f8..HEAD)

## Scope
Migration `supabase/migrations/0011_secret_box.sql`, `src/dal/secret-box.ts` + `secret-box-client.ts`,
`_actions/open-secret-box.ts`, `_components/secret-box-{launcher,dialog}.tsx`,
`_hooks/use-secret-box-dialog.ts`, `_utils/secret-box-badge-asset.ts`, `src/dal/kudos-stats.ts`,
`kudos-stat-list.tsx`, `page.tsx`, `messages/*.json`, `tests/e2e/secret-box.spec.ts` +
`kudos.spec.ts:745-751`. ~1550 LOC net new (excl. plan docs/spec drafts).

Verified directly, not just read: `pnpm typecheck` (clean), `pnpm lint` (0 errors, 5 warnings — 3 in
secret-box.spec.ts style-only, 2 in kudos.spec.ts owned by the concurrent C19 fix, out of scope),
`pnpm test:unit` (591/591), `npx playwright test tests/e2e/secret-box.spec.ts` (14/14 GREEN locally),
live `psql` against `supabase_db_saa-app`: table grants, RLS policy, function `prosecdef`/`proconfig`,
function grants, and `schema_migrations` (0011 applied via `migration up`, not reset).

## Assessment
Ships. Authorization, RLS, and the double-spend lock are correct and independently verified against
live Postgres state, not just the SQL text. Client-tampering resistance is real: the RPC computes
everything server-side and the DAL fails closed on any unrecognized shape. The two fragile e2e
invariants (dialog mount timing, anonymous-viewer guard) hold under actual test execution.

## Critical
None found.

## High
None found.

## Medium
- `src/app/(public)/kudos/_actions/open-secret-box.ts:35` — the catch-all `catch { return {ok:false,
  reason:"unknown"} }` swallows every unexpected error (a thrown Postgres error the DAL didn't
  recognize, `createClient()` failing) with zero server-side logging. Correct from a data-leakage
  standpoint (no stack trace reaches the client) but an unrecognized RPC failure mode becomes
  invisible in prod. Fix: add a `console.error`/structured log inside the catch before returning
  `unknown`, mirroring whatever `toggleKudoHeart` already does for its own catch (worth checking it
  has the same gap).
- `src/app/(public)/kudos/_components/secret-box-launcher.tsx:69,97` — `canMount`/the trigger
  button's `disabled` are both frozen from `stats.secretBoxUnopened` at first render (by design, for
  S13/S07/S09/S10). One side effect not covered by any test: once `canMount` is `true`, the outer
  `kudos-open-gift` button stays `disabled={false}` for the rest of the page's life even after the
  user drains `live` to 0 — clicking it just reopens the dialog showing `00` with the box disabled,
  which is harmless but the button itself loses its "reason" `title` tooltip (only shown when
  `!canMount`). Cosmetic, not a security or data issue — flagging so it isn't mistaken for
  unconsidered later.

## Low
- `tests/e2e/secret-box.spec.ts:520` — S13's inline comment ("PASSES: button is visible + disabled
  (both hardcoded to 0)") is a stale RED-era note; the button is now disabled because real
  `secretBoxUnopened` is genuinely 0, not because of the old hardcode. No functional impact, just
  drifted comment.
- 3 `playwright/no-useless-not` lint warnings in `secret-box.spec.ts` (lines 416, 439, 456) —
  `not.toBeVisible()` could be `toBeHidden()`. Style only, zero errors.

## Edge Cases Turned Up
- Confirmed live in Postgres (not just read from the migration file): `secret_box_openings` has
  exactly one policy (`secret_box_openings_select_own`, SELECT, `USING (user_id = auth.uid())`),
  `FORCE ROW LEVEL SECURITY` is set, and `authenticated` holds only `SELECT` on the table (no
  INSERT/UPDATE/DELETE grant at all) — matches the "no INSERT policy, one SELECT-own policy" bar
  exactly.
- `open_secret_box` is `prosecdef = t`, `proconfig = {"search_path=public, pg_temp"}`, owned by
  `postgres`; `authenticated` has `EXECUTE`, `anon` does not appear in the grant list at all —
  matches FR-601.
- Entitlement recheck genuinely happens inside the same transaction as the INSERT: `pg_advisory_xact_lock`
  → re-SELECT `entitlement`/`opened` → `IF v_opened >= v_entitlement THEN RAISE` → `INSERT`, all in one
  `plpgsql` function body executed as PostgREST's single statement/transaction. No window for a second
  concurrent call to read stale `opened` after the first commits (it blocks on the advisory lock, then
  re-reads post-lock-acquisition).
- Client tampering: `SecretBoxLauncher.handleOpenBox` sets `live`/`badgeKey` only from `result.unopened`/
  `result.badgeKey` — no local decrement anywhere in the launcher. `parseOpeningRow` in `secret-box.ts`
  throws (fail closed) on an empty array, a non-object row, an unrecognized `badge_key`, or a
  non-integer/negative `unopened` — and `secret-box.test.ts` exercises exactly those branches.
- S13 confirmed GREEN: `<SecretBoxDialog>` is gated behind `{canMount && ...}` in
  `secret-box-launcher.tsx:111`, so at `secretBoxUnopened === 0` the dialog never mounts —
  `toHaveCount(0)` holds, not just "closed".
- `!stats` guard is still the literal first line of `KudosStatList` (`kudos-stat-list.tsx:66-68`);
  ran S15 and it's green — anonymous still gets 0 stat rows and no button.
- `profile.spec.ts` has zero diff in this range (`git diff 975f4f8..HEAD --stat` returns nothing for
  it); `profile-statistics-card.tsx:31` still renders the unconditional `disabled` button. C6/C7
  untouched as claimed.
- Migration 0007's `sync_kudo_heart_count` untouched; `secret_box_openings` adds no competing counter,
  confirmed by the file diff and by the fact `getKudosStats` derives `secretBoxUnopened` from a live
  `count(*)` over the new table, never a stored column.
- First `.rpc()` call in the repo confirmed by `grep -rn "\.rpc(" src/` — only hits are this feature's
  own files.
- `D-P04` (no `revalidatePath`) — confirmed intentional and documented in both the action's own header
  comment and `plan.md`'s D-P04; not flagged as a defect per the task's explicit instruction.

## Done Well
- The migration's header comment is unusually rigorous: it states the exact Postgres RLS/BYPASSRLS
  semantics being relied on and even says "verified directly for this migration too" — and that claim
  checked out against live `psql` output.
- Fail-closed boundary check in `secret-box.ts` for a `.rpc()` response with no generated types is
  exactly the right amount of paranoia given the repo has no `Database` generic anywhere.
- Advisory-lock-then-recheck is the correct answer to "no natural row to `SELECT ... FOR UPDATE` before
  the first opening" — better than the more common (and here inapplicable) pessimistic-lock pattern.
- `useSecretBoxDialog` mirrors `use-kudos-compose-dialog.ts` faithfully (ref-callback, not `RefObject`;
  scroll-lock cleanup restores the prior `overflow` value) — no invented pattern.

## Actions In Order
1. Add error logging inside `openSecretBoxAction`'s catch block before returning `{ok:false,
   reason:"unknown"}` (Medium) — currently a silent black hole for any unrecognized failure.
2. Optional: refresh the stale S13 comment in `secret-box.spec.ts:520` (Low).
3. Optional: `--fix` the 3 `no-useless-not` warnings (Low, cosmetic).

## Numbers
- Type coverage: `pnpm typecheck` clean, 0 errors.
- Test coverage: unit 591/591 passed (project reports 100% stmt/branch/func/line on this feature per
  `evidence/temper-results.json`); e2e `secret-box.spec.ts` 14/14 passed (verified by direct run, not
  just trusted from the evidence file).
- Lint findings: 0 errors, 5 warnings (3 in this feature's spec file, style-only; 2 in the
  concurrently-edited `kudos.spec.ts`, out of this review's scope).

## Still Unresolved
- None blocking. The two open questions in `clarifications.md` (single vs. two-state title; whether
  to build a `/profile` stats pipeline) are scope decisions for the user, not defects in this diff.
