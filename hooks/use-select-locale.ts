"use client";

import { useTransition } from "react";

import { setLocale } from "@/app/actions/locale";
import type { AppLocale } from "@/lib/i18n/locale";

export type SelectLocale = {
  /** True while the locale-persisting Server Action round-trip is in flight. */
  isPending: boolean;
  handleSelectLocale: (nextLocale: AppLocale) => void;
};

/**
 * Homepage language selector's write path (`hooks/use-select-locale.ts`,
 * new hook per clarifications.md § Header — deliberately NOT sharing
 * `useLoginActions`'s transition, since that hook also carries the login
 * button's `isPending`).
 *
 * Same shape as `useLoginActions.handleSelectLocale`: return the Server
 * Action's promise into `startTransition` (not fire-and-forget) so React 19
 * treats this as an async transition and `isPending` reflects the cookie
 * write until the action's own round-trip re-renders the tree with
 * `i18n/request.ts`'s new output.
 */
export function useSelectLocale(): SelectLocale {
  const [isPending, startTransition] = useTransition();

  function handleSelectLocale(nextLocale: AppLocale) {
    startTransition(() => setLocale(nextLocale));
  }

  return { isPending, handleSelectLocale };
}
