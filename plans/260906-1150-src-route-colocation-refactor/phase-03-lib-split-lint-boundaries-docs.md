---
title: "Phase 3 — lib/ split, lint boundaries, routes constant, docs"
feature: F001,F002,F003
status: completed
priority: P2
effort: 2h
---

# Phase 3 — `lib/` split, lint boundaries, routes constant, docs

## Context Links

- Map rows marked `3` + the ESLint block to copy in:
  `.claude/skills/nextjs-route-colocation-architecture/references/migration-map.md`
  §§ `lib/` split by kind, Config changes, Docs and kit files
- Zone A direction rules: `.claude/skills/nextjs-route-colocation-architecture/SKILL.md` rules 3 and 5
- [reports/researcher-260906-1150-next16-src-layout-facts.md](reports/researcher-260906-1150-next16-src-layout-facts.md)
  fact 6 (`server-only` and `tsc`)
- [spec/system/architecture.md](spec/system/architecture.md) · [spec/system/permissions.md](spec/system/permissions.md) · [plan.md](plan.md)

## Overview

**Priority** P2 · **Status** pending · Depends on Phase 2 green. Last phase of the PR.

Split what is left of `src/lib/` by kind (`dal`, `api`, `utils`, and the vendor/capability glue that
stays in `lib`), add `server-only` to the DAL, centralize URL paths in `src/constants/routes.ts`,
turn the layout rules into ESLint errors, and bring `README.md`, the migration map and the three
skills in line with the landed layout.

## Key Insights

1. **`server-only` breaks the DAL's own unit tests unless handled.** The package's default export
   condition throws by design; under vitest (node, no `react-server` condition) importing it from
   `src/dal/users.ts` throws before any assertion. Add the import first, run `pnpm test:unit`, and
   if it throws, alias `server-only` to an empty stub in `vitest.config.ts`
   (`tests/setup/server-only-stub.ts`) — `tests/` already holds test infrastructure and stays at the
   repo root. Do not weaken the import to a comment.
2. **`tsc` is the reason the package must be installed**, not Next: Next strips `server-only`
   internally, but `pnpm typecheck` runs bare `tsc --noEmit` and `skipLibCheck` does not cover a
   missing module (fact 6). `devDependencies` is the right home; commit the lockfile change.
3. **The proxy matcher must stay literal.** `config.matcher` is statically analyzed at build time, so
   it cannot read `ROUTES`. `routes.ts` replaces route strings in redirects, links and defaults —
   never in the matcher. Keep a comment there saying why.
4. **`routes.ts` needs `as const`** or `href={ROUTES.LOGIN}` degrades to `string` and fails typed-route
   checking. It stays out of the coverage allowlist by design (declarative table, no `.ts` logic glob
   covers `src/constants/**`), so it ships without a test.
5. **E2E specs keep their literals.** The oracle must not import the constant it is meant to verify;
   the replacement is scoped to `src/**`.
6. **The map's sideways-import pattern may false-positive.** `../*/_*/**` can match the legitimate
   ancestor form `../../_components/language-selector/…` depending on whether ESLint's matcher treats
   `*` as matching `..`. Treat the home header as the canary: if `pnpm lint` flags it, narrow the
   pattern so the parent-walk segment is excluded (e.g. `../!(..)/_*`), and record the corrected
   block back into migration-map.md — the alias ban (`@/app/**/_*`) is the load-bearing half and must
   survive either way.
7. **Coverage denominator becomes 18** — `next-path`, `roving-index`, `get-user-role`,
   `users-role-client` and `sign-in-with-google` move between allowlisted globs; `routes.ts` adds none;
   the new `src/dal/auth.ts` (step 2b) adds exactly one, with its colocated test.

## Requirements

Functional: no behavior change anywhere; every export keeps its name. Non-functional: no client
component imports `src/dal`; `pnpm lint` fails on a Zone A → `src/app` import and on an alias reach
into a private folder; docs and kit files name only paths that exist.

## Related Code Files

### Move (tests ride along, renamed to match their module)

| From (post-Phase-2) | To |
|---|---|
| `src/lib/auth/get-user-role.ts` + test | `src/dal/users.ts` + `users.test.ts` |
| `src/lib/supabase/users-role-client.ts` + test | `src/dal/users-role-client.ts` + test |
| `src/lib/auth/sign-in-with-google.ts` + test | `src/api/auth.ts` + `auth.test.ts` |
| `src/lib/supabase/next-path.ts` + test | `src/utils/url/next-path.ts` + test |
| `src/lib/ui/roving-index.ts` + test | `src/utils/a11y/roving-index.ts` + test |

Staying put: `src/lib/supabase/{client,server,proxy-client}.ts` (+ tests) and
`src/lib/i18n/{locale.ts,locale.test.ts,messages-parity.test.ts}`. `src/lib/auth/` and `src/lib/ui/`
are removed once empty.

### Create

