import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/supabase/next-path";

/**
 * PKCE callback handler for Supabase's `signInWithOAuth` redirect
 * (DEC-001/DEC-002). Excluded from `proxy.ts`'s matcher — this route
 * owns its own redirect decisions:
 *   - `?error` (Google/GoTrue-side cancel or failure) → /login?error=...
 *   - `?code`  → exchange for a session → safeNextPath(next) | /login?error=auth_code_error
 *   - anything else (no code, no error) → /login?error=auth_code_error
 *
 * `code`/`error_description` are never logged (may carry sensitive
 * detail per the phase's security notes).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next");

  if (error) {
    const message = errorDescription ?? error;
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        return NextResponse.redirect(`${origin}${safeNextPath(next)}`);
      }
    } catch {
      // Fall through to the generic failure redirect below — never
      // surface the raw exchange error to the client.
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
