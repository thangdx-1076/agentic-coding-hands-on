import { NextResponse, type NextRequest } from "next/server";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  normalizeLocale,
} from "@/lib/i18n/locale";
import { createProxyClient } from "@/lib/supabase/proxy-client";

/**
 * Optimistic auth guard + locale-cookie normalization (Next 16's `proxy`,
 * formerly `middleware`). This is the FIRST line of defense only — the
 * authoritative check lives in `/todo`'s `getUser()` call
 * (`app/todo/page.tsx`), per the official Next.js guidance that a
 * proxy/middleware layer "should not be your only line of defense."
 *
 * Redirect matrix (§ E2E contract):
 *   authed   & path ∈ {/, /login}   → /todo
 *   !authed  & path ∈ {/, /todo}    → /login
 *   else                            → pass through (with refreshed cookies)
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  normalizeLocaleCookie(request, response);

  const user = await getUserOrNull(request, response);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/" || pathname === "/login";
  const isProtectedPage = pathname === "/" || pathname.startsWith("/todo");

  if (user && isAuthPage) {
    return redirectPreservingCookies(request, response, "/todo");
  }

  if (!user && isProtectedPage) {
    return redirectPreservingCookies(request, response, "/login");
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
 * Matcher whitelist (not a broad negative-lookahead): only the 3 routes
 * the guard actually governs. `/auth/callback` is deliberately excluded
 * (it handles its own redirect logic) and no `_next`/asset path is
 * matched, per the phase's risk assessment on proxy overreach.
 */
export const config = {
  matcher: ["/", "/login", "/todo/:path*"],
};
