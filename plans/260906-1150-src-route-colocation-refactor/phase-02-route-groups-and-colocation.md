---
title: "Phase 2 — Route groups, colocation, single session gate"
feature: F001,F002,F003
status: completed
priority: P1
effort: 4h
---

# Phase 2 — Route groups, colocation, single session gate

## Context Links

- Map rows marked `2`, their targets authoritative:
  `.claude/skills/nextjs-route-colocation-architecture/references/migration-map.md` §§ Route tree,
  Components, Hooks · scope ladder and private-folder rules in that skill's `SKILL.md` · layer rules
  in `separate-hook-logic-from-components/SKILL.md` · companion files in
  `write-unit-tests-and-storybook-stories/SKILL.md`
- [researcher report](reports/researcher-260906-1150-next16-src-layout-facts.md) facts 4, 5 ·
  [spec/system/permissions.md](spec/system/permissions.md) § Mô hình hai lớp guard · [plan.md](plan.md)

## Overview

**Priority** P1 · **Status** pending · Depends on Phase 1 green. Blocks Phase 3. Reshape `src/app/**`
into `(public)/(home)`, `(public)/login`, `(protected)/todo`; pull components, hooks, feature copy and
the countdown helper into the owning segment's private folders; lift the two shared Server Actions to
`src/app/_actions/`; replace `/todo`'s guard with one `(protected)/layout.tsx`. Both sideways imports
die as a by-product.

## Key Insights

1. **Route groups add no URL segment** — the three URLs are unchanged and no two groups resolve to the
   same path (fact 4). One root layout stays at `src/app/layout.tsx`, so the "multiple root layouts"
   caveat never fires. `_`-prefixed folders are unroutable at any depth, groups included (fact 5).
2. **The gate moves, the email read does not.** `(protected)/layout.tsx` owns the redirect;
   `todo/page.tsx` keeps its `getUser()` **only** to fill the greeting, minus the `if (!user)
   redirect(...)`. Accepted cost: one extra GoTrue round-trip on `/todo`. No `src/dal` session helper
   is created — nothing else would consume it (YAGNI).
3. **Private folders are reached relatively, never by alias** (Phase 3's lint rule bans the alias
   form), and `vi.mock()` specifiers must track the import: `use-select-locale.test.ts` and
   `use-login-actions.test.ts` mock `@/app/actions/locale`, and a stale mock path goes inert while
   the test keeps passing its own assertions.
4. **Coverage denominator holds at 17**: every moved file lands in an allowlisted glob (`_actions/**`,
   `_hooks/**`, `_utils/**`), so Phase 1's transitional `"src/app/actions/**/*.ts"` glob goes here.

## Requirements

Functional: the four URLs render identically; anonymous `/todo` still redirects to `/login`; logout
and locale switching unchanged; 22 stories still build. Non-functional: no export renamed, no
component rewritten, stories/tests move with their file, no sideways or downward segment import left.

## Related Code Files

### Move — route tree and actions

| From (post-Phase-1) | To |
|---|---|
| `src/app/page.tsx` | `src/app/(public)/(home)/page.tsx` |
| `src/app/home-client.tsx` | `src/app/(public)/(home)/_components/home-client.tsx` |
| `src/app/login/page.tsx` | `src/app/(public)/login/page.tsx` |
| `src/app/login/login-client.tsx` | `src/app/(public)/login/_components/login-client.tsx` |
| `src/app/todo/page.tsx` | `src/app/(protected)/todo/page.tsx` |
| `src/app/todo/actions.ts` + `actions.test.ts` | `src/app/_actions/logout.ts` + `logout.test.ts` |
| `src/app/actions/locale.ts` + `locale.test.ts` | `src/app/_actions/set-locale.ts` + `set-locale.test.ts` |

`src/app/layout.tsx`, `src/app/favicon.ico` and `src/app/auth/callback/**` stay exactly where they are.

### Move — components (stories ride along with their component)

