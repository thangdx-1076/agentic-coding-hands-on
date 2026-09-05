# Research: Storybook + MSW for this repo (Next 16.3.4 / React 19.2.8 / Tailwind v4 / pnpm 10.33.2)

Date: 2026-09-05. Report-only, no source touched. Method: npm registry JSON (ground truth for versions/peerDeps) + official docs (storybook.js.org, supabase.com, next-intl.dev) + GitHub issues/discussions (real-world validation) + this repo's own files. context7/search-docs 404'd for "storybook" and "mock service worker" (consistent with prior finding that context7 misses several libs) — fell back to WebSearch/WebFetch per skill fallback chain.

## Install (copy-paste)

```bash
# Storybook core + Next-on-Vite framework (recommended, see Q1)
pnpm add -D storybook@10.6.0 @storybook/nextjs-vite@10.6.0 vite

# MSW + Storybook addon
pnpm add -D msw@2.15.0 msw-storybook-addon@3.0.0

# pnpm 10 will likely print "Ignored build scripts" — see Q7
pnpm approve-builds

# Generates public/mockServiceWorker.js (browser runtime)
pnpm dlx msw init public --save
```

`storybook init` (the official scaffolder) also works, but do NOT trust its framework auto-pick blindly here — see Q1 unresolved note. Safer to hand-pin the above, then run `pnpm dlx storybook@10.6.0 init --framework=@storybook/nextjs-vite --skip-install` to get the example stories/scripts wired without it re-deciding the framework.

---

## Q1. Storybook version + framework package

**Storybook 10.6.0 is current** (npm registry, confirmed just-published; v10 is ESM-only, main breaking change). Two Next.js framework adapters exist, both published at **10.6.0** in lockstep with core:

