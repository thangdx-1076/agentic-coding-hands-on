# UI/i18n/test conventions scout — write-kudo modal

READ-ONLY scout. No `.codegraph/` in repo (confirmed absent) — used Grep/Read/Bash directly.
No `tkm:research`/`tkm:search-docs` applicable — this is internal codebase convention scouting,
not external tech/library research, so those skills were not activated.

## 1. Dialog/modal precedent

**No true modal exists.** No `createPortal`, no `<dialog>`, no focus-trap library, no scroll-lock
anywhere in `src/` (confirmed by repo-wide grep — zero hits). No dialog/headlessui/radix/floating-ui
dependency in `package.json`.

Two analogues, both **inline** (not portal), both **no scroll lock**, both **no real focus trap**
(focus only returns to trigger on close, it doesn't cycle inside):

- **`src/app/_components/notification-bell.tsx:82-90`** — closest to a "dialog": `role="dialog"`,
  `aria-label`, absolutely-positioned panel (`absolute top-full right-0 z-30`). Open state = local
  `useState(false)` (line 31). Escape (`:44-49`) closes + refocuses trigger button. Click-outside via
  `mousedown` listener on `document` checking `rootRef.contains` (`:38-42`). Trigger has
  `aria-haspopup="dialog"` `aria-expanded={open}` (`:70-71`). Header comment (`:13-25`) explicitly
  says a lone boolean toggle is "the documented exception in `separate-hook-logic-from-components`
  for a lone boolean that only controls visibility" — i.e. this pattern is sanctioned for simple
  toggles, not extracted to a hook.
- **`src/app/(public)/kudos/_components/kudos-filter-menu.tsx:77-125`** — a dropdown/listbox
  (`role="listbox"`/`role="option"`), NOT a dialog. All open/close/keyboard logic is delegated to
  the shared hook **`src/hooks/use-menu-keyboard-nav.ts`** (178 lines): roving tabindex, ArrowUp/Down/
  Home/End, Escape closes + returns focus to trigger (`:107-110,156-159`), Tab closes without
  stealing focus back (`:160-162`), click-outside via the same `mousedown` pattern
  (`use-menu-keyboard-nav.ts:76-84`). This is the **closest reusable precedent for keyboard/a11y
  plumbing** if the write-kudo modal needs a listbox-like sub-part, but it is NOT shaped for a
  full-screen modal (no scroll lock, no focus containment beyond return-on-close, ARIA role is
  `listbox` not `dialog`).
- `kudos-sunner-search.tsx` — not an overlay at all, plain input pill, irrelevant to overlay
  mechanics (listed only because the task asked to check it).

**Conclusion: build the modal from scratch** using `notification-bell.tsx`'s escape/click-outside
effect shape (own local `useState`, not the menu hook — the menu hook is APG "menu/listbox"
semantics, wrong ARIA role for a form dialog) and add what's missing (scroll lock, `aria-modal`,
`role="dialog"`, real focus trap) since no precedent supplies them.

**Direct evidence this modal doesn't exist yet, from the trigger itself:**
`src/app/(public)/kudos/_components/kudos-compose-pill.tsx:8-17` — the compose pill is a readonly
`<input>` with NO click handler, and the comment says exactly: *"the dialog it should open (Figma
frame `ihQ26W78P2` "Viết Kudo") does not exist in this repo yet (clarifications.md § Phạm vi F007)"*.
`ihQ26W78P2` is the exact screenId in this task's MoMorph ref — this pill is the intended trigger.

## 2. Form precedent

**No form-with-validation precedent.** No `useActionState`, no `useFormStatus`, no `aria-invalid`,
no `aria-describedby` anywhere in `src/` (confirmed by grep, zero hits for all four).

- `zod` and `zod-validation-error` appear ONLY in `pnpm-lock.yaml` (lines ~4271-4277, ~6462-6463) as
  **transitive devDependencies of `eslint`'s own dependency graph** — not a direct dependency, not
  imported anywhere in `src/`. Do not treat zod as "already in the stack."
- The only `<form>` in the repo: `src/app/(protected)/todo/_components/todo-screen.tsx:24` —
  `<form action={logoutAction}>`, a zero-field logout button using a Server Action passed as a prop.
  No validation surface.
