# Inspection: src/ route-colocation migration

Branch `refactor/src-route-colocation`, aca6e8e..580e45f (3 commits). Read-only review; verdict written
to `evidence/inspection-verdict.json`.

## Verdict

**SEALED** · score 9/10 · criticalCount 0 · contractStatus OK · touchesSensitiveArea true (auth gate
moved) · signoffRequired true, humanSignedOff false.

Independently re-ran the gate (not just trusted the tester/orchestrator logs): `pnpm lint
--max-warnings 0` (0), `pnpm format:check` (0), `pnpm test:unit` (19 files / 124 tests, 0),
`pnpm build-storybook` (0, 22 unique story files confirmed by parsing `storybook-static/index.json`),
`pnpm exec playwright test --grep-invert @auth` (46 passed / 2 skipped). Coverage 100%-all-axes /18
files and the `@auth` E2E suite came from the tester's concurrent `raw-temper-runs.json` (both exit 0);
build+typecheck for all 3 phases came from the orchestrator's `temper-results-orchestrator.json` (all
exit 0). Also proved the two ESLint boundary rules are not toothless by adding and reverting two
temporary violating imports (sideways `../login/_components/...` from the home page, and a Zone A
`@/app/...` import from `src/hooks/`) — both correctly failed lint, both cleanly reverted (`git diff`
empty after).

## Findings

| # | Sev | Location | Issue | Fix |
|---|---|---|---|---|
| 1 | Warning | `src/proxy.ts:13-16` | Docblock still says the authoritative check is `/todo`'s own `getUser()` in `app/todo/page.tsx` — that file and that check were removed in Phase 2. Contradicts the correct docblocks in `(protected)/layout.tsx` and `(protected)/todo/page.tsx` in the same diff. | Update the comment to name `src/app/(protected)/layout.tsx` as the authoritative gate. |
| 2 | Warning | `src/hooks/use-menu-keyboard-nav.test.ts` (382 lines), `src/app/auth/callback/route.test.ts` (221), `src/app/(public)/(home)/_shared/home-copy.ts` (202) | Exceed the repo's ≤200-line rule (skill rule 6). Confirmed via `git show aca6e8e:<old-path> \| wc -l` — identical counts pre-migration, so this is carried-over debt, not introduced here, but nowhere logged as accepted. | Log as debt in `plans/action-items.md`; not a blocker for a zero-behavior-change structural move. |
| 3 | Suggestion | — | Tester's raw run flagged "37 stories discovered (expected 22) — discrepancy". Rejected: `storybook-static/index.json` has 37 story *exports* across exactly 22 unique story *files* — the file count is what AC5 measures. | No action; clarify wording if this run log is reused. |

No critical or unresolved-security findings. `safeNextPath`'s open-redirect guard, the `getUserRole`
fail-open-to-`"member"` label, and the proxy's cookie-preserving redirect are all byte-identical to
pre-migration (confirmed via `git diff -M`), still exercised by E2E (`PERM004 ... stays within origin`,
`PERM002`/`PERM003` fail-open/closed) and unit tests.

## Acceptance criteria (study-context.json, verbatim)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Every migration-map file at its target path, root `app/components/hooks/lib/mocks/i18n/proxy.ts` gone | ✅ | `for d in app components hooks lib mocks i18n proxy.ts; do [ -e "$d" ]` → all gone |
| 2 | `pnpm lint` passes, no sideways/downward import (home header ≠ login, home page ≠ todo) | ✅ | lint exit 0; header uses `../../_components/language-selector/...` (ancestor, allowed); 2 reverted violation probes both correctly failed |
| 3 | `pnpm typecheck` passes | ✅ | orchestrator log, all 3 phases, exit 0 |
| 4 | `pnpm test:unit:coverage` 100% w/ pattern allowlist | ✅ | tester raw run exit 0, 100% all axes; independently enumerated 18 matching files by hand |
| 5 | `pnpm build-storybook` succeeds, 22 stories under `src/` | ✅ | own run exit 0; `index.json` → 22 unique `importPath` |
| 6 | `pnpm test:e2e` CI-safe + `@auth` green, URLs unchanged | ✅ | own run 46/48 (2 skip); tester's `@auth` run 9 passed |
| 7 | `(protected)/layout.tsx` single gate, anon `/todo` → `/login` | ✅ | code read + E2E `Unauthenticated GET /todo redirects to /login` |
| 8 | Every `src/dal` module imports `server-only`, no client component imports `src/dal` | ✅ | grep: all 3 dal files, line 1; reverse grep found 0 client importers |
| 9 | README + 3 skills reference only paths that exist | ✅ | diffed README.md + 3 SKILL.md, spot-checked every changed path on disk |

## Contracts

| Contract | Status |
|---|---|
| URLs `/ /login /todo /auth/callback` | Unchanged (build route list + E2E) |
| Env vars (`NEXT_PUBLIC_SUPABASE_URL`, `..._PUBLISHABLE_KEY`, `EVENT_START_AT`) | Unchanged (grep, still referenced by name) |
| `package.json` scripts | Unchanged (identical script bodies) |
| `messages/vi.json`, `messages/en.json` | Unchanged (`git diff` empty) |
| MSW handler endpoints | Unchanged (`handlers.ts` renamed at 100% similarity) |
| Playwright `testDir` | Unchanged (`./tests/e2e`) |

## Regression / blast-radius walk

OAuth flow, locale cookie normalization, homepage countdown/awards/header, `/todo` guard + logout,
vitest project split + coverage denominator, Storybook/MSW, CI workflow path assumptions — all walked,
all green (see verdict `regressionChecked`). `docs/vi` spec-layer re-baseline is explicitly out of phase
per `plan.md` (Stage 6 `rebuild-spec` core pass), not evaluated here by design.

## Unresolved

- Findings #1 and #2 above are non-blocking; no other open questions.
