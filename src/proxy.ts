import { NextResponse, type NextRequest } from "next/server";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  normalizeLocale,
} from "@/lib/i18n/locale";
import { createProxyClient } from "@/lib/supabase/proxy-client";
import { ROUTES } from "@/constants/routes";
import { parseTargetDate, remaining } from "@/utils/countdown";
import { isPrelaunchLockEnabled, planProxy } from "@/domain/prelaunch-lock";

/**
 * Every route that requires a session. Widen this list — never add a
 * second `if` branch — when a new protected route joins `/todo`; each one
 * only ever redirects to `/login` via the same check below.
 */
const PROTECTED_ROUTES = [ROUTES.TODO, ROUTES.PROFILE];

/**
 * Optimistic auth guard + locale-cookie normalization (Next 16's `proxy`,
 * formerly `middleware`). This is the FIRST line of defense only — the
 * authoritative check lives in `src/app/(protected)/layout.tsx`, which reads
 * the session through `src/dal/auth.ts` (`getCurrentUser`) and redirects to
 * `/login`, per the official Next.js guidance that a proxy/middleware layer
 * "should not be your only line of defense."
 *
 * Redirect matrix (§ E2E contract):
 *   prelaunch lock ON & !reached & route not exempt/legacy → /prelaunch (BR-001/BR-002/BR-005)
 *   /prelaunch & lock ON & reached                          → / (BR-003)
 *   authed   & path = /login                                → /
 *   !authed  & path ∈ PROTECTED_ROUTES                       → /login
 *   path = /                                                 → pass through, no redirect (public;
 *                                                               cookie refresh via getUserOrNull
 *                                                               still runs — see `config.matcher`)
 *   else                                                      → pass through (with refreshed cookies)
 *
 * The prelaunch-lock branch runs FIRST and does zero I/O (BR-005): computing
 * `lockEnabled`/`reached` is a string compare plus a pure date calculation,
 * never a network call, so widening `config.matcher` below never adds a
 * Supabase round-trip to a route that never had one — `planProxy` returns
 * `{ kind: "pass" }` for any such route before `getUserOrNull` is ever
 * reached. See `src/domain/prelaunch-lock.ts` for the decision table.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const lockEnabled = isPrelaunchLockEnabled(
    process.env.PRELAUNCH_LOCK_ENABLED,
  );
  // Same `parseTargetDate`/`remaining` the `/prelaunch` page uses (DRY) —
  // an absent or malformed `EVENT_START_AT` parses to `null`, which reads
  // as "never reached", never as "already reached" (would loop the
  // /prelaunch → / redirect) and never throws (BR-004).
  const target = parseTargetDate(process.env.EVENT_START_AT);
  const reached = target ? remaining(target, Date.now()).reached : false;

  const plan = planProxy({ pathname, lockEnabled, reached });

  if (plan.kind === "redirect") {
    // 303 for anything that isn't a GET/HEAD, not the 307 `NextResponse.redirect`
    // defaults to. 307 preserves the method, so a Server Action POST on a locked
    // route would be re-POSTed to `/prelaunch` — which has no action of that id
    // and answers 404 with `x-nextjs-action-not-found` instead of showing the
    // countdown (measured, not assumed). 303 is exactly the "never mind, go look
    // at this other resource with a GET" status this case needs. Every page in
    // the app reaches a Server Action as a POST to its own route, so without
    // this the lock 404s the language selector on /kudos, /awards and /standards.
    const isBodylessRead =
      request.method === "GET" || request.method === "HEAD";

    return NextResponse.redirect(
      new URL(plan.to, request.url),
      isBodylessRead ? undefined : 303,
    );
  }

  if (plan.kind === "pass") {
    return NextResponse.next();
  }

  // `plan.kind` is "auth" here. TypeScript proves it: the two branches above
  // narrow the 3-value union down to one member, so adding a 4th variant to
  // `ProxyPlan` without handling it here fails this assignment at build time
  // rather than silently falling through into the session lookup.
  const _exhaustive: "auth" = plan.kind;
  void _exhaustive;

  const response = NextResponse.next({ request });

  normalizeLocaleCookie(request, response);

  const user = await getUserOrNull(request, response);

  const isAuthPage = pathname === ROUTES.LOGIN;
  const isProtectedPage = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (user && isAuthPage) {
    return redirectPreservingCookies(request, response, ROUTES.HOME);
  }

  if (!user && isProtectedPage) {
    return redirectPreservingCookies(request, response, ROUTES.LOGIN);
  }

  return response;
}

/**
 * `NEXT_LOCALE` is untrusted client input (a cookie the browser sends
 * back verbatim). An invalid/tampered value falls back to `vi` and the
 * corrected cookie is written to BOTH `request` (so this same pass's
 * eventual `i18n/request.ts` read already sees the fix) and `response`
 * (so the browser's stored cookie is corrected too) — see clarifications
 * "Gap resolution" § NEXT_LOCALE.
 */
function normalizeLocaleCookie(request: NextRequest, response: NextResponse) {
  const raw = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = normalizeLocale(raw);

  if (raw !== locale) {
    request.cookies.set(LOCALE_COOKIE, locale);
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
}

/**
 * Wraps `getUser()` (which also refreshes the session token via GoTrue)
 * in try/catch: a network failure talking to Supabase must never 500 the
 * whole site — treat it as "no session" and let the page-level guard
 * (or the public page) render instead.
 */
async function getUserOrNull(request: NextRequest, response: NextResponse) {
  try {
    const supabase = createProxyClient(request, response);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * `NextResponse.redirect` starts a brand-new response object, so any
 * cookies already staged on `response` (refreshed session token,
 * normalized locale) must be copied across explicitly — otherwise the
 * redirect silently drops them, the classic `@supabase/ssr` proxy bug
 * flagged in the phase's risk assessment.
 */
function redirectPreservingCookies(
  request: NextRequest,
  response: NextResponse,
  path: string,
) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

/**
 * Widened from a 6-route whitelist to a negative lookahead (phase 04 /
 * CAP-02): the prelaunch lock has to see every route to be able to redirect
 * it to `/prelaunch`, which the old whitelist — by definition — never
 * exposed to this proxy. Pattern is the one
 * `node_modules/next/dist/docs/.../proxy.md` § Matcher recommends for
 * "match everything except a short exclude list": `_next/static`,
 * `_next/image`, `favicon.ico`, `api`, `auth`, and any path with a file
 * extension (static assets) never reach `proxy()` at all.
 *
 * This does NOT reintroduce the "proxy overreach" this file's history
 * warned against: every route that is newly in-scope (e.g. `/kudos`) is
 * caught by the lock branch's `{ kind: "pass" }` result — computed with
 * zero I/O — before `getUserOrNull` ever runs. The old 6 routes
 * (`/`, `/login`, `/todo/:path*`, `/awards`, `/standards`, `/profile`) keep
 * running the exact same auth/locale logic as before, bit-for-bit; see
 * `isLegacyProxyRoute` in `src/domain/prelaunch-lock.ts` for how `planProxy`
 * reproduces that whitelist.
 *
 * Stays a LITERAL array (single string), never `ROUTES.*` or an imported
 * constant: Next statically analyzes `config.matcher` at build time and
 * cannot evaluate an import, so this is the one place in `src/**` that
 * intentionally keeps its own route string. Keep the `\\.` (escaped dot,
 * doubled for the TS string literal) exactly as written — a single `\.`
 * changes what the regex matches.
 */
export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
