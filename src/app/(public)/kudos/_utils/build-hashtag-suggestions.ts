import { KUDOS_HASHTAG_MASTER } from "@/constants/kudos-hashtags";

/**
 * The compose picker's suggestion list: the Sun* master vocabulary first, then
 * whatever extra tags past kudos actually used.
 *
 * Why both halves. `derived` is `board.filters.hashtags` — every distinct tag
 * present in `public.kudos` (`kudos_filter_options`, migration 0014). On its
 * own it is a poor menu for WRITING a kudo: it can only ever offer tags
 * someone already typed, so a fresh board offers nothing, and it faithfully
 * propagates whatever was mistyped the first time (the demo seed's `Inspring`,
 * `0008_kudos_demo_seed.sql:117`). The master list alone is equally wrong — it
 * would hide tags the team genuinely uses. The union is what the picker wants;
 * the FILTER dropdown deliberately keeps using `derived` alone, since
 * filtering by a tag no kudo carries can only return an empty board.
 *
 * Order is master-first, then derived in its existing (`value`-sorted) order,
 * so the curated values sit at the top of the panel where they are seen.
 *
 * Matching is case-insensitive and trim-insensitive so a derived `dedicated`
 * or ` GO FAST ` does not produce a second row next to its master twin; the
 * FIRST spelling seen wins, which — given master comes first — means the
 * curated spelling is the one rendered.
 */
export function buildHashtagSuggestions(derived: string[]): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const tag of [...KUDOS_HASHTAG_MASTER, ...derived]) {
    const normalized = tag.trim().toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    suggestions.push(tag.trim());
  }

  return suggestions;
}
