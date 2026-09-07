"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";

export type StandardsClose = {
  /** "Đóng" button handler — see BR-003 in the hook's own doc comment. */
  handleClose: () => void;
};

/**
 * Minimal Navigation API surface this hook reads. Not yet in TypeScript's
 * bundled `lib.dom.d.ts` (checked: TS 5.9.3 ships no `Navigation` interface
 * and no `Window.navigation` member), so this is a local, narrow type
 * documenting exactly the one member read — not an unjustified `any`.
 * Chromium (Chrome/Edge) implements the real API at runtime; Firefox and
 * Safari do not implement it at all, which is exactly the case the `?.`
 * below and the "absent" branch in the colocated test cover.
 */
type NavigationApiWindow = Window & {
  navigation?: { canGoBack: boolean };
};

/**
 * "Đóng" (close) button behavior for the `/standards` route page (BR-003,
 * technical-spec.md § 3.2).
 *
 * `window.history.length` is NOT usable here — measured (2026-09-07,
 * Chromium via Playwright against this repo's own dev server) to give
 * conflicting readings for the same "should push HOME, not go back" case:
 * a direct `page.goto("/standards")` lands `history.length === 2` (an
 * artifact of Playwright's pages starting from a real `about:blank` entry),
 * while an in-app `<Link>` navigation from `/` lands `history.length === 3`.
 * No fixed threshold on that raw count separates "came from within this
 * app" from "direct-loaded" — the whole point of the fallback.
 *
 * `document.referrer` was also measured and ruled out: it stayed `""` in
 * BOTH scenarios, because Next's `<Link>` performs a same-document (SPA)
 * transition, and `document.referrer` only changes on a cross-document
 * navigation.
 *
 * `window.navigation.canGoBack` (the Navigation API) is what this hook
 * uses instead — measured, same setup: `canGoBack: false` on a direct load
 * (`entriesCount: 1`), `canGoBack: true` after the in-app `<Link>` click
 * (`entriesCount: 2`). Unlike raw `history.length`, the API's own entry
 * list does not carry the `about:blank`-artifact noise, so it agrees with
 * what a real fresh tab would also show. It is Chromium-only today
 * (Firefox/Safari do not implement `window.navigation`), so the `?.`
 * degrades to the `undefined` branch there — the deliberately safe
 * default is `router.push(ROUTES.HOME)`, never a guess at `back()`, since
 * landing on HOME is always a defensible destination while an incorrect
 * `back()` on a direct load is not.
 *
 * Net effect: `router.back()` only when the browser can positively confirm
 * same-session history to return to; `router.push(ROUTES.HOME)` (never a
 * hardcoded `"/"`) for a direct load, a new tab, or any engine without the
 * Navigation API.
 *
 * Returns a named object (`{ handleClose }`) — destructure it immediately
 * at the call site (`const { handleClose } = useStandardsClose()`) rather
 * than holding onto the whole object and reading `x.handleClose` later,
 * which trips the React Compiler's `react-hooks/refs` rule.
 */
export function useStandardsClose(): StandardsClose {
  const router = useRouter();

  const handleClose = useCallback(() => {
    const { navigation } = window as NavigationApiWindow;
    if (navigation?.canGoBack) {
      router.back();
      return;
    }
    router.push(ROUTES.HOME);
  }, [router]);

  return { handleClose };
}
