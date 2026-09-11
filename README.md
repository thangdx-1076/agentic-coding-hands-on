# SAA 2025 — Sun\* Annual Awards

Next.js 16 app for Sun\* Annual Awards 2025. Most of the product is public and needs no sign-in:
the homepage (hero, countdown, awards, Sun\* Kudos), the award-system page, the rules page, the
live Kudos board, and a pre-launch countdown screen. Signing in with Google (Supabase Auth, PKCE)
additionally unlocks the protected `/profile` and `/todo` routes, a personalized header
(notifications bell, account menu, role-aware admin link), and the write paths on Kudos — posting a
kudo, hearting one, and opening a Secret Box. UI ships in Vietnamese and English via a cookie-driven
locale (no URL prefix).

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

Eight pages plus one route handler. Route groups carry the auth split: `src/app/(public)/**` needs
no session, `src/app/(protected)/**` sits behind `src/app/(protected)/layout.tsx`.

| Route            | Group         | Description                                                                                                                                                                                                                                                             |
| ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`              | `(public)`    | Homepage — hero + countdown (`EVENT_START_AT`), event info, 6 award cards, Sun\* Kudos block, widget FAB, footer. Header is role-aware (anon: login link; member: bell + account menu; admin: adds "Admin"). No auth guard — anonymous and authenticated both get a 200 |
| `/awards`        | `(public)`    | Award-system page — hero, sticky category nav (click-scroll + scroll-spy), 6 award sections read from `public.awards`, Sun\* Kudos block. Fails open: an unreachable Supabase renders an empty state rather than a 500                                                  |
| `/standards`     | `(public)`    | Rules panel — Hero badges, Secret Box icons, Kudos Quốc dân, footer actions. 100% static i18n copy, zero Supabase/DAL reads, and deliberately renders no shared header/footer chrome                                                                                    |
| `/kudos`         | `(public)`    | Live Kudos board — highlight carousel, stats, hashtag/department filters (`?hashtag=`, `?department=`), paginated feed. Readable anonymously; the write paths (compose dialog, heart toggle, Secret Box) require a session                                              |
| `/prelaunch`     | `(public)`    | Pre-launch countdown screen. Also the redirect target of the site-wide navigation lock — see [Pre-launch lock](#pre-launch-lock)                                                                                                                                        |
| `/login`         | `(public)`    | Google OAuth login screen: header (logo + VN/EN selector), hero, "LOGIN With Google", footer; shows an inline error when the URL carries `?error=`; redirects to `/` if already authenticated                                                                           |
| `/profile`       | `(protected)` | Sunner profile card, read from the `public.profile_cards` view. `?id=` shows another Sunner's card; an absent or unknown id falls through to `notFound()`                                                                                                               |
| `/todo`          | `(protected)` | Placeholder that greets the signed-in user's email and offers logout. No todo feature is implemented; it exists to prove the auth guard end-to-end                                                                                                                      |
| `/auth/callback` | route handler | GET — exchanges the OAuth `code` for a session, then redirects to `next` (default `/`) or back to `/login?error=...` on failure                                                                                                                                         |

### Access control

Two layers, and the second one is the enforcement point:

- `src/proxy.ts` (Next 16's renamed `middleware.ts`) is an **optimistic** pre-check. It redirects
  `/login` → `/` when a session exists, and `/todo` and `/profile` → `/login` when none does. Its
  `config.matcher` is a negative lookahead matching everything except `api`, `auth`, `_next/static`,
  `_next/image`, `favicon.ico`, and any path with a file extension.
- `src/app/(protected)/layout.tsx` is **authoritative**. It runs a real GoTrue read through
  `src/dal/auth.ts` (`getCurrentUser()`) — never a cookie read — and redirects before any child
  page renders. Per Next.js's own guidance, the proxy layer is not the only line of defense.

The matcher is wide enough to see every route because the pre-launch lock needs to. That does not
put the whole site on Supabase's critical path: `src/domain/prelaunch-lock.ts`'s `planProxy()`
returns `{ kind: "pass" }` for any newly-in-scope route with **zero I/O**, before `getUserOrNull()`
is reached. Only the original six routes (`/`, `/login`, `/todo/:path*`, `/awards`, `/standards`,
`/profile`) run the session lookup.

### Pre-launch lock

`PRELAUNCH_LOCK_ENABLED=true` (exactly that string, case-insensitive — any other value, including
`"1"`, is OFF, so a misconfigured environment can never accidentally lock the site) redirects the
whole site to `/prelaunch` until `EVENT_START_AT` is reached; after that, `/prelaunch` itself
redirects to `/`. `/auth/*`, `/api/*`, `/_next/*` and static assets are exempt. A missing or
malformed `EVENT_START_AT` parses as "never reached" — never as "already reached", which would
loop the redirect.

## Prerequisites

- Node.js `>=22 <25` (see `engines` in `package.json`).
- pnpm `10.33.2`, pinned via `packageManager` in `package.json`. If it's not on `PATH`:
  `npm i -g pnpm@10.33.2`. Note: on this project pnpm was installed under a specific nvm Node
  version — switching Node versions with `nvm use` can remove pnpm from `PATH` until you
  reinstall it (or switch back) under the new version.

## Setup

1. `supabase start` from this repo's root. `supabase/config.toml` is committed, so this brings up the
   project's own stack (`project_id` `saa-app`, API on 55321) and applies every migration in
   `supabase/migrations/` — including the seed rows behind `/awards` and `/kudos`. See
   [Database](#database).
2. Read the API URL and publishable key: `supabase status`. Confirm the Google provider is enabled
   and `additional_redirect_urls` includes `http://localhost:3000/auth/callback`.
3. Create `.env.local` at this repo's root (gitignored, never commit it):
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<value from supabase status>
   EVENT_START_AT=2026-12-26T18:30:00+07:00
   ```
   Do **not** put `SERVICE_ROLE_KEY` here expecting the E2E suite to pick it up — Playwright never
   loads `.env.local` (`playwright.config.ts:7` keeps `dotenv` commented out), and the helper
   derives the key from `supabase status` anyway. See [Environment variables](#environment-variables).
4. `pnpm install`
5. `pnpm dev` → http://localhost:3000

### Environment variables

| Variable                               | Scope       | Required | Purpose                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | client      | yes      | Supabase API URL. Inlined into the client bundle at build time                                                                                                                                                                                                                                                                                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client      | yes      | Supabase publishable (anon) key. Inlined into the client bundle                                                                                                                                                                                                                                                                                                             |
| `EVENT_START_AT`                       | server-only | no       | ISO-8601 countdown target, read in `src/app/(public)/(home)/page.tsx` and validated by `src/utils/countdown.ts`. Absent or malformed → the countdown falls back to `00/00/00` (still shows "Coming soon"); it never crashes the page                                                                                                                                        |
| `PRELAUNCH_LOCK_ENABLED`               | server-only | no       | `"true"` arms the site-wide pre-launch lock. Anything else is OFF                                                                                                                                                                                                                                                                                                           |
| `SERVICE_ROLE_KEY`                     | shell only  | optional | Service-role key the E2E helpers (`tests/e2e/helpers/service-role.ts`) use to seed and clean up rows. **Optional** — when unset the helper derives it from `supabase status -o env`. Never referenced by application code. Note it must be **exported in your shell**: `playwright.config.ts:7` keeps `dotenv` commented out, so `.env.local` never reaches the test runner |
| `SAA_APP_DIR`                          | server-only | e2e only | Overrides where `tests/e2e/helpers/promote-to-admin.ts` shells out to `supabase db query`. See [Known gaps](#known-gaps)                                                                                                                                                                                                                                                    |
| `E2E_PORT`                             | server-only | e2e only | Port Playwright drives (`playwright.config.ts`). Defaults to 3000                                                                                                                                                                                                                                                                                                           |

The server-only variables carry no `NEXT_PUBLIC_` prefix on purpose — they are never inlined into
the client bundle.

`.env.example` is the copy-paste template for the four variables the app itself needs; on Vercel
the same four live in Project Settings → Environment Variables. See [Deployment](#deployment).

## Database

The Supabase project is committed here — `supabase/config.toml` plus `supabase/migrations/`:

| Migration                          | What it creates                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_users_table.sql`             | `public.users` (`role` `member`\|`admin`), `FORCE ROW LEVEL SECURITY`, own-row select policy                                                |
| `0002_handle_new_user_trigger.sql` | `handle_new_user()` — mirrors `auth.users` → `public.users` on sign-up                                                                      |
| `0003_awards_table.sql`            | `public.awards` + its six Vietnamese seed rows, readable by `anon` and `authenticated`                                                      |
| `0004_awards_en_seed.sql`          | English rows for `public.awards` (translations — the MoMorph source carries Vietnamese only)                                                |
| `0005_profile_cards_view.sql`      | `public.profile_cards` — `SECURITY DEFINER` view letting a signed-in Sunner read another Sunner's card past 0001's own-row policy           |
| `0006_kudos.sql`                   | `public.kudos`, the `public.users.department` column, and the `public.kudos_cards` read view                                                |
| `0007_kudo_hearts.sql`             | `public.kudo_hearts` + the trigger keeping `kudos.heart_count` in sync                                                                      |
| `0008_kudos_demo_seed.sql`         | Demo data for `/kudos`: 8 Sunners, 12 kudos, hearts — enough to exercise the carousel, filters and paging                                   |
| `0009_kudos_write_anonymity.sql`   | The first write path into `public.kudos`, its anonymity columns, and the `kudos_cards` patch that makes anonymity real rather than cosmetic |
| `0010_kudo_images_bucket.sql`      | Storage bucket `kudo-images` for the compose dialog's uploads — the repo's first use of Supabase Storage                                    |
| `0011_secret_box.sql`              | `public.secret_box_openings` + the `open_secret_box()` RPC (the repo's first `.rpc()` call)                                                 |
| `0012_notifications.sql`           | `public.notifications` — recipient-owned inbox rows for 4 event types; RLS + column-level `GRANT` is the enforcement, not app code          |
| `0013_notification_emitters.sql`   | Two `SECURITY DEFINER` `AFTER INSERT` triggers — the **only** writers of `public.notifications`; no `authenticated` INSERT grant exists     |

`supabase start` applies all of them, so a fresh clone reaches a working database in one command.
To apply new migrations to a stack that is already up, use `supabase migration up` — it runs only
what is pending and leaves existing rows alone.

**Never run `supabase db reset` on a stack anyone is using.** It drops and rebuilds the database,
taking every real sign-in in `auth.users` with it. That is also why seed rows live inside the
migrations rather than in a `supabase/seed.sql`: Supabase only reads `seed.sql` during a reset, so
a seed file there would be reachable exclusively through the one command you must not run.

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
| `pnpm test:unit`          | Vitest unit tests, split into two projects (`vitest.config.ts`): `node` (`src/**/*.test.ts`, excluding hook folders) and `jsdom` (`src/hooks/**`, `src/app/**/_hooks/**`) — 83 test files                                                               |
| `pnpm test:unit:coverage` | Same, with coverage against an explicit allowlist (`src/{api,dal,lib,utils,hooks,domain,configs}/**`, `src/app/**/{_hooks,_utils,_actions}/**`, `src/app/**/actions.ts`, `src/app/**/route.ts`) and a real 100% threshold gate — see `vitest.config.ts` |
| `pnpm storybook`          | Storybook dev server on port 6006 (81 stories)                                                                                                                                                                                                          |
| `pnpm build-storybook`    | Static Storybook build (also run in CI, see [CI](#ci))                                                                                                                                                                                                  |
| `pnpm test:e2e`           | Playwright E2E (`tests/e2e/`, 13 spec files) — needs the local Supabase instance (`saa-app`) running and a Chromium build available to Playwright; auto-starts `pnpm dev` on port 3000                                                                  |

Note the narrow scope of that 100% coverage gate: no `.tsx` glob appears in the allowlist, so
components and `async` Server Components are outside it by construction. The number says nothing
about whether a component renders correctly.

## CI

`.github/workflows/ci.yml` runs on push to `main` and to `feat/**`, `fix/**`, `chore/**`, on PRs to
`main`, plus manual `workflow_dispatch`:

- **`quality`** — lint (`--max-warnings 0`), format check, unit tests with a 100% coverage gate
  (`pnpm test:unit:coverage`), build, typecheck (runs _after_ build on purpose — see the workflow's
  own comment), then a Storybook build check (`pnpm build-storybook` — catches a story that fails to
  compile, not whether a story exists for every component).
- **`e2e` (CI-safe)** — Playwright, excluding tests tagged `@auth` **or** `@local-db`
  (`--grep-invert "@auth|@local-db"`). Both groups need the local `saa-app` Supabase instance and
  only run on a developer machine, never in CI. A green `e2e` run does **not** mean the
  authenticated flow, the OAuth callback success path, or any database-backed content were
  exercised — read the file-header comment in `ci.yml` for the exact coverage limit. The job prints
  the excluded-test count to the run summary on every run, green or red.
- `@auth` tests that need an admin account (e.g. the homepage's "Trang quản trị" menu item) promote a
  freshly-created test user via `tests/e2e/helpers/promote-to-admin.ts`. Tests that need seeded rows
  use `tests/e2e/helpers/service-role.ts`, which reads `SUPABASE_SERVICE_ROLE_KEY`/`SERVICE_ROLE_KEY`
  from the shell and otherwise falls back to `supabase status -o env` — so no manual key setup is
  normally needed on a machine with the local stack up.

None of these gates block a merge today: `main` has no branch protection, so every job reports
rather than enforces. They do block a **deploy** — see below.

## Deployment

Production runs on **Vercel** (app) + **Supabase Cloud** (database, auth, storage). Full runbook —
creating the Supabase project, applying migrations, wiring Google OAuth, the required GitHub
secrets, and the manual acceptance checklist — is in [`docs/deployment.md`](docs/deployment.md).

`.github/workflows/cd.yml` is a **separate** workflow from CI and only ever targets `main`. It is
triggered by `workflow_run` on CI's completion, not by `push`: a `push` trigger would start
deploying in parallel with the tests meant to gate it. Three jobs, in this order:

1. **`plan`** — `supabase db push --dry-run`, writing the pending migration list to the run
   summary. It carries no GitHub Environment on purpose: required reviewers gate a whole job
   before its first step, so a dry-run inside `migrate` would only print _after_ the approval.
   That also forces the three `SUPABASE_*` secrets to be repository secrets rather than
   environment ones — the cost of showing the plan before the gate.
2. **`migrate`** — `supabase db push` against the production project. Gated behind the
   `production-db` GitHub Environment with a required reviewer, because a schema change has no
   undo.
3. **`deploy`** — `vercel build --prod` then `vercel deploy --prebuilt --prod`, so the artifact that
   goes live is the exact tree CI gated, followed by a `curl` liveness check on `/`.

Vercel's own Git integration must stay **disabled** for this repo (`Ignored Build Step` →
`exit 0`); otherwise every push to `main` deploys twice, and the ungated Vercel-side build wins the
race. `docs/deployment.md` § Bước 4.

Two things this pipeline does not prove: the authenticated flow (CI excludes `@auth` and
`@local-db`), and the `/auth/callback` success path (no automated test exists anywhere). The
post-deploy checklist in the runbook covers both by hand.

## Known gaps

- `/todo` is a placeholder proving the auth guard; no todo feature exists.
- `tests/e2e/helpers/promote-to-admin.ts` still shells out to `supabase db query` with `cwd` set to
  a **sibling** `saa-app` checkout (`process.env.SAA_APP_DIR ?? "~/Desktop/Claude-and-mormoph/saa-app"`).
  Supabase now lives inside this repo, so that default path is stale — either set `SAA_APP_DIR` to
  this repo's root or point the helper at the repo root directly.
- The `/auth/callback` valid-PKCE-exchange branch has no automated test anywhere, CI or local: a
  real authorization code / verifier pair only exists after a genuine Google sign-in.
- **The admin menu link is dead.** `src/app/_components/account-menu.tsx:94` renders
  `href="/admin"` for `role = 'admin'`, but no `/admin` route exists in `src/app/**` and `ROUTES`
  has no `ADMIN` entry — every admin who clicks it gets a 404. Either build the route or hide the
  item.

## Assets

Figma exports from the MoMorph screens, consumed via `next/image` (bitmaps) or inlined as SVG
(icons):

| Directory           | Files | Screen                                                                                                      |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| `public/login/`     | 6     | Login (`662:14389` key visual, 2× export 2882×2044, served `fill` + `object-cover`)                         |
| `public/home/`      | 19    | Homepage (MoMorph screen `i87tDx10uM`) — key visual, logo, award cards, Kudos, bell/pencil/user/arrow icons |
| `public/kudos/`     | 14    | Kudos board and compose dialog (MoMorph screen `MaZUn5xHXZ` / `ihQ26W78P2`)                                 |
| `public/standards/` | 13    | Rules panel (MoMorph screen `3204:6051`) — Hero badges, Secret Box icons                                    |
| `public/prelaunch/` | 1     | Pre-launch screen (MoMorph screen `2268:35127`)                                                             |

## Docs

Generated documentation lives under `docs/vi/` (Vietnamese is the primary language):

| Path                 | What's there                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/vi/system/`    | `overview.md`, `architecture.md`, `permissions.md` — system shape and access control                                                                                                                   |
| `docs/vi/generated/` | Code-derived inventories: `feature-list.md`, `screen-list.md`, `route-list.md`, `entities.md`, `api-map.md`, `permissions-matrix.md`, `behavior-logic.md`, `user-stories.md`, `traceability-matrix.md` |
| `docs/vi/features/`  | Per-feature specs, F001–F012 (functional + technical)                                                                                                                                                  |
| `docs/vi/screens/`   | Per-screen specs, SCR001–SCR009                                                                                                                                                                        |
| `docs/journals/`     | Dated engineering journal — what broke, why, and what it cost                                                                                                                                          |
| `plans/`             | Per-task implementation plans and their evidence                                                                                                                                                       |

Repo conventions live in `AGENTS.md` and `CLAUDE.md`; file-placement rules are in the
`nextjs-route-colocation-architecture` skill.
