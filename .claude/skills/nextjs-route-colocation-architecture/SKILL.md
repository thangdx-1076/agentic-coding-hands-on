---
name: nextjs-route-colocation-architecture
description: "Folder organization for Next.js App Router projects: shared code grouped by kind under src/* (api, dal, domain, components, hooks, utils, constants, lib, contexts, configs) and feature code grouped by route inside src/app/** via route groups `(group)` and private folders `_components/_hooks/_actions/_utils/_shared/_contexts`. Server-first, unidirectional dependencies enforced by ESLint, colocated verification. Use when starting a Next.js project, adding a screen/feature, or deciding where a component, hook, action, util, constant or domain rule belongs."
argument-hint: "[init | add-route <segment> | where <thing>]"
license: MIT
metadata:
  author: dang.xuan.thang
  version: "6.0.0"
---

# Route-Colocated Feature Architecture (Next.js App Router)

Stack-agnostic: works with any UI kit, form or fetching library, test runner. Only the folder and dependency rules matter.

## 0. When to use it

- **Use** for product apps with roughly ten or more routes, an auth boundary, and several screens per entity (list / detail / edit / reports).
- **Too much** for a marketing or content site or a tiny tool: keep a flat `app/` + `components/` + `lib/`, skip `dal/`, `domain/`, actions folders.
- **Too little** when several products share a large domain with separate teams or release cadence: move Zone A into monorepo packages (`packages/ui`, `packages/domain`, `packages/api`) and keep one Next.js app per product.

## 1. Principles

1. **Two zones.** `src/<layer>/` = shared code grouped **by kind** (then by topic). `src/app/**` = feature code grouped **by route**; a feature is a route segment, its files live in private folders inside it.
2. **Proximity.** A file lives at the deepest folder that contains all of its consumers. Two sibling routes need it → parent's private folder. Unrelated features need it → Zone A.
3. **Unidirectional dependencies.** Zone A never imports from `src/app`. Inside Zone A: `types / constants / utils` ← `domain` ← `configs / lib` ← `api / dal` ← `hooks` ← `components`. Inside Zone B a segment imports only from its own private folders, its **ancestors'** private folders, or `@/…`. Never sideways (a sibling segment), never downward (a child segment). Enforced by lint (§10).
4. **Server-first.** `page.tsx`, `layout.tsx` and non-interactive components are Server Components: they read through the DAL, guard access, and pass plain props down. `"use client"` starts as low in the tree as the interaction requires. Mutations go through Server Actions when the server can reach the backend; otherwise through client hooks.
5. **Hooks own client logic, components own pixels.** Client state, URL state, client fetching and handlers live in `_hooks/`; client components receive them as props and never call the API layer.
6. **Colocated verification.** Unit test, story and mock sit next to the file they cover; end-to-end tests live in `e2e/` at the repo root.

The pattern combines the Next.js "colocation" project organization (private folders + route groups) with package-by-feature for business code (route tree = feature tree) and package-by-layer for shared code.

## 2. How each kind is organized

