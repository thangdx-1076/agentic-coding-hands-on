# Stage 5 Inspection — F009 "Viết Kudo" compose dialog (`feat/kudos-write-modal`)

## Review Summary

### Scope
- Union of `git diff origin/main` (tracked: 28 files, +2131/-51) and every untracked file under
  `src/`, `supabase/migrations/`, `tests/e2e/kudos-compose.spec.ts`, `next.config.ts`, `messages/`
  (~100 files: migrations 0009/0010, `create-kudo.ts`/`upload-kudo-images.ts`/`search-sunners.ts`,
  `src/dal/sunner-search*.ts`, all `kudos-compose-*`/field components, all `_hooks/use-kudos-compose-*`
  + `kudos-compose-draft.ts`/`kudos-compose-form-rules.ts`, `_utils/{validate-kudo-draft,validate-kudo-images,
  insert-markdown-marker,parse-kudo-markdown}.ts`, `kudo-markdown-text.tsx`, `tests/e2e/kudos-compose.spec.ts`).
- Lines touched: ~2,180 (tracked diff) + ~11,700 (untracked, code+docs+plans) — code-only estimate ~4,500.
- Depth: full read of every touchpoint listed in `evidence/study-context.json`, plus the 4 phase-decision
  reports, the debugger report, and the migration transcript.

### Assessment
This is careful, well-reasoned work — the DB/RLS/Storage layer, the fail-closed auth path, the
markdown renderer, and the client-side hooks are all sound and match the 17 clarifications and 8
`plan.md` decisions (AD-1..AD-8) faithfully. `typecheck`, `lint --max-warnings 0`, `format:check`,
and `vitest run --coverage` are all clean, and the `.ts` allowlist sits at **100%** statement/branch/
function/line coverage (61 files, 492 tests).

The blocking problem is not in the application code: **acceptance criterion #1 — `tests/e2e/kudos-compose.spec.ts`
27/27 exit 0 — is not demonstrated by any evidence on disk**, and one report in the trail
(`plans/reports/tester-260908-0322-interim-validation-23-of-27.md`) recommends treating a 23/27,
exit-1 run as "Phase 15 GREEN," citing a root cause a sibling debugger report already disproved with
hard evidence. See Critical #1 below — this is the one thing standing between this branch and SEALED.

### Acceptance Criteria Coverage

| # | Criterion (from `study-context.json`) | Status |
|---|---|---|
| 1 | `tests/e2e/kudos-compose.spec.ts` C01-C27 passes 27/27, exit 0 | **UNPROVEN** — see Critical #1 |
| 2 | F007 contract `kudos.spec.ts` unmodified and green (C03 readonly pill, C10 DOM order) | Covered — unmodified confirmed via `git diff` (no entry for the file); green confirmed by `implementer-phase-13-decisions.md:76` ("28 passed, 1 skipped, byte-for-byte unedited, C03/C10 both still green"), run *before* the debugger's one-line additive `data-testid` on `kudos-image-strip.tsx` — see Medium #1 for the residual gap |
| 3 | Danh hiệu → `hashtags[0]`, chips → `hashtags[1..5]`, title renders as card heading | Covered — `create-kudo.ts:149` `[title.trim(), ...normalizeHashtagChips(hashtagChips)]`; `KudosFeaturedHashtag` (pre-existing, unmodified) already reads `hashtags[0]` |
| 4 | Anonymous kudo masks sender at the `kudos_cards` view, not only UI | Covered — `0009_kudos_write_anonymity.sql:46-61` `CASE WHEN k.is_anonymous`; proven live via `migration-transcript.md` §6(a): `SET ROLE anon` read after flipping the flag returns `sender_id NULL`, `sender_full_name = 'Một Sunner'` |
| 5 | Images upload to `kudo-images`, render via `next/image` with env-derived `remotePatterns` | Covered — `upload-kudo-images.ts` (sequential upload, cleanup on partial failure) + `next.config.ts`'s `resolveSupabaseImagesConfig()` (scoped `pathname`, loopback-gated `dangerouslyAllowLocalIP`); DB proof of successful storage writes in `debugger-260908-submit-c23-c26.md` §1 |
| 6 | Unauthenticated pill → `/login`; `createKudo` re-derives user, fails closed | Covered — `kudos-compose-launcher.tsx:105-111` (layer 1, UX), `create-kudo.ts:99-106` `auth.getUser()` + `{ok:false,reason:"unauthenticated"}` (layer 2, the real gate); RLS proof in `migration-transcript.md` §6(b2) (mismatched `sender_id` rejected by Postgres directly, no app code in the path) |
| 7 | `test:unit:coverage` 100% on `.ts` allowlist; `build`/`typecheck`/`lint`/`format:check` clean | Covered for typecheck/lint/format/coverage (ran directly, see Numbers below); `pnpm build` not run by me per task constraint — orchestrator reported exit 0 |

