"use client";

import { useMemo, useState } from "react";

/** Spec § 13 Configuration — `SUNNER_SEARCH_MAX_LENGTH = 100` (BR-010). */
const SUNNER_SEARCH_MAX_LENGTH = 100;

export type SpotlightSearch = {
  query: string;
  setQuery: (value: string) => void;
  matched: Set<string>;
  canSubmit: boolean;
};

/**
 * Drives the Spotlight "tìm Sunner" box (`B.7.3`, clarifications.md § D002):
 * filters the static scatter's already-loaded `names` in place — no
 * navigation, no server round trip, matching the decision that Spotlight
 * stays a static layout over real data rather than an interactive canvas.
 *
 * `matched` recomputes from `query` on every change; the UI's Enter/submit
 * affordance is cosmetic — nothing here waits for a submit event, so
 * typing alone already keeps the scatter's highlight in sync.
 *
 * The comparison is diacritic- and case-insensitive (`normalize("NFD")` +
 * stripping combining marks) so typing "Hiep" still matches "Đỗ hoàng
 * Hiệp" — the exact approach called out in the phase's Key Insights.
 */
export function useSpotlightSearch(names: readonly string[]): SpotlightSearch {
  const [query, setQueryState] = useState("");

  function setQuery(value: string): void {
    setQueryState(value.slice(0, SUNNER_SEARCH_MAX_LENGTH));
  }

  const matched = useMemo(() => {
    const needle = foldForCompare(query.trim());
    if (needle.length === 0) {
      return new Set<string>();
    }
    return new Set(
      names.filter((name) => foldForCompare(name).includes(needle)),
    );
  }, [names, query]);

  return {
    query,
    setQuery,
    matched,
    canSubmit: query.trim().length > 0,
  };
}

/** Case- and diacritic-insensitive comparison key for a Vietnamese name. */
function foldForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
