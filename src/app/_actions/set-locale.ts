"use server";

import { cookies } from "next/headers";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  normalizeLocale,
} from "@/lib/i18n/locale";

/**
 * Server Action invoked by the language selector (phase-04 wires the
 * click handler). `locale` is untrusted client input, so it is always
 * routed through `normalizeLocale` before being persisted — this is what
 * keeps the `NEXT_LOCALE` cookie confined to {vi,en} regardless of what a
 * caller sends (defends the dynamic message import in `i18n/request.ts`
 * against cookie injection / path traversal, per the phase's security
 * notes).
 *
 * No `redirect()` call: a Server Action's own request/response round-trip
 * already re-renders the page tree with the new `i18n/request.ts` output,
 * so the caller only needs to await this action (e.g. inside
 * `startTransition`) to see the locale change take effect.
 */
export async function setLocale(locale: string): Promise<void> {
  const next = normalizeLocale(locale);

  try {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, next, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  } catch (error) {
    // `cookies().set()` throws when called outside a Server Action /
    // Route Handler context. Surface a clear cause instead of a silent
    // no-op locale switch.
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `setLocale: failed to persist ${LOCALE_COOKIE} cookie: ${reason}`,
    );
  }
}
