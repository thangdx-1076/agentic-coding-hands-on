# Rationale, private folders, screen chain, anti-patterns

Background for [SKILL.md](../SKILL.md). Read when a placement feels wrong and the table in the skill does not settle it.

## Why two zones

Shared code answers "what kind of thing is it?" so it is grouped by kind, then topic. Feature code answers "which screen uses it?" first, kind second, sub-feature third. The route tree already is the feature tree, so a `features/`, `modules/` or `screens/` folder beside `app/` duplicates it. This combines the Next.js "colocation" strategy (private folders + route groups) with package-by-feature for business code and package-by-layer for shared code. The proximity rule comes from the Epic Stack's "scope hoisting"; the direction rule from bulletproof-react and Feature-Sliced Design.

## Route groups and slots

Route groups never appear in the URL. Three uses only:

| Group | Purpose |
|---|---|
| `(public)` `(protected)` | auth boundary; `(protected)/layout.tsx` checks the session and mounts providers |
| `(with-<layout>)` | layout variant inside an auth boundary (sidebar, bare, wizard); add when a second layout appears |
| data-boundary groups such as `(list-and-crud)` `(with-entity)` | same URL prefix, different data prerequisites; the group that needs the entity owns a `layout.tsx` that loads it once |

Name groups by how the subtree renders or is guarded. `(home)` names the landing screen's render scope, not a business entity. Two groups may share `[id]` as long as resolved URLs never collide. Parallel routes (`@slot/`) and intercepting routes (`(.)`, `(..)`) belong inside the feature segment that owns the list they overlay; always ship `default.tsx` for the slot.

## Private folders

| Folder | Holds |
|---|---|
| `_components/` | UI for this segment and its children, sub-folders by sub-feature. Server Components by default (an async one may read via the DAL); `"use client"` on interactive leaves. One client root is acceptable only when the whole screen is client-driven. |
| `_hooks/` | Client logic: `use-<screen>.ts` (URL state, client fetching, handlers), `use-<verb>-<entity>.ts` (form + mutation), `use-<x>-store.ts` (segment-local store). Same sub-folder names as `_components`. |
| `_actions/` | Server Actions once `actions.ts` outgrows one file; `<verb>-<entity>.ts`. |
| `_utils/` | Pure helpers that need the feature's domain knowledge. |
| `_shared/` | `constants.ts`, `schema.ts`, `types.ts`, copy files, enum → label maps for the subtree. |
| `_contexts/` | Providers that hand layout-loaded data to client components. Server components below the layout call the DAL again; request memoization dedupes. |

`_components/<sub-feature>/`, `_hooks/<sub-feature>/`, `_actions/<sub-feature>/` share names so UI, logic and mutations of one sub-feature sit side by side.

## Features without a URL

- Behaviour that renders inside a shell (toaster, tab-sync listener, command palette) → the private folders of the layout that hosts it, usually `(protected)/_components/<capability>/` and `(protected)/_hooks/`.
- Technical capability with no UI (analytics, realtime client, feature flags, i18n) → `src/lib/<capability>/`.
- Business rule with no UI (fee calculation, eligibility) → `src/domain/<entity>/`.

## The screen chain

```text
src/proxy.ts                      optimistic: no session cookie → redirect to login. Nothing else.
(protected)/layout.tsx  (server)  verify session via dal → redirect() → providers
[entity]/layout.tsx     (server)  dal.getEntity(id) → notFound() / redirect() → <EntityProvider> for client children
page.tsx                (server)  metadata · authorization · reads via dal (Promise.all, Suspense + loading.tsx)
  ├─ _components/<view>.tsx (server)          renders data; may call dal itself
  └─ _components/<widget>.tsx ("use client")  interactive leaf
       ├─ _hooks/use-<screen>.ts             URL search params as the source of truth for filters/sort/pagination
       └─ actions.ts                         "use server" → validate → dal → revalidateTag(cacheTags.<resource>)
```

