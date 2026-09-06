# Migration map: current layout → `src/` route-colocated layout

Checklist for the migration PR. One row per file that moves; `git mv` keeps history. URLs do not change, so the Playwright suite in `tests/e2e/` is the safety net; unit coverage catches broken imports; `pnpm build-storybook` catches story globs.

Suggested split: **PR 1** rows marked `1` (move into `src/`, config, green build) → **PR 2** rows marked `2` (route groups, colocation, remove sideways imports) → **PR 3** rows marked `3` (split `lib/`, lint boundaries, docs). Each PR ends green on `pnpm lint && pnpm typecheck && pnpm test:unit:coverage && pnpm build-storybook`.

## Stays at the repo root

`messages/` (next-intl default), `public/`, `tests/` (Playwright `testDir` and vitest `setupFiles`), all root config files.

## App shell and framework files

| Current | Target | PR | Note |
|---|---|---|---|
| `app/layout.tsx` | `src/app/layout.tsx` | 1 | |
| `app/favicon.ico` | `src/app/favicon.ico` | 1 | Next metadata file, must stay in `app/` |
| `app/globals.css` | `src/styles/globals.css` | 1 | import path changes in `layout.tsx` and `.storybook/preview.tsx` |
| `app/fonts.ts` | `src/styles/fonts.ts` | 1 | |
| `proxy.ts` | `src/proxy.ts` | 1 | Next requires proxy/middleware inside `src/` when `src/` is used |
| `i18n/request.ts` | `src/i18n/request.ts` | 1 | next-intl auto-detects both locations; `next.config.ts` unchanged |
| `mocks/handlers.ts`, `mocks/node.ts` | `src/mocks/` | 1 | `@/mocks/*` keeps resolving after the alias change |
| `app/auth/callback/route.ts` (+ test) | `src/app/auth/callback/route.ts` | 1 | |

## Route tree

| Current | Target | PR | Note |
|---|---|---|---|
| `app/page.tsx` | `src/app/(public)/(home)/page.tsx` | 2 | own segment so home files do not leak into `login/` |
| `app/home-client.tsx` | `src/app/(public)/(home)/_components/home-client.tsx` | 2 | |
| `app/login/page.tsx` | `src/app/(public)/login/page.tsx` | 2 | |
| `app/login/login-client.tsx` | `src/app/(public)/login/_components/login-client.tsx` | 2 | |
| `app/todo/page.tsx` | `src/app/(protected)/todo/page.tsx` | 2 | drop its own `getUser()` once the layout below exists |
| new | `src/app/(protected)/layout.tsx` | 2 | session check through `src/dal` → `redirect("/login")`; the auth gate |
| `app/todo/actions.ts` (+ test) | `src/app/_actions/logout.ts` | 2 | used by `/` and `/todo`; removes the sideways import in `app/page.tsx` |
| `app/actions/locale.ts` (+ test) | `src/app/_actions/set-locale.ts` | 2 | locale is a root-shell concern (`layout.tsx` sets `lang`) |

## Components (58 files; the 22 stories move with their component)

| Current | Target | PR | Note |
|---|---|---|---|
| `components/home/**` except below | `src/app/(public)/(home)/_components/**` | 2 | keep the `icons/` sub-folder |
| `components/home/home-copy.ts` | `src/app/(public)/(home)/_shared/home-copy.ts` | 2 | |
| `components/login/language-selector.tsx` (+ story) | `src/app/(public)/_components/language-selector/language-selector.tsx` | 2 | used by the home header and login; removes the sideways import in `header.tsx` |
| `components/login/icons/icon-down.tsx`, `icon-vn-flag.tsx` (+ stories) | `src/app/(public)/_components/language-selector/` | 2 | only the selector uses them |
| `components/login/icons/icon-google.tsx` (+ story) | `src/app/(public)/login/_components/icons/` | 2 | |
| `components/login/**` rest | `src/app/(public)/login/_components/**` | 2 | |
| `components/login/login-copy.ts` | `src/app/(public)/login/_shared/login-copy.ts` | 2 | |
| `components/todo/todo-screen.tsx` (+ story) | `src/app/(protected)/todo/_components/` | 2 | |

## Hooks

| Current | Target | PR | Note |
|---|---|---|---|
| `hooks/use-countdown.ts` (+ test) | `src/app/(public)/(home)/_hooks/` | 2 | |
| `hooks/use-login-actions.ts` (+ test) | `src/app/(public)/login/_hooks/` | 2 | |
| `hooks/use-select-locale.ts` (+ test) | `src/app/(public)/_hooks/` | 2 | consumer is the shared language selector |
| `hooks/use-menu-keyboard-nav.ts` (+ test) | `src/hooks/` | 1 | generic; no domain knowledge |