- Login "action" pattern (closest thing to client-side async action handling):
  `src/app/(public)/login/_hooks/use-login-actions.ts` — `useTransition` + plain handler, explicitly
  NOT `useActionState` because the action needs browser PKCE state (`:30-37`). `isPending` and
  `hasClientError` are plain `useState`.
- Error rendering pattern: `src/app/(public)/login/_components/login-error-alert.tsx:10-21` — a
  presentational component that renders `null` when there's no error, otherwise a `<p role="alert">`
  styled red. No `aria-invalid`/`aria-describedby` field-level wiring exists to copy — this is a
  page-level/section-level alert, not per-field validation.

**Conclusion:** there is no in-repo form-validation idiom to match. The write-kudo form must invent
its own pattern; the one existing precedent to reuse is the `role="alert"` conditional-render
component shape from `login-error-alert.tsx`, and `useTransition`-based async submission (not
`useActionState`) if PKCE-style client-only requirements don't apply — plain `useActionState` +
Server Action is equally consistent with the rest of the app's Server Component/DAL architecture
and is likely simpler here since no PKCE-style constraint exists for a kudo submission.

## 3. Shared primitives inventory

`src/components/` and `src/domain/` — **do not exist** (confirmed: `find` errored "No such file or
directory" for both). Do not invent files assuming they exist.

- `src/hooks/use-menu-keyboard-nav.ts` — APG menu/listbox keyboard nav + roving tabindex (see §1).
- `src/utils/a11y/roving-index.ts` — `nextIndex`/`prevIndex`/`lastIndex` pure helpers backing the hook above.
- `src/utils/url/next-path.ts` — safe-redirect path validation (login `next=` param).
- `src/constants/routes.ts` — `ROUTES` route-string constants.
- `src/lib/supabase/{client,server,proxy-client}.ts` — Supabase client factories (browser/server/proxy variants).
- `src/lib/i18n/locale.ts` — `SUPPORTED_LOCALES`, `AppLocale`, `normalizeLocale`, `LOCALE_COOKIE` (see §4).
- `src/i18n/request.ts` — next-intl `getRequestConfig`, cookie-based locale (no URL prefix routing).
- `src/api/auth.ts` — `signInWithGoogle` client-side OAuth kickoff.
- `src/dal/*.ts` (+ `*-client.ts` DTO-mapper twins) — one DAL module per domain: `kudos`, `kudo-hearts`,
  `kudos-stats`, `awards`, `profile-cards`, `users`, `auth`, plus `kudos-cards-query.ts`. This is the
  layer a write-kudo Server Action would call into (likely a new `src/dal/kudos.ts` mutation or a
  sibling file — follow the existing `get*`/`to*Client` naming pair pattern).
- No shared `Button`/`Input`/`Avatar`/`Chip`/`Portal`/`cn()` helper exists anywhere. Every kudos
  component (e.g. `kudos-card-person.tsx`, `kudos-heart-button.tsx`) hand-rolls its own markup with
  inline Tailwind strings and no `clsx`/`cn` utility in the codebase (not in `package.json`
  dependencies, not custom-built). **Do not import `clsx`/`cn` — it isn't a repo convention.**

## 4. i18n

- Files: `messages/vi.json`, `messages/en.json`. Setup: `src/i18n/request.ts` (next-intl
  `getRequestConfig`, reads `NEXT_LOCALE` cookie, dynamic `import(\`../../messages/${locale}.json\`)`
  with fallback to `vi` on any load failure).
- Top-level namespaces = one per screen/section: `login, todo, home, awards, standards, profile, kudos`
  (`messages/vi.json`, read via `python -c json.load`).
- **Existing `kudos` namespace top-level keys**: `banner, compose, heroSearch, highlight, spotlight,
  feed, sidebar`. `kudos.compose.ariaLabel` = `"Viết Kudo"` (`messages/vi.json`, `compose` block) —
  this is literally the screen name of the MoMorph ref for this task.
- **Consumption pattern is NOT `useTranslations` inside leaf components.** Only `page.tsx` files (and
  their sibling `_shared/build-*-copy.ts`) call `getTranslations`/`useTranslations`. Confirmed by
  repo-wide grep: every hit is a `page.tsx` or a `build-*-copy.ts` file, zero hits inside
  `_components/`. Concretely for kudos:
  - `src/app/(public)/kudos/page.tsx:2,68-70` — Server Component calls
    `getTranslations("home")` and `getTranslations("kudos")`, then
    `buildKudosCopy(tHome, tKudos, locale)`.
  - `src/app/(public)/kudos/_shared/build-kudos-copy.ts` — maps raw translator calls into a typed
    `KudosPageCopy` object (composes `SiteChromeCopy` + one leaf-shape per section, e.g. `compose:
    { placeholder, ariaLabel }`). `.raw()` is used instead of a plain call when the message contains
    an interpolation placeholder the component fills by hand later (`:139-144`, `heartLabel`).
  - The typed copy object is then threaded down through `KudosClient` → `KudosScreen` → leaf
    components entirely as **props** (`kudos-client.tsx:29-46`; `kudos-card.tsx` takes a `copy?:
    KudosCopy` prop with a `defaultKudosCopy` fallback used only by Storybook/tests, per
    `_shared/kudos-copy.ts:1-13,20-28`).
- **Where the new namespace goes**: add a new sub-object under the existing `kudos` top-level key in
  both `messages/{vi,en}.json` (e.g. `kudos.writeModal` or similarly-named sibling of `compose`/
  `banner`/`feed`), NOT a new top-level namespace — this screen is still `/kudos`, matching the
  "one leaf per section" convention documented in `build-kudos-copy.ts`'s own header comment
  (`:1-24`). Extend `KudosPageCopy` in `build-kudos-copy.ts` with the new leaf type, extend
  `buildKudosCopy()`'s return object, and thread the new copy shape down as a prop the same way
  `compose`/`heroSearch` already are (`build-kudos-copy.ts:98-104`). Do NOT call `useTranslations` in
  the new modal component itself.
- `messages-parity.test.ts` exists at `src/lib/i18n/messages-parity.test.ts` — presumably asserts
  `vi.json`/`en.json` have identical key sets; adding a new namespace key to only one file will likely
  fail it (not opened in full, but its filename and location strongly imply this; treat as a gate).

## 5. Component conventions (from 4 kudos components read in full)

- **Header comment cites MoMorph node id + Figma URL**, e.g.
  `kudos-compose-pill.tsx:8-9`: `"Compose-kudos pill (mm:2940:13449 \`mms_A.1_Button ghi nhận\`,
  https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ)."` and inline per-JSX-node
  comments like `// mm:2940:13449` (`:24`) and `{/* mm:I2940:13449;186:2758 */}` (`:29`) above the
  element each node maps to.
- **Props type naming**: `<PascalComponentName>Props` (e.g. `KudosComposePillProps`,
  `KudosCardProps`, `KudosFilterMenuProps`) — always exported.
- **`data-testid` convention**: kebab-case, prefixed with the domain, e.g. `kudos-compose-pill`
  (`kudos-compose-pill.tsx:26`), `kudos-card` + `data-variant`/`data-sender-id` companion attributes
  (`kudos-card.tsx:59-61`), `kudos-sunner-search`/`kudos-sunner-search-submit`
  (`kudos-sunner-search.tsx:42,55`). Test-id strings are sometimes passed in as props
  (`KudosFilterMenuProps.testId`/`optionTestId`, `kudos-filter-menu.tsx:16-17`) when the same
  component is reused for two Figma instances (DRY) rather than being hardcoded per instance.
- **Tailwind class ordering**: no enforced linter/formatter — `package.json` has no
  `prettier-plugin-tailwindcss`. Observed hand convention: layout (`flex`/`grid`) → sizing
  (`w-*`/`h-*`) → spacing (`gap-*`/`p-*`) → border → background/color → typography (`font-*`/
  `text-*`/`tracking-*`) → interaction states (`hover:`/`focus-visible:`) → `motion-reduce:`. Not a
  hard gate — style, not lint rule.
- **Server vs Client boundary**: `"use client"` is the FIRST line of the file, only on components
  that own `useState`/`useEffect`/event handlers/hooks (confirmed on
  `kudos-card-actions.tsx, kudos-client.tsx, kudos-carousel-nav.tsx, kudos-feed.tsx,
  kudos-filter-menu.tsx, kudos-heart-button.tsx, kudos-hashtag-list.tsx,
  kudos-highlight-carousel.tsx, kudos-spotlight.tsx` — 9 files). Pure presentational components fed
  entirely by props (`kudos-card.tsx`, `kudos-card-person.tsx`, `kudos-sunner-search.tsx`,
  `kudos-screen.tsx`) carry **no** `"use client"` directive and no hooks — they render identically
  whether their parent is a Server or Client Component. `kudos-client.tsx` is the single "use
  client" boundary for the whole screen (mirrors `AwardsClient`/`ProfileClient` per its own header
  comment, `:48-50`); it owns all interactive hooks and passes plain data + callbacks down.
