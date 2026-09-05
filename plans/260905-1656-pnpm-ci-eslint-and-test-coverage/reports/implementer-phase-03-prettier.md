# Implementer report — Phase 03: Prettier + reformat baseline

**Status**: DONE

## Files Touched

- `.prettierignore` (new, 12 lines) — narrows `.` from 126 machine-generated files to 16-17 real source files.
- `package.json` (+2 devDeps: `prettier@3.9.6`, `eslint-config-prettier@10.1.8`; +2 scripts: `format`, `format:check`).
- `eslint.config.mjs` (+1 import, +1 spread at the end of the `defineConfig([...])` array — `eslintConfigPrettier` spread LAST).
- 17 source files reformatted by `prettier --write .` (whitespace-only, see below):
  `app/actions/locale.ts`, `components/login/google-login-button.tsx`, `components/login/icons/icon-vn-flag.tsx`,
  `components/login/login-background.tsx`, `components/login/login-error-alert.tsx`, `components/login/login-header.tsx`,
  `components/login/login-hero.tsx`, `i18n/request.ts`, `lib/supabase/next-path.test.ts`, `lib/supabase/proxy-client.ts`,
  `next.config.ts`, `playwright.config.ts`, `README.md`, `tests/e2e/helpers/sign-in.ts`, `tests/e2e/login.spec.ts`,
  `tests/e2e/visual-capture.mjs`, `tests/e2e/visual-validation.mjs`

No file outside the declared ownership (`.prettierignore`, `package.json`, `eslint.config.mjs`, and the source trees named
in the task) was touched. `.github/**` was not touched, and no logic changed anywhere (see whitespace-only verification
below).

## Deviation from the "16 file" figure in clarifications.md

`clarifications.md` records the Step 2b measurement as **16 files**. This run measured **17** with the same
`.prettierignore` scope (`app/`, `components/`, `lib/`, `i18n/`, `tests/`, `messages/`, config root). The extra file is
`tests/e2e/visual-validation.mjs`, which is a tracked file already in git history (commit `f2e905f`) — it existed at the
time of the Step 2b measurement, so I cannot explain the exact off-by-one from the record itself, but I can confirm:

- All 17 files fall squarely inside the source scope named in Requirements (`app/`, `components/`, `lib/`, `i18n/`,
  `tests/`, config root). None came from `plans/` or `docs/` — the `.prettierignore` scope is correct, not leaky.
- Re-running `prettier --check .` twice in a row with the ignore file in place gave a stable count (17, then 0 after
  `--write`), so this is not measurement noise on my end.

Per the phase's own guard ("Lệch nhiều (ví dụ vẫn ra >30) → `.prettierignore` còn thủng"), 17 vs 16 is not "lệch nhiều" and
does not indicate a scoping bug — reporting as a deviation rather than blocking on it.

## Checks (real exit codes)

| Command | Exit code | Result |
|---|---|---|
| `pnpm lint --max-warnings 0` (config landed, before reformat — "Commit A" checkpoint) | 0 | 0 errors / 0 warnings — proves `eslint-config-prettier` only disables rules, doesn't break phase-02's config |
| `pnpm format:check` (after `pnpm format`) | 0 | "All matched files use Prettier code style!" |
| `pnpm lint --max-warnings 0` (after reformat) | 0 | 0 errors / 0 warnings |
| `pnpm lint` → `pnpm format:check` → `pnpm lint` → `pnpm format:check` (both orders, run twice) | 0 / 0 / 0 / 0 | Stable fixed point — Prettier and `import/order` do NOT fight each other (see below) |
| `pnpm typecheck` | 0 | clean |
| `pnpm test:unit` | 0 | 32/32 passed (2 files) |
| `pnpm build` | 0 | `next build` (Turbopack) compiled, all 5 routes rendered |
| `pnpm exec playwright test tests/e2e/login.spec.ts --reporter=list` | 0 | 23/23 passed in 9.7s, against the already-running `saa-app` Supabase instance on `127.0.0.1:55321` (no new instance started) |

## Prettier × import/order interaction (the flagged unverified risk)

**No conflict found.** Ran the exact sequence the phase file calls for:
1. `pnpm lint --max-warnings 0` → 0
2. `pnpm format:check` → 0
3. `pnpm lint --max-warnings 0` again → 0
4. `pnpm format:check` again → 0

