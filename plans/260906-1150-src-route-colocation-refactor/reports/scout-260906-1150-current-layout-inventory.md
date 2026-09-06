# Scout report: current layout inventory (input to the src/ migration blueprint)

Verified on branch `refactor/src-route-colocation` @ `aca6e8e` (= origin/main after PR #6). Source of the migration itself: `.claude/skills/nextjs-route-colocation-architecture/references/migration-map.md`.

## Inventory

| Folder | Files | ts/tsx | tests | stories | LOC |
|---|---|---|---|---|---|
| `app/` | 15 | 13 | 3 | 0 | 1004 |
| `components/` | 58 | 58 | 0 | 22 | 3404 |
| `lib/` | 21 | 21 | 11 | 0 | 1349 |
| `hooks/` | 8 | 8 | 4 | 0 | 1056 |
| `i18n/` | 1 | 1 | 0 | 0 | 41 |
| `mocks/` | 2 | 2 | 0 | 0 | small |
| `tests/` (root, stays) | 8 | 6 | 0 | 0 | 1630 |

Root files that move: `proxy.ts`. Root files that stay: `eslint.config.mjs`, `next.config.ts`, `playwright.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `tsconfig.json`, `next-env.d.ts`, `messages/`, `public/`.

Routes: `/` (public, `app/page.tsx` + `app/home-client.tsx`), `/login`, `/todo` (protected, self-guards with `getUser()`), `/auth/callback` (route handler). Server Actions: `app/actions/locale.ts`, `app/todo/actions.ts`.

## Import graph facts (drive the phase order)

- `@/` alias usage: `@/lib` 27, `@/components` 11, `@/app` 7, `@/hooks` 6, `@/mocks` 2, `@/messages` 1. Relative imports: 99. All resolve through `tsconfig.json` `"@/*": ["./*"]`; vitest mirrors it in `resolve.alias`.
- Two sideways imports that the new boundary rules will reject and that PR 2 must lift to an ancestor:
  - `components/home/header.tsx:10` imports `LanguageSelector` from `components/login/` → target `(public)/_components/language-selector/`.
  - `app/page.tsx:6` imports `logoutAction` from `app/todo/actions` → target `src/app/_actions/logout.ts`.
- `hooks/` consumers: `app/home-client.tsx`, `app/login/login-client.tsx`, `components/home/{account-menu,countdown-timer,widget-button}.tsx`, `components/login/language-selector.tsx`. Only `use-menu-keyboard-nav` is domain-free (generic → `src/hooks/`).
- `lib/supabase/server` is the most imported module (10 sites). `lib/auth/get-user-role` and `lib/supabase/users-role-client` are server-only by nature (become `src/dal/`). `lib/auth/sign-in-with-google` is called from a client hook (becomes `src/api/auth.ts`). `lib/countdown` is home-only.

## Config touchpoints (every one of these breaks silently if missed)

| File | What references paths | Note |
|---|---|---|
| `tsconfig.json` | `paths` `@/*` → `./*` | becomes `./src/*` |
| `vitest.config.ts` | `resolve.alias`, projects `include` (`lib/**`, `app/**` node; `hooks/**` jsdom), `coverage.include` allowlist (5 globs, no `.tsx`), `thresholds {100:true}` | pattern-based rewrite in the map; keep the no-`.tsx` invariant |
| `.storybook/main.ts` | `stories` globs `../components/**`, `../app/**`; `staticDirs ../public` | one glob `../src/**/*.stories.@(ts|tsx)` |
| `.storybook/preview.tsx` | `../mocks/handlers`, `../app/globals.css` | `../src/mocks/handlers`, `../src/styles/globals.css` |
| `tests/setup/msw-node.ts` | `@/mocks/node` | keeps working via alias |
| `playwright.config.ts` | `testDir ./tests/e2e` | unchanged |
| `next.config.ts` | `createNextIntlPlugin()` no arg | relies on next-intl auto-detect of `src/i18n/request.ts` (researcher verifies) |
| `.github/workflows/ci.yml` | no source path globs; runs `pnpm` scripts; `--grep-invert @auth` | unchanged |
| `.prettierignore` | ignores `.claude/`, `plans/`, `docs/`, `public/` | unchanged |

## Docs layer impact

- 19 files under `docs/vi/` reference old paths (43 unique path strings); `docs/vi/_source-to-fcode.json` indexes `app/…`, `components/…`, `hooks/…`, `lib/…`; `.rebuild-state.json` holds `screen_spec_shas` and `primary_lang: vi`.
- F001–F003 `technical-spec.md` carry `**Source:** path:N-M` citations; after the move those paths no longer exist → the layered-spec validator treats that as critical for `status: implemented`. A rebuild-spec core pass after the move is therefore required, not optional.
- `README.md` lines 59, 77–78, 104, 108 name old paths.

## Test safety net already in place

- Unit: 13 test files, coverage gate 100% on the allowlist (CI job "Quality").
- Storybook: 22 stories, `pnpm build-storybook` runs in CI.
- E2E: `tests/e2e/home.spec.ts` (27 tests) + `login.spec.ts`; CI runs the CI-safe subset (`--grep-invert @auth`); `@auth` needs the local `saa-app` Supabase.
- URLs do not change, so the E2E suite is the regression oracle for the whole migration.

## Risks worth a phase gate

1. Partial `src/`: Next ignores `src/app` while root `app/` exists → move `app/` in one commit, never half.
2. Coverage denominator shift: a moved `.ts` file that falls outside the new include patterns silently leaves the gate; a new `.ts` in `_shared/` would enter it. Verify the printed file list after the first coverage run.
3. `server-only` may need installing (researcher verifies).
4. The `(protected)/layout.tsx` gate must keep the exact redirect behavior `/todo` → `/login` (E2E asserts it) and `proxy.ts` must keep `/` in its matcher for cookie refresh.