| Kind | Zone A (shared) — grouped by | Zone B (feature) — grouped by |
|---|---|---|
| **Components** | `src/components/ui/` — design-system primitives (button, input, dialog…), **by widget**; `src/components/<widget>/` — composed shared widgets (data-table, form fields, layout shells). No business nouns. | `<segment>/_components/` — **by route**, then **by sub-feature**. Server Components by default (an async component here may call the DAL itself); `"use client"` only on interactive leaves. |
| **Hooks** | `src/hooks/` — **generic** client hooks only (`use-disclosure`, `use-debounce`, `use-media-query`). | `<segment>/_hooks/` — **by route**, then **by sub-feature** with the **same sub-folder names** as `_components`. Domain-aware hooks shared by several features go to the nearest common ancestor segment, not to Zone A. |
| **Server Actions** | none | `<segment>/actions.ts` while small; `<segment>/_actions/<verb>-<entity>.ts` once several. `"use server"`: validate with a `domain` schema → call the DAL → `revalidateTag` / `revalidatePath` → return a typed result. |
| **Domain** (optional) | `src/domain/<entity>/` — pure TypeScript shared by client, actions and DAL: entity types, validation schemas, business rules (`calculate-fee.ts`), enum tables and labels. No React, no I/O, no framework imports. Create it the first time a rule or schema is needed by two features **or** by both a client form and a server action. | Feature-only rules and schemas stay in `<segment>/_shared/` / `_utils/`. |
| **Utils** | `src/utils/<topic>/` — **by topic** (`common/`, `datetime/`, `string/`, `testing/`…). One concern per file: predicates and formatters one function per file, a cohesive group may share a module. Business-agnostic; no `helpers/` beside `utils/`. | `<segment>/_utils/` — **by route**, helpers that need the feature's domain knowledge. |
| **Constants** | `src/constants/` — **by topic**, framework/app-level tables (`routes.ts`, `roles.ts`, `pagination.ts`, `cache-tags.ts`). User-facing text in an i18n catalog or `messages/`. Domain enums belong to `domain/`. | `<segment>/_shared/constants.ts`; `_shared/` also holds `schema.ts`, `types.ts`, enum→label maps. Teams may instead keep loose `constants.ts` / `schema.ts` in the segment root (non-special files are never routed) — one style per repo. |
| **Contexts / stores** | `src/contexts/` — app-wide client contexts only (session, theme). | `<segment>/_contexts/` — providers for **client components** that need data loaded in `layout.tsx`. Server components below the layout do not need it: they call the DAL again and rely on request memoization (`fetch` dedupe, `React.cache`). `_hooks/use-<x>-store.ts` for segment-local client stores. |
| **API (client)** | `src/api/<resource>.ts` — **by backend resource**: isomorphic HTTP functions + request/response types (generated from the API schema when one exists); query options / keys of the query library live here too. | none — features reach it from `_hooks/`. |
| **DAL (server)** | `src/dal/<resource>.ts` — **by backend resource**, `import "server-only"`. Server-side access layer whether the source is a database or an upstream API: reads and writes for RSC, actions and route handlers, authorization next to the data, cache tags and revalidation for its resource. | none — reached from `page.tsx`, `layout.tsx`, async server components, `actions.ts`. |
| **lib / configs / styles / types** | Zone A only, **by kind**: `lib/<vendor>/` (providers, wrappers; browser-bound ones `import "client-only"`), `lib/<capability>/` (technical capabilities with no route: analytics, realtime client, feature flags), `configs/env.ts` (validated, server/client split), `styles/`, `types/` (global and utility types only). | none |

Rules that fall out of the table:
- Shared side answers "*what kind of thing is it?*"; feature side answers "*which screen uses it?*" first, kind second, sub-feature third.
- `_components/<sub-feature>/`, `_hooks/<sub-feature>/`, `_actions/<sub-feature>/` share names so UI, logic and mutations of one sub-feature sit side by side.
- Nothing in `src/components`, `src/hooks`, `src/utils` may carry a domain noun; domain knowledge lives in `src/domain` or in a segment.
- The server boundary is visible in the path: `src/dal/` is server-only; `src/api/` may run in the browser.

## 3. Folder tree