| From (post-Phase-1) | To |
|---|---|
| `src/components/home/**` except `home-copy.ts` (incl. `icons/`) | `src/app/(public)/(home)/_components/**` |
| `src/components/home/home-copy.ts` | `src/app/(public)/(home)/_shared/home-copy.ts` |
| `src/components/login/language-selector.tsx` + story | `src/app/(public)/_components/language-selector/` |
| `src/components/login/icons/icon-down.tsx`, `icon-vn-flag.tsx` + stories | `src/app/(public)/_components/language-selector/` (flat, per the map) |
| `src/components/login/icons/icon-google.tsx` + story | `src/app/(public)/login/_components/icons/` |
| `src/components/login/**` rest (`login-screen`, `login-header`, `login-hero`, `login-background`, `login-footer`, `login-error-alert`, `google-login-button` + stories) | `src/app/(public)/login/_components/**` |
| `src/components/login/login-copy.ts` | `src/app/(public)/login/_shared/login-copy.ts` |
| `src/components/todo/todo-screen.tsx` + story | `src/app/(protected)/todo/_components/` |

### Move — hooks and the home-only helper

| From | To |
|---|---|
| `src/hooks/use-countdown.ts` + test | `src/app/(public)/(home)/_hooks/` |
| `src/hooks/use-login-actions.ts` + test | `src/app/(public)/login/_hooks/` |
| `src/hooks/use-select-locale.ts` + test | `src/app/(public)/_hooks/` |
| `src/lib/countdown/countdown.ts` + test | `src/app/(public)/(home)/_utils/countdown.ts` |

`src/hooks/use-menu-keyboard-nav.ts` + test stay in `src/hooks/` (generic). `src/components/` and
`src/lib/countdown/` must be empty and gone at the end of this phase.

### Create — `src/app/(protected)/layout.tsx`, the whole file

```tsx
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return <>{children}</>;
}
```

If generated `LayoutProps<"/">` is rejected here, fall back to `{ children: React.ReactNode }`.

### Edit — imports

