# ESLint standard for agentic-coding-hands-on — research report

Date: 2026-09-05. Repo untouched (verified `git status` before/after — all trials ran via an out-of-repo
`--config` file in scratchpad, imported by absolute path; `npm run lint` baseline = **0 problems**).

## Method

- Read `eslint.config.mjs`, `package.json`, `tsconfig.json`, all 34 source files under `app/`, `components/`,
  `lib/`, `i18n/`, `tests/e2e/`, plus root configs.
- Read the actual installed `eslint-config-next@16.3.4` dist source (`core-web-vitals.js`, `typescript.js`,
  `index.js`) to get the literal rule set, not docs paraphrase.
- **Ran real trials**: two throwaway flat-config files outside the repo (scratchpad), each importing the
  project's own installed plugins by absolute path, invoked via `npx eslint --config <scratchpad-file> <globs>`
  against the real source tree. No repo file was created, edited, or deleted.
- `tkm:search-docs`→context7 404'd for `typescript-eslint`, `eslint-plugin-playwright`, `@vitest/eslint-plugin`
  (same gap noted in prior sessions — not indexed on context7.com). Fell back to WebFetch on
  typescript-eslint.io + the plugin GitHub repos, and WebSearch for versions/downloads. 5 sources total,
  cross-checked against the installed `package.json` versions where possible.

---

## Q1 — What core-web-vitals + typescript already give us

`eslint-config-next/core-web-vitals` = one config block (`index.js`) + `@next/eslint-plugin-next`'s own
`core-web-vitals` rule set, stacked. The base block registers plugins `react`, `react-hooks`, `import`,
`jsx-a11y`, `@next/next` and turns on:

- `eslint-plugin-react` **recommended** (full) + `eslint-plugin-react-hooks` **recommended** (full —
  `rules-of-hooks`, `exhaustive-deps`) + `@next/eslint-plugin-next` **recommended+core-web-vitals** (full).
- `eslint-plugin-import`: **only one rule**, `import/no-anonymous-default-export: warn`. No ordering, no
  `no-cycle`, no `no-unresolved` — despite the plugin object being loaded. `import/resolver` is pre-wired for
  `typescript` + `node` though, so adding more `import` rules later is a config-only change, zero new deps.
- `eslint-plugin-jsx-a11y`: **only 6 hand-picked rules** (`alt-text`, `aria-props`, `aria-proptypes`,
  `aria-unsupported-elements`, `role-has-required-aria-props`, `role-supports-aria-props`), all `warn`. This is
  a small subset of the plugin's ~40-rule `recommended` set — notably **missing**
  `interactive-supports-focus`, `no-noninteractive-tabindex`, `click-events-have-key-events`,
  `no-static-element-interactions`, `tabindex-no-positive` — exactly the rules that police a hand-rolled ARIA
  widget (see Q5).
- `eslint-config-next/typescript` = `typescript-eslint.configs.recommended` (non-type-checked) + 2 extra
  rules (`no-unused-vars: warn`, `no-unused-expressions: warn`). **No type-checked rules at all.**
- Parser: the `next` block uses Next's babel-based parser for `**/*.{js,jsx,mjs,ts,tsx,...}`, but the
  `next/typescript` block (files `**/*.ts,**/*.tsx`) re-assigns `languageOptions.parser` to
  `typescript-eslint`'s parser for those files — so `.ts/.tsx` already parse through `@typescript-eslint/parser`,
  just without `parserOptions.projectService` (no type info requested).

**Conclusion:** do not re-add `eslint-plugin-react`, `-react-hooks`, `-jsx-a11y`, or `-import` as new deps —
they are already present and already wired with a resolver. The gaps are: (a) no type-aware TS rules, (b) a
deliberately thin jsx-a11y slice, (c) `import` rules limited to one, (d) zero test/tooling overrides, (e) no
formatter.

## Q2 — Type-aware linting: recommend `recommendedTypeChecked`, not `strictTypeChecked`