Reads on the server, as close to the data as possible; authorization inside the DAL. Writes through Server Actions first; client hooks plus `src/api` when the backend is not reachable from the server (this repo: Supabase OAuth sign-in is a browser redirect, so it lives in `src/api/auth.ts`). URL is state for anything shareable; component state for drafts; a segment-local store only when several client components must coordinate.

## Naming and module rules

- Files and folders `kebab-case`. Hooks `use-<name>.ts`, actions `<verb>-<entity>.ts`, utils `<verb>-<noun>.ts` or `is-<x>.ts`, API and DAL `<resource>.ts`, tests `<file>.test.ts`, stories `<file>.stories.tsx`.
- Route groups `(adjective)`, slots `@noun`, private folders `_noun`, dynamic segments `[camelCaseId]`.
- Named exports everywhere; default export only where Next.js requires it (`page`, `layout`, `loading`, `error`, `not-found`, `default`, route handlers) or for `dynamic()` targets.
- No barrel `index.ts` across layers. An `index.ts` is fine only inside one compound-widget folder.
- `@/…` aliases for layers; relative imports climb freely inside the feature's own subtree and up to ancestors' private folders. Add an ancestor alias (`@public/*` → `src/app/(public)/*`) only when relative depth hurts, and never one that points at a sibling.
- `import "server-only"` in every `src/dal` module; `import "client-only"` in browser-bound `lib/` wrappers; `"use server"` only in `actions.ts` / `_actions/`; `"use client"` only where a hook, event handler or browser API is used.

## Enforcing direction

`import "server-only"` already fails the build when client code imports the DAL. Lint must catch direction: Zone A → `src/app`, sibling → sibling, parent → child, and the alias escape `@/app/**/_*`. The core-ESLint rules in [migration-map.md](migration-map.md) cover those four. `eslint-plugin-boundaries` adds true ancestor matching; adopt it the first time a violation slips through the core rules:

```js
settings: { "boundaries/elements": [
  { type: "shared",  pattern: "src/!(app)/**" },
  { type: "segment", pattern: "src/app/**/*", mode: "folder", capture: ["path"] } ] },
rules: { "boundaries/element-types": ["error", { default: "disallow", rules: [
  { from: "shared",  allow: ["shared"] },
  { from: "segment", allow: ["shared", ["segment", { path: "${from.path}" }], ["segment", { path: "${from.path}/.." }]] } ] }] }
```

## Anti-patterns

- A `features/`, `modules/` or `screens/` folder beside `app/`; a `helpers/` folder next to `utils/`; a `hooks/shared` bucket for domain hooks.
- Business components, hooks or helpers under `src/components`, `src/hooks`, `src/utils`.
- Sideways imports between sibling segments; Zone A importing `src/app`; `@/app/**/_*` from anywhere.
- Server-only code recognisable only by a file suffix; keep it under `src/dal/`.
- A context provider created only so server components avoid a second DAL call.
- `"use client"` on `page.tsx`, on a whole screen by reflex, or on a component with no interactivity.
- Fetching in client components what a server component above could have read; authorization only in the proxy.
- Business CRUD through `app/api/**` route handlers; `revalidateTag` scattered in components.
- `_components/` grouped by type (`modals/`, `buttons/`) while `_hooks/` is grouped by sub-feature.
- Barrel `index.ts` across layers; default exports outside Next special files; a slot without `default.tsx`.
- One big `utils.ts` or `constants.ts`; hand-written API types when a schema exists; route strings inline.
- A hook, action, domain rule or util without a colocated test (see the testing skill).

## Reference points

Next.js docs on project structure (private folders, route groups, `server-only`, Data Access Layer); Cal.com, shadcn/taxonomy, vercel/platforms, Documenso for route groups by auth and layout with `_components` inside segments; bulletproof-react and Feature-Sliced Design for lint-enforced direction; the Epic Stack for colocation and scope hoisting. No single well-known repository uses this exact layout.
