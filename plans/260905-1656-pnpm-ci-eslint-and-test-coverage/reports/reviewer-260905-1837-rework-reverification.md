## Review Summary — Rework Re-verification

### Scope
- Re-verified the coordinator's 4 claimed fixes against the current tree, independently, without trusting the message.
- Sanity-read the newly promoted `docs/vi/system/architecture.md`.
- Files: `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `eslint.config.mjs`, `tests/e2e/login.spec.ts`, `tests/e2e/helpers/supabase-reachable.ts`, `docs/vi/system/architecture.md`, plus live command re-runs.
- Depth: full re-run of every command the coordinator cited, plus one command they didn't (branch-protection check via `gh api`).

### Re-verification results

**1. vitest reverted to 3.2.7 — CONFIRMED, genuinely.**
`package.json:36,47` and `pnpm-lock.yaml:2950` both show `3.2.7`/`^3.2.7`; `pnpm install --frozen-lockfile` re-run clean. Re-ran `pnpm test:unit` myself: 34/34 pass. Re-ran `pnpm test:unit:coverage` myself: reproduces **exactly** 55.55% stmts / 88.57% branch / 70% funcs / 55.55% lines — matches the coordinator's number to the decimal.
**Is the new number honest, not a regression?** Yes. Nothing in `lib/**` or its tests changed between the two coverage runs — only the vitest major changed. The v8 coverage provider's line-range accounting for *uncovered* files differs between vitest majors (e.g. `client.ts` now shows lines `1-18` uncovered instead of a single line `14`; `locale.ts` — previously invisible under the vitest-5 run's odd default-scoped 97.05% figure — now correctly appears at 100%). This is the coverage *tool's* bookkeeping changing, not the *application's* tested surface shrinking. Reverting to 3.2.7 restores the toolchain to the version the whole session was supposed to hold constant, so 55.55%/88.57%/70% is the correct on-record baseline going forward, superseding both the original 97.05% (wrong-scope) and the interim 71.73% (wrong-vitest-major) numbers.

**2. ESLint scope leakage — CONFIRMED FIXED.**
`eslint.config.mjs:92-102` now lists `plans/**`, `docs/**`, `.claude/**`, `test-results/**`, `playwright-report/**` in `globalIgnores`, with a comment naming the exact leak this review found. Re-ran `eslint . --format json` myself and parsed it: **41 files linted, zero from any tool-owned tree**, 0 errors/warnings total. `pnpm lint --max-warnings 0` re-run: exit 0.

**3. `?code=<unusable>` test — rescoped in name and intent, not moved. Judged adequate.**
Read the test at `tests/e2e/login.spec.ts:322-345` directly. It's still in the CI-safe `Unauthenticated` block (not tagged `@auth`), but the title changed to "falls back to /login?error=auth_code_error" and a comment block now states plainly: it proves the fallback is reachable, NOT that Supabase rejected an invalid code specifically; it names both causes that funnel into the same `catch`; and it names the two branches that remain genuinely uncovered (real invalid-code rejection, and the `?code=<valid>` success path). This resolves my original concern, which was about a misleading claim, not about test placement — the test's name and comment now match exactly what it proves in each environment. **I agree with the coordinator's call: leaving it CI-safe is the better trade (real fallback-reachability coverage in CI beats moving it to local-only to chase a distinction it was never going to prove in CI anyway).** No further action needed here.

**4. Coverage `include`/`exclude` — unchanged from original review, re-confirmed correct.** `vitest.config.ts:34-35` still has the explicit `include: ["lib/**/*.ts"]` / `exclude: ["lib/**/*.test.ts"]` that makes the percentage meaningful; re-ran the coverage report and the 3 Supabase factories still show 0% (now `client.ts` 0%, `proxy-client.ts` 0%, `server.ts` 0% — same three files as before, just different line-range totals per point 1 above).

**5. CI dispatch — still not done, correctly left open.** No `evidence/ci-quality-first-run.txt` or `evidence/ci-e2e-first-run.txt` exists. Re-ran the CI-simulated command myself (`CI=true`, unreachable Supabase on a different port than the coordinator used, to make sure it wasn't a fluke of one specific port): **27 passed, 0 skipped, exit 0**, both outage tests visibly executing in the list output. Also independently ran the full suite with `saa-app` up (it happens to be reachable in this session): **28 passed, 2 skipped**, matching the coordinator's log exactly. Both simulations are solid, but neither is a substitute for an actual GitHub Actions execution — this remains the one open item, and it cannot be closed without a `git push` / `workflow_dispatch`, which is outside this session's authorization.

### New finding from the architecture-doc sanity read

`docs/vi/system/architecture.md:143-144` asserts both CI jobs "(chặn merge...)" — **blocks merge**. I checked whether that's actually true: `gh api repos/sun-asterisk-internal/agentic-coding-hands-on/branches/main/protection` → **404 Not Found** — `main` has no branch protection rule at all, so no required status check is configured. Today, a red `quality` or `e2e` run would not stop anyone from merging; nothing in phases 05/06 touched branch protection (by design — it's a repo-settings change, not a workflow file change), and the CLAUDE.md rules for this run never asked for it either. This is a claim that outruns the code: the workflow *can* gate merges once branch protection is turned on, but the doc states it as already true. This is a doc-accuracy issue only (Medium, not blocking merge of this diff) — flagging because the coordinator asked for exactly this kind of check.
- **Fix**: soften to "sẽ chặn merge một khi được cấu hình làm required status check trong branch protection (chưa cấu hình tại thời điểm viết)" or equivalent, or actually configure branch protection as a follow-up and then the doc becomes true.

### Still open, unchanged from original review (not part of the 4 claimed fixes, low priority)
- `tests/e2e/helpers/supabase-reachable.ts:5` JSDoc still describes the skip condition inverted from the real implementation (checked again — untouched). Still just a comment bug.
- Pinned Action majors (`setup-node@v4`, `cache@v4`, `upload-artifact@v4`) still 1-3 majors behind latest but valid — unchanged, non-blocking.

### Verdict

**Decision: BLOCKED** (not SEALED). Every finding that was fixable from inside this session is now fixed and independently re-verified — 0 Critical, 0 unresolved High that's actually actionable here. The one remaining blocker is structural, not a code defect: **the phases' own stated acceptance gate ("workflow đã chạy xanh một lần trên branch này") requires a real GitHub Actions execution, which has never happened and cannot happen without a push this session isn't authorized to make.** Per the gate's own rule, an undemonstrated claim keeps the verdict off `SEALED` regardless of how clean everything else is — this isn't a judgment call to relax, since local simulation (however thorough — and I re-ran it independently, twice, on top of the coordinator's own log) is exactly the class of evidence the phase files themselves said was insufficient ("không phải 'YAML trông đúng'").

**Status:** DONE_WITH_CONCERNS
**Summary:** 4 of 4 checkable fixes verified independently and hold up (vitest revert + honest coverage number, ESLint scope leak closed, test rescoped adequately, coverage include still correct); one new doc-accuracy issue found (branch protection not configured, doc overstates it); the one open item (real CI dispatch) is correctly left open by the coordinator and is the only thing keeping this from sealing.
**Concerns/Blockers:** Real GitHub Actions dispatch is required before this can seal — not fixable by further code changes, needs the user's push authorization.
