---
name: write-unit-tests-and-storybook-stories
description: "WHAT SHIPS NEXT TO a file: mandatory companion files. Every logic file (hook, util, Server Action, Route Handler, DAL, API, lib) gets a colocated unit test at 100% coverage; every common component gets a Storybook story; every main route has a viewable story; MSW is the single mock-API layer for tests and stories. Activate every time you create or edit a .ts file in a logic location (src/app/**/_hooks, _utils, _actions, actions.ts, route.ts, src/{api,dal,lib,utils,hooks,domain,configs}), create or edit a component, run vitest/coverage/storybook, or when the user says 'write tests', 'unit test', 'coverage', 'storybook', 'story', 'mock API', 'msw', 'viết test'. Answers only the companion-file question: layer → separate-hook-logic-from-components; location → nextjs-route-colocation-architecture."
---

# What ships next to the file you just touched

This skill answers one question: **the code's layer and location are already decided, so which files must sit beside it?**

## Three skills, one question each

| Question | Skill |
|---|---|
| Which layer is this code: pure logic, hook, or component? | [separate-hook-logic-from-components](../separate-hook-logic-from-components/SKILL.md) |
| Where does the file live? | [nextjs-route-colocation-architecture](../nextjs-route-colocation-architecture/SKILL.md) |
| **What ships next to it: test, story, MSW handler?** | this skill |

Answer them in that order. Here the layer and folder are taken as settled. This rule is mandatory, not a suggestion.

Paths below are the real `src/` layout, landed 2026-09-06 on `refactor/src-route-colocation`.

## Lookup: touch this, ship that

| Created or edited | Must ship beside it | Runner |
|---|---|---|
| Pure logic: `src/app/**/_utils/**/*.ts`, `src/utils/**`, `src/domain/**`, `src/lib/**`, `src/configs/**` | `<file>.test.ts` | vitest, project `node` |
| Hook: `src/app/**/_hooks/use-*.ts`, `src/hooks/use-*.ts` | `use-*.test.ts` | vitest, project `jsdom` |
| Server Action: `src/app/**/actions.ts`, `src/app/**/_actions/**/*.ts` | `<file>.test.ts` | vitest, project `node` |
| Route Handler: `src/app/**/route.ts` | `route.test.ts` | vitest, project `node` |
| Data access: `src/dal/**`, `src/api/**` | `<file>.test.ts` | vitest, project `node` |
| Common component (boundary below) | `<file>.stories.tsx` | Storybook |
| Composition component, any `.tsx` in `src/app/**` that is not common | nothing mandatory | Playwright |

"Beside it" means the same folder and the same base name: `login/_hooks/use-login-actions.ts` → `login/_hooks/use-login-actions.test.ts`. No separate `__tests__/` folder.

## The "common component" boundary

Answer three questions and **stop at the first "no"**:

1. Does it receive all its data through props?
2. Does it import no feature copy or feature data, and nothing from another segment?
3. Does it compose fewer than two named components? (icons do not count)

Three "yes" → **common** → story required. One "no" → **composition** → not required.

Today's classification:

| Common (story required) | Composition (not required) |
|---|---|
| `GoogleLoginButton`, `LanguageSelector`, `LoginErrorAlert`, `LoginFooter`, the login icons | `LoginHeader` (composes `Image` + `LanguageSelector`), `LoginHero`, `LoginBackground` (hardcodes login art), `LoginScreen` (imports `login-copy.ts`) |
| `AccountMenu`, `AwardCard`, `CountdownTiles`, `CtaButtons`, `LogoLink`, `NavLink`, `NotificationBell`, `WidgetButton`, the home icons | `Header`, `HeroSection`, `AwardsSection`, `KudosSection`, `EventInfo`, `HomeFooter`, `HomeScreen` |

There is no `components/common/` folder. The boundary is the **file's content**, not its location: the story sits wherever the component sits, including inside a segment's `_components/`.

## Every main route has a viewable story

Build the story from the route's **presentational component**, never from `page.tsx` (an `async` Server Component; Storybook cannot render it).