| File | Contents |
|---|---|
| `src/constants/routes.ts` | `export const ROUTES = { HOME: "/", LOGIN: "/login", TODO: "/todo", AUTH_CALLBACK: "/auth/callback" } as const;` — no test (outside the allowlist by design) |
| `tests/setup/server-only-stub.ts` | Empty module, **only if** step 2 proves it is needed |

### Edit — imports and call sites

| File | Change |
|---|---|
| `src/dal/users-role-client.ts` | type import from `@/lib/auth/get-user-role` → `./users` |
| `src/dal/users.ts`, `src/dal/users-role-client.ts` | add `import "server-only";` as the first line |
| `src/api/auth.ts` | `@/lib/supabase/next-path` → `@/utils/url/next-path` |
| `src/app/auth/callback/route.ts` | `@/lib/supabase/next-path` → `@/utils/url/next-path` |
| `src/app/(public)/(home)/page.tsx` | `@/lib/auth/get-user-role` → `@/dal/users`; `@/lib/supabase/users-role-client` → `@/dal/users-role-client` |
| `src/app/(public)/login/_hooks/use-login-actions.ts` + test | `@/lib/auth/sign-in-with-google` → `@/api/auth`, including the `vi.mock()` specifier |
| `src/hooks/use-menu-keyboard-nav.ts` | `@/lib/ui/roving-index` → `@/utils/a11y/roving-index` |
| `src/proxy.ts` | redirect targets and `pathname` comparisons use `ROUTES`; **matcher stays literal** with a comment saying why |
| `src/app/_actions/logout.ts`, `src/app/(public)/login/page.tsx`, `src/app/(protected)/layout.tsx` | `redirect("/login")` / `redirect("/")` → `ROUTES.*` |
| `src/app/(public)/login/_components/login-client.tsx` | `const NEXT_PATH = "/"` → `ROUTES.HOME` |
| `src/app/(public)/(home)/_components/header.tsx`, `logo-link.tsx`, `home-footer.tsx` | `href="/login"` / `href="/"` → `ROUTES.*` |

Leave `safeNextPath`'s internal `"/"` fallback and every `tests/**` literal alone.

### Edit — config, docs and kit files

| File | Change |
|---|---|
| `package.json` + `pnpm-lock.yaml` | add `server-only` to `devDependencies` |
| `vitest.config.ts` | only if step 2 proves it: alias `server-only` → the stub |
| `eslint.config.mjs` | add the two `no-restricted-imports` blocks from migration-map.md § Config changes (core ESLint, no new dependency) |
| `README.md` | lines 59, 77–78, 104, 108 → new paths, incl. the vitest project/allowlist description |
| `.claude/skills/nextjs-route-colocation-architecture/references/migration-map.md` | line 5: the split is Phase 1 = the **entire** `app/` tree plus the shared folders and config (never half — Next ignores `src/app` while a root `app/` exists), Phase 2 = groups and colocation inside `src/app`, Phase 3 = `lib/` split, lint, docs. Fold in any lint-pattern correction from insight 6 |
| `.claude/skills/nextjs-route-colocation-architecture/SKILL.md` | § Status: drop "The code has not moved yet… never create `src/` partially" and state the layout as landed |
| `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md` | drop the "Until the migration PR lands, `vitest.config.ts` still lists the old root folders (…)" sentence |
| `.claude/skills/separate-hook-logic-from-components/SKILL.md` | drop the "until the `src/` migration lands, map them through the location skill's migration map" clause |

Do **not** touch `docs/vi/**` — generated; the orchestrator's `rebuild-spec` core pass at Stage 6
re-baselines it.

## Implementation Steps

1. `git mv` the five module/test pairs; delete the emptied `src/lib/auth/` and `src/lib/ui/`.
2. Add `import "server-only";` to both `src/dal` modules, then `pnpm add -D server-only` and run
   `pnpm test:unit`. If the DAL tests throw on the import, add `tests/setup/server-only-stub.ts` and
   the `server-only` alias in `vitest.config.ts`, and re-run until green.
2b. Create `src/dal/auth.ts` (first line `import "server-only";`) exporting
   `getCurrentUser(): Promise<User | null>` — wraps `createClient()` from `@/lib/supabase/server` and
   `supabase.auth.getUser()`, returns `data.user ?? null` — plus `src/dal/auth.test.ts` beside it (mock
   `@/lib/supabase/server`, cover user / null / error → null). Rewire the four server call sites to it:
   `src/app/(protected)/layout.tsx`, `src/app/(protected)/todo/page.tsx`,
   `src/app/(public)/(home)/page.tsx` (keeps its own `createClient()` only for the `toUsersRoleClient`
   role read), `src/app/(public)/login/page.tsx`. Reason: colocation skill rule 4 — `page.tsx`/`layout.tsx`
   read through `src/dal`; four consumers is past YAGNI. Redirect matrix and role read stay byte-identical.
3. Create `src/constants/routes.ts`, then apply the import and call-site edits table, matcher last so
   it is obvious it stayed literal.