```text
<repo>/
├── e2e/                    end-to-end tests, fixtures, auth setup
└── src/
    ├── api/                <resource>.ts — isomorphic HTTP functions, types, query options · <client>/ (http client, error utils, generated schema)
    ├── dal/                <resource>.ts — server-only access with authorization and cache tags
    ├── domain/             <entity>/ — types, schemas, business rules, enums (pure TS)            optional
    ├── components/
    │   ├── ui/             design-system primitives
    │   └── <widget>/       composed shared widgets (data-table/, form/, layout/)
    ├── configs/            env.ts (validated, server/client split), other runtime options
    ├── constants/          routes.ts, roles.ts, pagination.ts, cache-tags.ts, messages/…
    ├── contexts/           app-wide client contexts
    ├── hooks/              generic client hooks
    ├── lib/                <vendor>/ wrappers and providers · <capability>/ route-less technical features
    ├── styles/             global css, fonts
    ├── types/              global and utility types, *.d.ts
    ├── utils/              pure, business-agnostic functions by topic
    ├── proxy.ts            (middleware.ts on Next ≤ 15) optimistic redirect on missing session only — real auth lives in the DAL / layouts
    └── app/
        ├── layout.tsx  page.tsx  error.tsx  global-error.tsx  not-found.tsx
        ├── sitemap.ts  robots.ts  manifest.ts  opengraph-image.tsx      framework metadata files stay at the app root
        ├── api/            route handlers: webhooks, BFF (cookies, tokens), file streams, public API — never business CRUD
        ├── (public)/       routes without auth
        │   ├── layout.tsx
        │   └── <screen>/   page.tsx · _components/ · _hooks/ · actions.ts
        ├── (protected)/    routes behind auth
        │   ├── layout.tsx  session check via DAL + providers
        │   ├── _components/ _hooks/ _utils/        shared by every protected route, incl. route-less behaviour (notifications, tab sync)
        │   ├── (with-<layout>)/                    one group per layout variant (sidebar, bare, …)
        │   │   ├── layout.tsx
        │   │   └── <feature>/                      a feature = a route segment
        │   │       ├── page.tsx  loading.tsx  error.tsx
        │   │       ├── _components/ _hooks/ _actions/ _utils/ _shared/      shared by the whole feature
        │   │       ├── @modal/                     parallel-route slot for modal-over-list (optional)
        │   │       │   ├── default.tsx
        │   │       │   └── (.)[id]/page.tsx        intercepting route: detail as a modal, full page on reload
        │   │       ├── (list-and-crud)/            example data-boundary group: screens that do NOT need the entity loaded
        │   │       │   ├── page.tsx  new/  [id]/edit/
        │   │       │   ├── _components/<sub-feature>/
        │   │       │   ├── _hooks/<sub-feature>/    same names as _components
        │   │       │   └── _actions/<sub-feature>/
        │   │       └── (with-entity)/[id]/         example data-boundary group: screens that DO need the entity loaded
        │   │           ├── layout.tsx              DAL fetch once → notFound()/redirect() → <EntityProvider> for client children
        │   │           ├── _components/ _contexts/ _hooks/ _actions/ _shared/ _utils/
        │   │           └── <sub-screen>/           page.tsx · loading.tsx · _components/ · _hooks/ · _shared/
        │   └── (with-<other-layout>)/
        └── <sub-app>/      optional secondary surface sharing auth, backend and release cadence; repeats (protected)/(public) + its own _shared/
```

## 4. Route groups, slots — `(name)`, `@name`

Route groups never appear in the URL. Three uses only:

| Group | Purpose |
|---|---|
| `(public)` `(protected)` | auth boundary; `(protected)/layout.tsx` checks the session and mounts providers |
| `(with-<layout>)` | layout variant inside an auth boundary (sidebar, bare, wizard, …) |
| data-boundary groups, e.g. `(list-and-crud)` `(with-entity)` | same URL prefix, different data prerequisites; the group that needs the entity owns a `layout.tsx` that loads it once |

Name groups by *how the subtree renders or is guarded*, never by a domain noun. Two groups may share `[id]` as long as the resolved URLs never collide.

Parallel routes (`@slot/`) and intercepting routes (`(.)`, `(..)`) belong **inside the feature segment** that owns the list they overlay; always ship a `default.tsx` for the slot.

## 5. Private folders — `_name`

Excluded from routing. Any segment may hold any subset:

