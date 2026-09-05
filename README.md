# SAA 2025 — Login

Next.js 16 app for Sun* Annual Awards 2025. Visitors sign in with Google (Supabase Auth, PKCE) to
reach a protected `/todo` placeholder. UI ships in Vietnamese and English via a cookie-driven locale
(no URL prefix).

## Stack

| Layer      | Technology                                     | Version          |
| ---------- | ---------------------------------------------- | ---------------- |
| Framework  | Next.js (App Router)                           | 16.3.4           |
| UI         | React                                          | 19.2.8           |
| Styling    | Tailwind CSS                                   | 4                |
| Language   | TypeScript                                     | ^5               |
| Auth       | `@supabase/ssr` + `@supabase/supabase-js`      | 0.12.5 / 2.115.0 |
| i18n       | `next-intl` (no-routing, cookie `NEXT_LOCALE`) | 4.14.2           |
| Unit tests | Vitest                                         | ^3.2.7           |
| E2E tests  | `@playwright/test`                             | 1.62.1           |

## Routes

| Route            | Description                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`              | No UI — redirects to `/todo` (authenticated) or `/login` (anonymous)                                                                                      |
| `/login`         | Google OAuth login screen: header (logo + VN/EN selector), hero, "LOGIN With Google", footer; shows an inline error when the URL carries `?error=`        |
| `/auth/callback` | Route Handler (GET) — exchanges the OAuth `code` for a session, then redirects to `next` (default `/todo`) or back to `/login?error=...` on failure       |
| `/todo`          | Protected placeholder — greets the signed-in user's email and offers logout. No todo feature is implemented; it exists to prove the auth guard end-to-end |

Access is guarded in two layers: `proxy.ts` (Next 16's renamed `middleware.ts`) does an optimistic
redirect on `/`, `/login`, `/todo/:path*`; `/todo` re-checks with an authoritative `getUser()` call
before rendering.

## Prerequisites

- Node.js `>=22 <25` (see `engines` in `package.json`).
- pnpm `10.33.2`, pinned via `packageManager` in `package.json`. If it's not on `PATH`:
  `npm i -g pnpm@10.33.2`. Note: on this project pnpm was installed under a specific nvm Node
  version — switching Node versions with `nvm use` can remove pnpm from `PATH` until you
  reinstall it (or switch back) under the new version.

## Setup

1. Start the local Supabase instance `saa-app` (in its own project directory): `supabase start`.
2. Read its API URL and publishable key: `supabase status` (run inside the `saa-app` project). Confirm
   the Google provider is enabled there and `additional_redirect_urls` includes
   `http://localhost:3000/auth/callback`.
3. Create `.env.local` at this repo's root (gitignored, never commit it):
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<value from supabase status>
   ```
4. `pnpm install`
5. `pnpm dev` → http://localhost:3000

## Scripts

| Command                   | What it does                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                | Start the dev server (Turbopack)                                                                                                                                                           |
| `pnpm build`              | Production build                                                                                                                                                                           |
| `pnpm start`              | Start the production server                                                                                                                                                                |
| `pnpm lint`               | ESLint                                                                                                                                                                                     |
| `pnpm lint:fix`           | ESLint with `--fix`                                                                                                                                                                        |
| `pnpm typecheck`          | TypeScript check (`tsc --noEmit`) — run this only after a build, see [CI](#ci)                                                                                                             |
| `pnpm format`             | Prettier — write formatting to every file                                                                                                                                                  |
| `pnpm format:check`       | Prettier — check formatting, no writes (what CI runs)                                                                                                                                      |
| `pnpm test:unit`          | Vitest unit tests (`lib/i18n/locale.test.ts`, `lib/i18n/messages-parity.test.ts`, `lib/supabase/next-path.test.ts`, `lib/ui/roving-index.test.ts`, `lib/auth/sign-in-with-google.test.ts`) |
| `pnpm test:unit:coverage` | Same, with coverage (`lib/**` only; no thresholds enforced — see `vitest.config.ts`)                                                                                                       |
| `pnpm test:e2e`           | Playwright E2E (`tests/e2e/`) — needs the local Supabase instance (`saa-app`) running and a Chromium build available to Playwright; auto-starts `pnpm dev` on port 3000                    |

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`, plus manual `workflow_dispatch`:

- **`quality`** — lint (`--max-warnings 0`), format check, unit tests, build, then typecheck (typecheck runs _after_ build on purpose — see the workflow's own comment).
- **`e2e` (CI-safe)** — Playwright, excluding tests tagged `@auth` (`--grep-invert @auth`). Tests tagged `@auth` need the local `saa-app` Supabase instance and only run on a developer machine, never in CI. A green `e2e` run does **not** mean the authenticated flow or the OAuth callback success path were exercised — read the file-header comment in `ci.yml` for the exact coverage limit.

## Known gaps

- `/todo` is a placeholder proving the auth guard; no todo feature exists.

## Assets

- `public/login/keyvisual.png` is the hero background (Figma node `662:14389`, 2× export,
  2882×2044), served via `next/image` (`fill`, `object-cover`) in
  `components/login/login-background.tsx`. Copied from the sibling `saa-app` project's Figma
  export; not re-exported from Figma in this repo.

## Docs

- `docs/vi/system/architecture.md`, `docs/vi/system/permissions.md` — architecture and access control
- `docs/vi/generated/feature-list.md`, `docs/vi/generated/screen-list.md` — feature and screen inventory
- `docs/vi/features/F001_GoogleOAuthLogin/`, `docs/vi/features/F002_LanguageSwitch/` — per-feature specs
