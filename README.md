# SAA 2025 — Login

Next.js 16 app for Sun* Annual Awards 2025. `/` is the public homepage (hero, countdown, awards,
Sun* Kudos) — no sign-in required. Visitors can additionally sign in with Google (Supabase Auth,
PKCE) to reach a protected `/todo` placeholder and see a personalized header (notifications,
account menu, role-aware admin link). UI ships in Vietnamese and English via a cookie-driven locale
(no URL prefix).

## Stack

| Layer          | Technology                                                          | Version          |
| -------------- | ------------------------------------------------------------------- | ---------------- |
| Framework      | Next.js (App Router)                                                | 16.3.4           |
| UI             | React                                                               | 19.2.8           |
| Styling        | Tailwind CSS                                                        | 4                |
| Language       | TypeScript                                                          | ^5               |
| Auth           | `@supabase/ssr` + `@supabase/supabase-js`                           | 0.12.5 / 2.115.0 |
| i18n           | `next-intl` (no-routing, cookie `NEXT_LOCALE`)                      | 4.14.2           |
| Unit tests     | Vitest (2 projects: `node`, `jsdom`)                                | ^3.2.7           |
| E2E tests      | `@playwright/test`                                                  | 1.62.1           |
| Component docs | Storybook + `@storybook/nextjs-vite`                                | 10.6.0           |
| API mocking    | `msw` + `msw-storybook-addon` (shared handlers, vitest + Storybook) | 2.15.0 / 3.0.0   |

## Routes

| Route            | Description                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`              | Public homepage — hero + countdown (`EVENT_START_AT`), event info, 6 award cards, Sun* Kudos, footer; header is role-aware (anon: login link; member: bell + account menu; admin: adds "Admin" link). No auth guard — anonymous and authenticated visitors both get a 200 |
| `/awards`        | Public award-system page — hero, sticky category nav (click-scroll + scroll-spy), 6 award sections read from `public.awards`, Sun* Kudos block. No auth guard, and fails open: an unreachable Supabase renders an empty state rather than a 500                           |
| `/login`         | Google OAuth login screen: header (logo + VN/EN selector), hero, "LOGIN With Google", footer; shows an inline error when the URL carries `?error=`; redirects to `/` if already authenticated                                                                             |
| `/auth/callback` | Route Handler (GET) — exchanges the OAuth `code` for a session, then redirects to `next` (default `/`) or back to `/login?error=...` on failure                                                                                                                           |
| `/todo`          | Protected placeholder — greets the signed-in user's email and offers logout. No todo feature is implemented; it exists to prove the auth guard end-to-end                                                                                                                 |

Access is guarded in two layers: `proxy.ts` (Next 16's renamed `middleware.ts`) does an optimistic
redirect on `/login` (authenticated → `/`) and `/todo/:path*` (anonymous → `/login`); `/` stays in
the matcher only so the session cookie gets refreshed on every visit, it no longer redirects. `/todo`
re-checks with an authoritative `getUser()` call before rendering.

## Prerequisites

- Node.js `>=22 <25` (see `engines` in `package.json`).
- pnpm `10.33.2`, pinned via `packageManager` in `package.json`. If it's not on `PATH`:
  `npm i -g pnpm@10.33.2`. Note: on this project pnpm was installed under a specific nvm Node
  version — switching Node versions with `nvm use` can remove pnpm from `PATH` until you
  reinstall it (or switch back) under the new version.

## Setup

1. `supabase start` from this repo's root. `supabase/config.toml` is committed, so this brings up the
   project's own stack (`project_id` `saa-app`, API on 55321) and applies every migration in
   `supabase/migrations/` — including the seed rows behind `/awards`. See [Database](#database).
2. Read the API URL and publishable key: `supabase status`. Confirm the Google provider is enabled
   and `additional_redirect_urls` includes `http://localhost:3000/auth/callback`.
3. Create `.env.local` at this repo's root (gitignored, never commit it):
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<value from supabase status>
   EVENT_START_AT=2026-12-26T18:30:00+07:00
   ```
   `EVENT_START_AT` is server-only (no `NEXT_PUBLIC_` prefix — never inlined into the client bundle),
   read in `src/app/(public)/(home)/page.tsx` and validated by
   `src/app/(public)/(home)/_utils/countdown.ts`. ISO-8601, drives the homepage countdown. Absent or
   malformed → the countdown falls back to `00/00/00` (still shows "Coming soon"); it never crashes
   the page.
4. `pnpm install`
5. `pnpm dev` → http://localhost:3000

## Database

The Supabase project is committed here — `supabase/config.toml` plus `supabase/migrations/`:

| Migration                          | What it creates                                                             |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `0001_users_table.sql`             | `public.users` (`role` `member`\|`admin`), RLS own-row                      |
| `0002_handle_new_user_trigger.sql` | `handle_new_user()` — mirrors `auth.users` → `public.users` on sign-up      |
| `0003_awards_table.sql`            | `public.awards` + its six seed rows, readable by `anon` and `authenticated` |

`supabase start` applies all of them, so a fresh clone reaches a working database in one command.
To apply new migrations to a stack that is already up, use `supabase migration up` — it runs only
what is pending and leaves existing rows alone.

**Never run `supabase db reset` on a stack anyone is using.** It drops and rebuilds the database,
taking every real sign-in in `auth.users` with it. That is also why seed rows live inside
`0003_awards_table.sql` rather than in a `supabase/seed.sql`: Supabase only reads `seed.sql` during
a reset, so a seed file there would be reachable exclusively through the one command you must not
run.

Prefer idempotent migrations — `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before
`CREATE POLICY`, `ON CONFLICT DO NOTHING` on seed rows — so a file can be replayed against a
database that already has part of it.