| Folder | Holds |
|---|---|
| `_components/` | UI for this segment and its children, sub-folders by sub-feature. Server Components by default (async ones may read via the DAL); `"use client"` on interactive leaves. A single client root is acceptable only when the whole screen is client-driven (live dashboard, complex editor). |
| `_hooks/` | Client logic: `use-<screen>.ts` (URL state + client fetching + handlers), `use-<verb>-<entity>.ts` (form + mutation), `use-<x>-store.ts` (segment-local store). Same sub-folder names as `_components`. |
| `_actions/` | Server Actions once `actions.ts` outgrows one file. |
| `_utils/` | Pure helpers for the subtree. |
| `_shared/` | `constants.ts`, `schema.ts`, `types.ts`, enum→label mappings shared by the subtree. In a sub-app it may also hold `components/`. |
| `_contexts/` | Providers that hand layout-loaded data to **client** components. Not needed for server components (request memoization covers them). |

Scope ladder for any file: `<screen>/_x` → `<feature>/_x` → `(protected)/_x` → `<sub-app>/_shared` → `src/<layer>`. Climb one rung only when a consumer outside the current scope appears.

## 6. Features without a URL

Not everything maps to a route: notifications, cross-tab session sync, analytics, feature flags, background polling.

- **Behaviour that renders or reacts inside a shell** (a toaster, a tab-sync listener, a global command palette) → the private folders of the layout that hosts it, usually `(protected)/_components/<capability>/` and `(protected)/_hooks/`.
- **Technical capability with no UI** (analytics client, realtime client, feature-flag reader) → `src/lib/<capability>/`.
- **Business rules with no UI** (fee calculation, eligibility checks) → `src/domain/<entity>/`.

## 7. The screen chain

```text
proxy.ts / middleware.ts              optimistic: no session cookie → redirect to login. Nothing else.
(protected)/layout.tsx  (server)      verify session via dal → redirect() → providers
[entity]/layout.tsx     (server)      dal.getEntity(id) → notFound() / redirect() → <EntityProvider> for client children
page.tsx                (server)      metadata · authorization · reads via dal (Promise.all, Suspense + loading.tsx for streaming)
  ├─ _components/<view>.tsx (server)  renders data; may call dal itself — request memoization dedupes
  └─ _components/<widget>.tsx ("use client")   interactive leaf
       ├─ _hooks/use-<screen>.ts               URL search params as the source of truth for filters/sort/pagination;
       │                                       client fetching (src/api) only for live / paginated / optimistic data
       └─ actions.ts                           "use server" → validate with domain schema → dal → revalidateTag(cacheTags.<resource>)
```

Reads on the server, as close to the data as possible; authorization inside the DAL. Writes through Server Actions first; client hooks + `src/api` when the backend is not reachable from the server. URL is state for anything shareable (filters, page, sort); component state for drafts; a segment-local store only when several client components must coordinate.

## 8. Where does X go?

| Adding… | Location |
|---|---|
| A new screen | `app/<groups>/<segment>/page.tsx` (+ `loading.tsx`, `error.tsx` when meaningful) + `_components/` |
| A detail modal over a list | `<feature>/@modal/(.)[id]/page.tsx` + `@modal/default.tsx` |
| Component for one screen | that segment's `_components/` (sub-folder if it belongs to a sub-feature) |
| Component for sibling screens | the parent segment's `_components/` |
| Design-system primitive | `src/components/ui/` |
| Composed widget with no business meaning | `src/components/<widget>/` |
| Component shared inside one sub-app only | `app/<sub-app>/_shared/components/` |
| Client state, URL state, client fetching, handlers | that segment's `_hooks/use-<screen>.ts` |
| Mutation (create / update / delete) | `<segment>/actions.ts` → `_actions/<verb>-<entity>.ts` when many; client hook `_hooks/use-<verb>-<entity>.ts` only when a client library is required |
| State shared by several client components of one segment | `_hooks/use-<x>-store.ts` |
| Layout-loaded data needed by client children | `_contexts/<name>.tsx` (server children just call the DAL) |
| Enum table / schema / types for one feature | `_shared/` (or loose files in the segment, per repo style) |
| Entity type / schema / business rule used by two features, or by a form and an action | `src/domain/<entity>/` |
| Helper that knows the feature's domain | that segment's `_utils/` |
| Generic helper (`isEmail`, `formatDate`) | `src/utils/<topic>/` |
| Generic client hook (`useDisclosure`) | `src/hooks/` |
| Domain-aware hook used by several features | the nearest common ancestor segment's `_hooks/` |
| Route-less UI behaviour (toaster, tab sync) | hosting layout's `_components/` / `_hooks/` |
| Route-less technical capability (analytics, realtime) | `src/lib/<capability>/` |
| Backend calls from the browser (+ query options / keys) | `src/api/<resource>.ts` |
| Backend calls from RSC / actions / route handlers, cache tags | `src/dal/<resource>.ts` (`server-only`) |
| Cache tag names | `src/constants/cache-tags.ts`, revalidated only from the DAL or actions |
| URL path | `src/constants/routes.ts` — single source for links, redirects and the proxy matcher |
| Environment variable | `src/configs/env.ts` |
| Third-party glue (providers, wrappers) | `src/lib/<vendor>/` (`client-only` when browser-bound) |
| A long relative path outside the current feature | a `tsconfig` alias pointing at an ancestor |

