---
authored_by: researcher
---
# Test Coverage Audit — agentic-coding-hands-on

Skill preflight: `tkm:help` checked — no catalog skill fits a repo-internal test-traceability audit (not external tech research, no doc lookup, no document-format input). Proceeded directly on Read/Grep/Bash per the fallback instruction.

Method: read every test body (not filenames) in `lib/i18n/locale.test.ts`, `lib/supabase/next-path.test.ts`, `tests/e2e/login.spec.ts`, `tests/e2e/helpers/sign-in.ts`; cross-referenced against `docs/vi/generated/*.md` and `plans/260904-1633-login-page-google-oauth/momorph/test-cases.csv`; read every source file named in a US/PERM/BL/ROUTE entry (`proxy.ts`, `app/auth/callback/route.ts`, `lib/supabase/{client,server,proxy-client,next-path}.ts`, `app/actions/locale.ts`, `app/todo/actions.ts`, `app/{page,login/page,todo/page}.tsx`, `app/login/login-client.tsx`, `messages/{en,vi}.json`, `vitest.config.ts`, `playwright.config.ts`, `package.json`).

## 1. Spec-ID coverage matrix

### US### (user-stories.md)

| ID | Criterion | Test | Verdict |
|---|---|---|---|
| US001_SwitchLanguage C1 (menu shows vi/en) | `login.spec.ts:106-122` "Language dropdown opens on click" | COVERED |
| US001 C2 (select locale → cookie write → label updates) | none | **UNCOVERED** — no test clicks a menu item and asserts label/cookie change |
| US001 C3 (proxy.ts normalizes garbage `NEXT_LOCALE`) | none | **UNCOVERED** — `locale.test.ts` only unit-tests `normalizeLocale()` in isolation, never through `proxy.ts` |
| US002_LoginWithGoogle C1 (click → signInWithOAuth → pending UI) | `login.spec.ts:146-231` (TC 60bc5bbb, TC 37eae882) | COVERED |
| US002 C2 (OAuth success → `exchangeCodeForSession` → `safeNextPath` redirect) | none | **UNCOVERED** — "Authenticated" block injects cookies directly (`sign-in.ts`), never drives `GET /auth/callback` |
| US002 C3 (`?error`/exchange-fail → `/login?error=...` → fixed alert) | `login.spec.ts:124-132` (TC 45278c06) | PARTIAL — test only `page.goto('/login?error=auth_failed')` (consumption side); the callback route's own branch that *produces* the redirect (`route.ts:23-27`, `:44-45`) is never executed |
| US002 C4 (`signInWithOAuth` client-throw → `clientError` alert) | none | **UNCOVERED** — TC 60bc5bbb aborts the request but only asserts `authorizeCalled`, never checks `LoginErrorAlert` appears |
| US003_LogOut C1/C2 (submit `logoutAction` → `signOut()` best-effort → redirect) | none | **UNCOVERED** — `login.spec.ts:471-479` asserts the logout button is *visible*, never clicks it |
| US003 C3 (post-logout, PERM003 blocks `/todo`) | `login.spec.ts:134-138` (fresh unauth context, not literally post-logout) | PARTIAL — proves the guard, not the actual logout→guard chain |

US### summary: **0/3 fully covered, 3/3 partially covered**, 5 of 9 acceptance criteria UNCOVERED.

### SCR### (screen-list.md)

| ID | Verdict |
|---|---|
| SCR001_LoginScreen | COVERED (14 GUI/interaction tests) |
| SCR002_TodoScreen | COVERED, thin (2 tests: redirect-in, email+button visible — no logout click) |

### PERM### (permissions-matrix.md)

| ID | Branch | Test | Verdict |
|---|---|---|---|
| PERM001_RootRouteGuard | anonymous → `/login` | `login.spec.ts:140-144` | COVERED |
| PERM001 | authenticated → `/todo` | none | **UNCOVERED** — no test hits `/` while authenticated |
| PERM002_LoginRouteGuard | anonymous → render form | all unauth GUI tests | COVERED |
| PERM002 | authenticated → redirect `/todo` | `login.spec.ts:465-469` | COVERED |
| PERM002 | **fail-open on Supabase error** | none | **UNCOVERED** — no test breaks/mocks Supabase to hit `login/page.tsx:80-82`'s catch branch |
| PERM003_TodoRouteGuard | anonymous → redirect `/login` | `login.spec.ts:134-138` | COVERED |
| PERM003 | authenticated → render | `login.spec.ts:471-479` | COVERED |
| PERM003 | **fail-closed on Supabase error** (uncaught throw, `todo/page.tsx:18-21`) | none | **UNCOVERED** |
| PERM004_CallbackNextPathGuard | `safeNextPath` valid/invalid `next` | `next-path.test.ts` (24 cases) | COVERED **at unit level only** — never exercised through the actual `/auth/callback` route |

