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
 * The 6 routes `src/proxy.ts` guarded before this feature existed. Their
 * behavior must stay bit-for-bit unchanged (plan.md § Requirements) — which
 * means they resolve to `auth` unconditionally, even while the lock is on.
 * Only routes OUTSIDE this set (e.g. `/kudos`, newly reachable now that
 * `config.matcher` widened) are candidates for the lock redirect. This is
 * deliberate, not an oversight: it is what keeps sign-in and the already-
 * shipped protected pages usable for ops/QA while the rest of the site is
 * walled off behind `/prelaunch`.
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
 * Decision order matters and is NOT the naive "lock beats everything but
 * the exempt list" reading of FR-102:
 *
 *   1. `/prelaunch` itself — its own two-value rule (BR-003): once the
 *      countdown has reached and the lock is still on, bounce it home;
 *      otherwise let it render (this is the only path that keeps the CI
 *      suite, which never flips the lock, able to reach the screen at all).
 *   2. The legacy whitelist — always `auth`, lock or no lock (see
 *      `isLegacyProxyRoute`). Checked BEFORE the lock branch on purpose.
 *   3. BR-002 exemptions — always `pass`.
 *   4. Everything else: locked and not yet reached → redirect to
 *      `/prelaunch`; otherwise `pass`.
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

  if (isLegacyProxyRoute(pathname)) {
    return { kind: "auth" };
  }

  if (isExempt(pathname)) {
    return { kind: "pass" };
  }

  if (lockEnabled && !reached) {
    return { kind: "redirect", to: ROUTES.PRELAUNCH };
  }

  return { kind: "pass" };
}
