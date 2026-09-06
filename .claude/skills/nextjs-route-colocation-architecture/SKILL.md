---
name: nextjs-route-colocation-architecture
description: "WHERE a file lives in this repo. Route-colocated layout for the Next.js App Router: shared code by kind under src/{api,dal,domain,components,hooks,utils,constants,lib,configs,contexts}; feature code by route inside src/app/** via route groups (public)/(protected) and private folders _components/_hooks/_actions/_utils/_shared/_contexts. Activate when creating any file under src/app or a shared layer, adding a screen or route, choosing a MoMorph Track A outputPath, writing a plan phase that names files, or when the user asks 'where does X go', 'add a route', 'add a screen', 'đặt file ở đâu', 'thêm màn', 'thêm route', 'tách folder'. Answers only the WHERE question: layer split → separate-hook-logic-from-components; companion files → write-unit-tests-and-storybook-stories."
argument-hint: "[where <thing> | add-route <segment> | migrate]"
license: MIT
metadata:
  author: dang.xuan.thang
  version: "7.0.0"
---

# Route-colocated architecture: where a file lives (this repo)

## Status

Adopted and migrated 2026-09-06 on branch `refactor/src-route-colocation`.

## Three skills, one question each

| Question | Skill |
|---|---|
| Which layer is this code: pure logic, hook, or component? | [separate-hook-logic-from-components](../separate-hook-logic-from-components/SKILL.md) |
| **Where does the file live?** | this skill |
| What ships next to it: test, story, MSW handler? | [write-unit-tests-and-storybook-stories](../write-unit-tests-and-storybook-stories/SKILL.md) |

Answer them in that order. This skill never restates the other two.

## Rules

1. **Two zones.** `src/<layer>/` = shared code grouped by kind. `src/app/**` = feature code grouped by route. A feature is a route segment; its files live in that segment's private folders.
2. **Scope ladder.** A file lives at the deepest folder that contains all its consumers: `<screen>/_x` → `<feature>/_x` → `(group)/_x` → `src/app/_x` → `src/<layer>`. Climb one rung only when a consumer outside the current scope appears.
3. **Direction.** Zone A never imports `src/app`. Inside Zone A: `types/constants/utils` ← `domain` ← `configs/lib` ← `api/dal` ← `hooks` ← `components`. A segment imports its own private folders, its ancestors' private folders (relative path), or `@/<layer>`. Never a sibling, never a child, never `@/app/**/_*`.
4. **Server-first.** `page.tsx` and `layout.tsx` are Server Components: read through `src/dal`, guard access, pass plain props down. `"use client"` starts at the lowest interactive leaf. Mutations go through Server Actions (`actions.ts` or `_actions/`): validate → DAL → `revalidateTag` / `revalidatePath`.
5. **No business nouns in `src/components`, `src/hooks`, `src/utils`.** Business rules → `src/domain` (create on the first shared rule). Business UI → a segment.
6. **Files ≤ 200 lines** (repo rule). Kebab-case. Named exports except Next special files. No cross-layer barrel `index.ts`.

## Target tree

```text
messages/  public/  tests/{e2e,setup}/          stay at the repo root
src/
├── app/
│   ├── layout.tsx  favicon.ico                 root shell: locale, fonts, providers
│   ├── _actions/   set-locale.ts  logout.ts    shell-level actions used by more than one group
│   ├── auth/callback/route.ts                  OAuth code exchange (route handler, not business CRUD)
│   ├── (public)/                               no session required
│   │   ├── _components/language-selector/      shared by (home) and login
│   │   ├── _hooks/use-select-locale.ts
│   │   ├── (home)/   page.tsx · _components/ · _hooks/use-countdown.ts · _utils/countdown.ts · _shared/home-copy.ts
│   │   └── login/    page.tsx · _components/ · _hooks/use-login-actions.ts · _shared/login-copy.ts
│   └── (protected)/
│       ├── layout.tsx                          session check via src/dal → redirect(); the auth gate
│       └── todo/     page.tsx · _components/
├── api/        auth.ts                         browser-side Supabase calls, reached from _hooks only
├── dal/        users.ts  users-role-client.ts  `import "server-only"`; reads + authorization next to the data
├── lib/        supabase/{client,server,proxy-client}.ts · i18n/locale.ts
├── hooks/      use-menu-keyboard-nav.ts        generic client hooks only
├── utils/      a11y/roving-index.ts · url/next-path.ts
├── constants/  routes.ts                       every path used by links, redirects and the proxy matcher
├── configs/    env.ts                          validated env, server/client split (create on first need)
├── styles/     globals.css  fonts.ts
├── mocks/      handlers.ts  node.ts            MSW, one handler list for vitest and Storybook
├── i18n/       request.ts                      next-intl entry (framework-required location)
└── proxy.ts                                    optimistic redirect only; real auth = (protected)/layout.tsx + dal
```

`domain/`, `contexts/` and shared `components/` widgets do not exist yet. Create each on its first real consumer, never ahead of it.