PERM### summary: 4/4 have *some* coverage, but the fail-open/fail-closed asymmetry the user asked me to verify is **confirmed untested on both sides** — no test ever makes the Supabase call fail while hitting `/login` or `/todo`.

### ROUTE### (route-list.md)

| ID | Verdict |
|---|---|
| ROUTE001 `GET /auth/callback` | **UNCOVERED** — zero tests navigate to `/auth/callback`. Confirmed by reading `login.spec.ts` end-to-end: no `page.goto` or `page.request.get` targets that path. The PKCE `exchangeCodeForSession` call (`route.ts:34`), the `?error` branch (`route.ts:23-27`), the missing-code/error fallback (`route.ts:45`), and the `safeNextPath(next)` *integration* (as opposed to the unit-tested function) all execute exactly zero times in CI. |

### BL### (behavior-logic.md) — all `integration` client factories

| ID | File | Verdict |
|---|---|---|
| BL001_SupabaseBrowserClient | `lib/supabase/client.ts:13` | **Indirectly exercised**, not directly tested — TC 60bc5bbb/37eae882 click the login button, which calls `createClient()` inside `handleLoginClick` (`login-client.tsx:45`) before hitting the intercepted/aborted network call. No assertion targets the factory itself. |
| BL002_SupabaseServerClient | `lib/supabase/server.ts:16` | **Indirectly exercised** via every `/login` and `/todo` page load (guard's `getUser()` call), including a real round-trip to the local `saa-app` Supabase instance in the Authenticated block. **Not** exercised via `logoutAction()`'s `signOut()` call (never invoked — see US003 gap) or via `auth/callback/route.ts`'s `exchangeCodeForSession()` (ROUTE001 gap above). |
| BL003_SupabaseProxyClient | `lib/supabase/proxy-client.ts:13` | **Indirectly exercised** on every navigation matching `proxy.ts`'s matcher (`/`, `/login`, `/todo/:path*`) — Next's dev server runs it in-process for every `page.goto` in the suite. No dedicated assertion, and — important nuance — because `app/{page,login/page,todo/page}.tsx` each re-run the *same* authoritative check, a test can pass even if `proxy.ts` itself were silently broken (the page-level fallback would still produce the correct redirect). No test isolates which layer fired. |

### MODEL### (entities.md)

| ID | Verdict |
|---|---|
| MODEL001_AppLocale | PARTIAL — `normalizeLocale` unit-tested (8 cases); the "VN"/"EN" label rendering is incidentally asserted (TC 8415b629 checks aria-label contains "VN") but locale *switching* is untested (US001 C2 gap) |
| MODEL002_SupabaseUser | COVERED — `email` read asserted via `/todo` greeting test (`login.spec.ts:471-479`, checks `h1` contains `@`) |
| MODEL003_LoginCopy | COVERED — every GUI test asserting literal copy text (subtitle, tagline, button label, footer, alt text) exercises this shape |

## 2. MoMorph test-cases.csv coverage (17 TCs total)

| TC_ID | Objective | Verdict |
|---|---|---|
| 45278c06 | Login access condition (3 sub-cases: unauth visible / post-logout redirect / auth-redirect) | PARTIAL — sub-case 2 (actual logout→login redirect) uncovered, see US003 |
| b9805e65 | Logo top-left, all sizes, non-interactive | PARTIAL — position asserted; resize + non-interactivity not tested |
| 8415b629 | Language selector top-right, all sizes | PARTIAL — position/label asserted; resize not tested |
| 33a1dacf | Footer fixed, non-interactive, survives scroll | PARTIAL — visibility/text asserted; scroll/non-interactivity not tested |
| 5fbe2a18 | Hero artwork presence | COVERED (thorough — also checks the actual asset loads, a real regression guard) |
| 42b82364 | Hero title/desc, non-interactive | PARTIAL — text asserted; non-interactivity not tested |
| 6ae76d15 | Login button visible + Google icon | PARTIAL — visibility asserted; icon presence not asserted |
| 20d87e28 | Dropdown opens on click | COVERED |
| 5f1cbabd | Default language "VN" shown | **UNCOVERED** as its own TC (incidentally touched by 8415b629's aria-label check, not a dedicated assertion) |
| 98e20775 | Flag icon + chevron display | **UNCOVERED** |
| f62b0c97 | Authenticated user redirected off `/login` | COVERED |
| 60bc5bbb | Click triggers Google OAuth flow | COVERED |
| c18649fa | Hover shadow effect on button | **UNCOVERED** — no visual/CSS hover assertion anywhere |
| 37eae882 | Button disabled + loader during auth | COVERED |
| 4426635b | Dropdown opens on click (component-interaction dup of 20d87e28) | COVERED (via 20d87e28's identical behavior, different TC id) |
| cb42461d | Hover highlight + pointer cursor on language control | **UNCOVERED** |
| e76aa170 | User info returned on successful auth | PARTIAL — substituted with direct session-cookie injection (reasonable, since real Google OAuth can't run in CI); literal "authenticate with Google account" step is untestable as written, not a gap in this suite's control |

Tally: **5 fully covered, 8 partial, 4 uncovered** (5+8+4=17).

## 3. Direct answers to the suspected gaps

- **`proxy.ts` matcher/redirect matrix**: exercised only *indirectly*, every test run, because Next's dev server invokes it in-process for every `/`, `/login`, `/todo` navigation. No test isolates proxy behavior from the page-level authoritative fallback, and no test asserts on cookies proxy.ts refreshes/normalizes. Confirmed: no dedicated proxy test exists.
- **PERM002 fail-open vs PERM003 fail-closed asymmetry**: confirmed **neither failure path is tested**. Nothing in the suite breaks the local Supabase instance or mocks a thrown/rejected `getUser()` call, so `login/page.tsx:80-82`'s catch-and-continue and `todo/page.tsx:18-21`'s uncaught-throw are both dead code paths in CI.
- **`app/auth/callback/route.ts`**: confirmed **zero executable coverage**. PKCE exchange, the `?error` branch, and the `safeNextPath` *integration* are untested; only `next-path.test.ts`'s unit tests of the pure function run.
- **`lib/supabase/{client,server,proxy-client}.ts` (BL001-003)**: all three are exercised as a side effect of E2E navigation/clicks (real calls against the local `saa-app` instance), but none has a dedicated assertion, and BL002's `signOut()`/`exchangeCodeForSession()` call sites are never reached (see US003, ROUTE001 gaps).
- **`app/actions/locale.ts` / `app/todo/actions.ts` Server Actions**: neither is invoked by any test. `setLocale` has zero coverage (not even indirectly — no test selects a language menu item). `logoutAction` has zero coverage (no test clicks logout).
- **i18n bundle key parity (`messages/en.json` vs `vi.json`)**: manually verified — both have identical key sets (`login.{subtitle,tagline,loginButton,footer,error,logoAlt,heroAlt}`, `todo.{greeting,logout}`, 9 keys each, structurally identical). **No automated test enforces this** — a future edit could silently desync them.
- **Coverage reporting**: **none configured**. `vitest.config.ts:8-12` has no `coverage` block; `@vitest/coverage-v8` (or `-istanbul`) isn't in `package.json` devDependencies (checked — absent). `npm run test:unit` (`vitest run`) would need `--coverage` plus that package installed before any number could be produced; today the command errors out or silently ignores the flag. There is no % figure to cite because the tool to produce one isn't wired up.

## 4. Over-tested / redundant

Nothing rises to "cut this." Two candidates considered and rejected:
- The 9 ARIA-menu keyboard-navigation tests (`login.spec.ts:233-439`) look like a lot for a 2-item dropdown, but each asserts a genuinely distinct APG behavior (open-on-ArrowDown, open-on-ArrowUp-at-last-item, wrap-forward, wrap-backward, Home, End, Escape-refocus, Tab-no-refocus, mouse-reopen-focus-reset regression). Cutting any one loses real signal on a real prior regression (the last test is tagged `[REG 2026-09-05]`, i.e. it already caught a bug once).
- `next-path.test.ts`'s 24 cases have some conceptual overlap (raw CR / raw LF / raw CRLF are three separate assertions of the same `isForbiddenCodePoint` branch), but each pins a distinct attacker-controlled byte sequence against a security-critical open-redirect guard — justified given `safeNextPath` is the single choke point for `?next=`.

No test doubles up on the same behavior at the same layer; the redundancy that exists (e.g. 20d87e28 vs 4426635b in the MoMorph CSV) is in the *design spec*, not in the code — the app has one E2E test correctly satisfying two near-duplicate acceptance criteria.

## 5. Ranked recommendations (value vs. effort)

**High value, do first** (real, currently-undetectable risk — not just an unexecuted line):
1. **E2E test hitting `/auth/callback` directly** (`page.request.get` or a `page.goto` with a crafted `?code=`/`?error=` against the local Supabase instance). This is the single biggest blind spot: the entire PKCE exchange path and the callback's own error/fallback branches (ROUTE001, BL002's `exchangeCodeForSession`, PERM004's live integration) have never executed once. A regression here (e.g. someone "simplifies" the try/catch and breaks the fallback redirect) would ship silently.
2. **E2E test that actually clicks logout** and asserts (a) redirect to `/login`, (b) a subsequent direct `/todo` visit redirects again (closes the loop on US003 + PERM003 fail-closed *after* a real session teardown, not just a fresh anonymous context). Currently `logoutAction`/`signOut()` is provably never invoked by any test — for an app whose entire feature surface is "log in, stay in, log out," that's the one action-with-side-effects path left completely dark.

**Medium value** (real gap, lower blast radius for a 2-screen demo):
3. **One E2E test that clicks a language-menu item** and asserts the label/content actually switches (closes US001 C2 — currently `setLocale` Server Action has zero coverage of any kind, not even indirect).
4. **A fail-open/fail-closed simulation** for PERM002/PERM003 (stub/break the Supabase client to reject, verify `/login` still renders and `/todo` still redirects). This is the asymmetry the user already suspected — confirmed real, but effort is non-trivial (needs a way to force `getUser()` to throw in an E2E context, e.g. route interception on the GoTrue endpoint) and the app is a demo; still worth it because a regression here silently flips fail-open into fail-closed (locks everyone out) or vice versa (an availability/security trade each direction).

**Low value, skip for this app's size**:
- A dedicated locale-cookie-normalization-through-proxy.ts test (US001 C3) — the pure-function unit test already covers the logic; wiring it through the real cookie/response path adds effort for a cosmetic fallback with no security consequence.
- Hover/CSS-only MoMorph TCs (c18649fa, cb42461d, 98e20775, 5f1cbabd) — visual-only assertions with no business-logic risk; Playwright CSS/hover assertions are also typically the flakiest and lowest-signal tests to maintain. Leave uncovered.
- `vitest coverage` wiring — for a 32-test unit suite on 2 pure-logic files, a coverage percentage adds process overhead without changing what gets written next; the traceability matrix above is a more honest signal than a line-coverage number would be for this codebase shape (most of the app is JSX/guard code that Vitest's `node` environment can't run anyway — see `vitest.config.ts:9-11`'s explicit `lib/**/*.test.ts` scope).
- i18n key-parity test — 9 keys, 2 files, changed rarely; a one-line diff test would be trivial to add but the risk it guards against (a missing key falling back to next-intl's raw-key display) is cosmetic and would be caught immediately in manual QA of a 2-screen app. Nice-to-have, not urgent.

## 6. Honest assessment

For a 2-screen demo app, the unit-test layer (`normalizeLocale`, `safeNextPath`) is genuinely thorough — both choke points for untrusted input are exhaustively covered at the pure-function level, including several security-relevant encoding edge cases. The E2E layer is strong on **presentational/GUI** coverage (14 tests on `/login` alone, matching most of the MoMorph CSV's static-layout TCs) and on the two most command **guard entry points** (unauthenticated redirect off `/todo` and `/`, authenticated redirect off `/login`). But it systematically **never exercises anything past the point where a real network call to Supabase would be required to prove a code path**: the callback route, the logout action, the locale-switch action, and both failure-mode branches of the route guards are all dead in CI despite being real, non-trivial branches with dedicated code (try/catch asymmetry, PKCE exchange, safe-redirect fallback). That's not "coverage is bad" — it's "coverage stops exactly at the OAuth/session boundary," which is a defensible line to draw for the happy-path/GUI work but leaves the app's actual security-sensitive logic (open-redirect guard *integration*, fail-open/fail-closed *behavior*) unverified by anything that runs in CI today.

## Unresolved

- Whether the team wants `/auth/callback` tested against the real local Supabase instance (slower, real network) vs. a stubbed GoTrue response (faster, needs route interception) — affects effort estimate for recommendation #1.
- No visibility into whether CI actually runs `test:unit`/`test:e2e` on every push (not checked — out of scope, no CI config file was read).

**Status:** DONE
**Counts:**
- US###: 3 total, 0 fully covered / 3 partial / 0 uncovered (5 of 9 acceptance criteria uncovered)
- SCR###: 2 total, 2 covered / 0 uncovered
- PERM###: 4 total, 4 partially covered (every fail-open/fail-closed branch uncovered — 2 of 2 asymmetric branches uncovered)
- ROUTE###: 1 total, 0 covered / 1 uncovered
- BL###: 3 total, 3 indirectly-exercised (0 with dedicated assertions)
- MODEL###: 3 total, 2 covered / 1 partial
- MoMorph CSV: 17 total, 5 covered / 8 partial / 4 uncovered
- Coverage tooling: not configured (no % obtainable today)

**Top 3 recommended additions:**
1. E2E test driving `GET /auth/callback` directly (code-exchange success, `?error` branch, missing-code fallback) — closes ROUTE001/US002-C2/C3/PERM004-integration in one test file.
2. E2E test that clicks logout and re-verifies the post-logout guard — closes US003/BL002's `signOut()` path.
3. E2E test simulating a Supabase-down condition on `/login` and `/todo` — closes the PERM002/PERM003 fail-open/fail-closed asymmetry the user specifically flagged.