| | `@storybook/nextjs-vite` | `@storybook/nextjs` (webpack) |
|---|---|---|
| peer `next` | `^14.1.0 \|\| ^15.0.0 \|\| ^16.0.0` | `^14.1.0 \|\| ^15.0.0 \|\| ^16.0.0` |
| peer `react`/`react-dom` | `^19.0.0` incl. (also 16-18) | same |
| peer bundler | `vite ^5\|\|^6\|\|^7\|\|^8` | `webpack ^5` (optional peer) |
| real-world Next 16 report | yes — [storybookjs/storybook discussion #33752](https://github.com/storybookjs/storybook/discussions/33752): confirmed working on Storybook 10.2.4 + Next 16, one snag (Node <22.12 → module-resolution error on Windows, fixed by upgrading Node) | none found for Next 16 specifically |
| Storybook team's own guidance | recommended default for "most Next.js projects" — faster builds, simpler config, no Babel/webpack config needed | "use only if custom webpack/Babel config incompatible with Vite" |
| known open issues | Windows-specific `react-remove-scroll` cache bug (Node-version-gated, fixed by Node upgrade) | [#30646](https://github.com/storybookjs/storybook/issues/30646) React-version drift between Next and Storybook's own React copy |
| code duplication vs sibling | [#34463](https://github.com/storybookjs/storybook/issues/34463): ~500 lines duplicated between the two frameworks — low switching cost either direction |

This repo's `next.config.ts` has **zero custom webpack config** (`const nextConfig: NextConfig = {/* config options here */}` — empty), so the one carve-out for the webpack framework doesn't apply. Repo is already pnpm10/ESM/modern-tooling — Vite fits the existing posture.

`storybook init` auto-detection: multiple web sources (of varying credibility — mostly blog posts, dated pre-Storybook-10) say plain `storybook init` on a Next.js project installs `@storybook/nextjs` (webpack) by default. I could not confirm this is still true for Storybook 10 targeting a Turbopack-first Next 16 App Router repo like this one — flagged as unresolved below. Don't rely on auto-detect; pass `--framework=@storybook/nextjs-vite` explicitly or hand-install per the block above.

**Recommendation:** `storybook@10.6.0` + `@storybook/nextjs-vite@10.6.0` (+ `vite` devDependency, unpinned — let pnpm resolve within the `^5||^6||^7||^8` peer range). Reject `@storybook/nextjs` (webpack) — no upside for this repo, less Next-16 real-world validation.

---

## Q2. Config file shapes

`.storybook/main.ts`:
```ts
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: [
    "../components/**/*.stories.@(ts|tsx)",
    "../app/**/*.stories.@(ts|tsx)",
  ],
  addons: ["msw-storybook-addon"],
  // Next.js serves /public at runtime automatically; Storybook does NOT —
  // staticDirs is required or /login/keyvisual.png etc. 404 in stories.
  staticDirs: ["../public"],
};

export default config;
```
Confirmed via official doc: "the public folder is not automatically served to Storybook by default... specify `staticDirs`" ([storybook.js.org/docs/api/main-config/main-config-static-dirs](https://storybook.js.org/docs/api/main-config/main-config-static-dirs)).

`.storybook/preview.tsx` (note `.tsx` — the next-intl decorator returns JSX):
```tsx
import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { initialize, mswLoader } from "msw-storybook-addon/csf3";

import viMessages from "../messages/vi.json";
import "../app/globals.css"; // Tailwind v4 entry point, same file the app uses

initialize({ onUnhandledRequest: "warn" });

const preview: Preview = {
  loaders: [mswLoader],
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    nextjs: { appDirectory: true },
  },
};

export default preview;
```
`vi` hardcoded as default locale — matches this repo's own `DEFAULT_LOCALE` and the login screen's own doc-comment ("defaults render the Figma vi copy as-is"). A toolbar locale switcher (Storybook `globalTypes`) is a nice-to-have, not required — skipped here (YAGNI).

Tailwind v4 CSS: repo uses `@tailwindcss/postcss` (postcss.config.mjs), not `@tailwindcss/vite`. Official Storybook doc: "Vite comes with PostCSS support out-of-the-box... if you've customized PostCSS config... automatically applied to Storybook" ([storybook.js.org/docs/configure/styling-and-css](https://storybook.js.org/docs/configure/styling-and-css)). A known bug ([tailwindlabs/tailwindcss #16451](https://github.com/tailwindlabs/tailwindcss/discussions/16451), unresolved as of Oct 2025) is specific to the **`@tailwindcss/vite`** plugin in Nx monorepos — doesn't apply here since this repo never adopted that plugin. Do not switch to `@tailwindcss/vite` to "fix" a bug that doesn't exist in this config.

**Recommendation:** exact snippets above. `staticDirs: ["../public"]` is non-optional for this repo's `/login/*.png` and `/login/*.svg` assets.

---

## Q3. next/image, next/font, next-intl in Storybook

- **next/image**: `@storybook/nextjs-vite` handles it "with no configuration" for both local and remote sources (official doc, [nextjs-vite framework page](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite)). `login-background.tsx`, `login-header.tsx`, `login-hero.tsx`'s `<Image fill priority sizes=... />` usage needs no mocking.
- **next/font/google**: same doc, explicit: "Google fonts (`next/font/google`) require no setup." Covers `app/fonts.ts` (Montserrat/Montserrat_Alternates) and `app/layout.tsx` (Geist/Geist_Mono) as-is. Caveat from the same doc: `next.config.js` font-loader options (`fallback`, `adjustFontFallback`, `preload`, `display`) aren't fully honored in Storybook's emulation — irrelevant here since this repo doesn't set those.
- **next-intl**: no framework-level auto-support; wire via a preview decorator. Official next-intl doc ([next-intl.dev/docs/workflows/storybook](https://next-intl.dev/docs/workflows/storybook)) shows exactly the `NextIntlClientProvider` decorator pattern used above. Same doc's own caveat: "support for async Server Components is currently experimental in Storybook" — moot for this repo's actual component tree (see Q6: the whole `LoginScreen` subtree is already a client-safe, prop-driven tree with no server dependency).

**Recommendation:** no next/image or next/font mocking needed. Add the `NextIntlClientProvider` decorator (snippet in Q2). A community addon (`storybook-next-intl`) exists as an alternative to hand-rolling the decorator — skip it (YAGNI, the decorator is ~6 lines).

---

## Q4. MSW wiring for both runtimes

Packages: `msw@2.15.0` (Node engine `>=18`, satisfied), `msw-storybook-addon@3.0.0` (peers: `msw >=2`, `storybook >=9` — both satisfied).

**Browser (Storybook)**: `pnpm dlx msw init public --save` generates `public/mockServiceWorker.js` (served automatically once `staticDirs` includes `../public`, per Q2). `.storybook/main.ts` registers `addons: ["msw-storybook-addon"]`; `.storybook/preview.tsx` calls `initialize()` + registers `mswLoader` in `loaders` (Q2 snippet). Per-story overrides via `parameters.msw.handlers` (classic CSF3 shape, confirmed in addon's own README) or per-story `beforeEach({ msw }) { msw.use(...) }` (newer shape, both shown in the addon's README/npm listing).

**Node (vitest)**: `msw/node`'s `setupServer` is bundled in the `msw` package itself — no extra install.

```ts
// mocks/handlers.ts — the ONE shared module both runtimes import
import { http, HttpResponse } from "msw";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

export const handlers = [
  http.post(`${SUPABASE_URL}/auth/v1/token`, () =>
    HttpResponse.json({
      access_token: "mock-token",
      token_type: "bearer",
      user: { id: "u1", email: "demo@example.com" },
    }),
  ),
  http.get(`${SUPABASE_URL}/auth/v1/user`, () =>
    HttpResponse.json({ id: "u1", email: "demo@example.com" }),
  ),
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => new HttpResponse(null, { status: 204 })),
];
```
```ts
// mocks/node.ts — vitest side
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```
```ts
// tests/setup/msw-node.ts — vitest setupFiles entry
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "@/mocks/node";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```
Add `setupFiles: ["./tests/setup/msw-node.ts"]` to `vitest.config.ts`'s `test` block. `msw/node` patches Node's fetch/http layer directly — no jsdom needed, so this doesn't touch the repo's existing `environment: "node"` decision or force in `@testing-library`.

**Recommendation:** exact files/paths above. One shared `mocks/handlers.ts`, imported by both `.storybook/preview.tsx` (via per-story `parameters.msw`) and `mocks/node.ts` (vitest). File layout:
```
mocks/
  handlers.ts   # shared
  node.ts       # msw/node setupServer
tests/setup/
  msw-node.ts   # vitest setupFiles hook
public/
  mockServiceWorker.js   # generated, commit it (MSW's own convention)
```

---

## Q5. Mocking Supabase auth via MSW — which endpoints, and a correction

Traced from this repo's actual call sites (not guessed):

| Call site | Method + path | Runtime | MSW-interceptable? |
|---|---|---|---|
| `app/auth/callback/route.ts` → `exchangeCodeForSession` | `POST /auth/v1/token?grant_type=pkce` | Node (Route Handler) | yes, via `msw/node` |
| `lib/supabase/server.ts` → `getUser()` (used in `/login`, `/todo`, `/`) | `GET /auth/v1/user` | Node (Server Component) | yes, via `msw/node` |
| `lib/supabase/proxy-client.ts` → `getUser()` (`proxy.ts`) | `GET /auth/v1/user` | Node/Edge (proxy) | yes, via `msw/node` |
| `app/todo/actions.ts` → `signOut()` | `POST /auth/v1/logout?scope=global` | Node (Server Action) | yes, via `msw/node` |
| `lib/auth/sign-in-with-google.ts` → `signInWithOAuth({provider:"google"})` | `GET/POST /auth/v1/authorize?provider=google&...` | **Browser** | **not usefully**, see below |

**Correction to the task's framing**: Supabase's own docs confirm `signInWithOAuth` "causes a redirect" ([supabase.com/docs/reference/javascript/auth-signinwithoauth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)) — the browser does a top-level navigation to `/auth/v1/authorize` (which itself 302s to Google), it is not a `fetch()`/XHR call. MSW intercepts fetch/XHR/WebSocket, not top-level navigations, so an `http.get('.../auth/v1/authorize', ...)` handler in the Storybook **browser** worker will never actually fire for this repo's real code path. Listing it as a browser-mockable endpoint (as the task's phrasing implies) overstates what MSW can do here.

Consequence for THIS repo: MSW's real payoff is the **Node/vitest** runtime, not Storybook. And it lands squarely on a gap this repo's own CI already documents as untested — `ci.yml`'s own header comment states the PKCE-exchange success/failure branches in `/auth/callback` have "NO automated test anywhere, CI or local." `msw/node` handlers for `/auth/v1/token` (success, `invalid_grant`, network-down) directly close that named gap, plus the fail-open/fail-closed `getUser()` paths already called out in `lib/supabase/server.ts`/`proxy.ts`'s own comments.

**Recommendation:** write handlers for `/auth/v1/token`, `/auth/v1/user`, `/auth/v1/logout` (Q4 snippet), target them at `lib/auth/sign-in-with-google.test.ts`-style vitest specs for `app/auth/callback/route.ts` and the Supabase client factories. Do NOT invest in mocking `/auth/v1/authorize` for Storybook — mock the `onLoginClick` prop directly on `LoginScreen` instead (see Q6).

---

## Q6. Storybook for App Router server pages

Next 16 async Server Components can't render directly in Storybook's default (non-RSC) mode. Options, ranked for this repo specifically:

1. **Story the existing presentational tree directly (recommended, do now).** `app/login/page.tsx` (async Server Component: auth guard + `getTranslations`) already delegates ALL rendering to `LoginClient` → `LoginScreen`, and `LoginScreen`/`LoginHeader`/`LoginHero`/`LoginFooter`/`GoogleLoginButton`/`LanguageSelector` are pure, prop-driven, zero server dependency (`login-screen.tsx`'s own doc-comment: "Presentational only... Track B supplies real copy/locale/handlers"). A story just supplies `copy`, `locale`, `loginPending`, `errorMessage`, and no-op callbacks. Zero RSC feature flags, zero MSW, zero risk — "one story per main route" for `/login` is a rename-free fit with this repo's own existing Track A/Track B split.
2. **Extract a presentational `TodoScreen` first.** `app/todo/page.tsx` has its JSX (`<main>`, `<h1>`, logout `<form>`) written inline in the async Server Component — there is no presentational child to story yet. This is a small refactor, out of scope for a report-only task — flagging as a prerequisite, not doing it here.
3. **`features.experimentalRSC: true`** (`@storybook/nextjs-vite`, per [storybook.js.org/blog/build-a-nextjs-app-with-rsc-msw-storybook](https://storybook.js.org/blog/build-a-nextjs-app-with-rsc-msw-storybook/)) — explicitly experimental, wraps stories in Suspense, still evolving. Reject for now: option 1 already covers the login route without it (YAGNI).
4. **`storybookjs/nextjs-server`** (embeds Storybook inside the Next dev server) — maintainers themselves call it "highly experimental." Reject: heaviest, least mature, biggest integration surface change.

**Recommendation:** (1) now for `/login`; (2) as necessary follow-up before `/todo` gets a story; reject (3) and (4) until a page genuinely can't be decomposed into a presentational component.

---

## Q7. Known breakages / Day-1 snags

1. **ESLint will fail on the first `.stories.tsx` file.** Verified by reading this repo's own `eslint.config.mjs`: `eslint-plugin-import`'s `no-anonymous-default-export` is turned on via `eslint-config-next`'s core-web-vitals block. Storybook's canonical CSF3 shape is `export default { title, component, ... }` — a bare anonymous object — which trips that rule immediately. Two fixes, pick one: (a) use `const meta = {...} satisfies Meta<typeof X>; export default meta;` (also Storybook's own current template style — better type inference too, no eslint change needed), or (b) add `{ files: ["**/*.stories.tsx"], rules: { "import/no-anonymous-default-export": "off" } }` to `eslint.config.mjs`. Prefer (a) — no config drift, DRY with what Storybook already generates.
2. **pnpm 10 build-script gating.** Storybook's install tree pulls transitive deps with lifecycle scripts (e.g. esbuild); pnpm 10 silently skips them ("Ignored build scripts" warning) unless approved. Run `pnpm approve-builds` and commit the resulting lockfile/config change, or list packages under `pnpm.onlyBuiltDependencies`. (Consistent with this repo's own prior pnpm-migration finding.)
3. **Node version floor.** Storybook 10 requires Node `20.19+` or `22.12+` (official migration guide). Repo's `engines: ">=22 <25"` and CI's pinned Node 24 both clear this, but a local dev machine sitting on Node 22.0–22.11 will fail — worth a one-line note in onboarding docs.
4. **`storybook-static/` build output** isn't yet in `.gitignore` or eslint's `globalIgnores` — add both once `build-storybook`/`storybook build` is run, same treatment as `.next/`.
5. **Windows-only** `react-remove-scroll` module-resolution bug on `@storybook/nextjs-vite` (GH discussion #33752) — irrelevant here (dev env is darwin), noted only as a maturity/adoption-risk signal for the framework choice.
6. **Whole stack is simultaneously bleeding-edge**: Storybook 10 (ESM-only, days-old minor at fetch time), Next 16 (very recent major), msw-storybook-addon 3.0.0 (very recent major with a CSF-Next migration mid-flight — see [#32626](https://github.com/storybookjs/storybook/issues/32626)). None of these individually are exotic, but stacking four near-simultaneous majors raises real early-adopter risk — expect to hit undocumented edges the official docs haven't caught up to yet. Budget for it; don't treat this as a "just works" install.

**Recommendation:** apply fix (a) for #1 before writing any story; run `pnpm approve-builds` right after install (#2); confirm local Node ≥22.12 (#3); add `storybook-static/` to ignores once you build (#4); treat #6 as a standing risk note, not a blocker.

---

## Unresolved questions

1. Does `storybook init`'s auto-detection currently pick `@storybook/nextjs-vite` or `@storybook/nextjs` for a Turbopack-first Next 16 App Router project with no custom webpack config? Sources conflict (mostly pre-Storybook-10 blog posts say webpack-by-default); didn't find a Storybook-10-specific, Next-16-specific confirmation either way. Mitigation given: pass `--framework` explicitly, don't rely on auto-detect.
2. Exact `msw-storybook-addon@3.0.0` CSF3-subpath (`msw-storybook-addon/csf3`) API surface — does it still require a separate `initialize()` call, or does registering `addons: ["msw-storybook-addon"]` in `main.ts` now own worker startup end-to-end? My sources disagree slightly (one shows manual `initialize()`, another shows only addon registration for the newer "CSF Next" `definePreview`/`addonMsw()` shape — that shape is NOT what's recommended here, see Q2 rationale for staying on classic CSF3). Verify against the installed package's own README at install time before treating the Q2 preview.tsx snippet as final.
3. Exact current Vite major (`^5||^6||^7||^8` peer range spans four majors) — left unpinned deliberately; not this task's concern, but worth knowing what pnpm actually resolves post-install.

**Status:** DONE_WITH_CONCERNS
**Summary:** Storybook 10.6.0 + `@storybook/nextjs-vite@10.6.0` + `msw@2.15.0` + `msw-storybook-addon@3.0.0` is the cross-validated, version-pinned stack for this repo, with exact main.ts/preview.tsx/handlers file shapes given. Concerns are the 3 unresolved items above (none blocking, all verifiable in minutes at actual install time) plus a real, ESLint-verified Day-1 lint failure on the first `.stories.tsx` file that has a named fix.
