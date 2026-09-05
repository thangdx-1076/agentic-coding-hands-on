# Research: pnpm migration + GitHub Actions CI design

Date: 2026-09-05. Repo: agentic-coding-hands-on (branch `feat/login-google-oauth`, default branch `main` confirmed via `gh repo view` on both `origin` (thangdx-1076) and `upstream` (sun-asterisk-internal) remotes). Report-only, no project files changed — all empirical tests ran against an isolated rsync copy in scratchpad, deleted after use.

## Verified current state (not trusted, checked live)
- Node v24.14.1, npm 11.11.0, pnpm 10.33.2 (installed standalone under nvm, NOT a corepack shim — `which pnpm` resolves to `.nvm/.../bin/pnpm`), corepack 0.34.6 present and working on this Node 24.
- No `.github/`, no `.npmrc`, no `engines`/`packageManager` in package.json. Confirmed.
- `eslint.config.mjs` uses **ESLint 9 flat config** with direct ESM imports (`import nextVitals from "eslint-config-next/core-web-vitals"`), not legacy `.eslintrc` extends-string resolution. This one fact overturns most of the generic "pnpm breaks eslint-config-next" folklore for this repo — see A.2.
- Latest pnpm on npm registry: 11.25.0. Latest Next.js docs (fetched live, version stamped 16.3.4, updated 2026-07-21): minimum Node **20.9**, and Next.js's own official installation docs now list `pnpm` as the *first* package-manager tab.

## A. pnpm migration

### A.1 — packageManager pin: use pnpm's native self-management, not corepack
**Recommendation: pin `"packageManager": "pnpm@10.33.2"` in package.json (the version actually tested below), rely on pnpm ≥10's built-in `manage-package-manager-versions` for local devs, and `pnpm/action-setup` in CI reading the same field. Do not add corepack.**

Why, ranked:
1. Node's own TSC voted to stop bundling corepack from **Node 25 onward** (stays in Node 24 and earlier as experimental-only). This repo already runs Node 24 — one Node upgrade away from corepack silently disappearing unless `npm install -g corepack` is added everywhere. Depending on corepack today buys nothing and adds a future migration.
2. pnpm 10+ ships `manage-package-manager-versions` enabled by default: once *any* pnpm binary is on PATH, it reads the `packageManager` field and re-execs the pinned version itself. This makes corepack redundant for a pnpm-only repo (YAGNI — corepack's value is multi-package-manager portability, which this repo doesn't need).
3. `pnpm/action-setup` (still the mainstream, most field-tested CI action; confirmed via its README, fetched live) reads `packageManager`/`devEngines.packageManager` directly, so CI and local stay pinned to one source of truth with zero duplication (DRY).
4. Trade-off named: pnpm also publishes a newer `pnpm/setup` action (self-contained binary, can replace `actions/setup-node` entirely, required for pnpm v11+ "native standalone" mode). It's real but newer/less battle-tested; `pnpm/action-setup` explicitly still supports pnpm v11/v12 paired with `actions/setup-node`. Recommend staying on `pnpm/action-setup` + `actions/setup-node` — don't chase the newest action for a login-feature repo (KISS).
5. **Verify-live gap**: I only empirically installed/built/tested against pnpm **10.33.2** (see A.2). pnpm 11.25.0 is newer and unverified here — don't jump the major during this migration. Revisit pnpm 11 later as its own small, isolated bump.

`engines` field: add `"engines": { "node": ">=22 <25" }`. Lower bound matches Next 16's documented 20.9 minimum with headroom for the two current LTS lines (22, 24); upper bound `<25` is a deliberate guard — Node 25 is where corepack disappears and where this pin should be revisited, not silently crossed by an auto-upgrading CI runner image.

### A.2 — strict node_modules breakage: **none found, empirically**
Ran a full install + lint + typecheck + unit + build cycle with pnpm 10.33.2 against an isolated copy of this exact repo (fresh `pnpm install`, no `.npmrc`, zero hoisting overrides):