## Scripts

| Command                   | What it does                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                | Start the dev server (Turbopack)                                                                                                                                                                                                                        |
| `pnpm build`              | Production build                                                                                                                                                                                                                                        |
| `pnpm start`              | Start the production server                                                                                                                                                                                                                             |
| `pnpm lint`               | ESLint                                                                                                                                                                                                                                                  |
| `pnpm lint:fix`           | ESLint with `--fix`                                                                                                                                                                                                                                     |
| `pnpm typecheck`          | TypeScript check (`tsc --noEmit`) — run this only after a build, see [CI](#ci)                                                                                                                                                                          |
| `pnpm format`             | Prettier — write formatting to every file                                                                                                                                                                                                               |
| `pnpm format:check`       | Prettier — check formatting, no writes (what CI runs)                                                                                                                                                                                                   |
| `pnpm test:unit`          | Vitest unit tests, split into two projects (`vitest.config.ts`): `node` (`src/**/*.test.ts`, excluding hook folders) and `jsdom` (`src/hooks/**/*.test.ts`, `src/app/**/_hooks/**/*.test.ts`) — 19 files                                                |
| `pnpm test:unit:coverage` | Same, with coverage against an explicit allowlist (`src/{api,dal,lib,utils,hooks,domain,configs}/**`, `src/app/**/{_hooks,_utils,_actions}/**`, `src/app/**/actions.ts`, `src/app/**/route.ts`) and a real 100% threshold gate — see `vitest.config.ts` |
| `pnpm storybook`          | Storybook dev server on port 6006                                                                                                                                                                                                                       |
| `pnpm build-storybook`    | Static Storybook build (also run in CI, see [CI](#ci))                                                                                                                                                                                                  |
| `pnpm test:e2e`           | Playwright E2E (`tests/e2e/`) — needs the local Supabase instance (`saa-app`) running and a Chromium build available to Playwright; auto-starts `pnpm dev` on port 3000                                                                                 |

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`, plus manual `workflow_dispatch`:

- **`quality`** — lint (`--max-warnings 0`), format check, unit tests with a 100% coverage gate (`pnpm test:unit:coverage`), build, typecheck (runs _after_ build on purpose — see the workflow's own comment), then a Storybook build check (`pnpm build-storybook` — catches a story that fails to compile, not whether a story exists for every component).
- **`e2e` (CI-safe)** — Playwright, excluding tests tagged `@auth` (`--grep-invert @auth`). Tests tagged `@auth` need the local `saa-app` Supabase instance and only run on a developer machine, never in CI. A green `e2e` run does **not** mean the authenticated flow or the OAuth callback success path were exercised — read the file-header comment in `ci.yml` for the exact coverage limit.
- `@auth` tests that need an admin account (e.g. the homepage's "Trang quản trị" menu item) promote a
  freshly-created test user via `tests/e2e/helpers/promote-to-admin.ts`, which shells out to
  `supabase db query "update public.users set role='admin' where email='<email>'"` with `cwd` set to
  the sibling `saa-app` project directory (`process.env.SAA_APP_DIR ?? "~/Desktop/Claude-and-mormoph/saa-app"`
  by default; override with `SAA_APP_DIR` if your `saa-app` checkout lives elsewhere). No `psql` or
  service-role key is needed locally.

## Known gaps

- `/todo` is a placeholder proving the auth guard; no todo feature exists.

## Assets

- `public/login/keyvisual.png` is the hero background (Figma node `662:14389`, 2× export,
  2882×2044), served via `next/image` (`fill`, `object-cover`) in
  `src/app/(public)/login/_components/login-background.tsx`. Copied from the sibling `saa-app`
  project's Figma export; not re-exported from Figma in this repo.
- `public/home/*` (19 files: keyvisual/logo/award-card/Kudos PNGs + bell/pencil/user/arrow SVG
  icons) are the homepage's Figma exports (MoMorph screen `i87tDx10uM`), consumed via `next/image`
  (bitmaps) or inlined as SVG (icons) across `src/app/(public)/(home)/_components/**`.

## Docs

- `docs/vi/system/architecture.md`, `docs/vi/system/permissions.md` — architecture and access control
- `docs/vi/generated/feature-list.md`, `docs/vi/generated/screen-list.md` — feature and screen inventory
- `docs/vi/features/F001_GoogleOAuthLogin/`, `docs/vi/features/F002_LanguageSwitch/`,
  `docs/vi/features/F003_Homepage/` — per-feature specs