## `lib/` split by kind

| Current | Target | PR | Note |
|---|---|---|---|
| `lib/supabase/client.ts`, `server.ts`, `proxy-client.ts` (+ tests) | `src/lib/supabase/` | 1 | vendor glue |
| `lib/supabase/next-path.ts` (+ test) | `src/utils/url/next-path.ts` | 3 | open-redirect guard, business-agnostic |
| `lib/auth/get-user-role.ts` (+ test) | `src/dal/users.ts` | 3 | add `import "server-only"`; install the `server-only` package |
| `lib/supabase/users-role-client.ts` (+ test) | `src/dal/users-role-client.ts` | 3 | DAL-internal type shim, server-only |
| `lib/auth/sign-in-with-google.ts` (+ test) | `src/api/auth.ts` | 3 | browser-side Supabase call from `use-login-actions` |
| `lib/countdown/countdown.ts` (+ test) | `src/app/(public)/(home)/_utils/countdown.ts` | 2 | only home uses it |
| `lib/i18n/locale.ts` (+ test), `messages-parity.test.ts` | `src/lib/i18n/` | 1 | route-less capability |
| `lib/ui/roving-index.ts` (+ test) | `src/utils/a11y/roving-index.ts` | 3 | |
| new | `src/constants/routes.ts` | 3 | replace inline `/login`, `/todo`, `/`, `/auth/callback` in proxy, pages, hooks, tests |
| new, optional | `src/configs/env.ts` | 3 | `EVENT_START_AT`, Supabase public keys; create when a second env read appears |

## Config changes

**`tsconfig.json`**

```json
"paths": { "@/*": ["./src/*"] }
```

**`vitest.config.ts`**: alias `@` → `./src`; projects and coverage by pattern.

```ts
projects: [
  { extends: true, test: { name: "node", environment: "node",
      include: ["src/**/*.test.ts"],
      exclude: ["src/hooks/**", "src/app/**/_hooks/**"] } },
  { extends: true, test: { name: "jsdom", environment: "jsdom",
      include: ["src/hooks/**/*.test.ts", "src/app/**/_hooks/**/*.test.ts"] } },
],
coverage: {
  include: [
    "src/api/**/*.ts", "src/dal/**/*.ts", "src/lib/**/*.ts", "src/utils/**/*.ts",
    "src/hooks/**/*.ts", "src/domain/**/*.ts", "src/configs/**/*.ts",
    "src/app/**/_hooks/**/*.ts", "src/app/**/_utils/**/*.ts",
    "src/app/**/_actions/**/*.ts", "src/app/**/actions.ts", "src/app/**/route.ts",
  ],
  exclude: ["**/*.test.ts", "**/*.d.ts"],
  thresholds: { 100: true },
}
```

Still no `.tsx` glob: components stay documented by Storybook, not unit-tested. `_shared/`, `constants/`, `mocks/`, `i18n/request.ts` and `proxy.ts` stay out of the denominator on purpose (declarative tables, test infrastructure, framework glue covered by Playwright).

**`.storybook/main.ts`**: `stories: ["../src/**/*.stories.@(ts|tsx)"]`. **`.storybook/preview.tsx`**: `../src/mocks/handlers`, `../src/styles/globals.css`.

**`eslint.config.mjs`**, boundary rules with core ESLint only (no new dependency). Upgrade to `eslint-plugin-boundaries` the first time a violation slips through.

```js
// Zone A never imports the route tree.
{ files: ["src/!(app)/**/*.{ts,tsx}"],
  rules: { "no-restricted-imports": ["error", { patterns: [
    { group: ["@/app", "@/app/*", "@/app/**"], message: "Shared layers must not import from src/app." } ] }] } },
// Inside the route tree: private folders are reached only by a relative path to
// your own segment or an ancestor. The alias form is always a boundary escape.
{ files: ["src/app/**/*.{ts,tsx}"],
  rules: { "no-restricted-imports": ["error", { patterns: [
    { group: ["@/app/**/_*", "@/app/**/_*/**"], message: "Import private folders relatively from your own segment or an ancestor." },
    { group: ["../*/_*", "../*/_*/**", "./*/_*", "./*/_*/**"], message: "No sideways or downward imports between segments." } ] }] } },
```

## Docs and kit files to update in PR 3

- `README.md` (paths in the scripts table and the assets section).
- `rebuild-spec` core pass so `docs/vi/_source-to-fcode.json`, `.rebuild-state.json` and the F001–F003 technical specs follow the new paths (19 files reference old paths; do not hand-edit generated ones).
- The two sibling skills already describe the target layout; only their "until the migration lands" notes get removed.
- `plans/action-items.md`: log the PR links and anything deferred.
