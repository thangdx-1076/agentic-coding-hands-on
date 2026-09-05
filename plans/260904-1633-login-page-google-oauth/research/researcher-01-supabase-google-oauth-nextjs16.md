# Research: Google OAuth /login via Supabase Auth, Next.js 16.3.4 App Router

Date: 2026-09-04. Sources: official Next.js 16 docs (nextjs.org, version-pinned 16.3.4), Supabase docs (supabase.com/docs), next-intl.dev docs, playwright.dev docs, npm registry (live version check), cross-checked against 2-3 independent blog/discussion sources per claim. context7/tkm:search-docs returned no llms.txt for supabase/playwright/next-intl (404) — fell back to WebSearch+WebFetch per skill's built-in fallback chain.

## Q1 — @supabase/ssr API + versions

**Pin:** `@supabase/supabase-js@2.115.0`, `@supabase/ssr@0.12.5` (live npm registry, confirmed 2026-09-04). Next.js peer range for both is wide open (`^12–16` for next-intl-adjacent pkgs; supabase-js/ssr have no next peer constraint at all) — no compat risk with next@16.3.4/react@19.2.8.

**Publishable key = anon key drop-in.** Supabase's `sb_publishable_...` key format directly replaces the legacy anon key in `createBrowserClient`/`createServerClient` — same API, no code changes, only the env var value/name changes (docs: [Migrating to publishable/secret keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)). Get it via `supabase status` in the `saa-app` dir → use as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; URL → `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321`.

**Browser client** (`utils/supabase/client.ts`):
```ts
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
}
```
**Server client** (`utils/supabase/server.ts`, async cookies per Next 16):
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(URL!, KEY!, { cookies: {
    getAll() { return cookieStore.getAll() },
    setAll(cs, _h) { try { cs.forEach(({name,value,options}) => cookieStore.set(name,value,options)) } catch {} },
  }})
}
```
Source: [Supabase AI prompt: Next.js 16 + Supabase Auth](https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth) (explicitly targets Next 16, uses `proxy` export name), corroborated by [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Q2 — signInWithOAuth PKCE + callback + guard placement

```ts
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback?next=/todo` } })
```
`app/auth/callback/route.ts`:
```ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  let next = searchParams.get('next') ?? '/todo'
  if (error) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription ?? error)}`)
  if (code) {
    const supabase = await createClient()
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
    if (!exErr) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}
