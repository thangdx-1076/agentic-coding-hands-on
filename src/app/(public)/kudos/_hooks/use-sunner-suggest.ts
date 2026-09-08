"use client";

import { useEffect, useRef, useState } from "react";

import {
  searchSunners,
  type SearchSunnersResult,
} from "../_actions/search-sunners";

import type { SunnerSuggestion } from "@/dal/sunner-search";

export type SunnerSuggestOptions = {
  /** Set to `false` to stop searching without unmounting — e.g. once a
   * recipient has already been picked, or when there is no active
   * `@`-mention token (`query === null`). Defaults to `true`. */
  enabled?: boolean;
};

export type SunnerSuggestState = {
  options: SearchSunnersResult;
  loading: boolean;
};

/** AD-6 — 250ms debounce, minimum 1 character, before calling the Server
 * Action. */
const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 1;

/**
 * Debounced Sunner search shared by BOTH the recipient combobox and the
 * `@`-mention suggestions — `use-kudos-compose-form.ts` calls this hook
 * twice, once per source, so the debounce/stale-response logic exists in
 * exactly one place (clarifications.md "Nguồn dữ liệu người nhận").
 *
 * `query` is fully external state (not owned here): the caller decides
 * what text is being searched for and when searching should be `enabled`.
 * A sequence counter — not `AbortController`, since the underlying Server
 * Action does not accept a `signal` (AD-6) — drops a response that arrives
 * after a newer request has already started, and `isMountedRef`
 * additionally guards against ever calling `setState` after unmount, since
 * neither the counter nor `clearTimeout` can cancel a call already in
 * flight when the component unmounts mid-request.
 */
export function useSunnerSuggest(
  query: string | null,
  { enabled = true }: SunnerSuggestOptions = {},
): SunnerSuggestState {
  const [options, setOptions] = useState<SearchSunnersResult>([]);
  // The query a result (success OR failure) has actually SETTLED for —
  // compared against the current `trimmed` below to DERIVE `loading`,
  // rather than a separate `useState<boolean>` the effect would have to
  // flip on synchronously (`react-hooks/set-state-in-effect`: setState
  // must not run directly in an effect body, only from an async callback
  // — deriving `loading` needs no such call at all). A revisited query
  // that has already settled once briefly shows its last-known result
  // without a loading flicker while it re-fetches — an accepted, minor
  // trade-off for staying off that anti-pattern.
  const [settledQuery, setSettledQuery] = useState<string | null>(null);
  const sequenceRef = useRef(0);
  const isMountedRef = useRef(true);

  const trimmed = query?.trim() ?? "";
  // `isActive` gates the PUBLICLY returned state below as well as the
  // effect — a disabled/too-short query masks straight to the empty
  // result at render time instead of the effect resetting state on every
  // such render.
  const isActive = enabled && trimmed.length >= MIN_QUERY_LENGTH;
  const loading = isActive && settledQuery !== trimmed;

  useEffect(() => {
    // React Strict Mode (on by default under `next dev`, which is what
    // Playwright's webServer runs) double-invokes every mount effect —
    // run → cleanup → run again — so the cleanup below setting this to
    // `false` must be undone on the SECOND run, or it stays `false`
    // forever and every later `setOptions`/`setSettledQuery` inside the
    // debounced `.then()` gets silently dropped by the guard.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      // Invalidate any request already in flight so its response, if it
      // arrives later, cannot resurrect stale options past this point.
      sequenceRef.current += 1;
      return;
    }

    const requestId = ++sequenceRef.current;

    const timeoutId = setTimeout(() => {
      void searchSunners(trimmed)
        .then((result) => {
          if (isMountedRef.current && sequenceRef.current === requestId) {
            setOptions(result);
            setSettledQuery(trimmed);
          }
        })
        .catch(() => {
          if (isMountedRef.current && sequenceRef.current === requestId) {
            setOptions([]);
            setSettledQuery(trimmed);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [trimmed, isActive]);

  return {
    options: isActive ? options : [],
    loading,
  };
}

export type RecipientSearch = {
  query: string;
  setQuery: (value: string) => void;
  options: SearchSunnersResult;
  loading: boolean;
  select: (option: SunnerSuggestion) => void;
  reset: () => void;
};

/**
 * The recipient combobox's search half (C21), built on `useSunnerSuggest`
 * above — kept in this file rather than `use-kudos-compose-form.ts` so
 * that hook stays under its 200-line budget (a deviation noted in the
 * phase's decisions report). Typing re-opens the dropdown; `select` closes
 * it (by disabling the search until the query is edited again) and reports
 * `option` up to the caller, which owns where the SELECTED recipient
 * actually lives — the compose draft, not here.
 */
export function useRecipientSearch(
  onSelectionChange: (option: SunnerSuggestion | null) => void,
): RecipientSearch {
  const [query, setQueryState] = useState("");
  const [hasSelection, setHasSelection] = useState(false);
  const { options, loading } = useSunnerSuggest(query, {
    enabled: !hasSelection,
  });

  function setQuery(value: string): void {
    setQueryState(value);
    if (hasSelection) {
      setHasSelection(false);
      onSelectionChange(null);
    }
  }

  function select(option: SunnerSuggestion): void {
    setQueryState(option.fullName ?? "");
    setHasSelection(true);
    onSelectionChange(option);
  }

  function reset(): void {
    setQueryState("");
    setHasSelection(false);
  }

  return { query, setQuery, options, loading, select, reset };
}