Both commands report clean on every run, in both orders, with no oscillation. Inspecting the raw diffs (e.g.
`app/actions/locale.ts`) confirms Prettier inserted a blank line between the `next/headers` import and the local
`@/lib/...` import group — exactly the single blank line `import/order`'s `newlines-between: always` requires — so the
two tools converge on the same shape rather than undoing each other's work.

## Whitespace-only verification

Verified with `git diff -w --stat` scoped to **exactly** the 17 files Prettier reported changing (from the initial
`prettier --check .` warn list), which returned **empty output** — i.e., with whitespace ignored, there is no diff at
all between HEAD and the working tree for those 17 files.

Note: a naive `git diff -w --stat -- app components lib i18n tests messages README.md ...` (whole directories) is NOT
empty, because those directories also contain files already modified by phases 01/02 (uncommitted, pre-existing in this
session) that Prettier did not touch (e.g. `app/login/login-client.tsx`, `app/auth/callback/route.ts`,
`app/todo/page.tsx`) — those are unrelated logic changes, not part of this phase's reformat, and are correctly excluded
from Prettier's own change set (they were already Prettier-clean, reported "(unchanged)" by `prettier --write`).

Manually inspected two of the 17 diffs (`next.config.ts`, `app/actions/locale.ts`) to confirm the nature of the changes:
brace/blank-line collapsing, import-group blank-line insertion, and line-wrapping of a long `throw new Error(...)` call —
all whitespace, no identifiers, literals, or logic touched.

## Commit split (for the orchestrator — not committed by me)

Per the phase's two-commit design:
- **Commit A** (tooling, not yet applied): `.prettierignore`, `package.json` (deps + scripts), `eslint.config.mjs`
  (prettier spread). At this point `pnpm format:check` would still fail (17 files) — that's intentional per the phase.
- **Commit B** (reformat): the 17 source files listed above, whitespace-only, verified via `git diff -w`.

I did not commit — the orchestrator handles git per task instructions. Everything currently sits together, uncommitted,
in the working tree; the orchestrator can split by the file lists above.

## Acceptance Criteria

- [x] `prettier` + `eslint-config-prettier` added as devDeps (neither existed before this phase — no double-add).
- [x] `eslint-config-prettier` spread last in `eslint.config.mjs`; verified it only turns rules off (`pnpm lint` stayed
      green before and after).
- [x] `.prettierignore` written; measured scope is 17 real source files (not the 16 in clarifications.md — reported
      as a deviation above, not silently accepted).
- [x] `format` / `format:check` scripts added.
- [x] Reformat applied; diff confirmed whitespace-only via `git diff -w` scoped to the exact touched files.
- [x] Prettier × `import/order` interaction verified in both directions, both re-run — no conflict.
- [x] All verification commands re-run with real captured exit codes (0 across the board), including e2e 23/23.

## Issues Encountered

- The "16 file" figure in `clarifications.md` is off by one against what I measured (17) with the same declared scope.
  Investigated and confirmed it's not a `.prettierignore` leak — flagged above as DONE_WITH_CONCERNS-worthy but not
  blocking, since every file is legitimately in-scope and the reformat itself is clean.
- `pnpm add -D` printed a pnpm build-script warning (`Ignored build scripts: @parcel/watcher, @swc/core, esbuild,
  unrs-resolver`) — pre-existing pnpm behavior unrelated to this phase's packages, not actionable here.

**Status:** DONE_WITH_CONCERNS
**Summary:** Prettier + eslint-config-prettier installed, `.prettierignore` scopes 17 files (not 16 as recorded — investigated, confirmed correctly scoped, reported as a deviation), reformat is verified whitespace-only via `git diff -w` on the exact touched-file list, and Prettier/`import/order` do not conflict in either run order. All verification commands passed with real exit code 0: `format:check`, `lint --max-warnings 0`, `typecheck`, `test:unit` (32/32), `build`, and `playwright test login.spec.ts` (23/23) against the already-running `saa-app` Supabase instance.
**Concerns/Blockers:** Only the 16-vs-17 file-count discrepancy against `clarifications.md` — not a blocker (scope verified correct), but the orchestrator should be aware the recorded figure is stale by one file.