Route groups are named by how the subtree is guarded or rendered (`(public)`, `(protected)`, `(home)`), never by a business entity. Every segment that owns files gets its own folder: `/` lives in `(public)/(home)/` so home-only components cannot leak into `login/` through the shared `(public)/_components/`.

## Where does X go?

| Adding… | Location | Example in this repo |
|---|---|---|
| A screen | `src/app/<groups>/<segment>/page.tsx` + `_components/` | `(public)/(home)/page.tsx` |
| Component for one screen | that segment's `_components/` | `award-card.tsx` → `(home)/_components/` |
| Component for sibling screens | the parent group's `_components/` | `language-selector` → `(public)/_components/` |
| Client state, URL state, handlers | segment `_hooks/use-<screen>.ts` | `use-login-actions.ts` → `login/_hooks/` |
| Generic client hook | `src/hooks/` | `use-menu-keyboard-nav.ts` |
| Mutation | `<segment>/actions.ts`; `src/app/_actions/` when several groups share it | `logout.ts` (used by `/` and `/todo`) |
| Server read + authorization | `src/dal/<resource>.ts` | `get-user-role` → `dal/users.ts` |
| Browser-side backend call | `src/api/<resource>.ts` | `sign-in-with-google` → `api/auth.ts` |
| Feature-only helper | segment `_utils/` | `countdown.ts` → `(home)/_utils/` |
| Generic helper | `src/utils/<topic>/` | `roving-index.ts` → `utils/a11y/` |
| Feature constants, types, copy | segment `_shared/` | `home-copy.ts`, `login-copy.ts` |
| Vendor glue | `src/lib/<vendor>/` | `lib/supabase/*` |
| Route-less capability | `src/lib/<capability>/` | `lib/i18n/locale.ts` |
| URL path | `src/constants/routes.ts` | `/login`, `/todo`, `/auth/callback` |
| Environment variable | `src/configs/env.ts` | `EVENT_START_AT` |
| Icons from a design | `_components/icons/` of the segment that uses them | `(home)/_components/icons/` |

## Workflows

- **`where <thing>`**: decide the layer (previous skill) → list the consumers → take the deepest common segment on the ladder → place it in that segment's private folder for that kind. If the common segment is `src/app` itself, it belongs in Zone A under the matching layer.
- **`add-route <segment>`**: pick the groups (auth → layout → data) → `page.tsx` as a Server Component reading through `src/dal` → `_components/` with `"use client"` at the leaves → `_hooks/use-<segment>.ts` only if client state exists → `actions.ts` for mutations → register the path in `src/constants/routes.ts` and the proxy matcher → `_shared/`, `_contexts/`, `@modal/` only when needed.
- **`migrate`**: follow [references/migration-map.md](references/migration-map.md) top to bottom. It is the checklist for the migration PR and the single source of the config changes (tsconfig alias, vitest globs, Storybook globs, ESLint boundaries).

## AIDD: how this layout ties into the kit

- **One feature code ↔ one segment.** `rebuild-spec` generates `docs/vi/features/F###_*` and `docs/vi/screens/SCR###_*` and maps source files to feature codes in `docs/vi/_source-to-fcode.json`. A feature's files must resolve to one segment plus Zone A. Today F003 spans `app/page.tsx`, `app/home-client.tsx`, `components/home/**`, `hooks/use-countdown.ts` and `lib/countdown/`; after migration it is `(home)/**` plus Zone A. When a feature would need two segments, the placement is wrong, not the map.
- **After any move, run the `rebuild-spec` core pass** so `_source-to-fcode.json`, `.rebuild-state.json` and the technical specs pick up the new paths. Hand-edits to generated docs do not survive the next pass.
- **MoMorph Track A** (`momorph-ui-implementer`): the orchestrator passes `outputPath: src/app/<groups>/<segment>/_components/` and an `ownedFiles` list inside that segment. Icons and design-derived mock data stay in the segment. Reuse what an ancestor already owns (`(public)/_components/language-selector/`) instead of regenerating it.
- **Planner and implementer**: phase files name target paths from this skill. A phase that touches two segments needs two file-ownership lists.
- **Ambiguous placement**: decide by the ladder (deepest first, then the option matching an existing pattern, then fewest files), log one line under `## Decisions` in `plans/action-items.md`, keep going. Do not ask.
- **Reviewer checklist**, fail the review on any of: a sideways or downward import between segments; Zone A importing `@/app`; a private folder reached through `@/app/**/_*` instead of a relative path; `"use client"` on `page.tsx` or `layout.tsx`; a business noun under `src/components|hooks|utils`; a `.ts` file in a logic folder without its colocated test; a file over 200 lines.

## Verification

`pnpm lint` runs the boundary rules in `eslint.config.mjs` (added by the migration PR; the config is in the migration map). `pnpm typecheck && pnpm test:unit:coverage && pnpm build-storybook` use pattern globs, so a file placed by this skill is picked up automatically. Rationale, anti-patterns and the lint options: [references/rationale-and-anti-patterns.md](references/rationale-and-anti-patterns.md).