```
Cancel/failure on Google's side returns to `redirectTo` with `?error=access_denied&error_description=...` — same branch handles it. Source: [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

**Guard placement — RANKED:**
1. **Optimistic in `proxy.ts` + authoritative in server component/DAL (RECOMMENDED).** This is Next.js's own documented pattern, not just a Supabase convention — [nextjs.org/docs/app/guides/authentication § Optimistic checks with Proxy](https://nextjs.org/docs/app/guides/authentication): "Proxy can be useful for initial checks [but] should not be your only line of defense... perform checks close to your data source." Proxy only reads the session cookie (`supabase.auth.getUser()` or a lightweight claim check) and redirects `/todo`→`/login` (no session) or `/login`→`/todo` (has session); the `/todo` page (or its layout) independently re-verifies via `createClient().auth.getUser()` server-side. Matches project's stated optimistic+authoritative intent exactly.
2. Proxy-only — simpler, but violates the documented "not your only line of defense" guidance; skip.
3. Page-only (no proxy) — correct but no early redirect, extra round-trip for the common case; skip for this UX (design wants immediate redirect).

Caveat found in community writing (not official, flag as lower-confidence): several 2026 posts claim recent Next.js proxy CVEs mean **auth must never live solely in proxy.ts** — consistent with and reinforces the official recommendation above, so treat as directional confirmation, not the sole basis.

## Q3 — next-intl v4, no i18n routing (per coordinator update — replaces hand-rolled cookie plan)

**Pin:** `next-intl@4.14.2` — peerDeps `next: "^12 || ^13 || ^14 || ^15 || ^16"`, `react: ">=19.0.0"` (npm registry, live check) → compatible with next@16.3.4/react@19.2.8.

`next.config.ts`:
```ts
import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin()
export default withNextIntl({})
```
`src/i18n/request.ts`:
```ts
import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
export default getRequestConfig(async () => {
  const locale = (await cookies()).get('NEXT_LOCALE')?.value ?? 'vi'
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default }
})
```
`app/layout.tsx`: wrap children in `<NextIntlClientProvider>` (no props needed — v4 auto-inherits locale/messages from the server request config).

**Cookie name:** use `NEXT_LOCALE` explicitly — this is next-intl's own default cookie name for locale detection persistence, so aligning avoids a second convention. Source: [next-intl Routing configuration](https://next-intl.dev/docs/routing/configuration), [Getting started: App Router](https://next-intl.dev/docs/getting-started/app-router).

**Client → set cookie → refresh, RANKED:**
1. **Server Action (RECOMMENDED).** `'use server'` action does `(await cookies()).set('NEXT_LOCALE', locale)`; dropdown calls it inside `useTransition` (`startTransition(() => setLocale(v))`), no extra revalidate call needed since it's a fresh server round-trip that re-renders `i18n/request.ts`. No new dependency; matches Next 16's own cookie-writing rules (cookies can only be mutated in Server Actions/Route Handlers, not Server Components).
2. Client-side `document.cookie` + `router.refresh()` (next-intl's own switcher example uses `js-cookie` lib) — works, but adds a dependency (`js-cookie`) for one line of code; skip per DRY/YAGNI — plain `document.cookie = 'NEXT_LOCALE=vi; path=/'` + `router.refresh()` is fine if avoiding a Server Action is preferred, but Server Action is more idiomatic for Next 16 and testable.

## Q4 — Playwright E2E without hitting real Google

**(a) Assert OAuth kickoff without navigating to Google — RECOMMENDED technique:** intercept via `page.route`, not `waitForURL` (redirect chain moves past the authorize URL too fast to reliably assert, and letting it continue hits real Google over the network).
```ts
await page.route('**/auth/v1/authorize**', async (route) => {
  const url = new URL(route.request().url())
  expect(url.searchParams.get('provider')).toBe('google')
  await route.abort() // stop before it 302s to accounts.google.com
})
await page.getByRole('button', { name: /login with google/i }).click()
```
This is a real request to the **local** GoTrue instance (127.0.0.1:55321) that gets aborted before its redirect to Google fires — satisfies "without hitting real Google."

**(b) Authenticated-user-redirected-away-from-/login test, RANKED:**
1. **Setup project + `signInWithPassword` against local GoTrue, persist `storageState` (RECOMMENDED).** `enable_signup=true` on local instance confirms email/password signup works locally, so seed a test user once (`supabase.auth.signUp` or pre-seeded via SQL) then `signInWithPassword` in `tests/auth.setup.ts`, `page.context().storageState({ path: 'playwright/.auth/user.json' })`. Standard, documented Playwright pattern ([playwright.dev/docs/auth](https://playwright.dev/docs/auth)); avoids any real OAuth entirely for this test. Corroborated independently: [Testing Supabase Auth E2E](https://getautonoma.com/blog/how-to-test-supabase-auth), [Login at Supabase via REST API in Playwright](https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test).
2. Call GoTrue REST directly (`POST /auth/v1/token?grant_type=password`) and inject cookies manually — lower-level, more brittle to Supabase cookie-chunking format; skip unless (1) proves awkward.

`playwright.config.ts` shape:
```ts
export default defineConfig({
  testDir: './tests',
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
  ],
})
```
npm scripts to add: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`. devDeps: `@playwright/test@1.62.1` (npm live check) + `npx playwright install --with-deps chromium`.

## Q5 — Next 16 gotchas + pending-state pattern

