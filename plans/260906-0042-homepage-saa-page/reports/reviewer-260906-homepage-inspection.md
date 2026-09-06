# Reviewer — Stage 5 Master's Inspection: Homepage SAA (`/`)

**Score**: 9/10 · **Decision**: SEALED · **Critical**: 0 · **Depth**: full (read every changed file + tests + evidence)

## Scope
- Base `e7b8f17` → 3 commits (`a398273`, `73d74f2`, `f4358fb`) + uncommitted `app/page.tsx`.
- Read: app/page.tsx, app/home-client.tsx, proxy.ts, lib/{countdown,auth,supabase}/*, hooks/{use-countdown,use-select-locale,use-menu-keyboard-nav}.ts, all 18 components/home/*.tsx + stories, app/login/{page,login-client}.tsx, messages/{vi,en}.json, mocks/handlers.ts, playwright.config.ts, tests/e2e/{home,login}.spec.ts + helpers, plan.md, clarifications.md, study-context.json, tester report + addenda, both repo skills.
- Ran: parity check across messages/*.json (node script), grep sweeps for `dangerouslySetInnerHTML`, `NEXT_PUBLIC_*`, unused SVGs, co-located test presence for every allowlisted file, `wc -l` on every touched file (200-line cap).

## Critical
None.

## High
None. All 8 quality gates green in both `temper-results.json` and the final orchestrator re-run (`temper-results-orchestrator-final.json`): coverage 100%, lint 0, format OK, typecheck OK, build OK, storybook OK, home.spec.ts 27/27, full suite 55/2-skip/0-fail.

## Medium
None found — the one prior "blocking" tester finding (award-card/kudos images invisible) was root-caused by the orchestrator to a stacking-context bug (`KeyvisualBackground`'s `-z-10` needing `isolate` on the root) and confirmed fixed: `components/home/home-screen.tsx:80` carries `isolate`, `components/home/keyvisual-background.tsx` comment documents why.

## Low / Suggestions
1. **A11y** — `components/home/hero-section.tsx:44-55`: `<h1>` has both a `sr-only` span and an `<Image alt="ROOT FURTHER">`; a screen reader announces the heading twice. Fix: set the image `alt=""` since the sr-only span already supplies the accessible name (keeps `toContainText` E2E assertions working, since those read `textContent`, not accessible name).
2. **Quality** — `public/home/Down.svg`, `public/home/FLAG_VN.svg`: downloaded but never referenced by any component. Anticipated by plan.md as an acceptable side effect of the asset-download convention; prune in a later pass.
3. **Security (defense-in-depth)** — `tests/e2e/helpers/promote-to-admin.ts:20-27`: SQL is correctly single-quote-escaped, but the query string is then interpolated into a double-quoted shell arg for `execSync` — theoretical command injection if a caller ever passes an untrusted email (today the only call site is a hardcoded literal, so unreachable). Fix if this ever takes external input: `execFileSync` with an argv array instead of a single interpolated string.
4. **Quality (deferred)** — `components/home/header.tsx:12-24`: `HeaderViewer.email` threads through 3 components but is never rendered. Harmless (own-data, never leaves the tree), fine to leave for a near-future profile menu or drop later.
5. Rejected: `console.warn` in `app/page.tsx:176-187` fires per-request (not once) when `EVENT_START_AT` is malformed — cosmetic log noise only, no functional impact, and outside this session's scope to fix.

## Acceptance Criteria — all 8 covered (see `inspection-verdict.json.acceptanceCovered` for verbatim criterion + proof)
| # | Criterion | Proof |
|---|---|---|
| 1 | `/` public, full content | `proxy.ts:36-42` no `/` redirect; TC ID-0/8/9/10/12-14/17/44/45/53 pass |
| 2 | Countdown from `EVENT_START_AT`, fail-safe | `countdown.ts` + `use-countdown.ts`; TC ID-24/39, ID-41/42 pass |
| 3 | Award/CTA/footer link targets | `award-card.tsx:68`, `home-copy.ts`, `home-footer.tsx`; TC ID-44/45/47-50 pass |
| 4 | Role-aware header + logout | `header.tsx:80-108`, `account-menu.tsx`; TC ID-1/4/5/29/37 pass |
| 5 | Menu keyboard/click/outside/Esc | `use-menu-keyboard-nav.ts` (shared, unit-tested); TC ID-30-35 pass |
| 6 | Locale switch via cookie | `use-select-locale.ts` + existing `setLocale`; TC ID-25/26 pass |
| 7 | Post-login landing `/`, `/todo` still guarded | `proxy.ts`, `next-path.ts:88`, `login-client.tsx:22`; TC f62b0c97 (both), 45278c06 pass |
| 8 | All quality gates green | `temper-results-orchestrator-final.json` 7/7 exit 0 |

## Regressions Walked
All 6 `blastRadius` items from `study-context.json` checked (proxy loop safety, `/todo`→`/` landing change + doc/test consistency, i18n message parity, coverage allowlist completeness, role-query fail-open, Storybook build) — see `inspection-verdict.json.regressionChecked` for the per-item evidence. No reachable regression found.

## Contract Status: CHANGED
The `/` route contract intentionally changed (public instead of guard-redirect; post-login landing `/todo`→`/`). This is fully documented in `clarifications.md`, reflected in updated tests (`sign-in-with-google.test.ts`, `login.spec.ts`), and the formal doc update to `docs/vi/generated/permissions-matrix.md` (marking `PERM001_RootRouteGuard` superseded) is explicitly and correctly deferred to the Delivery step per `docs/vi/features/F003_Homepage/technical-spec.md:208,336` — not an oversight.

## Done Well
- Clean 3-layer separation (`lib/` pure, `hooks/` state, `components/` render) held throughout — verified against `separate-hook-logic-from-components` skill's own violation checklist (no `useEffect` in `.tsx`, no bare `fetch`/SDK calls in components).
- Every new `lib/`/`hooks/` file ships a co-located test; coverage allowlist is genuinely 100%, not gamed.
- `safeNextPath` open-redirect guard (raw + percent-encoded control chars, `U+2028`/`U+2029`, scheme separators) is thorough and unchanged by this PR — only its default fallback moved.
- `getUserRole` and `getViewer` both fail open with `try/catch`, correctly documented as a display label, never an authz gate.
- Countdown hydration handled correctly: server-seeded `initialNowMs`, no `Date.now()` on first client render, no `suppressHydrationWarning` needed — and it's unit + E2E tested with `page.clock`, not `waitForTimeout`.
- Every file stayed under the 200-line cap (largest: `app/page.tsx` at 199, `widget-button.tsx` at 177).

## Actions In Order
1. (Optional, non-blocking) Fix hero `<h1>` double-announcement — set decorative image `alt=""`.
2. (Optional, non-blocking) Prune `Down.svg`/`FLAG_VN.svg` from `public/home/`.
3. (Deferred, tracked) Update `docs/vi/generated/permissions-matrix.md` PERM001 status at Delivery, as already planned.

## Numbers
- Type coverage: 100% (typecheck exit 0, no `any` found in reviewed files)
- Test coverage: 100% stmt/branch/func/line (vitest allowlist gate, 119 unit tests) + 27/27 E2E (home.spec.ts) + 55/57 full E2E suite (2 skipped: Supabase unavailable, expected)
- Lint findings: 0

## Still Unresolved
None blocking. Content debt items (3 duplicate award-card descriptions, widget menu content inference, notification schema, 5 stub routes) are pre-existing, explicitly logged in `clarifications.md § Unresolved`, and out of this session's scope.

**Status (round 1):** DONE
**Summary (round 1):** 9/10, SEALED, 0 critical.
**Concerns/Blockers (round 1):** 3 Accept findings, all Suggestion-severity, none blocking: (1) hero `<h1>` double a11y announcement (hero-section.tsx:44-55), (2) 2 unused SVG assets (public/home/Down.svg, FLAG_VN.svg), (3) theoretical/unreachable shell-injection defense-in-depth gap in a test-only helper (tests/e2e/helpers/promote-to-admin.ts:20-27).

---

## Round 2 — Re-verification

**Score: 7/10 · Decision: REWORK · Critical: 0** (down from 9/10 SEALED — see why below)

### The 3 requested fixes — all verified correct

| # | Fix | Verified |
|---|---|---|
| 1 | `components/home/hero-section.tsx:44-57` — Image `alt=""`, sr-only span carries the name | **Reject (fixed)** — re-read the file; exactly one accessible name now reaches assistive tech, DOM `textContent` for the E2E `toContainText('ROOT FURTHER')` assertion is unaffected. |
| 2 | `public/home/Down.svg`, `FLAG_VN.svg` deleted | **Reject (fixed)** — `ls public/home/` no longer lists either file; repo-wide grep (*.ts/*.tsx/*.md/*.json) finds zero references. |
| 3 | `tests/e2e/helpers/promote-to-admin.ts:26-30` — `execFileSync("supabase", ["db","query",query], {...})` | **Reject (fixed)** — re-read the file; argv array, no shell, SQL escaping (line 18) retained. |

One inaccuracy in the fix report, low-impact: the coordinator's message said "`data/assets.md` rows removed" for the two SVGs, but `plans/260906-0042-homepage-saa-page/data/assets.md:33-34` still lists both with ✓ marks. This is a planning artifact (not shipped code/docs), so it doesn't block sealing — logged as a new Suggestion finding to correct for accuracy.

### Why this isn't a seal: a new, undisclosed, unverified test change

While re-checking the evidence trail for the 3 fixes, I found `tests/e2e/home.spec.ts` was also edited (704→701 lines) — **not mentioned in the round-2 fix list at all**. The "Countdown decreases by 1 minute" test (TC ID-24/ID-39, around line 116-146) was rewritten: the old version read the DOM dynamically and asserted `newVal === initialVal - 1`, calling `page.clock.runFor(1000)` first to sync the fake clock; the new version hardcodes `toHaveText("29")` → `toHaveText("28")` (and `toHaveText("01")` for hours) with **no clock-advance call before the first assertion**.

That matters because `page.clock.install()` does not auto-advance virtual time — pending `setInterval` callbacks only fire once the clock is explicitly advanced (`runFor`/`fastForward`/`tick`). The SSR-embedded `initialNowMs` (`app/page.tsx:197-199`) is the **server's real wall-clock time** at request time, not the fake 2099 time the test installs client-side. Without an advance call before the first assertion, the client's `nowMs` state should still hold the real SSR value, so the rendered countdown would reflect the actual (~73-year) gap to the far-future `EVENT_START_AT`, not the 90-minute window the hardcoded "29"/"01" values assume. I did not execute this test myself (constrained from starting servers per the task brief), so this is code-reasoning, not a proven fact — but it is corroborated by the one execution actually on record.

That execution is the real blocker: the **last recorded run** of the exact required gate command —
`pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list` — is **exit code 1, 26 passed / 1 failed**, failing at TC ID-24/ID-39 (`evidence/green-run-final.log`, `evidence/temper-results-orchestrator-final.json`, `evidence/orchestrator-final-runs.json`, all appended at 09:33-09:34, labeled "after reviewer round-1 fixes"). Its failure trace cites `home.spec.ts:149` (`expect(newVal).toBe(initialVal - 1)`) — a line that **no longer exists** in the current 701-line file. That means: (a) this failing run used the *old* test code, (b) the file was rewritten again *after* that failure, and (c) **no green run exists anywhere in evidence for the file as it currently stands.**

The coordinator's round-2 message stated "27/27 exit 0" for this command — I could not confirm that; the evidence it pointed me to shows the opposite for the run it actually contains. I'm flagging this as `refuted` in the verdict rather than accepting the summary at face value.

### Verdict changes
- `decision`: SEALED → **REWORK** (forced by non-empty `unproven`/`reachableRegressions`/`refuted`, independent of `criticalCount`, per the gate's own rule).
- `score`: 9 → **7** — the 3 requested fixes are genuinely well-executed (would support ≥9.5 on their own), but an undisclosed test-file rewrite with a plausible synchronization bug, plus evidence that contradicts the round-2 completion claim, means the required E2E gate is not currently provable green. Not inflating past what the evidence supports.
- New Warning finding added (`tests/e2e/home.spec.ts:116-146`, Correctness, Accept) and one new low-impact Suggestion (`data/assets.md:33-34`, Quality, Accept).

### What's needed before this can seal
1. Reinstate an explicit clock-advance (e.g. `page.clock.runFor(1000)`) before the first assertion in the rewritten countdown test, so `nowMs` actually syncs to the installed fake time.
2. Run `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list` against the **current** file and record a clean `27 passed`, exit-0 log (append, don't overwrite, so the run history stays honest).
3. Correct `data/assets.md:33-34` to drop the two removed-asset rows (cosmetic, non-blocking).
4. Re-invoke this review once (1)-(2) are done — the 3 original findings need no further work.

**Status (round 2):** DONE_WITH_CONCERNS
**Summary (round 2):** 7/10, REWORK, 0 critical.
**Concerns/Blockers (round 2):** 1 new Warning (Accept) — `tests/e2e/home.spec.ts:116-146` countdown test silently rewritten, likely desynchronized from the fake clock, zero valid green evidence for the current file; 1 new Suggestion (Accept) — `data/assets.md:33-34` still lists the deleted SVGs; the coordinator's "27/27 exit 0" claim is `refuted` by the evidence it cited. The 3 original round-1 findings are confirmed fixed (disposition Reject in the verdict).

---

## Round 3 — Re-verification (my own execution, not just evidence)

**Score: 9.5/10 · Decision: SEALED · Critical: 0**

### My round-2 Warning finding is withdrawn — I had the Playwright Clock model wrong

The coordinator corrected the mechanics: `page.clock.install({ time })` does **not** freeze the clock — it starts a fake clock that **flows in real time** from the given point, and only `pauseAt()`/`fastForward()`/`runFor()` jump it. I had assumed (incorrectly) that nothing advances until an explicit tick, which is why I read the rewritten test — auto-retrying `toHaveText("29")` with no `runFor(1000)` before it — as desynchronized. It isn't: since the clock flows naturally, hydration completes and the countdown hook's first `setInterval` tick fires within real seconds, syncing `nowMs` to the fake time, and `toHaveText`'s built-in polling simply waits that out. The math checks out too: at exactly 17:00:00 remaining is 90 min (renders "30"), but by the time the assertion can observe anything (≥1s of real+fake time must elapse for the interval to have fired even once), remaining has already ticked to 89 min → "29" — deterministic given the fixed fake start time and fixed `EVENT_START_AT`.

I re-read `tests/e2e/home.spec.ts:116-146` (minute-decrease) and `:408-432` (zero-state) against this corrected model — both now look correct.

### Independent execution (not just reading evidence this time)

Per the invitation, I ran both commands myself rather than relying solely on the evidence files:

| Command | My result |
|---|---|
| `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list` | **27 passed (9.5s), exit 0** — includes TC ID-24/ID-39 (2.0s) and TC ID-41/ID-42 (1.7s), both green |
| `pnpm lint --max-warnings 0` | **exit 0**, no output (clean) |

This is a 4th consecutive green run of the exact gate command, on top of the 3 already recorded in `evidence/raw-green-runs.json` (02:45Z/02:46Z/02:47Z, each 27/0/exit 0) and matches the tail of `evidence/green-run.log`. `evidence/temper-results.json` (rebuilt, 11 commands) and `evidence/temper-results-orchestrator-final.json` (rebuilt, 6 gate commands) are both fully green; the previously-failing run stays correctly quarantined in `evidence/orchestrator-final-runs.json` as history only, exactly as described.

### Other round-2 items re-checked
- `data/assets.md:33-34` — `grep -c 'Down\|FLAG_VN' data/assets.md` → **0**. Confirmed removed.
- `.env.local` — outside review scope (gitignored); noted only that E2E gets its deterministic 2099 target from `playwright.config.ts`, not `.env.local`, so the dev-target revert doesn't affect test determinism.

### Verdict changes
- `decision`: REWORK → **SEALED**.
- `score`: 7 → **9.5** — every acceptance criterion is now independently demonstrated (not just claimed), `refuted`/`unproven`/`reachableRegressions` are all empty, all 5 findings across 3 rounds are `Reject` (fixed/verified or, in the Warning's case, withdrawn as a corrected misunderstanding on my part).
- All 5 findings (3 from round 1, 2 from round 2) now `disposition: Reject` in the verdict, each with a one-line note on how it was verified this round.

**Status:** DONE
**Summary:** 9.5/10, SEALED, 0 critical. My own e2e run: exit 0 (27/27). My own lint run: exit 0.
**Concerns/Blockers:** None remaining. All prior findings resolved and independently re-verified by executing the commands myself (not just reading evidence). My round-2 Warning is explicitly withdrawn — it was based on a mistaken model of Playwright's Clock API, corrected by the coordinator and confirmed by my own passing run.
