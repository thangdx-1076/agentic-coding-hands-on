"use client";

import { useState, useTransition } from "react";
import { LoginScreen } from "@/components/login/login-screen";
import type { LoginCopy } from "@/components/login/login-copy";
import { createClient } from "@/lib/supabase/client";
import { setLocale } from "@/app/actions/locale";
import type { AppLocale } from "@/lib/i18n/locale";

export type LoginClientProps = {
  copy: LoginCopy;
  locale: AppLocale;
  /**
   * Fixed, translated error text — always available so a client-only
   * OAuth failure (never round-tripped through `?error=`) can show the
   * same copy the server renders for a `?error=` redirect.
   */
  errorText: string;
  /** Non-null when the server already resolved a `?error=` query param. */
  errorMessage: string | null;
};

/**
 * Client boundary for `/login` (A2 · FR-202/FR-203, A1's language-switch
 * rung). Owns the two interactions `LoginScreen` cannot: kicking off the
 * Google OAuth redirect and persisting a locale choice. Neither is a form
 * submission — `signInWithOAuth` needs the browser's PKCE verifier and
 * `setLocale` re-renders via its own Server Action round-trip — so both
 * run through `useTransition` + a plain handler, not `useActionState`
 * (research § Q5).
 */
export function LoginClient({
  copy,
  locale,
  errorText,
  errorMessage,
}: LoginClientProps) {
  const [isPending, startTransition] = useTransition();
  const [clientError, setClientError] = useState(false);

  function handleLoginClick() {
    setClientError(false);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/todo`,
          },
        });
        if (error) {
          setClientError(true);
        }
        // No `finally { setClientError(false) }` / manual pending reset:
        // on success the browser is about to navigate away to Google's
        // authorize URL, so `isPending` staying true until unmount is
        // correct, not a bug (avoids the TC 37eae882 flakiness the phase
        // risk assessment calls out).
      } catch {
        setClientError(true);
      }
    });
  }

  function handleSelectLocale(nextLocale: AppLocale) {
    // Returning the Server Action's promise (not fire-and-forget) lets
    // React 19 track this as an async transition — `isPending` reflects
    // the cookie write, and the action's own round-trip re-renders the
    // tree with the new `i18n/request.ts` output; no `router.refresh()`.
    startTransition(() => setLocale(nextLocale));
  }

  return (
    <LoginScreen
      copy={copy}
      locale={locale}
      loginPending={isPending}
      errorMessage={clientError ? errorText : errorMessage}
      onLoginClick={handleLoginClick}
      onSelectLocale={handleSelectLocale}
    />
  );
}
