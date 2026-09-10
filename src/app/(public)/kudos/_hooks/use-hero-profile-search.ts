"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSunnerSuggest } from "./use-sunner-suggest";

import { ROUTES } from "@/constants/routes";
import type { SunnerSuggestion } from "@/dal/sunner-search";

/** Mirrors `search-sunners.ts`'s own `MAX_QUERY_LENGTH` (128): the Server
 * Action truncates anyway, but capping here keeps the input's value, the
 * `maxLength` attribute and the query actually sent identical, the same way
 * `use-spotlight-search.ts` mirrors `SUNNER_SEARCH_MAX_LENGTH`. */
export const HERO_SEARCH_MAX_LENGTH = 128;

export type HeroProfileSearch = {
  query: string;
  setQuery: (value: string) => void;
  options: SunnerSuggestion[];
  loading: boolean;
  /** Dropdown visibility — derived, never a second source of truth. */
  isOpen: boolean;
  /** Escape / blur: hides the dropdown without clearing the typed text. */
  dismiss: () => void;
  /** Enter: opens the first result, if there is one. */
  submit: () => void;
  openProfile: (option: SunnerSuggestion) => void;
};

export type HeroProfileSearchOptions = {
  /** `viewerId !== null`, resolved server-side in `page.tsx`. `profile_cards`
   * is `GRANT SELECT TO authenticated` only, so an anonymous visitor's search
   * would come back empty from Postgres regardless — skipping the round trip
   * lets the UI say "sign in" instead of the misleading "no match". */
  isSignedIn: boolean;
};

/**
 * Drives the KV-band "Tìm kiếm profile Sunner" pill (`mm:2940:13450`): the
 * one search on `/kudos` whose job is to OPEN another Sunner's profile,
 * distinct from the Spotlight box (filters the on-screen scatter,
 * `use-spotlight-search.ts`) and from the compose dialog's recipient
 * combobox (picks a kudo recipient, `useRecipientSearch`).
 *
 * Owns no fetching of its own: `useSunnerSuggest` already carries the 250ms
 * debounce, the min-1-character floor and the stale-response guard, and
 * `searchSunners` already re-derives the caller from the server session. This
 * hook adds only what that pill needs on top — a capped query, dropdown
 * open/dismiss, and navigation to `/profile?id=`.
 *
 * `isOpen` is derived from `query` + `dismissed` rather than stored: typing
 * re-opens the dropdown, Escape/blur hides it, and picking a result hides it
 * while the route transition runs. `id` is `encodeURIComponent`-ed on the way
 * into the URL (matching `kudos-leaderboard.tsx`) even though
 * `profile_cards.id` is always a uuid — the value crosses into a query string,
 * so it gets encoded there, not trusted.
 */
export function useHeroProfileSearch({
  isSignedIn,
}: HeroProfileSearchOptions): HeroProfileSearch {
  const router = useRouter();
  const [query, setQueryState] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const { options, loading } = useSunnerSuggest(query, {
    enabled: isSignedIn,
  });

  const isOpen = !dismissed && query.trim().length > 0;

  function setQuery(value: string): void {
    setQueryState(value.slice(0, HERO_SEARCH_MAX_LENGTH));
    setDismissed(false);
  }

  function dismiss(): void {
    setDismissed(true);
  }

  function openProfile(option: SunnerSuggestion): void {
    setDismissed(true);
    router.push(`${ROUTES.PROFILE}?id=${encodeURIComponent(option.id)}`);
  }

  function submit(): void {
    const first = options[0];
    if (!first) {
      return;
    }
    openProfile(first);
  }

  return {
    query,
    setQuery,
    options: isSignedIn ? options : [],
    loading: isSignedIn ? loading : false,
    isOpen,
    dismiss,
    submit,
    openProfile,
  };
}
