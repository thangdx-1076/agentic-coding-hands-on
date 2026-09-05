# Implementer report — Phase 02: ESLint standard + measured fixes

**Status**: DONE

## Files Touched

- `eslint.config.mjs` (+74/-1 lines net — 9-layer config per phase Architecture)
- `package.json` (+10 lines — 4 new devDeps, `lint:fix` script; `packageManager`/`engines`/`typecheck` lines already present from phase 01, untouched by me)
- `app/actions/locale.ts` (+1, import/order autofix)
- `app/auth/callback/route.ts` (+1, import/order autofix)
- `app/login/login-client.tsx` (+1, import/order autofix)
- `app/login/page.tsx` (+4/-2, import/order autofix — includes 1 genuine reorder)
- `app/page.tsx` (+1, import/order autofix)
- `app/todo/actions.ts` (+1, import/order autofix)
- `app/todo/page.tsx` (+4/-2, import/order autofix — includes 1 genuine reorder)
- `components/login/language-selector.tsx` (+10/-2 — import/order autofix + hand fix: `tabIndex={-1}` on `role="menu"` wrapper)
- `components/login/login-header.tsx` (+1, import/order autofix)
- `components/login/login-hero.tsx` (+1, import/order autofix)
- `components/login/login-screen.tsx` (+3/-2, import/order autofix)
- `i18n/request.ts` (+13/-6 — import/order autofix + hand fix: typed the dynamic `import(...)` result)
- `lib/i18n/locale.test.ts` (+1, import/order autofix)
- `lib/supabase/next-path.test.ts` (+1, import/order autofix)
- `proxy.ts` (+1, import/order autofix — root app source, not under `app/**` but functionally app code; see Concerns)
- `tests/e2e/helpers/sign-in.ts` (+4/-2 — hand fix: cast `.json()` results to the file's existing `SessionResponse` interface)
- `tests/e2e/login.spec.ts` (+78/-31 — 2 real bug fixes, type-safety fix, 2 playwright warning fixes; see below)
- `tests/e2e/visual-capture.mjs` (+3/-2, import/order autofix)

## Checks

- **Typecheck**: clean (`pnpm typecheck` → exit 0)
- **Lint**: clean (`pnpm lint` → exit 0; also verified `eslint --max-warnings 0` → exit 0) — **0 errors, 0 warnings**
- **Unit tests**: 32/32 passing (`pnpm test:unit` → exit 0)
- **Build**: clean (`pnpm build` → exit 0, Turbopack production build succeeds)
- **E2E**: 23/23 passing (`pnpm exec playwright test tests/e2e/login.spec.ts --reporter=list` → exit 0, run against the already-running `saa-app` Supabase instance at `127.0.0.1:55321`)
- **Lint wall-clock time** (3 runs each, repo root, warm cache after first run):
  - **Before** (original `eslint-config-next` defaults only, run via an out-of-repo-content-but-in-repo-path scratch config against the *current* tree, deleted immediately after measuring): 2.31s (cold) → 1.60s → 1.41s
  - **After** (full 9-layer config incl. type-aware linting): 4.51s (cold) → 3.24s → 3.18s
  - **Delta**: roughly +1.6–1.8s, ~2x, for type-aware linting on this 35-file `.ts`/`.tsx` tree — small in absolute terms, consistent with "negligible at this scale" but not literally sub-second as the research report's citation implied; reporting the real number rather than the citation.

## Acceptance Criteria (from phase file § Success Criteria)

- [x] `pnpm lint --max-warnings 0` → exit 0
- [x] `pnpm build` → exit 0
- [x] `pnpm typecheck` → exit 0
- [x] `pnpm test:unit` → exit 0, 32/32
- [x] `pnpm test:e2e` (saa-app running) → exit 0, 23/23
- [x] `grep -n "eslint-disable" tests/e2e/login.spec.ts` → 0 hits (old disable comment removed, no new one added)

## Config shape (`eslint.config.mjs`)

Exactly the 9 layers from the phase's Architecture section, in order:
1. `...nextVitals`, 2. `...nextTs` (unchanged, already present)
3. `{ files: ["**/*.{ts,tsx}"], extends: [...tseslint.configs.recommendedTypeChecked], languageOptions.parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }, rules: { no-floating-promises: error, no-misused-promises: error } }`
4. `{ files: ["**/*.mjs"], extends: [tseslint.configs.disableTypeChecked] }` (defense-in-depth — see Concerns)
5. `{ rules: { ...jsxA11y.flatConfigs.recommended.rules } }` (rules-only merge, no re-declared plugin key)
6. `{ rules: { "import/order": ["error", { "newlines-between": "always" }] } }` (rules-only, same reasoning)
7. `{ files: ["tests/e2e/**/*.spec.ts"], extends: [playwright.configs["flat/recommended"]] }`
8. `{ files: ["lib/**/*.test.ts"], extends: [vitest.configs.recommended] }`
9. `globalIgnores([...])` (unchanged)

Used ESLint's `extends` field (from `eslint/config`'s `defineConfig`) rather than raw array-spreading for layers 3/4/7/8, specifically so the outer `files` scope is AND-combined into every nested config object — verified this empirically with a throwaway script before writing the real config (confirmed layer-0 of `recommendedTypeChecked`, which sets `languageOptions.parser` globally with no `files` of its own, gets properly scoped down to `**/*.{ts,tsx}` instead of leaking onto `.mjs`/`.json`/etc).