| Route | Story built from |
|---|---|
| `/` | `HomeScreen` |
| `/login` | `LoginScreen` |
| `/todo` | `TodoScreen` |

A new route whose JSX is written straight into `page.tsx` first gets a presentational component extracted, then a story.

## 100% coverage: what it means and what it does not

`vitest.config.ts` measures an **explicit, pattern-based allowlist** (target form; the migration map in the location skill holds the exact block):

```text
src/{api,dal,lib,utils,hooks,domain,configs}/**/*.ts
src/app/**/{_hooks,_utils,_actions}/**/*.ts · src/app/**/actions.ts · src/app/**/route.ts
```

`thresholds: { 100: true }`: below 100% the process exits non-zero and CI is red. It is a gate, not a metric.

**No `.tsx` glob is in the allowlist.** That extension mismatch is the mechanism, not a maintained `exclude` list. Adding a `.tsx` glob breaks the design. `_shared/`, `constants/`, `mocks/`, `i18n/request.ts` and `proxy.ts` are also out on purpose: declarative tables, test infrastructure and framework glue that Playwright exercises.

The number says: every pure helper, every hook's observable state machine, and each Server Action, Route Handler and DAL function's own logic has a test running through it. It does **not** say Server Components render correctly, real Supabase or Google OAuth works, or the UI looks right. Those belong to Playwright and Storybook. Do not quote the number in their place.

A new `.ts` file in any allowlisted location without a test turns CI red at once: it enters the denominator at 0%. That is correct behaviour, not a configuration bug.

## MSW: one module, two runtimes

```text
src/mocks/handlers.ts         ← single source
   ├── src/mocks/node.ts      → setupServer; vitest loads it through tests/setup/msw-node.ts
   └── .storybook/preview.tsx → service worker; Storybook loads it
```

Edit a handler in `handlers.ts` and tests and stories both see it. **Never** define a second handler for the same endpoint. Mockable endpoints today (all server-side): `/auth/v1/token`, `/auth/v1/user`, `/auth/v1/logout`.

**Warning: MSW cannot intercept `signInWithOAuth`.** It is a top-level browser redirect, not `fetch`/XHR. A story simulates the login click through the `onLoginClick` prop, not through an `/auth/v1/authorize` handler. Writing that handler is dead code.

## Story shape

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GoogleLoginButton } from "./google-login-button";

const meta = {
  component: GoogleLoginButton,
} satisfies Meta<typeof GoogleLoginButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { label: "LOGIN With Google" } };
export const Pending: Story = { args: { label: "LOGIN With Google", pending: true } };
```

`const meta = {...}` then `export default meta`, **never** `export default {...}` inline: `import/no-anonymous-default-export` is on and an anonymous default export fails `pnpm lint` on the first story.

Cover the component's main variants: default plus every state that changes its shape (pending, error, open). A `Default`-only story for a three-state component is not a usage guide.

## Testing hooks: two techniques

- **Handlers returned by the hook** (`handleMenuKeyDown`, `handleButtonKeyDown`): call them directly with a minimal event `{ key, preventDefault: vi.fn() }`. No `fireEvent` needed.
- **Effects bound to the real DOM** (`document.addEventListener`, `.focus()`): create nodes with `document.createElement`, attach through the ref callback inside `act()`, then `fireEvent.mouseDown(...)` and assert `document.activeElement`.

`useTransition`: `isPending` turns `true` **synchronously** at `startTransition`, assertable without `await`. To wait for it to clear use `waitFor`, **not** `waitForNextUpdate` (removed with `@testing-library/react-hooks`).

## Does not apply when

- Composition components: the route story covers them.
- Any `.tsx` in `src/app/**`: `page.tsx` is an `async` Server Component that vitest does not support (a Next.js limitation). A route's client boundary file (`*-client.tsx`) is exempt for the same reason: it only wires props to actions, and the route story covers the visuals. Playwright checks both.
- `*-copy.ts` files holding static strings, `*.d.ts`, `_shared/` types and constants.
- Root config files.

Do not write tests for show. But never add a file to an allowlisted location and leave it bare: the allowlist will catch it, and it should.
