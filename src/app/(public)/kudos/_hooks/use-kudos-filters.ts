"use client";

import { useRouter } from "next/navigation";

import type { KudosFilterState } from "../_components/kudos-filter-menu";

import { ROUTES } from "@/constants/routes";

export type KudosFilterValues = {
  hashtag: string | null;
  department: string | null;
};

export type KudosFilters = {
  hashtagFilter: KudosFilterState;
  departmentFilter: KudosFilterState;
  /** Clicking a hashtag on a card is the same act as picking it in the
   * dropdown (BR-003), so it reuses that filter's own `onSelect`. */
  selectHashtag: (tag: string) => void;
};

/** The `/kudos` URL carrying `current` plus `next`'s overrides. A key
 * absent from `next` keeps its current value; a `null` clears it. */
export function buildKudosUrl(
  current: KudosFilterValues,
  next: Partial<KudosFilterValues>,
): string {
  const hashtag = "hashtag" in next ? next.hashtag : current.hashtag;
  const department =
    "department" in next ? next.department : current.department;
  const params = new URLSearchParams();
  if (hashtag) params.set("hashtag", hashtag);
  if (department) params.set("department", department);
  const qs = params.toString();
  return qs ? `${ROUTES.KUDOS}?${qs}` : ROUTES.KUDOS;
}

/** One `KudosFilterState` for `hashtag` or `department` (AD-4: URL-driven,
 * never local state) — only the query key differs between the two. */
function makeFilter(
  key: keyof KudosFilterValues,
  label: string,
  options: string[],
  current: KudosFilterValues,
  push: (url: string) => void,
): KudosFilterState {
  return {
    label,
    options,
    selected: current[key],
    onSelect: (value) => push(buildKudosUrl(current, { [key]: value })),
    onClear: () => push(buildKudosUrl(current, { [key]: null })),
  };
}

/**
 * Both dropdowns of the `/kudos` filter bar, wired to the router rather
 * than to local state (AD-4): every selection or clear is a `push` of the
 * next query string, so a filtered board stays shareable and survives a
 * reload. `current` is what the Server Component already read out of
 * `searchParams` — this hook never reads them itself.
 */
export function useKudosFilters(
  current: KudosFilterValues,
  labels: { hashtag: string; department: string },
  options: { hashtags: string[]; departments: string[] },
): KudosFilters {
  const router = useRouter();
  const push = (url: string) => router.push(url);

  const hashtagFilter = makeFilter(
    "hashtag",
    labels.hashtag,
    options.hashtags,
    current,
    push,
  );
  const departmentFilter = makeFilter(
    "department",
    labels.department,
    options.departments,
    current,
    push,
  );

  return {
    hashtagFilter,
    departmentFilter,
    selectHashtag: hashtagFilter.onSelect,
  };
}