- `cookies()`, `headers()`, `params`, `searchParams` are all `Promise`-returning now — every read needs `await`. ([Upgrading: Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16), [Dynamic APIs are Asynchronous](https://nextjs.org/docs/messages/sync-dynamic-apis))
- File is `proxy.ts` (not `middleware.ts`), exported function name is `proxy` (not `middleware`) — confirmed in official auth guide's own code sample. `export const config = { matcher: [...] }` unchanged.
- Turbopack is default for `next dev`/`next build` in 16 — no flag needed, no `experimental.turbo` config required.
- No `experimental` flags needed for anything in this scope (App Router, Server Actions, `cookies()` are all stable).

**Login button pending state, RANKED:**
1. **`useTransition` + plain `onClick` (RECOMMENDED).** `signInWithOAuth` is a client-side Supabase SDK call (needs browser cookies/PKCE verifier in localStorage) — it is NOT a form submission to the server, so React 19 `useActionState`/`<form action>` doesn't fit naturally (those are for Server Actions). `const [isPending, startTransition] = useTransition(); onClick={() => startTransition(async () => { const {error} = await supabase.auth.signInWithOAuth(...); if (error) setError(error.message) })}`, button `disabled={isPending}`. Matches design (loading+disabled while pending, inline error on failure).
2. Plain `useState` (`loading`/`error`) + manual try/catch/finally — works identically, marginally more boilerplate than `useTransition`, no automatic pending flag; acceptable fallback, not preferred (violates DRY vs. built-in `isPending`).
3. `useActionState`/form action — skip: wrong tool, this flow has no server round-trip to submit to (OAuth redirect happens client-side via `window.location`).

## Ranked recommendation summary
| # | Question | Pick |
|---|---|---|
| 1 | Client setup | `@supabase/ssr@0.12.5` + `@supabase/supabase-js@2.115.0`, publishable key as anon-key drop-in |
| 2 | Guard | Optimistic `proxy.ts` + authoritative server-side check on `/todo` (official Next.js pattern) |
| 3 | Locale | next-intl@4.14.2, no-routing mode, `NEXT_LOCALE` cookie, Server Action + `useTransition` to set/refresh |
| 4 | E2E | `page.route` abort on `**/auth/v1/authorize**` for OAuth-kickoff test; setup-project `signInWithPassword` + storageState for authenticated-redirect test |
| 5 | Pending state | `useTransition` + `onClick`, not form actions |

## Unresolved / lower-confidence
- Exact shape of `error`/`error_description` query params when the *user* cancels the Google consent screen (vs. GoTrue-side error) — Supabase docs describe the redirect mechanism but not Google's literal cancel payload; verify empirically once local Google OAuth app is testable (may need a manual one-time run against real Google, outside the e2e-red-first automated suite).
- Whether `saa-app`'s local Google provider env vars produce a `redirect_to` GoTrue accepts for `next=/todo` (config.toml confirms `http://localhost:3000/auth/callback` is allow-listed, but the `next` query param passthrough wasn't verified against this specific config) — planner should sanity-check `additional_redirect_urls` covers the callback+next combination.
- `next-intl` `NextIntlClientProvider` "no props" auto-inheritance was corroborated only via WebFetch summary of the without-routing guide, not a second independent source — low risk (official docs) but worth a quick confirm during implementation if the provider errors on missing `locale`/`messages` props.

**Status:** DONE
**Summary:** Researched and ranked all 5 questions with official-doc-backed code shapes: @supabase/ssr@0.12.5/supabase-js@2.115.0 client setup, PKCE OAuth + /auth/callback handler, optimistic-proxy+authoritative-page guard (matches Next.js's own documented pattern), next-intl@4.14.2 no-routing i18n with NEXT_LOCALE cookie + Server Action refresh (per coordinator's mid-task pivot to next-intl), Playwright `page.route` interception + storageState setup-project strategy for OAuth-free e2e, and useTransition for button pending state. Report at plans/260904-1633-login-page-google-oauth/research/researcher-01-supabase-google-oauth-nextjs16.md.
**Concerns/Blockers:** None blocking. 3 unresolved lower-confidence items listed above for planner awareness (Google cancel payload shape, redirect_to+next allow-list interaction, NextIntlClientProvider zero-prop confirmation) — none block planning, all resolvable during implementation.