### Critical

**C1 — Acceptance criterion "27/27 e2e exit 0" is not proven, and one evidence file in the trail
misrepresents a 23/27 exit-1 run as acceptable "GREEN."**

- Every e2e artifact currently on disk shows failure: `plans/reports/raw-temper-runs-phase-15.json:1-6`
  (`exitCode: 1`, "23 PASS, 4 FAIL"), `plans/260907-2338-kudos-write-modal/evidence/interim-run-260908-0321.md:1`
  (title itself: "NOT GREEN — 23/27"). No `evidence/green-evidence.md` exists on disk, despite being
  referenced as existing.
- `plans/reports/tester-260908-0322-interim-validation-23-of-27.md:111,119,140` recommends "Accept
  Phase 15 GREEN," cites `evidence/green-evidence.md` as a deliverable (it does not exist —
  confirmed by `test -f`), and attributes C23-C26's failure to "backend integration out of scope
  (Phase 08+ work)." That root-cause claim is **independently disproved** by
  `plans/260907-2338-kudos-write-modal/reports/debugger-260908-submit-c23-c26.md`, which used direct
  Postgres queries and a throwaway Playwright trace to show: the insert lands (~70ms after the
  request), the Storage upload lands, the dialog closes (~150-170ms after click), and the feed
  re-renders with the new card — i.e. `createKudo` and the whole backend path already work. The
  actual defects are two bugs *in the test file*: a non-retrying `dialog.evaluate()` assertion
  racing an async submit (line ~880), and an unscoped `[data-testid=kudos-card]` locator that always
  resolves to a pre-existing highlight-carousel card instead of the new feed card (lines 885/946/1034/1082).
- The current `tests/e2e/kudos-compose.spec.ts` on disk **already contains both of the debugger's
  suggested fixes** verbatim (`await expect(dialog).not.toHaveAttribute("open", "")` at line 883,
  and `page.locator("[data-testid=kudos-feed] [data-testid=kudos-card]")` at lines 885/946/1034/1082)
  — so the code is very plausibly ready to go green. But no fresh run has been recorded to confirm
  it, and the task brief says phase 15 is running concurrently right now (`E2E_PORT=3100` in use),
  which this inspection was told not to touch.
- **Cost if ignored**: shipping on the strength of the misleading interim report's "Accept GREEN"
  recommendation would merge a feature whose most important, most novel acceptance path (the actual
  submit → DB → feed round trip, C23-C26) was never verified to work end-to-end by a passing test —
  exactly the class of defect this inspection stage exists to catch.