## 9. Naming & module rules

- Files and folders `kebab-case`. Hooks `use-<name>.ts`, actions `<verb>-<entity>.ts`, utils `<verb>-<noun>.ts` / `is-<x>.ts`, API and DAL `<resource>.ts` (the folder says which), tests `<file>.test.ts`, stories `<file>.stories.tsx`.
- Route groups `(adjective)`, slots `@noun`, private folders `_noun`, dynamic segments `[camelCaseId]`, sub-feature folders reused verbatim across `_components/`, `_hooks/`, `_actions/`.
- **Named exports everywhere**; default export only where Next.js requires it (`page`, `layout`, `loading`, `error`, `not-found`, `default`, route handlers) or for `dynamic()` targets.
- **No barrel files** across layers (`src/components/index.ts`, `src/utils/index.ts`): import from the file. An `index.ts` is fine only inside one compound-widget folder.
- Imports via `@/…` aliases (one per layer, plus deep aliases that point only at **ancestors** of the importing file). Relative imports may climb freely **inside the feature's own subtree**; leaving the feature goes through an alias.
- Keep files small (≈ 250 lines); split into a parts folder / two hooks / two utils before they grow past it.
- `import "server-only"` in every `src/dal` module; `import "client-only"` in browser-bound `lib/` wrappers; `"use server"` only in `actions.ts` / `_actions/`; `"use client"` only where a hook, event handler or browser API is used.

## 10. Enforcing the boundaries (lint)

`import "server-only"` already fails the build when client code imports the DAL — no lint rule needed for that. What lint must catch is **direction**: Zone A → `src/app`, sibling → sibling, parent → child. Relative-path patterns alone cannot do it (an alias such as `@/app/(protected)/…` bypasses them), so use a boundary-aware plugin.

Illustrative `eslint-plugin-boundaries` setup — adapt paths:

```js
settings: {
  "boundaries/elements": [
    { type: "shared",  pattern: "src/!(app)/**" },
    { type: "segment", pattern: "src/app/**/*",  mode: "folder", capture: ["path"] },
  ],
},
rules: {
  "boundaries/element-types": ["error", {
    default: "disallow",
    rules: [
      { from: "shared",  allow: ["shared"] },                                  // Zone A never reaches src/app
      { from: "segment", allow: ["shared", ["segment", { path: "${from.path}" }],   // itself and its subtree…
                                            ["segment", { path: "${from.path}/.." }]] }, // …plus ancestors (see plugin docs for ancestor matching)
    ],
  }],
},
```

Minimal fallback with core ESLint (catches the common cases, not alias bypasses):

```js
{ files: ["src/!(app)/**/*.{ts,tsx}"],
  rules: { "no-restricted-imports": ["error", { patterns: ["@/app/*"] }] } },
{ files: ["src/app/**/*.{ts,tsx}"],
  rules: { "no-restricted-imports": ["error", { patterns: ["../*/_*", "../*/_*/**", "./*/_*", "./*/_*/**"] }] } },
```