- **File-size ceiling**: dev-rules says <200 lines. Actual max observed in `kudos/_components/`:
  `kudos-screen.tsx` at **197 lines** (`wc -l`), i.e. the ceiling is treated as a real, tightly-held
  limit, not aspirational — plan for the modal to split into sub-components before approaching 200.

## 6. Unit test + Storybook conventions

- Runner: **Vitest 3.2.7**, config `vitest.config.ts` (repo root). Two `projects` (stable API since
  3.2, not the deprecated `workspace`): `node` (`src/**/*.test.ts`, excludes `src/hooks/**` and
  `src/app/**/_hooks/**`) and `jsdom` (those excluded hook-test globs) — see
  `vitest.config.ts:1-60`. `resolve.alias` maps `@/` → `./src/` and stubs `server-only` via
  `tests/setup/server-only-stub.ts` (both live at ROOT, inherited by both projects).
- Command to run a single unit test file: **`pnpm exec vitest run <path>`** (e.g. `pnpm exec vitest
  run "src/app/(public)/kudos/_hooks/use-kudos-hearts.test.ts"`) — `pnpm test:unit` maps straight to
  `vitest run` (`package.json`), so `pnpm test:unit -- <path>` should pass through correctly for
  vitest (unlike the Playwright case in §7 — vitest's own CLI parses positional args as filters
  normally); `pnpm exec vitest run <path>` is the safe, unambiguous form either way.