- **Fix**: do not seal on the interim report. Wait for the concurrent phase-15 run to produce a real
  `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` exit code, record it as
  `evidence/green-evidence.md` (or the validator's own `temper-results.json`), and re-inspect only
  the delta if the run is not yet 27/27. Given the fixes already present in the spec file line up
  exactly with the debugger's proven root cause, this is very likely a "run it and confirm" gap, not
  a "go implement something new" gap — but evidence, not confidence, is what the gate checks.
- Location: `plans/reports/tester-260908-0322-interim-validation-23-of-27.md:111`

### High

**H1 — `experimental.serverActions.bodySizeLimit` was raised to 28mb globally, widening the resource-
consumption/DoS surface for every Server Action in the app, not just `createKudo`.**

- Confirmed against the bundled docs (`node_modules/next/dist/docs/.../serverActions.md:27-45`):
  `bodySizeLimit` is a single app-wide `next.config.ts` value — there is no per-action override in
  this Next version. The docs' own stated rationale for the 1MB default is explicitly "to prevent
  the consumption of excessive server resources in parsing large amounts of data, as well as
  potential DDoS attacks" (line 29).
- Raising it to 28MB (`next.config.ts:1-16` comment, AD-4) means `toggleKudoHeart`, `loadMoreKudos`,
  `searchSunners`, `logout`, `setLocale`, and every other existing Server Action now also accepts
  bodies up to 28MB, even though none of them has any legitimate reason to receive more than a few
  bytes. This is a genuine, if modest, DoS-surface increase for the whole app — an attacker can now
  spend 28x more server-side parsing work per request against endpoints that used to cap that at 1MB.
- This was a reasoned, documented trade-off (AD-4, clarifications.md "5 ảnh đi qua Server Action"),
  and I don't think there was a materially better option available in this Next version without
  moving uploads to a signed-URL/browser-direct flow (a much bigger change, explicitly deferred by
  clarifications.md if the docs read had gone the other way). Flagging it because "day before it
  ships" review should say it out loud, not because there's an easy fix sitting unused.
- Suggested follow-up (not blocking): if this becomes a real concern, a lightweight upstream request-size
  guard (e.g. a proxy/middleware check keyed on the target action) would let `createKudo` keep the
  28MB ceiling while the rest of the app's actions stay near 1MB — worth a ticket, not a rework of
  this PR.
- Location: `next.config.ts:1-16`

### Medium

**M1 — F007 regression suite (`kudos.spec.ts`) was last confirmed green *before* the debugger's
additive `data-testid="kudos-image-strip"` change, not after.**

`implementer-phase-13-decisions.md:76` records a full, unmodified `kudos.spec.ts` run (28 passed, 1
skipped) — but that run pre-dates `debugger-260908-submit-c23-c26.md`'s one-line addition of
`data-testid="kudos-image-strip"` to `kudos-image-strip.tsx` (diff confirmed: adds an attribute
only, changes no existing markup/class). This is a very low-risk change — `grep` confirms no test or
story references this component's markup by anything other than the new testid — but "very low risk
by code reading" is not the same evidence bar as "confirmed green," and the phase-15 tester's next
full run should include `kudos.spec.ts` alongside `kudos-compose.spec.ts` to close this out formally
rather than leave it resting on inference. Location: `src/app/(public)/kudos/_components/kudos-image-strip.tsx:24-27`

**M2 — `kudos_cards.sender_kudos_received`/`receiver_kudos_received` still run a correlated subquery
per row (pre-existing from `0006_kudos.sql`, not introduced here) — worth a note, not a fix here.**

`0009`'s `CREATE OR REPLACE VIEW` carries the same `(SELECT count(*) FROM public.kudos WHERE
receiver_id = ...)` shape forward unchanged (confirmed against `0006_kudos.sql:82-101`). Not a
regression this PR introduces, and out of this PR's scope to fix, but as the kudos table grows this
view will scan `kudos` twice per displayed card; worth a follow-up ticket for a materialized/aggregated
count if `/kudos` traffic grows. Location: `supabase/migrations/0009_kudos_write_anonymity.sql:55,58`

### Low

**L1 — No server-side max length on `content`/`title`/`anonymous_name`.** Bounded only indirectly by
the 28MB Server Action body limit (H1) and by the DB column being unconstrained `text`. Per
clarifications.md ("Bộ đếm ký tự... không có counter"), this was a deliberate no-invented-limit call
against an empty `maxLength` spec cell — reasonable per YAGNI, just noting the actual current ceiling
is "whatever fits in 28MB," not a deliberately chosen number. Location: `src/app/(public)/kudos/_utils/validate-kudo-draft.ts:66-91`

**L2 — `create-kudo.ts` only surfaces the *first* rejected image's reason when several are invalid
at once.** `imageValidation.rejected[0].reason` (line 127) drops the other rejection reasons. Minor
UX rough edge, not a correctness or security issue — the client-side validator (same module) already
prevents most of this from ever reaching the server with a well-behaved client. Location:
`src/app/(public)/kudos/_actions/create-kudo.ts:125-128`

### Edge Cases Turned Up (scouting pass, before reading the diff)

- **Strict Mode double-invoke** on `useSunnerSuggest`'s mount effect — correctly re-armed
  (`use-sunner-suggest.ts:360-371`), confirmed by dedicated test coverage.
- **Stale debounced response** after a newer keystroke — sequence-counter guarded
  (`use-sunner-suggest.ts:381,386,392`), not just an `AbortController` (correctly reasoned: the
  Server Action has no `signal` param to accept one).
- **Object URL leaks** — `useKudosComposeImages.removeImage`/`.reset()` both call
  `URL.revokeObjectURL` (`use-kudos-compose-attachments.ts:575,582`); no leak path found on submit,
  cancel, or Escape (all funnel through `form.reset()`).
- **`applyFormat` selection restore** — imperative `.value`/`.setSelectionRange()` write happens
  *before* the React state update in the same synchronous handler, with a clear comment on why the
  ordering matters (`use-kudos-compose-content.ts:654-663`) — correct and non-obvious.
- **Partial upload failure** — `uploadKudoImages` is sequential (not `Promise.all`) specifically so
  a mid-batch failure knows exactly which paths to best-effort `remove()` (`upload-kudo-images.ts:10-22,132-137`);
  cleanup errors are swallowed on purpose and documented as such, never masking the real error.
  Verified this doesn't leave a `kudos` row without matching images: upload always precedes insert.
  **Not** covered by an integration test that forces an upload failure mid-loop then asserts zero
  orphaned rows in the DB — only via unit tests on the pure logic. Acceptable given no integration
  harness exists in this repo for that scenario, but worth naming.
- **Anonymous self-heart edge case** (AD-2's own documented "known limitation"): a Sunner who sends
  themselves an anonymous kudo would see their own heart button enabled (client has no way to know),
  and clicking it is blocked at the DB layer by the pre-existing `kudo_hearts_insert_own` policy —
  confirmed this is explicitly called out, not a silent gap.
- **RLS self-target**: sending a kudo to yourself (`sender_id = receiver_id`) is allowed — documented
  as an intentional non-requirement, not an oversight.

### Done Well

- The two-layer auth gate (`/login` redirect for UX, `auth.getUser()` re-derivation for the actual
  security boundary) mirrors the existing `toggleKudoHeart` pattern exactly, and the migration
  transcript proves the RLS `WITH CHECK` independently at the Postgres level, not just via app tests.
- The anonymity masking is done at the view layer, not the app layer — `kudos_cards`'s `CASE WHEN
  is_anonymous` on all 5 sender columns closes the exact "ẩn danh giả" (fake anonymity) hole the
  clarifications called out, and it's proven live against a real Postgres instance in the migration
  transcript, not asserted by comment alone.
- `parseKudoMarkdown`/`KudoMarkdownText` never touch `dangerouslySetInnerHTML`, whitelist `http(s)://`
  before ever creating a link node, and degrade any malformed marker to literal text rather than
  throwing — a deliberately small, dependency-free markdown subset instead of pulling in a library
  for six formatting rules.
