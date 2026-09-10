"use client";

import {
  HERO_SEARCH_MAX_LENGTH,
  useHeroProfileSearch,
} from "../_hooks/use-hero-profile-search";
import type { KudosHeroSearchCopy } from "../_shared/build-kudos-copy";

import { KudosHeroSearchPill } from "./kudos-hero-search-pill";
import type { KudosSunnerOption } from "./kudos-sunner-options";

import type { SunnerSuggestion } from "@/dal/sunner-search";

export type KudosHeroProfileSearchProps = {
  copy: KudosHeroSearchCopy;
  /** `viewerId !== null`, resolved server-side in `page.tsx` — the same prop
   * `KudosComposeLauncher` takes, threaded from `KudosKeyvisualBand`. */
  isSignedIn: boolean;
};

/** `SunnerSuggestion.fullName` is `string | null`; the dropdown's option text
 * is a plain `string`. Coalesced here the same way
 * `kudos-compose-form.tsx`'s `toSunnerFieldOption` does for the recipient
 * field, so both search surfaces render a nameless row identically. */
function toSunnerOption(option: SunnerSuggestion): KudosSunnerOption {
  return { ...option, fullName: option.fullName ?? "" };
}

/**
 * Stateful half of the KV-band Sunner-profile search — the same split
 * `kudos-compose-launcher.tsx` uses for the compose pill: this file owns the
 * hook, `KudosHeroSearchPill` stays presentational (and keeps its Storybook
 * story renderable without a Server Action).
 *
 * An anonymous visitor gets `signInHint` in place of `empty`: `/kudos` is a
 * public route but `profile_cards` is `authenticated`-only, so a search that
 * ran for them would always come back empty — saying "no match" there would
 * be a lie about the data rather than a statement about the query.
 */
export function KudosHeroProfileSearch({
  copy,
  isSignedIn,
}: KudosHeroProfileSearchProps) {
  const search = useHeroProfileSearch({ isSignedIn });

  return (
    <KudosHeroSearchPill
      placeholder={copy.placeholder}
      ariaLabel={copy.ariaLabel}
      query={search.query}
      onQueryChange={search.setQuery}
      maxLength={HERO_SEARCH_MAX_LENGTH}
      options={search.options.map(toSunnerOption)}
      loading={search.loading}
      isOpen={search.isOpen}
      loadingLabel={copy.loading}
      emptyLabel={isSignedIn ? copy.empty : copy.signInHint}
      onSelect={search.openProfile}
      onDismiss={search.dismiss}
      onSubmit={search.submit}
    />
  );
}