- Mocking style: `vi.mock()` factories for module boundaries needing to leave the module graph
  (e.g. `next/navigation` in `use-kudos-filters.test.ts:15`), plain `vi.fn()` for injected
  callbacks/Server Action props (`use-kudos-hearts.test.ts:32,46`), `@testing-library/react`'s
  `renderHook`/`act`/`waitFor` for hook tests. MSW (`msw-storybook-addon`, `tests/setup/msw-node.ts`)
  intercepts HTTP at the process level for anything touching Supabase's REST boundary — set up once
  at ROOT `setupFiles`, not per-project.
- Storybook: **CSF3**, `@storybook/nextjs-vite` (NOT the webpack builder), meta typed via
  `satisfies Meta<typeof Component>` (not `: Meta<typeof Component>` — `kudos-heart-button.stories.tsx:7-10`),
  no decorators observed in the sampled file, args-only story objects (`kudos-heart-button.stories.tsx:16-44`).

## 7. E2E conventions

- Config: `playwright.config.ts` — `testDir: "./tests/e2e"`, single `chromium` project, `baseURL`
  from `E2E_PORT` (default 3000), `webServer` auto-runs `pnpm dev --port ${PORT}` with
  `reuseExistingServer: !process.env.CI` and a **fixed** `EVENT_START_AT: "2099-12-31T18:30:00+07:00"`
  env var baked in (`:57-66`) — changing that value would shift countdown-dependent assertions.
- Specs: `tests/e2e/{awards,home,kudos,login,profile,standards}.spec.ts` +
  `tests/e2e/helpers/{promote-to-admin,sign-in,supabase-reachable}.ts` +
  `tests/e2e/visual-{capture,validation}.mjs` + `tests/setup/{msw-node,server-only-stub}.ts`.
- Tag convention confirmed: `@auth` (needs live session, e.g. `home.spec.ts:501`), `@local-db` (needs
  seeded Supabase data, e.g. `awards.spec.ts:161`), untagged = "CI-safe". CI runs
  `playwright test --grep-invert "@auth|@local-db"` (`.github/workflows/ci.yml:212`).