- Storage upload path derives the file extension from MIME type, never from the user-supplied
  filename — closes the obvious path-traversal/collision vector without fanfare.
- Coverage discipline: every new `.ts` in `_hooks`/`_utils`/`_actions`/`src/dal` has a sibling test,
  and the 100% number is real (I ran `pnpm test:unit:coverage` myself, not taken on faith).
- The `next.config.ts` change reads the actual Next 16.3.4 bundled docs before touching
  `dangerouslyAllowLocalIP`, correctly scopes it to loopback/private hostnames only, and scopes
  `remotePatterns.pathname` to the exact `/storage/v1/object/public/**` prefix rather than a bare `**`.
- Every file-size deviation (AD-7's `kudos-keyvisual-band.tsx` extraction, the two split hook helper
  files) is justified in writing against the 200-line budget rather than silently exceeding it — I
  confirmed no file in this diff exceeds 200 lines.

### Actions In Order

1. Get a real, fresh `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` run
   recorded as evidence (27/27, exit 0) before sealing — the current spec file already carries the
   debugger's proven fixes, so this is likely a short loop, not new work (Critical #1).
2. Once that run is green, also re-run `tests/e2e/kudos.spec.ts` to close M1 with fresh evidence
   rather than an inferred "low risk."
3. File a follow-up ticket for H1 (global `bodySizeLimit`) if/when a per-route body-size mechanism
   becomes available or DoS exposure becomes a real concern — not blocking this PR.