4. Add the two ESLint boundary blocks. Run `pnpm lint --max-warnings 0`.
   - If the home header's `../../_components/language-selector/…` import is flagged, narrow the
     sideways pattern per insight 6 and re-run.
   - Prove the gate bites: temporarily add `import { LoginFooter } from "../login/_components/login-footer";`
     to `(public)/(home)/page.tsx`, confirm `pnpm lint` errors, then revert the line.
   - Prove the Zone A rule bites the same way with a temporary `@/app/...` import in `src/hooks/`.
5. Update `README.md`, `migration-map.md` and the three skills.
6. Run the full gate in the Phase 1 order.
7. Assert: coverage table lists 18 source files; 22 stories; routes unchanged; `grep -rn "@/lib/auth\|@/lib/ui\|@/lib/supabase/next-path" src` returns nothing;
   `grep -rln "server-only" src/dal` lists all three DAL modules (`auth.ts`, `users.ts`, `users-role-client.ts`);
   `grep -rn "auth.getUser" src/app` returns nothing (every server call site goes through `getCurrentUser`).
8. Commit: `refactor(structure): split lib by kind, add boundary lint rules and routes constant`.

## Todo List

- [x] Five module/test pairs moved; `src/lib/auth/` and `src/lib/ui/` gone
- [x] `server-only` imported in both DAL modules, installed as a devDependency, unit tests green
- [x] `src/constants/routes.ts` created (`as const`) and inline route strings replaced in `src/**`
- [x] Proxy matcher left literal, with the reason commented
- [x] ESLint boundary rules added, canary checked, both rules proven to bite and the probes reverted
- [x] `README.md`, `migration-map.md` and the three skills updated
- [x] `src/dal/auth.ts` + test created; four server call sites read the session through `getCurrentUser`
- [x] Full gate green; 18 coverage files, 22 stories, routes unchanged
- [x] Single commit created (lockfile included) — orchestrator ran build/typecheck (exit 0); review fix in fd445a5

## Success Criteria

Owns, verbatim from `evidence/study-context.json`:

- "Every file listed in references/migration-map.md lives at its target path and no source remains in
  root app/, components/, hooks/, lib/, mocks/, i18n/ or root proxy.ts"
- "pnpm lint passes with the new boundary rules and no sideways or downward segment import remains
  (home header no longer imports from login; home page no longer imports from todo)"
- "every src/dal module imports server-only and no client component imports src/dal"
- The README half of: "docs/vi and README reference the new paths: rebuild-spec core pass
  re-baselined _source-to-fcode.json and the F001-F003 technical-spec source citations" — the
  `docs/vi` half belongs to the Stage 6 `rebuild-spec` core pass, not to this phase.

## Risk Assessment

| Risk | L×I | Countermeasure |
|---|---|---|
| `server-only` throws inside vitest → DAL tests red | High×Med | Step 2 runs the tests before anything else and has the stub-alias remedy ready |
| `server-only` missing from `package.json` → `tsc` TS2307 in CI | Med×High | Installed in the same step; lockfile committed |
| Boundary rule false-positives on the legitimate ancestor import → `pnpm lint` unfixably red | Med×High | Insight 6 canary in step 4, with the narrowed pattern and a map correction |
| Boundary rules added but toothless (never match) | Med×Med | Two deliberate violation probes in step 4, both reverted |
| `ROUTES` in the proxy matcher → matcher silently ignored, guard disabled | Low×High | Explicit "matcher stays literal" edit row, comment, and the E2E redirect cases |
| `ROUTES` without `as const` → typed-route `href` errors | Med×Low | Spelled out in the create table |
| README/skill edits drift from what actually landed | Med×Low | Written after the code moves, before the gate |

**Rollback:** `git revert` the phase commit; the tree returns to the green Phase 2 state. The only
effect outside the source tree is the `server-only` devDependency, which the revert removes along
with its lockfile entry (run `pnpm install` afterwards).

## Security Considerations

This phase strengthens the boundary rather than moving it: `import "server-only"` makes a client
import of `src/dal/users.ts` a build-time failure instead of a review catch, and the ESLint rules stop
Zone A from reaching into route code. Nothing about the guards changes — `src/proxy.ts` keeps its
matcher and redirect matrix, `(protected)/layout.tsx` keeps its `getUser()` check, `safeNextPath`
keeps its open-redirect guard byte-for-byte (only its folder changes), and `getUserRole` stays a
display-only, fail-open label that gates no route.

## Next Steps

Hand back to the orchestrator: inspection, then the Stage 6 `rebuild-spec` core pass to re-baseline
`docs/vi/_source-to-fcode.json`, `.rebuild-state.json` and the F001–F003 `technical-spec.md` source
citations, then `/tkm:ship`. Log in `plans/action-items.md` under `## Decisions`: the session gate and
the three pages read the session through `src/dal/auth.ts` (`getCurrentUser`; four consumers, per the
colocation skill's rule 4) — the Phase 2 layout calls `createClient()` directly only until this phase
rewires it — and `/todo` accepts one extra `getUser()` round-trip for the greeting.
