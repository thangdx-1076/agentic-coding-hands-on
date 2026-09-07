export type KudosFeedSentinelProps = {
  /** `useInfiniteFeed` (phase 06)'s own callback ref — this component
   * never creates or owns a scroll observer of its own (Out of scope). */
  sentinelRef: (node: Element | null) => void;
};

/**
 * ALL KUDOS infinite-scroll trigger (C18/C19). Rendered by `kudos-feed.tsx`
 * ONLY while `hasMore` is true — the caller unmounts this element entirely
 * once the feed runs out of pages, which is exactly what C19 observes
 * ("sentinel biến mất khỏi DOM", not merely hidden).
 *
 * Deliberately a real, separate element with non-zero height (not the last
 * card, not `height: 0`) — the phase's own Key Insights: a zero-height or
 * list-final sentinel either never intersects the viewport or gets
 * recycled away the moment a new page appends, and the observer loses its
 * target either way.
 */
export function KudosFeedSentinel({ sentinelRef }: KudosFeedSentinelProps) {
  return (
    <div
      data-testid="kudos-feed-sentinel"
      ref={sentinelRef}
      aria-hidden="true"
      className="h-10 w-full shrink-0"
    />
  );
}