Whichever tool: the rule exists in the repo, not only in this document, and PR review checks that deep aliases point at ancestors.

## 11. Workflows

**`init`** — create the Zone A layers (`api`, `dal`, `components/ui`, `hooks`, `utils`, `constants`, `lib`, `configs`, `contexts`; add `domain` when the first shared rule appears) and the auth groups `(public)` `(protected)`; one `tsconfig` alias per layer; put `constants/routes.ts`, `constants/cache-tags.ts`, `configs/env.ts`, `api/<client>/`, the lint boundary rules and `e2e/` in place before the first feature.

**`add-route <segment>`** — pick the groups (auth → layout → data) → `page.tsx` as a Server Component reading through `src/dal` → `_components/` with client boundaries at the leaves → `_hooks/use-<segment>.ts` only if client state exists → `actions.ts` for mutations (validate with a domain schema, revalidate by tag) → register the path in `constants/routes.ts` and the proxy matcher → add `_shared/` / `_contexts/` / `@modal/` only when needed → when the feature grows, split `_components/`, `_hooks/`, `_actions/` by the same sub-feature names.

**`where <thing>`** — decide the kind, list its consumers, take the deepest common segment on the scope ladder, place it in that segment's private folder for that kind; if the segment is `src/app` itself, it belongs in Zone A under the matching layer (`domain` for business rules, `lib` for capabilities, `utils` for generic helpers).

## 12. Anti-patterns

- A `features/`, `modules/` or `screens/` folder beside `app/` — the route tree already is that.
- A `helpers/` folder next to `utils/`; a `hooks/shared` bucket for domain hooks — use the scope ladder instead.
- Business components, hooks or helpers under `src/components` / `src/hooks` / `src/utils` — business rules go to `src/domain`, business UI to a segment.
- Sideways imports between sibling segments; Zone A importing from `src/app`; a deep alias that points at a sibling instead of an ancestor.
- Server-only code recognisable only by a file suffix — keep it under `src/dal/`.
- A context provider created only so server components avoid a second DAL call — request memoization already covers it.
- `"use client"` on `page.tsx`, on a whole screen by reflex, or on a component with no interactivity.
- Fetching in client components what a server component above could have read; authorization only in the proxy/middleware.
- Business CRUD through `app/api/**` route handlers — use Server Actions or the DAL.
- `revalidateTag` / `revalidatePath` scattered in components — only the DAL and actions revalidate.
- `_components/` grouped by type (`modals/`, `buttons/`) while `_hooks/` is grouped by sub-feature — same names, same split.
- Barrel `index.ts` across layers; default exports outside Next special files; a parallel-route slot without `default.tsx`.
- A second product grown inside `<sub-app>/` after it has its own team or release cadence — move it to a monorepo app.
- One big `utils.ts` or `constants.ts`; hand-written API types when a schema exists; route strings inline.
- A hook, action, domain rule or util without a colocated test.

## 13. Reference points

No single well-known repository uses this exact layout; each part is documented practice (structures as of the author's knowledge, they may have moved):

- **Next.js docs — Project structure and organization**: private folders `_x`, route groups `(x)`, the "split by route" colocation strategy, `server-only` / `client-only`, Data Access Layer guidance.
- **Cal.com** (`apps/web/app/(use-page-wrapper)/(main-nav)/…`), **shadcn/taxonomy** (`(auth)`, `(dashboard)`, `(marketing)`), **vercel/platforms**, **Documenso**: route groups by auth and layout, `_components` inside segments.
- **shadcn/taxonomy**, **vercel/commerce**, Vercel templates: the shared side — `components/ui`, `lib`, `hooks`, `config`, `types`.
- **bulletproof-react**: unidirectional dependency rules enforced with ESLint (shared → features → app); note it keeps features in `src/features/` rather than inside the route tree.
- **Feature-Sliced Design**, **Nx module boundaries**: formalized layer + slice rules with lint enforcement.
- **Epic Stack (Kent C. Dodds)**: the colocation and "scope hoisting" philosophy this skill's proximity rule comes from.