| Check | Result |
|---|---|
| `pnpm install` | 430 packages, clean. 4 packages had postinstall scripts blocked by pnpm 10's default script sandbox: `@parcel/watcher`, `@swc/core`, `esbuild`, `unrs-resolver` (transitive, not direct deps) |
| `pnpm run lint` (flat-config eslint-config-next) | **exit 0**, no plugin-resolution errors |
| `pnpm exec tsc --noEmit` | 1 error (`LayoutProps` undefined) — pre-existing, NOT pnpm-related: Next 16 generates that ambient type into `.next/types` only after a build/dev run; a bare `tsc` before any build always shows this on any package manager |
| `pnpm run test:unit` | **32/32 pass**, exit 0 |
| `pnpm run build` (Turbopack) | **succeeds**, "Running TypeScript" step (Next's own internal typecheck, which DOES see the generated types) passes with 0 errors, all 5 routes + Middleware listed |

Conclusions per named risk:
- **eslint-config-next**: the historical hoisting bug is specific to legacy `.eslintrc`-style plugin resolution (name-based lookup relative to CWD). This repo's flat config imports the plugin package directly via ESM, which resolves through normal Node module resolution against `eslint-config-next`'s own nested deps — pnpm's non-flat layout is not just harmless here, it's the layout Node resolution was designed for. **No `.npmrc` change needed.**
- **Tailwind 4 / `@tailwindcss/postcss`**: it's a direct devDependency, so pnpm always hoists direct deps of the root manifest to the project root regardless of strict mode. Build succeeded, config resolves fine.
- **`@supabase/ssr`**: direct dependency, same reasoning, build/lint clean.
- **`@playwright/test` browser downloads**: unaffected by node_modules layout either way — Playwright downloads browser binaries to `~/.cache/ms-playwright` via an explicit `playwright install` step, not an npm/pnpm postinstall script (confirmed: `@playwright/test` did NOT appear in pnpm's "ignored build scripts" list).
- **The one real new behavior**: pnpm 10's default build-script sandbox blocked 4 transitive packages' postinstall scripts, and **none of them were needed** for lint/typecheck/unit/build to pass. Do not blanket-approve builds pre-emptively (`shamefully-hoist=true` or approving everything is exactly the kind of blanket fix the brief asked me not to recommend). If a real failure surfaces later tied to one of those 4 packages, resolve it narrowly with `pnpm approve-builds <pkg>` (writes an explicit `pnpm.onlyBuiltDependencies` allow-list into package.json — auditable, scoped, not "trust everything").
- **No `.npmrc` is required for this repo today.** This is the correct, minimal answer per YAGNI — don't add `public-hoist-pattern`/`shamefully-hoist` speculatively; add only if a specific, named symptom appears.

### A.3 — exact migration sequence (parity-verified)
1. `rm package-lock.json`.
2. `pnpm import` — reads `package-lock.json` and writes `pnpm-lock.yaml` with **identical resolved versions**, not a fresh re-resolve. Verified live: after `pnpm import`, the caret-range devDeps (`vitest ^3.2.7`, `typescript ^5`, `eslint ^9`) resolved to the exact same versions (3.2.7, 5.9.3, 9.39.5) as a plain fresh `pnpm install` against the same manifest — no silent upgrade smuggled in during the migration itself. This is the correct command for a parity migration; don't just delete both lockfiles and run `pnpm install` fresh (that conflates "switch package manager" with "bump transitive deps," two changes that should never ship in one commit).
3. Add `"packageManager": "pnpm@10.33.2"` and `"engines": { "node": ">=22 <25" }` to package.json.
4. `pnpm install` (now reads the imported lockfile, `--frozen-lockfile` semantics in CI).
5. Verify: `pnpm run lint`, `pnpm exec tsc --noEmit` (after one `pnpm run build` first, see A.2 caveat), `pnpm run test:unit`, `pnpm run build` — all exit 0, matches the table above.
6. Add `.gitignore` entries are already fine (`.pnpm-debug.log*` already present); no change needed there.

### A.4 — hardcoded npm/npx that must be rewritten
Grepped the whole repo (excluding `node_modules`) for `npm run|npm install|npm ci|npm exec|npx`:

**Must change (live, current-facing files):**
| File | Line | Current | Fix |
|---|---|---|---|
| `playwright.config.ts` | 40 | `command: 'npm run dev'` (webServer) | `command: 'pnpm dev'` |
| `README.md` | 44-45, 51-56 | `npm install`, `npm run dev/build/start/lint/test:unit/test:e2e` (setup steps + full scripts table) | `pnpm install`, `pnpm dev/build/start/lint/test:unit/test:e2e` |

**Found but out of scope — historical/generated, not living docs:** ~90 hits across `plans/260904-1633-login-page-google-oauth/**` (phase files, evidence JSON, reviewer/tester/implementer reports) and `docs/journals/**`. These are timestamped execution logs of a completed feature build — rewriting them would falsify history for no benefit (DRY/YAGNI cuts the other way here: don't edit closed logs). Leave them; only `README.md` and `playwright.config.ts` are load-bearing for future runs.

## B. CI design

### B.1 — workflow shape
- **Trigger**: `push` to `main` + `pull_request` targeting `main` (default branch confirmed via `gh repo view --json defaultBranchRef` on both remotes → `main`).
- **Concurrency**: `group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` — standard, avoids wasting minutes on superseded pushes.
- **pnpm + Node setup**: `pnpm/action-setup@v6` (no `version:` input — reads `packageManager` from package.json, single source of truth) → `actions/setup-node@v4` with `node-version: '24'`, `cache: 'pnpm'`. Cache is automatically keyed on `pnpm-lock.yaml` by `actions/setup-node`'s built-in pnpm cache support.
- **Job graph — recommend 2 jobs, not 1 and not a 5-way matrix**, for this repo's size (32 unit tests, 23 e2e tests, one small Next.js app, no monorepo):
  - **`quality`** (blocking, every push/PR): checkout → pnpm setup → `pnpm install --frozen-lockfile` → `pnpm run lint` → `pnpm exec tsc --noEmit` → `pnpm run test:unit` → `pnpm run build`. Measured locally: install ~54s cold / lint+build+unit combined well under 10s once installed — expect **~1-2 CI minutes** total on a cold cache, well under 1 minute on a warm pnpm-store cache hit.
  - **`e2e`** (separate job, see B.2 for exact trigger gating): needs its own Playwright browser cache + a Supabase service. Splitting from `quality` means a lint/type/unit/build failure gives fast feedback without waiting on Docker startup, and a flaky/slow E2E run never blocks the fast checks from reporting.
  - Rejected: single combined job (loses the fast/slow separation, one slow Docker pull delays every signal); full per-check matrix (lint/typecheck/unit/build as 4 separate jobs) — at this repo's size the fixed per-job overhead (checkout + pnpm setup + install, ~15-25s each even cache-hot) would cost more in aggregate minutes than it buys in parallelism for sub-10-second checks.

### B.2 — E2E in CI: can it run as written? Yes, mostly — verified by reading the actual test code
Read `playwright.config.ts`, `tests/e2e/helpers/sign-in.ts`, `tests/e2e/login.spec.ts` end to end. Findings:

- **No test contacts real Google.** Every OAuth-flow assertion intercepts the request client-side: `page.route('**/auth/v1/authorize**', route => route.abort())` or `.fulfill({...stub...})`. The suite verifies the app *calls* the correct GoTrue `/authorize?provider=google` URL and shows correct loading/disabled state — it never lets that request leave the browser context. **Zero Google secrets are ever needed in CI for this suite as written.**
- **21 of 23 tests need no live Supabase at all.** `proxy.ts`'s `getUserOrNull()` wraps the Supabase `getUser()` call in try/catch and treats any failure (unreachable host, missing env var, malformed client) as "no session" — this is a deliberate, already-implemented resilience choice, not an accident. So every unauthenticated-path test (logo, hero, footer, language selector + full keyboard-nav suite, `/login?error=`, unauthenticated redirects, the two OAuth-intercept tests) works against `next dev` alone, no external service.
- **2 of 23 tests (the `Authenticated` describe block) do need a live GoTrue.** `createTestSession()` in the sign-in helper makes real HTTP calls to `${supabaseUrl}/auth/v1/signup` then `/auth/v1/token?grant_type=password` to mint a real session, then injects real cookies via `@supabase/ssr`. Without a reachable Supabase Auth endpoint these 2 tests fail for real (not gracefully) — `sign-in.ts` throws on a non-OK response.
- **This repo has no `supabase/` directory** — confirmed via `find`. `saa-app` (the actual Postgres+GoTrue instance) lives entirely outside this repo per the brief. So `supabase start` cannot run here today without adding a config.

**Recommendation, ranked:**
1. **Best fit (recommended): run `supabase start` as a step inside the `e2e` job, via `supabase/setup-cli` + a new `supabase/config.toml` committed to this repo (generated once via `supabase init`, default settings — email confirmations off in local dev config, no Google provider secrets required at all since the 2 authenticated tests use email/password signup directly).** This covers all 23 tests with zero test-code changes — reuses `sign-in.ts` exactly as written, just points it at the CI-local instance's URL/anon key via env vars, same as local dev already does. Trim the container set with `supabase start -x studio,storage-api,realtime,imgproxy,inbucket,edge-runtime,logflare,vector,pgbouncer` to cut Docker pull/startup time (unused services for this suite). Estimated added cost: ~20-40s Docker pull+startup (first run cold; GH-hosted runners have Docker preinstalled), then the existing 23-test run (historically ~7-15s per earlier logs in `plans/`). Flakiness: low-medium — the known failure mode is cold Docker image pull on a fresh runner, not test logic; mitigate by keeping the excluded-service list tight.
2. **Rejected as sole solution: skip the 2 authenticated tests in CI.** Explicitly disallowed by the brief, and rightly so — the auth guard (`proxy.ts` redirect matrix) is exactly the security-relevant logic that would regress silently.
3. **Alternative, lower rank: split into a CI-safe subset (21 tests, blocking, no service) + a separate scheduled/manual workflow against a persistent staging Supabase project for the 2 authenticated tests.** Lower implementation cost today (no `supabase/config.toml` to add) but weaker signal — a broken auth guard wouldn't fail the PR that broke it, only a later scheduled run. Only prefer this if maintaining an ephemeral Docker Supabase in CI proves consistently flaky in practice; I found no evidence it would be, given the suite is this small.
4. **Not recommended: point CI's `NEXT_PUBLIC_SUPABASE_URL` at a shared external staging Supabase project.** Adds a real secret (service/anon key of a shared always-on resource) and cross-run state (test users pile up); the ephemeral-per-run local container is materially safer and is the standard pattern for this exact use case (Supabase's own docs and multiple independent CI writeups converge on `supabase start` in Actions for auth-integration tests).

**Code changes implied by the recommendation:** add `supabase/config.toml` (new, CI + optional local-alt), no changes to `tests/e2e/**`, one new job (`e2e`) in the workflow, playwright.config.ts's `webServer.command` fix from A.4.

### B.3 — Playwright browser caching for @playwright/test 1.62
Current guidance (converged across multiple 2026 sources, cross-checked): cache `~/.cache/ms-playwright`, key on **exact Playwright package version + OS** (e.g. `${{ runner.os }}-playwright-${{ steps.pw-version.outputs.version }}`), **do not** set `restore-keys` (a stale partial-match cache can hand back a browser revision the currently-installed `@playwright/test` binary rejects — worse than no cache). On a cache hit, still run `playwright install --with-deps <browser>` (Playwright will skip the actual binary download but the OS-level system library install step still needs to happen — "cache hit, binaries present, system libs missing" is the documented failure mode otherwise). Given the app only tests `chromium` (per `playwright.config.ts` projects list), this is a small, single-browser cache — expected saving is real but modest (avoids a ~30-45s Chromium download per run) and worth doing given `e2e` is already the slower job.

### B.4 — env vars: build-time vs test-time
Grepped every `process.env.*` reference in the app source (`app/`, `lib/`, `components/`, `i18n/`, `proxy.ts`) — **exactly 2 env vars exist in this entire codebase**, both `NEXT_PUBLIC_`-prefixed (values not read, only key names, per instruction):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Both are read in 3 files (`lib/supabase/proxy-client.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`). Because of the `NEXT_PUBLIC_` prefix, Next.js inlines them into the client bundle **at build time** if any client component imports `lib/supabase/client.ts` — so they must be present (as *some* value) before `pnpm run build` in the `quality` job, not just at test time. Note the "publishable key" is Supabase's anon/public key by design (meant to ship in client JS) — it is not a traditional secret, but still supply it via a repo/environment **variable** (not printed) rather than hardcoding a literal in the workflow YAML, for hygiene and to keep per-environment values swappable.
- **`quality` job**: needs both vars set to *any* non-empty placeholder value to get a clean build (Next.js doesn't validate reachability at build time — confirmed, since my probe's build succeeded reading real `.env.local` values, but the code path doesn't call any Supabase API during static generation).
- **`e2e` job**: needs both vars set to the *real* values matching whatever Supabase instance is running in that job (the CI-local `supabase start` instance's own printed URL/anon key from B.2, not the local dev `saa-app` values — these change per environment, so wire them from `supabase status --output json` in that job's own step, not from a stored secret).
- No Google client ID/secret/credentials exist anywhere in this repo's source (grepped, zero hits) — that config lives entirely in Supabase's own Auth provider settings (in `saa-app` locally; in whatever `supabase/config.toml`'s `[auth.external.google]` block would say, but that block is only needed if a test ever completed a real OAuth handshake, which none currently do).

## Ranked recommendation summary

**A (pnpm migration):** pin `packageManager: "pnpm@10.33.2"` + `engines.node: ">=22 <25"`, migrate via `pnpm import` (parity-verified), fix the 2 hardcoded npm references (`playwright.config.ts` webServer command, `README.md`), add no `.npmrc` overrides unless a real symptom appears. Skip corepack entirely — pnpm 10+'s own version management supersedes it, and corepack is being phased out of Node itself.

**B (CI):** two-job workflow (`quality` blocking on every push/PR; `e2e` also on every push/PR but with its own Supabase-via-CLI service step) using `pnpm/action-setup` + `actions/setup-node` with pnpm-lock-keyed caching, plus version-pinned Playwright browser caching. Add `supabase/config.toml` to run the full 23-test suite (not 21) in CI with zero test-code changes and zero Google secrets, since no test ever contacts Google for real.

## Unverified / left uncovered
- pnpm 11.25.0 (latest major) was not empirically tested against this repo — only 10.33.2 was. Recommend a separate, isolated bump later.
- Did not actually spin up `supabase start` + run the 2 authenticated Playwright tests end-to-end in CI-like conditions (would require adding `supabase/config.toml` to the repo, which is implementation, out of scope for a report-only research task). The recommendation in B.2 is grounded in reading the actual test/helper code plus cross-referenced external sources, not a live CI run.
- GitHub branch protection rules / required status checks on `main` were not checked (would need `gh api repos/.../branches/main/protection`, not requested).
- Did not verify whether the shared runner's Docker daemon on GitHub-hosted `ubuntu-latest` pulls the Supabase CLI's Postgres/GoTrue images fast enough to keep `e2e` job time acceptable in practice — flagged as the main residual risk in B.2.

**Status:** DONE
**A recommendation:** pin `packageManager: "pnpm@10.33.2"` + `engines.node ">=22 <25"`, migrate via `pnpm import`, no corepack, no speculative `.npmrc` hoisting (none needed — verified live).
**B recommendation:** 2-job Actions workflow (`quality` + `e2e`), `pnpm/action-setup`+`actions/setup-node` with pnpm-lock caching, add `supabase/config.toml` and run `supabase start` inside the `e2e` job to cover all 23 tests for real (no test ever hits Google, so no Google secrets needed).
**Unresolved:** confirm Docker image pull time for `supabase start` on GitHub-hosted runners in practice; decide later whether to bump to pnpm 11.
