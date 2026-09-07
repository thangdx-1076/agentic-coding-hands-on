# Repo conventions for a NEW Next.js page

Sources: `.claude/skills/{nextjs-route-colocation-architecture,separate-hook-logic-from-components,write-unit-tests-and-storybook-stories}/SKILL.md` (authoritative, maintainer-written, cross-checked against live code below), `docs/vi/README.md` index, plus direct reads of `src/i18n/*`, `src/lib/supabase/*`, `src/dal/*`, `vitest.config.ts`, `.github/workflows/ci.yml`, `tests/e2e/*.spec.ts`, `src/styles/globals.css`. Every rule below verified against real files, not just skill prose — no drift found between skill docs and code (skills read as trustworthy going forward).

## 1. Route colocation (`.claude/skills/nextjs-route-colocation-architecture/SKILL.md:27-108`)

Two zones: `src/<layer>/` = shared code by kind; `src/app/**` = feature code by route. Never mix.

**Folder shape per new route segment** (SKILL.md:36-64, confirmed live at `src/app/(public)/(home)/`, `src/app/(public)/login/`):
- `page.tsx` — Server Component, reads via `src/dal`, guards access, passes plain props down. No `"use client"`.
- `_components/` — page-scoped components. `"use client"` starts at the lowest interactive leaf.
- `_hooks/use-<screen>.ts` — client state/URL state/handlers, only if needed.
- `_utils/` — feature-only pure helpers.
- `_shared/` — feature constants, types, copy (e.g. `home-copy.ts`).
- `actions.ts` or `_actions/` — Server Actions: validate → DAL → `revalidateTag`/`revalidatePath`.

**Scope ladder** (SKILL.md:30): a file lives at the deepest folder containing ALL its consumers — `<screen>/_x` → `<feature>/_x` → `(group)/_x` → `src/app/_x` → `src/<layer>`. Climb one rung only when a consumer outside current scope appears. E.g. `language-selector` used by both `(home)` and `login` → lives in `(public)/_components/`, not duplicated.

**Import direction** (SKILL.md:31): Zone A (`src/<layer>`) never imports `src/app`. Inside Zone A: `types/constants/utils` ← `domain` ← `configs/lib` ← `api/dal` ← `hooks` ← `components`. A segment may import its own/ancestor private folders (relative path) or `@/<layer>`. Never sideways to a sibling segment, never `@/app/**/_*` for private folders (use relative import instead).

**No business nouns** in `src/components`, `src/hooks`, `src/utils` (SKILL.md:33) — business logic goes to `src/domain` (create on first shared rule) or the segment itself.

**Hard limits** (SKILL.md:34, matches `development-rules.md`): files ≤200 lines, kebab-case, named exports (except Next special files), no cross-layer barrel `index.ts`.

Reviewer fail-list (SKILL.md:104): sideways/downward segment import; Zone A importing `@/app`; private folder reached via `@/app/**/_*` instead of relative; `"use client"` on `page.tsx`/`layout.tsx`; business noun under `src/components|hooks|utils`; `.ts` in a logic folder missing its colocated test; file >200 lines.

Route registration: new path goes in `src/constants/routes.ts` + the proxy matcher (SKILL.md:94).

## 2. i18n

- `src/i18n/request.ts:22-40` — locale comes from `NEXT_LOCALE` cookie (no URL-prefix routing), normalized via `normalizeLocale`. Dynamic `import(../../messages/${locale}.json)` with try/catch fallback to `DEFAULT_LOCALE` bundle on load failure (defense-in-depth, not silent bug).
- `src/lib/i18n/locale.ts:9,14` — `SUPPORTED_LOCALES = ["vi","en"]`, `DEFAULT_LOCALE = "vi"`. `LOCALE_LABEL` (`VN`/`EN`) is fixed, NOT translated copy — lives in code not `messages/*.json` (DRY, same in both locales).
- `messages/vi.json` and `messages/en.json` top-level keys (both): `login`, `todo`, `home`. A new page adds ONE new top-level key matching its route/feature name, in both files simultaneously.
- `home.awards` shape: `{ caption: string, heading: string, items: [{ title, description }, ...] }` — nested-object + array-of-objects pattern is the template for a new page section's messages.
- `src/lib/i18n/messages-parity.test.ts` (MODEL003, vitest.config.ts `node` project) enforces: (1) en/vi key sets identical bidirectionally at every nesting level (dot-path flatten+diff), (2) flattened key COUNT matches. **Rule for new page**: every message key added to `en.json` must be added to `vi.json` at the same path, and vice versa — no partial-locale keys, test fails loud (lists missing keys) otherwise.

