import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Supabase client factory for `proxy.ts` (Next 16's proxy/middleware
 * layer). Unlike `lib/supabase/server.ts`, cookie writes here must land
 * on BOTH the incoming `request` (so the rest of this same pass sees the
 * refreshed value) AND the outgoing `response` (so the browser actually
 * receives the new/rotated session cookie) — this is the well-documented
 * `@supabase/ssr` proxy pattern; skipping either half silently drops the
 * session refresh.
 */
export function createProxyClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