- Auth: no dedicated Playwright `storageState`/setup-project — `tests/e2e/helpers/sign-in.ts` hits
  the GoTrue REST API directly (`/auth/v1/signup` then `/auth/v1/token?grant_type=password` on 422),
  builds cookies via `@supabase/ssr`'s `createServerClient` (`generateSupabaseCookies`,
  `sign-in.ts:87-118`), then `context.addCookies(...)` (`injectSupabaseSession`, `:124-140`) — no
  browser-driven login flow, no stored auth state file.
- Contract-code convention: `kudos.spec.ts:27-52`, a markdown table in the file's header comment,
  one row per assertion: `| C01 | *(CI-safe)* | ... | TC[02] | FR-101, FR-102, BR-015 |`. Format is
  `C<NN>` + CI-safety/tag column + plain-language assertion + `TC[n]` test-case ref + FR/BR spec
  ref. New assertions for the write-kudo modal should extend this same table with the next free
  `C<NN>` and cite the modal's own FR/BR/TC identifiers.
- **Single-spec-file command — confirmed broken as flagged**: ran
  `pnpm test:e2e -- tests/e2e/kudos.spec.ts --list` live in this repo. Output:
  `> playwright test -- tests/e2e/kudos.spec.ts --list` then **`Running 135 tests using 4 workers`**
  — it executed the ENTIRE suite for real (not a list, not filtered), because pnpm inserts a second
  `--` before the args and Playwright's arg parser then does not treat the file path/`--list` as
  filters. Killed the run after confirming (was executing real browser tests against local state).
  **Correct invocation: `pnpm exec playwright test tests/e2e/kudos.spec.ts`** (direct binary call,
  no `pnpm run` wrapper, no `--`) — matches `playwright.config.ts`'s `testDir` and is the standard
  Playwright CLI positional-arg file filter.

## 8. Quality gates

From `package.json` scripts + `.github/workflows/ci.yml` (job `quality` runs on every push/PR to the
branches listed; job `e2e` is independent, does not `need: quality`):

| Command | Runs in CI? | Notes |
|---|---|---|
| `pnpm lint` (→ `eslint`) | Yes, as `pnpm lint --max-warnings 0` | `quality` job |
| `pnpm format:check` (→ `prettier --check .`) | Yes | `quality` job |
| `pnpm typecheck` (→ `tsc --noEmit`) | Yes, **after** `pnpm build` on purpose | ci.yml:119-128 explains why: Next generates ambient types only after a build |
| `pnpm test:unit:coverage` (→ `vitest run --coverage`) | Yes | **100% coverage gate**, allowlist-scoped: `src/{api,dal,lib,utils,hooks,domain,configs}/**`, `_hooks/_utils/_actions` under `src/app/**`, `actions.ts`/`route.ts` — `.tsx` files are OUTSIDE the allowlist, so components/Server Components are not coverage-gated |
| `pnpm build` (→ `next build`) | Yes | `quality` job |
| `pnpm build-storybook` | Yes | catches broken stories, not missing ones |
| `pnpm test:e2e` (→ `playwright test`) | Yes, but only `--grep-invert "@auth|@local-db"` (CI-safe subset) in a separate `e2e` job | `@auth`/`@local-db` tests run only on a dev machine with local Supabase up |

`main` has **no branch protection** (ci.yml:39-42, verified 2026-09-05 via API 404) — none of these
gates actually block a merge today; they only report.

## Open questions (not resolved by this scout — flag for clarification)

1. Should the write-kudo Server Action live in `src/app/(public)/kudos/_actions/` (sibling to
   `toggle-kudo-heart.ts`/`load-more-kudos.ts`) or does it need a new `src/dal/kudos.ts` mutation
   function first? No existing DAL write path was found (only `getKudosBoard`/`getKudosStats`-style
   reads) — POST-ing a new kudo is a genuinely new DAL surface.
2. No image-upload precedent exists anywhere in the repo (kudos cards render `imageUrls` but nothing
   writes them) — if the write-kudo modal includes image attachment, there's zero convention to match.
3. No focus-trap or scroll-lock utility exists at all; the modal will need to introduce both from
   scratch. Worth deciding whether that becomes a new `src/hooks/use-*` shared hook (given
   `separate-hook-logic-from-components` conventions) or stays inline like `notification-bell.tsx`'s
   single-boolean exception — likely the former, since a real modal is materially more complex than
   a lone boolean toggle.