## 3. Supabase read pattern (layering rule)

- `src/lib/supabase/server.ts:16` — async `createClient()` for Server Components/Actions/Route Handlers, wraps `@supabase/ssr` `createServerClient`; `setAll` try/catch swallows the "Server Component cookies are read-only" throw by design (session refresh happens in `proxy.ts`, not here).
- `src/lib/supabase/client.ts:13` — sync `createClient()` for browser/client components only, uses publishable key (never service-role/secret key). `!` assertions intentional — fail loud at first use if env missing.
- **DAL layering rule**: DAL functions are plain, synchronously-testable `lib/`-style functions that take an **INJECTED narrow client type**, never call `createClient()` themselves (`src/dal/users.ts:10-13,32-41`). `UsersRoleClient` type declares only the exact chain used (`.from("users").select("role").eq("id",...).maybeSingle()`), deliberately narrower than the full SDK so callers/tests can stub without matching full surface. `maybeSingle()` typed `PromiseLike` not `Promise` (real postgrest builder is a thenable without catch/finally).
- `src/dal/users-role-client.ts:21-38` — `toUsersRoleClient(supabase)` is the shim adapter that re-issues the real `createServerClient()` result through explicit arrows into the narrow type — avoids TS2589 "type instantiation excessively deep" from structural comparison against the full SDK type. Pattern for a new DAL fn: define its own narrow `XClient` type in the `dal/` module + a `toXClient` adapter, don't pass the raw SDK client through.
- `src/dal/auth.ts:1,16-27` — every DAL file starts `import "server-only";`. Pattern is **fail-open**: `getCurrentUser()` returns `null` on any error (Supabase outage never crashes a page, renders as anonymous); `(protected)/layout.tsx` is what turns `null` into an actual `redirect()` — DAL functions never redirect themselves. `getUserRole` (`src/dal/users.ts:47-70`) is also fail-open to `"member"` — explicitly documented as a display label, NOT an authorization gate; a real authz boundary is a separate concern.
- **Rule for a new page needing data**: `page.tsx` (Server Component) calls a DAL function passing an injected client from `src/lib/supabase/server.ts`'s `createClient()`; DAL function fails open/closed per its documented semantics; never create the Supabase client inside `_components/` or `_hooks/` — client components only use `src/lib/supabase/client.ts` via `src/api/*.ts` browser-side calls.

## 4. Testing conventions