Trial (`typescript-eslint@8.69.0` `recommendedTypeChecked`, `projectService: true`, `tsconfigRootDir` = repo
root) against all of `app/`, `components/`, `lib/`, `i18n/`: **6 errors, 1 file**
(`i18n/request.ts:21,22,24,25,26` — `no-unsafe-assignment`/`no-unsafe-member-access` on
`(await import(`../messages/${locale}.json`)).default`, a dynamic import that TS can't type). This is the
textbook next-intl pattern — real but low-value noise, fixed with one type cast or a per-file override, not a
bug.

Trial against `tests/e2e/**` + root configs: **8 more real errors, 2 files** —
- `tests/e2e/login.spec.ts:153` and `:207`: **`no-floating-promises`, real hits** — `page.route(pattern, (route) => { ...; route.abort(); })` / `route.fulfill({...})` inside a route-handler callback that returns nothing; `route.abort()`/`.fulfill()`'s promise is dropped. This is precisely the "floating promise in test glue" class of bug the task asked about — it just landed in a Playwright route handler, not the Server Actions (those are already correctly awaited, see below).
- `tests/e2e/login.spec.ts:171,186,188`: `no-unsafe-argument`/`no-unsafe-call`/`no-unsafe-member-access`
  on `(window as any).__reportBtnState(...)`, plus one `no-unnecessary-type-assertion`. Notable: the file
  already has a targeted `eslint-disable-next-line @typescript-eslint/no-explicit-any` right above this line —
  written by whoever wrote the test, aiming at the *current* linter. Type-checked rules introduce **new rule
  IDs** the existing disable comment doesn't cover — a real migration-cost signal: turning this tier on breaks
  a file that was already "clean" under today's config.
- `tests/e2e/helpers/sign-in.ts:52,54`: `no-unsafe-assignment` from an untyped `JSON.parse` result.
- 4 files (`eslint.config.mjs`, `postcss.config.mjs`, `tests/e2e/visual-capture.mjs`,
  `visual-validation.mjs`) **fail to parse under `projectService`** — `tsconfig.json`'s `include` never
  lists `**/*.mjs`. Not lint findings, a config gap — needs `allowDefaultProject` or an `ignores`/untyped
  override for `**/*.mjs` (see Q3).

**Specifically checked the three files named in the brief** (`app/auth/callback/route.ts`,
`app/actions/locale.ts`, `app/todo/actions.ts`) plus every client call site (`login-client.tsx`,
`todo/page.tsx`): **zero floating-promise hits**. Every Supabase/Server Action call is already `await`ed or
explicitly wrapped in `startTransition`. `no-floating-promises` would be a pure regression-guard here, not a
current-bug finder — the one place it *did* fire (Playwright route handlers) is real and worth fixing on its
own merits.

**Cost measured, not guessed:** 14 real errors total across 3 files (i18n/request.ts, sign-in.ts,
login.spec.ts) in a 34-file repo, plus a one-time `**/*.mjs` override. Type-checked lint time on a project
this small is sub-second in CI (typescript-eslint's own docs: "small projects experience negligible delays
— seconds or less"); the CI-only cost model applies since editors already do this via TS-server, cached.

**Recommend:** `recommendedTypeChecked` (not `strictTypeChecked` — strict adds ~15 more opinionated rules
like `no-unnecessary-condition`/`no-confusing-void-expression` that would light up stylistic-only findings on
a 2-screen app; that's noise this repo doesn't need — YAGNI). Layer only `no-floating-promises` +
`no-misused-promises` as `error`, keep the rest of `recommendedTypeChecked` as shipped (mostly `error`
already). Ship with `**/*.mjs` excluded from the type-checked overlay (untyped-only for those files).

## Q3 — Per-area overrides

- **`tests/e2e/**` (Playwright)**: `eslint-plugin-playwright` v2.11.0, ~3.4M weekly downloads, actively
  released (~monthly cadence), flat-config native via `playwright.configs['flat/recommended']`. Its
  `missing-playwright-await` rule is the purpose-built version of the exact bug the type-checked trial just
  found by accident (unawaited `route.abort()`/`.fulfill()`) — worth adding on its own merits, not just as a
  belt-and-suspenders to `no-floating-promises`. Also flags `no-conditional-in-test` (the `if (!btn) return`
  inside `page.evaluate` callbacks is browser-context code, not test-body code, so it won't trip this — verify
  after adding). **Recommend: add**, scoped to `tests/e2e/**/*.spec.ts`.
- **`lib/**/*.test.ts` (Vitest)**: current package name is **`@vitest/eslint-plugin`** (the old
  `eslint-plugin-vitest` name is the deprecated one — don't install that). Flat config via
  `vitest.configs.recommended`. Repo only has 2 tiny `.test.ts` files (`locale.test.ts`, `next-path.test.ts`);
  low urgency, but it's a 1-line addition once the plugin is a devDependency and catches missing
  `expect()` calls / disallowed `.only`. **Recommend: add**, low priority.
- **`tests/e2e/*.mjs`** (`visual-capture.mjs`, `visual-validation.mjs`): plain Node scripts, not specs.
  Confirmed they already lint clean today (base config's globals are `{...browser, ...node}` merged for every
  file, so `process`/`console` etc. are already recognized) — **the only real gap is the type-checked overlay
  parse failure** from Q2 (not in tsconfig `include`). Fix: either add `**/*.mjs` to `tsconfig.json`'s
  `include`, or give them an `ignores`/no-type-checked override. Don't apply the Playwright plugin to them —
  they aren't specs, don't import `@playwright/test`'s `test`/`expect`.
- **Root config files** (`*.config.ts`, `*.config.mjs`): same `.mjs` parse gap. `*.config.ts`
  (`next.config.ts`, `playwright.config.ts`, `vitest.config.ts`) parse fine under `projectService` (already
  in tsconfig `include`) — no override needed there.

## Q4 — Import hygiene: `eslint-plugin-import` yes (already present), skip `import-x`

Trial with `import/order` (`newlines-between: always`) + `import/no-cycle`: **21 errors across 16 files, 100%
`--fix`-able**, plus one genuine reorder each in `app/login/page.tsx` and `app/todo/page.tsx` (local
`./actions`/`./login-client` import listed after the absolute `@/lib/...` import — cosmetic, not a bug).
`no-cycle`: **zero hits** — a 34-file app with this shallow a dependency graph has no cycles to catch; not
worth enabling given it's the slowest rule in the plugin (module-graph traversal) for zero payoff here.

`eslint-plugin-import-x` (the actively-maintained fork some teams move to) is **not installed** and would be
a new dependency; `eslint-plugin-import` 2.32.0 is already transitive, already has a working TS resolver
(`eslint-import-resolver-typescript`, also already present) — no reason to add a second package. **Recommend:
`import/order` only, promote `eslint-plugin-import` from transitive to explicit devDependency, skip
`no-cycle`.** One-time `eslint --fix` commit absorbs all 21 violations.

## Q5 — jsx-a11y: real finding in the language selector, with a caveat

Ran jsx-a11y's full `flatConfigs.recommended` (not just the 6 rules Next ships) against every component:
**exactly one real hit**, `components/login/language-selector.tsx:150`:

```
Elements with the 'menu' interactive role must be focusable   jsx-a11y/interactive-supports-focus
```

on `<div role="menu" onKeyDown={handleMenuKeyDown} ...>`. Nothing else fired — the login screen otherwise
uses semantic `<button>` for both the trigger and every menu item (not `<div onClick>`), which is exactly why
`no-static-element-interactions`/`click-events-have-key-events`/`no-noninteractive-*` stayed silent.

**Caveat, stated plainly:** the component's own doc comment says focus is deliberately roving —
`itemRefs.current[activeIndex]?.focus()` moves real DOM focus onto a `menuitem` `<button>`, never onto the
`role="menu"` wrapper. That's the correct ARIA APG menu-button pattern (container isn't meant to be a tab
stop when children hold roving `tabIndex`); `interactive-supports-focus` doesn't understand roving-tabindex
delegation and treats every `role="menu"` node as needing its own focusability. This is a known limitation of
the rule, not a hidden bug — but it's cheap to silence correctly (`tabIndex={-1}` on the wrapper documents
intent instead of just suppressing the rule) rather than blanket-disabling. **Recommend: enable full
`jsx-a11y/recommended` rules (not just Next's 6), fix this one instance with an explicit `tabIndex={-1}`, and
treat the rest of the ruleset as a correct zero-cost upgrade** — one real, fixable finding for the entire
component tree is a strong signal the rest of the app already writes accessible markup.

## Q6 — Prettier + `eslint-config-prettier`, not ESLint Stylistic

Both are real options (2026 sources both cite them); Stylistic means one tool/one pass but couples formatting
rules to the same ESLint run/version the team also uses for correctness — any Stylistic rule churn now blocks
lint AND format together. Prettier is opinionated-zero-config, decouples "is this formatted" from "is this
correct," and is what Next.js's own docs recommend pairing with `eslint-config-prettier` (a config that only
*turns off* conflicting stylistic ESLint rules — it adds no new lint rules, no new failure modes). For a team
already running bare `eslint-config-next` defaults, Prettier is the lower-surprise, lower-maintenance choice.
**Recommend: `prettier` + `eslint-config-prettier`**, `eslint-config-prettier` spread last in the flat config
array so it wins on any overlap, plus a `format`/`format:check` npm script — CI should call
`prettier --check` as a separate step from `eslint`, not fold formatting into the linter.

## Q7 — CI: no CI workflow exists yet (greenfield)

Confirmed: no `.github/workflows/*` in this repo — this is a net-new CI setup, not a "plug into existing"
question.

- **`--max-warnings 0`**: yes, on `npm run lint` in CI. All the newly-recommended rules above ship as
  `warn` by default in eslint-config-next's own additions (`no-unused-vars`, `import/no-anonymous-default-export`)
  — `--max-warnings 0` is what actually makes those block a merge instead of silently accumulating.
- **`lint:fix` script**: yes, `"lint:fix": "eslint --fix"` — cheap, and absorbs the 21 `import/order`
  violations from Q4 in one run.
- **`--cache`**: yes, `--cache --cache-location .eslintcache/` locally and in CI (cache keyed on
  lockfile hash) — 34 files is small enough that this barely matters today, but it's a zero-cost flag to add
  now rather than a later PR.
- **SARIF/annotations**: **skip for now.** SARIF upload is built for security-scanner-class tools
  (CodeQL) posting to the Security tab — overkill machinery for a lint gate. The lightweight, well-known
  option for inline PR annotations is `reviewdog/action-eslint` (mature, widely used) — recommend it only as
  an **optional follow-up** once the team feels the "read CI logs" workflow is actually painful; don't ship it
  day one on a 2-screen app (YAGNI). Day one: plain `eslint . --max-warnings 0` failing the job is enough —
  GitHub already renders non-zero exit + stderr in the Actions log next to the diff.

## Q8 — Migration cost, measured (not guessed)

| Addition | Real violations found | Files affected | Auto-fixable | Verdict |
|---|---|---|---|---|
| `typescript-eslint` `recommendedTypeChecked` | 14 | 3 (`i18n/request.ts`, `sign-in.ts`, `login.spec.ts`) | 0 | small, real bugs (2 floating promises) — fix by hand, ~15 min |
| `**/*.mjs` project-service gap | 4 parse errors | 4 | n/a (config, not code) | 1-line tsconfig/override fix |
| `import/order` | 21 | 16 | 21 (100%) | free — one `--fix` commit |
| `import/no-cycle` | 0 | 0 | — | skip, no payoff |
| `jsx-a11y/recommended` (full) | 1 | 1 | 0 | small, real, worth a manual `tabIndex={-1}` |
| `eslint-plugin-playwright` recommended | not directly trialable (plugin not installed) | — | — | expect it to also flag the 2 floating-promise route handlers via `missing-playwright-await`; add and confirm |
| `@vitest/eslint-plugin` recommended | not trialable, only 2 tiny test files | — | — | negligible either way |
| Prettier + `eslint-config-prettier` | not measured (formatting, not lint) | run `prettier --check .` once to see diff count before enforcing | — | stage as warn-only for one PR if the diff is large |

**Staged adoption, given the numbers above:** everything except Prettier is cheap enough (14 + 21 + 1 = 36
total findings, 21 auto-fixed, 15 hand-fixed across 4 files) to land as `error` in one PR — this is not a
"light up dozens of pre-existing files and pretend it's free" situation, it's a small, itemized list. Only
Prettier needs a first-run check (`prettier --check .`) before flipping CI to fail on it, since nobody has
run a formatter over this repo yet and the diff size is unmeasured.

---

## Recommended config (net new, on top of what's already there)

Keep `eslint-config-next/core-web-vitals` + `/typescript` as the base (unchanged). Add, in order:
`typescript-eslint.configs.recommendedTypeChecked` with `parserOptions.projectService: true` +
`tsconfigRootDir` set to repo root, an override disabling the type-checked overlay for `**/*.mjs` (untyped
lint only there), `jsx-a11y.flatConfigs.recommended.rules` merged in (not re-declaring the `jsx-a11y` plugin
key — flat config throws on duplicate plugin identity), `import/order` (`newlines-between: always`) using the
already-present `eslint-plugin-import` + its TS resolver, `eslint-plugin-playwright`'s flat `recommended`
scoped to `tests/e2e/**/*.spec.ts`, `@vitest/eslint-plugin`'s `recommended` scoped to `lib/**/*.test.ts`, and
`eslint-config-prettier` spread last. Add `prettier`, `eslint-config-prettier`, `eslint-plugin-playwright`,
`@vitest/eslint-plugin` as new devDependencies (4 packages — everything else used above is already
installed). Package-manager cost: 4 new deps for an app this size is proportionate — each maps to one
concrete, already-demonstrated finding class (floating promises in tests, a11y focus, vitest hygiene), not
speculative coverage. CI: `eslint . --max-warnings 0` + `prettier --check .` as two separate required jobs,
`--cache` on the eslint step, no SARIF/reviewdog day one.

**Measured migration cost: 36 total findings (21 auto-fixed via `--fix`, 15 fixed by hand across 4 files),
plus 4 files needing a one-line `.mjs`/tsconfig override — no mass pre-existing breakage, safe to land as
`error` in one PR rather than staged warn-then-error.**

**Status:** DONE

## Unresolved

- `eslint-plugin-playwright`'s exact hit count on `tests/e2e/**` is inferred, not trialed (package isn't a
  devDependency yet — installing it was out of scope for a report-only Study stage). Expect it to at minimum
  echo the 2 `missing-playwright-await` findings `recommendedTypeChecked` already surfaced.
- `prettier --check .` diff size on the current tree is unmeasured — run it once before wiring CI to fail on
  formatting, so the first PR isn't a surprise mass reformat.
