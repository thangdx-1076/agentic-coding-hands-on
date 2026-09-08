import { ROUTES } from "@/constants/routes";

/**
 * Pure decision function for the prelaunch navigation lock (CAP-02 / A2,
 * BR-001..BR-005). Zero I/O, zero `Date.now()` of its own — `reached` is
 * computed by the caller (`src/proxy.ts`) from `@/utils/countdown`'s
 * `parseTargetDate`/`remaining`, the same functions the `/prelaunch` page
 * itself uses (DRY — one date calculation for the whole feature).
 *
 * `to` is typed as the exact two literals this module ever redirects to —
 * not `string` — so a caller can render `NextResponse.redirect(new URL(to,
 * request.url))` without a runtime guard.
 */
export type ProxyPlan =
  | { kind: "redirect"; to: "/prelaunch" | "/" }
  | { kind: "pass" } // NextResponse.next() immediately: NO Supabase, NO cookie work (BR-005)
  | { kind: "auth" }; // continue into the existing locale + getUserOrNull branch

/**
 * Fail-safe by construction (permissions.md § Fail-safe): only the exact
 * string `"true"` (case-insensitive) enables the lock. Missing, empty, or
 * any other value — including truthy-looking ones like `"1"` — is OFF. A
 * misconfigured environment can never accidentally lock the site.
 */
export function isPrelaunchLockEnabled(raw: string | undefined): boolean {
  return raw?.toLowerCase() === "true";
}

/**
 * The 6 routes `src/proxy.ts` guarded before this feature existed. Reaching
 * this test means the request is NOT being redirected, and the only question
 * left is who pays for the session lookup: these 6 keep their original
 * locale-normalization + `getUserOrNull` behavior (`auth`), everything the
 * widened `config.matcher` newly exposes returns a bare `pass` so it never
 * touches Supabase (BR-005).
 *
 * This is a separate axis from the lock. It decides how a request is served,
 * never whether it is allowed through — `planProxy` settles that first.
 */
function isLegacyProxyRoute(pathname: string): boolean {
  if (
    pathname === ROUTES.HOME ||
    pathname === ROUTES.LOGIN ||
    pathname === ROUTES.AWARDS ||
    pathname === ROUTES.STANDARDS ||
    pathname === ROUTES.PROFILE
  ) {
    return true;
  }

  return pathname === ROUTES.TODO || pathname.startsWith(`${ROUTES.TODO}/`);
}

/**
 * BR-002's exemption list, reproduced here as defense-in-depth against
 * `config.matcher` (intentional duplication — see plan.md § Architecture):
 * `/auth/*` (OAuth callback and sign-in must never be locked), `/api/*`
 * (route handlers, not pages), `/_next/*` (framework assets — normally
 * filtered by the matcher already, kept here in case `planProxy` is ever
 * called directly), and any path whose last segment carries a file
 * extension (static files served from `public/`).
 */
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    /\.[^/]+$/.test(pathname)
  );
}

/**
 * Decision order, and why it is this order:
 *
 *   1. `/prelaunch` itself — its own two-value rule (BR-003): once the
 *      countdown has reached and the lock is still on, bounce it home;
 *      otherwise let it render (this is the only path that keeps the CI
 *      suite, which never flips the lock, able to reach the screen at all).
 *   2. BR-002 exemptions — `/auth/*`, `/api/*`, `/_next/*`, static files.
 *      Exempt from the lock by definition, so they are settled before it.
 *      `/auth/*` above all: locking the OAuth callback strands anyone
 *      mid-sign-in.
 *   3. The lock — `lockEnabled && !reached` → redirect to `/prelaunch`.
 *      This runs BEFORE the legacy-whitelist test on purpose. FR-102 locks
 *      "toàn bộ điều hướng đến các trang khác", and `/`, `/awards` and
 *      `/standards` ARE the public site; a lock that waved them through
 *      would wall off nothing worth walling off. Note what this means for
 *      `/login`: it is not on BR-002's exemption list, so it locks too —
 *      before the event there is nothing to sign in for.
 *   4. Not redirected, so the only question left is who pays for the
 *      session lookup: the legacy 6 keep their original `auth` behavior,
 *      everything else `pass`es without touching Supabase (BR-005).
 */
export function planProxy(input: {
  pathname: string;
  lockEnabled: boolean;
  reached: boolean;
}): ProxyPlan {
  const { pathname, lockEnabled, reached } = input;

  if (pathname === ROUTES.PRELAUNCH) {
    return lockEnabled && reached
      ? { kind: "redirect", to: ROUTES.HOME }
      : { kind: "pass" };
  }

  if (isExempt(pathname)) {
    return { kind: "pass" };
  }

  if (lockEnabled && !reached) {
    return { kind: "redirect", to: ROUTES.PRELAUNCH };
  }

  if (isLegacyProxyRoute(pathname)) {
    return { kind: "auth" };
  }

  return { kind: "pass" };
}