- `vitest.config.ts:53-71` — two `projects`: `node` (`src/**/*.test.ts`, excludes hooks) and `jsdom` (`src/hooks/**` + `src/app/**/_hooks/**` only, for DOM/focus/keyboard semantics).
- Coverage (`vitest.config.ts:97-122`): explicit ALLOWLIST (not exclude-list) — `src/{api,dal,lib,utils,hooks,domain,configs}/**/*.ts` + `src/app/**/{_hooks,_utils,_actions}/**/*.ts`, `actions.ts`, `route.ts`. **No `.tsx` glob** — components/`page.tsx` deliberately outside coverage (Storybook covers them; async Server Components unsupported by vitest per Next's own testing guide). Threshold `{100: true}` — real gate, non-zero exit below 100%, not just a printed number. A new `.ts` file in an allowlisted path with no test turns CI red immediately.
- CI (`.github/workflows/ci.yml`): `quality` job runs `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm test:unit:coverage` (=`vitest run --coverage`) → `pnpm build` → `pnpm typecheck` (MUST run after build — Next generates ambient types into `.next/types` only after a build) → `pnpm build-storybook`. Separate `e2e` job (independent, not `needs: quality`) runs `pnpm exec playwright test --grep-invert @auth`.
- **`@auth` exclusion mechanism**: tests tagged via Playwright's `test.describe("Authenticated", { tag: "@auth" }, ...)` (`tests/e2e/home.spec.ts:638`); CI runner excludes them with `--grep-invert @auth` because they need a live local Supabase instance (`saa-app`) unreachable from GH Actions runners. They run only on a dev machine with `saa-app` up. CI prints an explicit "Coverage limitation notice" step (`always()`) disclosing excluded count on every run.
- No branch protection today (verified 2026-09-05 in the workflow's own header comment) — CI jobs report, don't yet enforce/block merge.
- `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md` mandated companion-file table (line 24-32): pure logic/hook/Server Action/Route Handler/DAL/API → colocated `<file>.test.ts` beside it (same folder, same base name, no `__tests__/`). **Common component** → `<file>.stories.tsx`; **composition component** → nothing mandatory (route-level Playwright story covers it instead).
- **Common vs composition boundary** (SKILL.md:38-44): 3 yes-answers required — (1) all data via props, (2) no feature copy/data/cross-segment import, (3) composes <2 named components (icons excluded) → common (needs story). Any "no" → composition (no story required).
- Every main route needs a viewable story built from its **presentational component**, never `page.tsx` (async Server Component, Storybook can't render it) — e.g. `/` → `HomeScreen`, `/login` → `LoginScreen`. A new route's JSX-in-`page.tsx` must first get a presentational component extracted.
- MSW is the single mock-API layer (`src/mocks/handlers.ts` shared by vitest via `tests/setup/msw-node.ts` and Storybook via `.storybook/preview.tsx`) — never define a second handler for the same endpoint. Cannot intercept `signInWithOAuth` (top-level redirect, not fetch/XHR) — simulate via prop instead.
- Story shape: `const meta = {...} satisfies Meta<...>; export default meta;` — never inline `export default {...}` (fails `import/no-anonymous-default-export` lint rule on first story).

## 5. Hook separation (`.claude/skills/separate-hook-logic-from-components/SKILL.md`, 3 bullets)

- Three layers, strict content test (stop at first "yes"): **pure logic** (runs without React — no JSX/useState), **hook** (`use-*.ts`, owns `useState/useEffect/useRef/useTransition`, delegates real computation to pure layer, returns ONE named object destructured immediately at call site — never keep the object, never expose a `RefObject`, only a ref callback), **component** (JSX/className/layout only, calls exactly one hook of its own, no `useEffect`/business conditionals/`fetch`).
- Mandatory order before writing a component: list state/effects needed → pure layer first (with `*.test.ts`) → `use-<name>.ts` → component imports the hook and renders → `pnpm lint && pnpm typecheck`.
- Signals a component is hoarding logic (must split): `useEffect` in a `.tsx`, >2 `useState`, a `handle*` fn >5 lines, `try/catch`/`fetch`/SDK call in `.tsx`, file >150 lines (repo hard cap 200), duplicated logic block across components. Exception: no hook needed for a purely presentational component or a single toggle-only boolean `useState`.

## 6. Styling tokens (`src/styles/globals.css`)

`@theme inline` block (lines 8-21) defines custom Tailwind color tokens:
- `--color-background`, `--color-foreground` (base, light/dark via `prefers-color-scheme`)
- `--font-montserrat`, `--font-montserrat-alternates` (Figma-sourced fonts, login screen only)
- `--color-login-background: #00101a`
- `--color-login-divider: #2e3940`
- `--color-login-button: #ffea9e`
- `--color-login-button-text: #00101a`

**No `home-*` or other screen-specific tokens exist yet** — home screen currently has zero custom color tokens in `globals.css` (confirmed via grep, no `--home*` match). A new page needing screen-specific literal design colors should follow the `login-*` naming pattern (`--color-<screen>-<role>`) added under the same `@theme inline` block, per the file's own comment convention ("Login screen (mm:...) — Figma fonts + literal design colors").

## Unresolved / left uncovered

- Did not read `docs/vi/system/architecture.md` in full (index-only per task scope) — if the planner needs system-wide tech-stack rationale beyond what's cited here, read that file directly.
- Did not verify `src/constants/routes.ts` current contents or the proxy matcher file — planner should read `src/constants/routes.ts` + `src/proxy.ts` directly when registering the new route's path.
- Storybook `.storybook/preview.tsx` MSW wiring and `.storybook/main.ts` globs not read — assume they follow the pattern-glob convention noted in the skill (auto-picked-up, no manual registration needed) but not independently confirmed.