**Type-aware coverage**: all 35 real `.ts`/`.tsx` files in the repo (31 under `app/`, `components/`, `lib/`, `i18n/`, `tests/` + 4 root config files `next.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `proxy.ts`) are covered by `tsconfig.json`'s existing `**/*.ts`/`**/*.tsx` include and matched by the type-checked layer — confirmed by the lint run producing zero "not included in project" parse errors. The 4 `.mjs` files (`eslint.config.mjs`, `postcss.config.mjs`, `tests/e2e/visual-capture.mjs`, `tests/e2e/visual-validation.mjs`) are explicitly excluded via layer 4 rather than silently falling outside scope.

**No scope leakage**: first `pnpm lint` run only touched files under `app/`, `components/`, `lib/`, `i18n/`, `tests/`, plus root `proxy.ts` — nothing under `plans/`, `docs/`, `.claude/` was scanned, so no `globalIgnores` additions were needed (phase step 3's conditional was not triggered).

**Dependencies**: exactly the 4 new devDependencies the phase specified — `typescript-eslint@8.69.0`, `eslint-plugin-playwright@2.11.0`, `@vitest/eslint-plugin@1.6.27`, `eslint-plugin-import@2.32.0` (promoted from transitive). `eslint-plugin-jsx-a11y` was **not** added as a new devDependency (matches the phase's explicit 4-package list) — it's imported directly in `eslint.config.mjs` to merge its full `recommended` rule map, and resolves today because pnpm's default `public-hoist-pattern` (`*eslint*`) hoists it to root `node_modules` even though it's only a transitive dep of `eslint-config-next`. Verified this resolves before relying on it. All 4 new packages are `devDependencies` only — no runtime/bundle impact.

## The 36 measured findings — reconciliation

**15 hand-fixed findings across 4 files — matches the measurement exactly:**
- `i18n/request.ts`: 6 `no-unsafe-assignment`/`no-unsafe-member-access` on the dynamic `import(...)`. Fixed by typing the cast as `{ default: AbstractIntlMessages }` (type imported from `next-intl`) rather than widening/disabling anything.
- `tests/e2e/login.spec.ts`: 2 real bugs (`route.abort()` / `route.fulfill()` missing `await` inside Playwright route handlers — fixed by making the callbacks `async` and awaiting both) + 4 `no-unsafe-*`/`no-unnecessary-type-assertion` on `(window as any).__reportBtnState(...)` — fixed by declaring a `ButtonState` interface and a `declare global { interface Window { __reportBtnState: ... } }` augmentation, removing the `as any` cast and the pre-existing `eslint-disable-next-line @typescript-eslint/no-explicit-any` comment entirely (confirmed 0 `eslint-disable` hits in the file).
- `tests/e2e/helpers/sign-in.ts`: 2 `no-unsafe-assignment` from untyped `.json()` — fixed by casting both call sites to the file's existing `SessionResponse` interface.
- `components/login/language-selector.tsx`: 1 `jsx-a11y/interactive-supports-focus` — fixed with `tabIndex={-1}` on the `role="menu"` wrapper, documented with a comment explaining the roving-tabindex pattern the rule can't see. **Verified by hand and by test**: all 9 keyboard-navigation E2E tests (ArrowUp/Down, Home/End, Escape, Tab, the mouse-reopen regression test) still pass — roving focus is intact.

**21 auto-fixable `import/order` findings across 16 files — measured deviation, explained:** the real first `pnpm lint` run found **27 auto-fixable `import/order` errors across 17 files**, not 21/16. Diffed the extra 6 findings/1 file against the research's own file list (`app/, components/, lib/, i18n/, tests/e2e/` — 34 files) and found the gap is exactly the files/patterns the original trial didn't include:
- `proxy.ts` (1 finding) — root-level app source (Next 16's `proxy`/middleware-equivalent), not explicitly enumerated in the research's 34-file read list.
- `tests/e2e/visual-capture.mjs` (2 findings) — a plain `.mjs` script; `visual-validation.mjs` (also `.mjs`) has 0 findings because its 2 imports already happen to be in order, so it wasn't a signal the original trial's glob skipped `.mjs` — but combined with `visual-capture.mjs` having findings, it looks like the original `import/order` trial simply didn't include `.mjs` in its glob.
- The remaining 3 extra findings are additional blank-line/order errors on files already in the 16-file set (e.g. `login-screen.tsx`, `language-selector.tsx`, `login.spec.ts` each showed one more finding than the trial's per-file breakdown implied).

All 27 were 100% `--fix`-able and I reviewed the full diff before proceeding: every hunk is either an import reordered or a blank line inserted between import groups — nothing else changed. Ran `pnpm typecheck`/`pnpm build`/`pnpm test:unit`/e2e after, all green, so this is a real but harmless undercount in the research, not a sign of something wrong with the config.

**Bonus findings from `eslint-plugin-playwright`** (correctly flagged by the research as untrialed/unmeasured, not part of the 36): after adding the plugin, it surfaced 6 additional auto-fixed findings (5× `no-useless-not` rewritten to `toBeHidden()`, 1× `consistent-spacing-between-blocks`) and 3 additional hand-fixed findings — `no-wait-for-timeout` (×2) and `expect-expect` (×1), described below. `missing-playwright-await` fired on the exact same 2 lines `no-floating-promises` already caught (the 2 real bugs) — confirms the research's expectation that the two rules would overlap on this bug, not double-count it.

### The 3 bonus `eslint-plugin-playwright` warnings, resolved on their merits

- **`no-wait-for-timeout` (2 instances)**: both waits exist because the tests need to observe an async side effect (an intercepted request, a `MutationObserver` callback) with no other Playwright-native wait primitive that fits.
  - Test `[TC 37eae882]`: replaced `page.waitForTimeout(200)` + a manual `observed.some(...)` check with `await expect.poll(() => observed.some(...)).toBe(true)` — a bounded poll instead of a fixed sleep, strictly more reliable (retries until the default timeout instead of a single 200ms check). Verified green.
  - Test `[TC 60bc5bbb]`: **first tried** replacing `page.waitForTimeout(500)` with `page.waitForRequest('**/auth/v1/authorize**')` — this **broke the test** (30s timeout, request event never observed for a request that gets `route.abort()`-ed mid-navigation). Reverted that approach and used `await expect.poll(() => authorizeCalled).toBe(true)` instead (polling the flag the route handler already sets), which is both lint-clean and verified reliable. Recording this since it's exactly the kind of "looked like a free improvement, silently broke E2E" trap the task warned about — I did not ship the broken version.
- **`expect-expect` (1 instance)**: test `[TC f62b0c97]` only did `await page.waitForURL('/todo', ...)` with no explicit `expect()`. Added `expect(page.url()).toContain('/todo')` right after, matching the exact pattern already used by the sibling redirect tests earlier in the same file (`[TC 45278c06]` ×2) — a consistency fix, not new test logic.

No rule was disabled anywhere. `grep -rn "eslint-disable"` across every file I touched shows only a removal (the old `no-explicit-any` comment), never an addition.

## Concerns / deviations flagged for review

1. **`proxy.ts` fixed even though it's not literally under the `file_ownership` globs** (`app/**`, `components/**`, `lib/**`, `i18n/**`, `tests/**`). It's root-level app source (Next 16 renamed `middleware.ts` → `proxy.ts`), and the change is a 1-line, 100%-auto-fixed import reorder with no logic change — I judged this in-scope in spirit (it's real application code the linter now correctly covers) rather than leaving a known lint violation unfixed. Flagging in case the orchestrator wants it split into a separate touch.
2. **Import/order count deviation** (27/17 vs measured 21/16) — explained above; not blocking, but exactly the kind of deviation the task asked me to flag rather than silently absorb.
3. **`no-floating-promises`/`no-misused-promises: "error"` override is technically redundant** — both are already `"error"` by default in `recommendedTypeChecked`. Kept the explicit override anyway (with a comment) per the phase's explicit Requirements bullet, as a named regression guard that survives a future typescript-eslint default change.
4. **Layer 4 (`**/*.mjs` → `disableTypeChecked`) is likely a no-op given layer 3's `files` scoping** — since layer 3 is scoped to `**/*.{ts,tsx}`, `.mjs` files never receive the type-checked parser/rules in the first place, so nothing is left for layer 4 to disable. Kept it anyway per the phase's explicit 9-layer Architecture, as cheap defense-in-depth against a future `files`-less type-checked rule addition. Did not attempt to "prove" it's a no-op beyond the fact that lint is clean and the 4 `.mjs` files show no findings.
5. Did not touch `playwright.config.ts` (shows as modified in `git status` from outside this task) or `.prettierignore`/`.github/**` — outside my file ownership, left untouched.

## Unresolved questions

None — everything in the phase file's Todo List and Success Criteria is done and verified.