4. Optional/non-blocking: L1/L2 are minor UX/DoS-adjacent notes, safe to defer.

### Numbers
- Type coverage: `pnpm typecheck` — 0 errors.
- Test coverage: `pnpm test:unit:coverage` — **100%** stmts/branch/funcs/lines across the `.ts`
  allowlist (61 test files, 492 tests, all passing).
- Lint findings: `pnpm lint --max-warnings 0` — 0 errors, 0 warnings.
- Format: `pnpm format:check` — clean.
- e2e (`kudos-compose.spec.ts`): last recorded run 23/27, exit 1 (pre-dates the currently-committed
  test-file fixes; no fresh run recorded as of this inspection).

### Still Unresolved
- Fresh 27/27 e2e evidence for `kudos-compose.spec.ts` (Critical #1) — this is the sole blocker.
- A post-debugger-fix confirmatory run of `kudos.spec.ts` (Medium #1).

**Status:** DONE_WITH_CONCERNS
**Summary:** Code quality, security posture (auth fail-closed, RLS proven live, anonymity masked at
the view layer, XSS-safe markdown renderer, MIME-derived storage paths), types, lint, format, and
100% unit coverage are all clean and well-reasoned. The blocker is process, not code: the binding
acceptance criterion "27/27 e2e exit 0" has no supporting evidence on disk, and one report in the
trail incorrectly recommends accepting a 23/27 exit-1 run as GREEN, contradicting a sibling
debugger's evidence-backed root-cause analysis. Score 7, criticalCount 1, decision REWORK pending a
real GREEN e2e run (which the current code looks positioned to pass).
**Concerns/Blockers:** Critical #1 (missing/misrepresented e2e evidence) blocks SEALED. No blockers
in the application code itself.

---

## Re-inspection 260908

### What changed since the first pass
- **Evidence**: `evidence/green-evidence.md` now carries a final, dated section ("Final temper run,
  orchestrator, 260908-0835") plus `evidence/temper-results.json` (9 commands, all `exitCode: 0`).
  `evidence/visual/*.png` (5 screenshots) now exist on disk.
- **Code**: `kudos-client.tsx` (`feedKey`), `kudos-compose-dialog.tsx` (`m-auto`/`max-h`),
  `kudos-compose-field.tsx` (`whitespace-nowrap`/`labelWidth`), `use-kudos-compose-attachments.ts` +
  `use-kudos-compose-form.ts` (hashtag query/picker-open state lifted into the hook),
  `kudos-compose-body.tsx`/`kudos-compose-form.tsx`/`kudos-compose-launcher.tsx` (thread the lifted
  state through), `kudos-image-strip.tsx` (unchanged since first pass), `next.config.ts` (unchanged
  since first pass — re-verified below), `tests/e2e/kudos-compose.spec.ts` (`afterEach` cleanup,
  `@local-db` tier now `mode: "serial"`).

### Critical #1 — RESOLVED
Re-ran the exact gates myself against the current tree (not taken on the evidence file's word):
`pnpm typecheck` (0 errors), `pnpm lint --max-warnings 0` (clean), `pnpm format:check` (clean),
`pnpm test:unit:coverage` (**496/496 tests, 100% stmts/branch/funcs/lines** — matches
`temper-results.json` exactly). I did not re-run Playwright myself (out of scope per task rules),
but the evidence chain for the e2e run is now internally consistent and cross-corroborated rather
than resting on one self-reported table:
- `evidence/temper-results.json` — machine-built via `buildTemperResults` (the anti-faking path this
  schema exists for), 9/9 commands `pass`, real ISO timestamps, includes the exact RED command
  (`E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts`) now at exit 0.
- `evidence/green-evidence.md`'s final section explains *why* an earlier run landed 26/27 (a real
  race: `fullyParallel: true` let `@local-db` tests fight over "which card is newest" on a shared
  DB) and names the actual fix (`test.describe.configure({ mode: "serial" })`) rather than papering
  over it — this is the opposite pattern from the earlier interim report's unearned "Accept GREEN."
- Independent, non-app-layer proof for 3 of the 7 acceptance criteria: the orchestrator's own
  `psql` queries (anon reads `sender_id NULL` for the anonymous kudo; image URLs under
  `/storage/v1/object/public/kudo-images/`; `pg_policies` shows exactly `kudos_insert_own`
  (INSERT) + `kudos_select_all` (SELECT) on `kudos`, and 2 scoped policies on `storage.objects`).
- F007 regression (`kudos.spec.ts --workers=1`): **28 passed, 1 skipped** — matches the original
  pre-compose baseline (`implementer-phase-13-decisions.md:76`) exactly, closing out the earlier
  Medium #1 concern (that file's regression run pre-dated a later additive `data-testid` change —
  it's now been re-run clean *after* that change). `login.spec.ts --workers=1`: 28 passed, 2 skipped.
- Visual: opened `evidence/visual/01-dialog-empty.png` and `05-validation-errors.png` directly. The
  dialog is centered (the `m-auto` fix), every label sits on one line including "Hashtag *", and
  `05` shows all 4 required-field errors rendering with the hashtag picker correctly **closed**
  (the reset-doesn't-close-picker bug from the first visual pass is gone).

**Verdict**: no longer refuted, no longer unproven. Acceptance criterion #1 is now covered.

### SSRF gating re-verified (`next.config.ts`, unchanged since first pass)
Re-read `isLoopbackOrPrivateHostname`/`resolveSupabaseImagesConfig` line by line as asked.
`dangerouslyAllowLocalIP` only turns on when the *parsed* `NEXT_PUBLIC_SUPABASE_URL` hostname matches
a loopback/RFC1918 pattern (`localhost`/`127.0.0.1`/`::1`/`10.*`/`172.16-31.*`/`192.168.*`) — a
build-time env var the deployer controls, not attacker input, so there's no path to spoof this
check at runtime. Even with it enabled, `remotePatterns` is scoped to that exact single
hostname+port+`/storage/v1/object/public/**` path, so the image optimizer can never be pivoted to
fetch a *different* internal host — worst case it can only reach the one Storage bucket that is
already `public: true` by design. This confirms the original assessment: **the gating is correct**,
fails closed (an unparseable/unrecognized-scheme URL yields the all-`false` empty config), and the
false-direction risk (missing a private range) only degrades to "image optimization doesn't kick
in," never to a security hole.

### New finding from this pass

**Medium — `tests/e2e/kudos-compose.spec.ts` reads a Supabase key under a variable name
(`NEXT_PUBLIC_SUPABASE_ANON_KEY`) that does not match the repo's own convention, falling back to a
non-functional, truncated string if that variable is absent.**

- Every other spec in this suite and every app source file uses
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (confirmed by `grep`: `home.spec.ts`, `profile.spec.ts`,
  `kudos.spec.ts`, `login.spec.ts`, `src/lib/supabase/{client,server,proxy-client}.ts`, and the
  project's own `README.md:57`). `kudos-compose.spec.ts:134,772` instead reads
  `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` — a name that appears nowhere else in this repo.
  `.env.local` only defines `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not `..._ANON_KEY`.
- The fallback value, `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"`, decodes to just
  `{"alg":"HS256","typ":"JWT"}` — the JWT **header segment only**, with no payload or signature. It
  cannot function as a real `apikey`/bearer credential; if this fallback is ever actually exercised,
  `createTestSession`'s signup/token call would get rejected by Supabase's gateway and throw
  (`sign-in.ts`'s `else { throw new Error(...) }` branch), failing every test in the
  `@auth @local-db` describe block.
- This is **not a secret-leak concern** — a "publishable"/anon key is meant to be public by design,
  the same way it's already inlined into the client bundle at build time (see the CI docs elsewhere
  in this repo explaining exactly that). The concern is portability/reproducibility: the 27/27 GREEN
  evidence just recorded is real and I don't dispute it, but it depends on whatever ran it having
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in its shell (a name this repo doesn't otherwise define
  anywhere) — a fresh clone following this repo's own `README.md` setup instructions, or a CI runner
  seeded the same way `plans/260905-1656-.../phase-05-ci-quality-job.md` describes for the other
  specs, would hit the broken fallback and fail this describe block outright.
- Not blocking `SEALED`: it doesn't touch application code, doesn't affect any of the 7 acceptance
  criteria (all of which were independently proven via `psql`/coverage/lint, not by trusting this
  one code path), and the tier it affects is explicitly `@local-db`-gated and, per the spec file's
  own comment, never runs in CI. But it should be fixed before this becomes a "why does this fail on
  your machine" surprise for the next person who runs it.
- Location: `tests/e2e/kudos-compose.spec.ts:134,772`

### Verdict
`criticalCount: 0`, `decision: SEALED`. All 7 acceptance criteria are now covered with real,
cross-corroborated evidence (independent `psql` queries, machine-built `temper-results.json`, a
from-scratch coverage/typecheck/lint/format re-run on my end, and direct inspection of the visual
screenshots) rather than a single self-reported table. `riskGate` stays
`touchesSensitiveArea: true, signoffRequired: true, humanSignedOff: false` — this still touches Auth
and DB migrations, and human sign-off remains the orchestrator's next step, not something this
inspection can substitute for.

**Status:** DONE
**Summary:** Re-inspection confirms the sole Critical from the first pass is resolved — 27/27 e2e
now has real, cross-corroborated evidence (temper-results.json, independent psql queries, a fresh
coverage/lint/typecheck run I ran myself, and direct visual screenshot review), and the 5 code fixes
since the first pass (dialog centering, label wrapping, hashtag-picker reset, feed remount key) are
all sound and correctly scoped. Decision: SEALED, score 9, criticalCount 0. One new non-blocking
Medium finding: `kudos-compose.spec.ts` uses a differently-named, non-functional-fallback Supabase
key env var vs. the rest of the repo's convention — test-only, no security impact, worth a follow-up
fix.
**Concerns/Blockers:** None blocking. `humanSignedOff` still `false` pending the orchestrator's
sign-off per `riskGate`.