| File (post-move) | Change |
|---|---|
| `(home)/page.tsx` | `./home-client` → `./_components/home-client`; `@/app/todo/actions` → `../../_actions/logout` (kills sideways import #2); `@/components/home/home-copy` → `./_shared/home-copy`; `@/components/home/header` → `./_components/header` |
| every `(home)/_components/**` file using `./home-copy` (13, incl. `home-client.tsx` + 3 stories) | → `../_shared/home-copy` |
| every `login/_components/**` file using `./login-copy` (4) | → `../_shared/login-copy` |
| `(home)/_components/header.tsx` | `@/components/login/language-selector` → `../../_components/language-selector/language-selector` (kills sideways import #1) |
| `(home)/_components/countdown-timer.tsx` | `@/hooks/use-countdown` → `../_hooks/use-countdown` |
| `(home)/_hooks/use-countdown.ts` + test | `@/lib/countdown/countdown` → `../_utils/countdown` |
| `login/page.tsx` | `./login-client` → `./_components/login-client`; `@/components/login/login-copy` → `./_shared/login-copy` |
| `login/_components/login-client.tsx` | `@/components/login/login-screen` → `./login-screen`; `@/components/login/login-copy` → `../_shared/login-copy`; `@/hooks/use-login-actions` → `../_hooks/use-login-actions` |
| `login/_components/login-header.tsx` | `./language-selector` → `../../_components/language-selector/language-selector` |
| `(public)/_components/language-selector/language-selector.tsx` (+ its story) | `./icons/icon-down` → `./icon-down`; `./icons/icon-vn-flag` → `./icon-vn-flag`; `@/hooks/use-select-locale` → `../../_hooks/use-select-locale` |
| `(public)/_hooks/use-select-locale.ts` + test | `@/app/actions/locale` → `../../_actions/set-locale`, **including the `vi.mock()` specifier** |
| `login/_hooks/use-login-actions.ts` + test | `@/app/actions/locale` → `../../../_actions/set-locale`, **including the `vi.mock()` specifier**; its `@/lib/auth/sign-in-with-google` import and mock stay until Phase 3 |
| `(protected)/todo/page.tsx` | `./actions` → `../../_actions/logout`; `@/components/todo/todo-screen` → `./_components/todo-screen`; **delete** the `if (!user) redirect("/login")` block; read `user?.email ?? ""` |
| `(protected)/todo/_components/todo-screen.stories.tsx` | `../../../messages/vi.json` → `../../../../../messages/vi.json` (two levels deeper from the repo root) |
| `_actions/logout.ts`, `_actions/set-locale.ts` | no import edit; exports `logoutAction` / `setLocale` keep their names |

### Edit — config

`vitest.config.ts`: delete the transitional `"src/app/actions/**/*.ts"` entry from the coverage
allowlist. Every other glob is pattern-based and needs no change.

## Implementation Steps

1. Create the group and private folders, then `git mv` the three move tables (one command per folder
   where possible).
2. Write `src/app/(protected)/layout.tsx` from the snippet above.
3. Apply the import-edit table, then delete the transitional coverage glob.
4. Prove the sideways imports are gone — this grep returns nothing, and the header's
   language-selector import shows only the ancestor-relative form:
   `grep -rn "todo/actions\|@/components\|@/hooks/use-countdown\|@/hooks/use-select-locale\|@/hooks/use-login-actions\|@/app/actions" src` — and `src/components/` and `src/lib/countdown/` are gone.
5. Run the gate in the Phase 1 order: `lint --max-warnings 0` → `format:check` →
   `test:unit:coverage` → `build` → `typecheck` → `build-storybook` →
   `playwright test --grep-invert @auth`.
6. Assert from the output: `pnpm build` prints exactly `/`, `/login`, `/todo`, `/auth/callback`
   (plus `/_not-found`); coverage table still lists 17 source files; Storybook still finds 22
   stories — parentheses in group folder names must not break the story glob.
7. Run the anonymous-`/todo` E2E case specifically; the redirect target must still be `/login`.
8. Commit: `refactor(structure): group routes and colocate feature files under src/app`.

## Todo List

- [x] Group folders created, all three move tables applied, stories/tests moved with their file
- [x] `(protected)/layout.tsx` created; `/todo` page guard removed, greeting still filled
- [x] Import-edit table applied, incl. both `vi.mock()` specifiers and the deep `messages/` path
- [x] Transitional coverage glob deleted; sideways-import greps clean; `src/components/` gone
- [x] Gate green in order; routes, 17 coverage files, 22 stories asserted — lint/format/coverage
      (17 files)/build-storybook (22 stories)/playwright all green by the implementer; the orchestrator
      ran `pnpm build` (exit 0, routes `/`, `/_not-found`, `/auth/callback`, `/login`, `/todo`, Proxy)
      and `pnpm typecheck` (exit 0)
- [x] Anonymous `/todo` → `/login` verified by E2E; single commit created — E2E verified green
      (both the full non-`@auth` run and the case alone); orchestrator commit
      `refactor(structure): group routes and colocate feature files under src/app`

## Success Criteria

Owns, verbatim from `evidence/study-context.json`:

- "pnpm test:e2e passes the CI-safe suite, and the @auth suite when Supabase is reachable, with
  unchanged URLs /, /login, /todo, /auth/callback"
- "(protected)/layout.tsx is the single authoritative session gate and /todo still redirects
  anonymous users to /login"

Phase-local: no file under `src/app/**` imports a sibling or child segment's private folder; home
header and home page no longer reach into login/todo; moved logic keeps its test, components theirs.

## Risk Assessment

| Risk | L×I | Countermeasure |
|---|---|---|
| Guard gap: page guard removed before/without a working layout gate | Low×High | Layout written before the page edit; step 8 runs the redirect case explicitly |
| `vi.mock()` specifier not updated → mock inert, test asserts nothing | Med×Med | Named in the edit table; 100% gate still runs |
| Story or vitest glob mishandles `(…)` in folder names | Low×Med | Step 7 asserts 22 stories and 17 coverage files |
| `LayoutProps<"/">` rejected for the group layout | Med×Low | Documented fallback to an explicit `children` prop type |
| Extra `getUser()` round-trip on `/todo` | High×Low | Accepted, recorded as a decision; one route, placeholder page |
| Deep relative to `messages/` missed → Storybook build fails | Med×Low | Named in the edit table; Storybook step in the gate |

**Rollback:** `git revert` the phase commit — the tree returns to the green Phase 1 state. No schema,
cookie or URL contract changed, so nothing outside the repo needs undoing.

## Security Considerations

This phase moves the authoritative auth boundary; three invariants hold on the way out.
`(protected)/layout.tsx` performs a real `supabase.auth.getUser()` (never a cookie read) and redirects
to exactly `/login`. `src/proxy.ts`'s matcher and optimistic redirects stay byte-identical — first line
only. `/auth/callback` stays outside the group and the matcher. `/todo` cannot render user data before
the gate runs: a layout awaits above its children.

## Next Steps

Phase 3: split `lib/` by kind, add the ESLint boundary rules that make this import discipline
enforceable, add `src/constants/routes.ts`, update `README.md`, the map and the three skills.
