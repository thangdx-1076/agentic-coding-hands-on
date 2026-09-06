# Homepage `/` (SAA) — Next 16 implementation patterns

Pins: next 16.3.4, react 19.2.8, next-intl 4.14.2, @supabase/ssr 0.12.5, tailwind ^4, @playwright/test 1.62.1, vitest ^3.2.7, storybook 10.6.0.
Doc paths below are relative to `node_modules/next/dist/docs/` unless a URL is given.

## 1. Countdown timer
**Finding:** `EVENT_START_AT` must be server-only (no `NEXT_PUBLIC_` prefix) — only prefixed vars are inlined into the client bundle (`01-app/02-guides/environment-variables.md`). Parse it once in `app/page.tsx` (Server Component) and pass only the resolved value down, never the raw env access. Repo's own hydration-flash guide (`01-app/02-guides/preventing-flash-before-hydration.md`) shows the general pattern (inline script + `suppressHydrationWarning`) for client-only values computed from a server timestamp — but for a *ticking* value the cleaner fix is: seed the hook's `useState` from a server-computed prop (not `Date.now()` called during client render), so first client render is byte-identical to SSR output and no `suppressHydrationWarning` is needed at all. Existing hook convention (`hooks/use-menu-keyboard-nav.ts`) uses plain `useEffect`/`useState`, not `useSyncExternalStore` — matches KISS; `useSyncExternalStore` solves tearing across concurrent external stores, which a 1s interval has no risk of.

**Code shape:**
```ts
// lib/countdown/countdown.ts (pure, 100% coverage required)
export function parseTargetDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function remaining(target: Date, nowMs: number) {
  const totalMin = Math.floor(Math.max(0, target.getTime() - nowMs) / 60000);
  return { days: Math.floor(totalMin / 1440), hours: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60, reached: target.getTime() <= nowMs };
}
```
```ts
// hooks/use-countdown.ts — seeded from server prop, no client Date.now() at first render
export function useCountdown(targetIso: string | null, initialNowMs: number) {
  const target = useMemo(() => parseTargetDate(targetIso ?? undefined), [targetIso]);
  const [nowMs, setNowMs] = useState(initialNowMs); // == server's Date.now(), matches SSR
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return { ...zero(), showComingSoon: false };
  const r = remaining(target, nowMs);
  return { ...pad2(r), showComingSoon: !r.reached };
}
```
`app/page.tsx` passes `targetIso={process.env.EVENT_START_AT}` and `initialNowMs={Date.now()}` into a client `<CountdownTimer>` wrapper. Presentational `components/home/countdown-timer.tsx` is pure props → render, `*.stories.tsx` co-located.
**Source:** `01-app/02-guides/environment-variables.md`; `01-app/02-guides/preventing-flash-before-hydration.md`; repo `hooks/use-menu-keyboard-nav.ts`, `.claude/skills/separate-hook-logic-from-components/SKILL.md`.
**Ranked recommendation:** lib pure calc + hook (`useEffect`+`setInterval`, prop-seeded state) + dumb component. Reject `useSyncExternalStore` (unneeded ceremony) and reject `suppressHydrationWarning` (avoidable by seeding, not masking).

