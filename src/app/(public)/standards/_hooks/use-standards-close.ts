"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";

export type StandardsClose = {
  /** "Đóng" button handler — see BR-003 in the hook's own doc comment. */
  handleClose: () => void;
};

/**
 * "Đóng" (close) button behavior for the `/standards` route page (BR-003,
 * technical-spec.md § 3.2).
 *
 * `window.history.length > 1` is a heuristic, not a guaranteed API
 * (technical-spec § 5.2) — accepted because clarifications.md requires
 * exactly this behavior and the App Router exposes no better signal:
 * `router.back()` when there is history to go back to, falling back to
 * `router.push(ROUTES.HOME)` (never a hardcoded `"/"`) for a direct load or
 * a new tab, where there is nothing to go back to.
 *
 * No `typeof window !== "undefined"` guard: `handleClose` only ever runs
 * from a DOM click event, at which point `window` always exists — adding
 * the guard would create a branch no test can legitimately reach, failing
 * the project's 100%-branch coverage gate with dead code.
 *
 * Returns a named object (`{ handleClose }`) — destructure it immediately
 * at the call site (`const { handleClose } = useStandardsClose()`) rather
 * than holding onto the whole object and reading `x.handleClose` later,
 * which trips the React Compiler's `react-hooks/refs` rule.
 */
export function useStandardsClose(): StandardsClose {
  const router = useRouter();

  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(ROUTES.HOME);
  }, [router]);

  return { handleClose };
}
