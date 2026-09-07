export type KudosEmptyStateProps = {
  /** Caller-supplied string (BR-011) — never hard-coded here. The feed
   * (C07/C17) and the highlight carousel (phase 09) render this SAME
   * component with the SAME `kudos.feed.empty` copy, so C07's assertion of
   * exactly 2 `[data-testid=kudos-empty]` nodes holds without either
   * caller duplicating the markup. */
  message: string;
};

/**
 * Shared empty state for both ALL KUDOS (`kudos-feed.tsx`, C07/C17) and the
 * highlight carousel (phase 09) — no single Figma frame draws this state
 * (every mock frame has content), so typography mirrors the sibling
 * `kudos-leaderboard.tsx` empty row (`Chưa có dữ liệu`) for visual
 * consistency across the screen's own empty states.
 */
export function KudosEmptyState({ message }: KudosEmptyStateProps) {
  return (
    <p
      data-testid="kudos-empty"
      className="w-full py-10 text-center font-montserrat text-base font-semibold text-white"
    >
      {message}
    </p>
  );
}