## 2. `next/link` hash nav + active state
**Finding:** `<Link href="/awards#top-talent">` needs nothing special — it renders a real `<a>`, browser handles the hash jump; docs confirm `scroll` only gates Next's own scroll-restore/scroll-to-top-of-page logic, hash anchors work regardless (`01-app/03-api-reference/02-components/link.md`, "Disable scrolling to top" + hash example). `scroll` defaults `true` (scroll to top only if navigated Page isn't already in viewport); `scroll={false}` disables that. For "click active link → scroll to top": clicking a `Link` whose `href` matches the current route does **not** trigger a real navigation, so no scroll reset happens automatically — needs an explicit `onClick` on that link only. Active-state detection: `usePathname()` is a client-only hook (`'use client'` required); doc's own official pattern for active links uses it in a small client leaf component (`link.md` "Checking active links"), matching this repo's existing pattern of small client components for interactive nav bits (`LanguageSelector`).
**Code shape:**
```tsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href.split("#")[0];
  return (
    <Link href={href} className={isActive ? "text-white" : "text-white/70"}
      onClick={isActive ? () => window.scrollTo({ top: 0, behavior: "smooth" }) : undefined}>
      {children}
    </Link>
  );
}
```
**Source:** `01-app/03-api-reference/02-components/link.md` (`scroll` section, hash example, "Checking active links").
**Ranked recommendation:** client `usePathname` + small `onClick` scroll-to-top override on the active link only. Reject server-computed active prop (can't react to client-side route changes without a round trip).

## 3. Sticky header, floating widget, footer, images
**Finding:** Existing Tailwind v4 tokens (`app/globals.css` `@theme inline`, e.g. `--color-login-background: #00101a`) become real Tailwind colors, so opacity modifiers (`bg-login-background/70`) work automatically — reuse this token for a semi-transparent dark header rather than inventing a new ad-hoc hex. Sticky/fixed/footer need no Next API: `sticky top-0 z-50 backdrop-blur`, `fixed bottom-6 right-6 z-50`, plain `footer` element (already used at `/login`). **Breaking change confirmed:** `images.qualities` defaults to `[75]` only in Next 16 (was: any value) — `next.config.ts` currently has no `images` block, so any `quality` prop ≠75 is silently coerced to 75 (with a dev-only warning) (`01-app/02-guides/upgrading/version-16.md`). **Also confirmed:** `priority` prop is deprecated in Next 16 in favor of `preload` (`01-app/03-api-reference/02-components/image.md`) — the existing `components/login/login-background.tsx` still uses `priority` (pre-dates this check); new homepage hero should use `preload={true}`, not `priority`.
**Code shape:** hero: `<Image src="/home/hero.png" alt="" fill priority={false} preload sizes="100vw" className="object-cover" />` (mirrors `LoginBackground`'s `fill`+`sizes` shape). Fixed-size icons/logos: explicit `width`/`height`, no `sizes` needed.
**Source:** `01-app/02-guides/upgrading/version-16.md` (qualities), `01-app/03-api-reference/02-components/image.md` (`priority`→`preload`), repo `components/login/login-background.tsx`, `app/globals.css`.
**Ranked recommendation:** reuse existing color-token pattern; use `preload` (not deprecated `priority`); add `images.qualities` to `next.config.ts` only if a non-75 quality is actually needed by an exported asset — else leave default (YAGNI).

## 4. Auth-aware header on a public page
**Finding:** Must fail OPEN (unlike `/todo`'s no-try/catch fail-closed check) — matches `/login`'s existing `getAuthenticatedUser()` helper shape exactly. No `public.users` query exists yet in the repo (greenfield) and no SQL migration files were found — the RLS "own-row select" policy is a Track-B/backend dependency this research flags but does not resolve. Per layering skill, an SDK-calling async function belongs in `lib/`, not `hooks/` (no React) and not the page.
**Code shape:**
```ts
// lib/auth/get-current-user-role.ts
export type CurrentAccount = { email: string; role: "member" | "admin" } | null;
export async function getCurrentAccount(supabase: SupabaseClient): Promise<CurrentAccount> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    return { email: user.email ?? "", role: (data?.role as "member" | "admin") ?? "member" };
  } catch { return null; }
}
```
Called from `app/page.tsx` via `createClient()` (existing `lib/supabase/server.ts`), mapped into header props.
**proxy.ts matcher:** keep `/` in `config.matcher` — session-cookie refresh (GoTrue token rotation) must still run on every homepage hit, or a stale token could linger until the visitor hits `/todo` or `/login`. Minimal-diff fix: remove `/` from the `isAuthPage`/`isProtectedPage` unions (no redirect fires) but leave the unconditional `getUserOrNull()` call — `createProxyClient` still refreshes cookies as a side effect on `/` regardless of which branch is taken.
**Source:** repo `app/login/page.tsx` (`getAuthenticatedUser`), `app/todo/page.tsx`, `lib/supabase/server.ts`, `proxy.ts`; `01-app/03-api-reference/03-file-conventions/proxy.md` ("Execution order", Server Functions caveat); Supabase SSR guide `supabase.com/docs/guides/auth/server-side/nextjs` (session refresh in middleware — exact matcher regex not reproduced by fetch, treat as directional only).
**Ranked recommendation:** fail-open lib helper (reuse `/login` shape) + keep `/` in matcher with redirect branches narrowed, not widened to Supabase's broader default matcher (repo's narrow whitelist is already the tested convention — don't switch patterns mid-project).

## 5. Sign out from homepage account menu
**Finding:** Reuse `logoutAction` verbatim (`app/todo/actions.ts`) via the exact `<form action={...}><button type="submit">` shape already in `TodoScreen`. Caveat: put `role="menuitem"` on the `<button>` itself, not the wrapping `<form>` (ARIA APG expects the interactive element to carry the role). `useMenuKeyboardNav`'s `registerItem` only touches `HTMLButtonElement` refs, so a submit button nested in a form is unaffected — no hook change needed. No proxy-matcher caveat beyond §4's fix: Server Actions ride the route they're invoked from, and `/` stays reachable.
**Code shape:**
```tsx
<div role="menu">
  <form action={logoutAction}>
    <button type="submit" role="menuitem" ref={registerItem(idx)}>{logoutLabel}</button>
  </form>
</div>
```
**Source:** repo `components/todo/todo-screen.tsx`, `app/todo/actions.ts`, `hooks/use-menu-keyboard-nav.ts`.
**Ranked recommendation:** reuse `logoutAction` + `role="menuitem"` on the button. No new Server Action needed (DRY).

## 6. next-intl rich text + messages-parity
**Finding:** `lib/i18n/messages-parity.test.ts` flattens keys via `Object.entries`; since `typeof [] === "object"` in JS, an array's indices ARE walked as leaf keys (`home.rootFurther.paragraphs.0`, `.1`...). An array-of-strings shape therefore already satisfies the parity test as-is (equal-length arrays in both locales), with zero test changes. `t.rich` requires per-callsite tag→component mapping and bakes markup into the JSON string (harder for translators); `t.raw` returns the JSON value unparsed — appropriate for arrays.
**Code shape:**
```json
// messages/en.json — home.rootFurther.paragraphs: string[]
{ "home": { "rootFurther": { "paragraphs": ["First…", "Second…"] } } }
```
```tsx
const paragraphs = t.raw("home.rootFurther.paragraphs") as string[];
paragraphs.map((p, i) => <p key={i}>{p}</p>);
```
**Source:** repo `lib/i18n/messages-parity.test.ts`; next-intl docs (`next-intl.dev/docs/usage/messages` — confirms `t.rich` = ICU+component mapping, `t.raw` = bypass parsing; direct array support not itself documented but is a mechanical consequence of the repo's own parity-test flattening logic, verified by reading that test file, not by the next-intl docs).
**Ranked recommendation:** array-of-strings + `t.raw`, mapped to `<p>` in the presentational component. Reject `t.rich` for this case (ceremony without benefit — no inline styling needed, just paragraph breaks).

## 7. Playwright determinism
**Finding:** (a) `playwright.config.ts`'s `webServer` has no `env` field today (inherits `process.env` only) — add `env: { EVENT_START_AT: "2025-12-31T18:30:00+07:00" }` to fix the *server-rendered* initial countdown digits. (b) `page.clock.install({ time })` (must be called before `page.goto`/any other clock call, per Playwright's own ordering rule) fakes the *browser's* `Date.now()` for the client-tick hook; `page.clock.fastForward("00:01:00")` advances a minute to assert digits change, fast-forward further to assert "Coming soon" hides and digits freeze at `00:00:00`. Server env and browser clock are two different axes — both are needed for a fully deterministic test (SSR digits + client tick). (c) For links whose target route doesn't exist yet, assert the `href` attribute directly rather than following navigation (matches existing `login.spec.ts` convention of attribute/route-intercept assertions over full navigations).
**Code shape:**
```ts
// playwright.config.ts
webServer: { command: "pnpm dev", url: "http://localhost:3000",
  env: { ...process.env, EVENT_START_AT: "2025-12-31T18:30:00+07:00" }, reuseExistingServer: !process.env.CI },
```
```ts
await page.clock.install({ time: new Date("2025-12-31T18:29:00+07:00") });
await page.goto("/");
await page.clock.fastForward("00:01:00");
await expect(page.getByText("00:00:00")).toBeVisible(); // or however zero-state renders
await expect(page.getByText(/coming soon/i)).toBeHidden();
const link = page.locator('a:has-text("Top talent")');
expect(await link.getAttribute("href")).toBe("/awards#top-talent");
```
**Source:** `playwright.dev/docs/clock` (`install`, `fastForward`, ordering rule), `playwright.dev/docs/test-webserver` (`webServer.env`), repo `playwright.config.ts`, `tests/e2e/login.spec.ts` (attribute-assertion convention).
**Ranked recommendation:** combine `webServer.env` (SSR digits) + `page.clock` (client tick) — neither alone is deterministic; `href`-only assertions for not-yet-built routes.

## Unresolved
- `public.users` RLS policy/migration for role select does not exist in-repo — Track B dependency, not resolved here.
- Supabase's official broad session-refresh matcher regex could not be verbatim-confirmed (fetch returned no code sample); recommendation above is directional, weighed against the repo's own tested narrow-whitelist convention.

**Status:** DONE
**Summary:** All 7 topics answered with version-pinned (Next 16.3.4) code shapes, cross-checked against node_modules doc source and repo convention; two open items listed above are backend/external-verification gaps, not implementation blockers.
**Concerns/Blockers:** None blocking — the two unresolved items are flagged for Track B / a follow-up doc check, not for this research pass.
