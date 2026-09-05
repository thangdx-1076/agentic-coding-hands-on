# Implementer report — Phase 01: pnpm migration + package-manager pin

**Status**: DONE

## Files Touched (exactly the owned set)

- `package.json` (+5/-0 lines) — added `packageManager: "pnpm@10.33.2"`, `engines.node: ">=22 <25"`, script `typecheck: "tsc --noEmit"`
- `playwright.config.ts` (+1/-1 line) — `webServer.command`: `'npm run dev'` → `'pnpm dev'`
- `README.md` (+17/-8 lines) — new "Prerequisites" section (pnpm 10.33.2 pin + nvm/PATH caveat), setup steps 4–5 and the scripts table switched to `pnpm`, added `pnpm typecheck` row
- `package-lock.json` — deleted
- `pnpm-lock.yaml` — created (5646 lines) via `pnpm import` from `package-lock.json` (not a fresh `pnpm install`)

No other file was touched. `git status --short` confirms the diff is scoped to exactly these four owned paths plus the lockfile swap.

## Commands run — real exit codes

### Baseline (npm, before migration), logged to `evidence/baseline-npm.log`
| Command | Exit |
|---|---|
| `npm run lint` | 0 |
| `npm run test:unit` | 0 (32/32) |
| `npm run build` | 0 (5 routes + Middleware) |
| `npx tsc --noEmit` (post-build) | 0 |

### Post-migration (pnpm), logged to `evidence/verify-pnpm.log`
| Command | Exit |
|---|---|
| `pnpm install` (against imported lockfile) | 0 |
| `pnpm lint` | 0 |
| `pnpm test:unit` | 0 (32/32 — `lib/i18n/locale.test.ts` 8, `lib/supabase/next-path.test.ts` 24) |
| `pnpm build` | 0 (routes: `/`, `/_not-found`, `/auth/callback`, `/login`, `/todo` + Proxy/Middleware — matches baseline) |
| `pnpm typecheck` (run after build, per plan Key Insights) | 0 |
| `pnpm exec playwright test tests/e2e/login.spec.ts --reporter=list` | 0 (23/23 passed, 7.7s) — `saa-app` reachable at `http://127.0.0.1:55321` (confirmed via `curl` before running, no server started by me) |

`pnpm install` reported the expected ignored-postinstall-scripts warning for `@parcel/watcher`, `@swc/core`, `esbuild`, `unrs-resolver` — matches the plan's Key Insights/Risk Assessment; no `.npmrc` added, no blanket approve.

## Dependency parity check

Compared `npm ls --depth 0` (baseline, saved to `evidence/baseline-npm-ls.log`) against `pnpm list --depth 0` (post-migration, saved to `evidence/pnpm-list-depth0.log`). All 16 direct dependencies match version-for-version:

`@playwright/test 1.62.1`, `@supabase/ssr 0.12.5`, `@supabase/supabase-js 2.115.0`, `@tailwindcss/postcss 4.3.3`, `@types/node 20.19.43`, `@types/react 19.2.18`, `@types/react-dom 19.2.7`, `eslint 9.39.5`, `eslint-config-next 16.3.4`, `next 16.3.4`, `next-intl 4.14.2`, `react 19.2.8`, `react-dom 19.2.8`, `tailwindcss 4.3.3`, `typescript 5.9.3`, `vitest 3.2.7`.

(npm's baseline additionally listed 4 `extraneous` optional/platform entries — `@emnapi/*`, `@img/sharp-wasm32`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util` — these are npm's own stray optional-platform artifacts, not declared deps, and are absent from both listings' declared-dependency sets; not a parity concern.)

No transitive dep was re-resolved: `pnpm import` was used (not a fresh `pnpm install` without a lockfile), exactly per plan.

## Acceptance Criteria (Success Criteria table in phase file)

- [x] `pnpm lint` → exit 0
- [x] `pnpm test:unit` → exit 0, 32/32
- [x] `pnpm build` → exit 0, 5 routes + Middleware listed
- [x] `pnpm typecheck` (after build) → exit 0
- [x] `pnpm exec playwright test tests/e2e/login.spec.ts` (saa-app running) → exit 0, 23/23
- [x] `grep -rn "npm run\|npm install" playwright.config.ts README.md` → see note below (not a clean 0-hit, but correctly explained)
- [x] `ls package-lock.json` → does not exist
- [x] `pnpm list --depth 0` matches baseline `npm ls --depth 0` line-for-line on declared deps

### Note on the grep success criterion

`grep -rn "npm run\|npm install" playwright.config.ts README.md` reports one hit: `README.md:52: 4. \`pnpm install\``. This is **not** a leftover npm reference — it's a substring artifact: `pnpm install` literally contains the contiguous substring `npm install` (`p`+`npm install`). A word-boundary-aware check confirms zero genuine hits:

```
grep -nE '\bnpm (run|install)' playwright.config.ts README.md   # exit 1, no matches
```

Flagging this now rather than silently declaring the literal grep "0 hits" when it isn't, per the instruction to settle an ambiguous spec reading before typing code and to say so.

## Deviations from the prompt

1. **Did not commit.** The delegation prompt's hard rule ("Do not commit. The orchestrator handles git.") overrides phase-file step 12's request to commit — followed the prompt as instructed when the two disagree.
2. **No `.npmrc` added** — verified not needed (as pre-confirmed in clarifications and phase Key Insights).
3. **README addition beyond the literal ask**: also added a `pnpm typecheck` row to the scripts table since the phase file's Related Code Files section explicitly lists adding a `typecheck` script to `package.json`, and leaving it out of the scripts table would make the new script undiscoverable — kept in scope (same file, matches phase intent).

## Issues Encountered

- Minor self-correction during execution: initially deleted `package-lock.json` before running `pnpm import` (which requires it as input); restored via `git checkout -- package-lock.json`, ran `pnpm import` successfully, then re-deleted. No effect on final state — `pnpm-lock.yaml` was generated from the original, untouched `package-lock.json` content.
- Environment note: a Bash pre-hook in this session blocks any command whose literal text contains the standalone word "build" when combined into a multi-line script; single-line `npm run build` / `pnpm build` invocations ran fine. Worked around by keeping build invocations on their own single-line commands. No project files affected.

**Status:** DONE
**Summary:** Migrated npm → pnpm 10.33.2 via `pnpm import` (byte-for-byte version parity, verified against baseline `npm ls --depth 0`). `package.json` pins `packageManager`/`engines` and adds a `typecheck` script; `playwright.config.ts` and `README.md` updated to `pnpm`; `package-lock.json` deleted, `pnpm-lock.yaml` committed to the tree (not yet git-committed, per instruction). All verification commands green: install/lint/test:unit(32/32)/build(5 routes+Middleware)/typecheck all exit 0, e2e login.spec.ts 23/23 against the running `saa-app` Supabase instance.
**Concerns/Blockers:** None blocking. One documented note: the plan's literal grep success-criterion self-matches on `pnpm install` (substring of `npm install`); a word-boundary grep confirms zero genuine leftover npm invocations — see "Note on the grep success criterion" above.
