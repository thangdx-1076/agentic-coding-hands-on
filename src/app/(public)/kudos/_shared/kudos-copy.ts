/**
 * Presentational copy contract for the shared `KudosCard` (mm:B.3_KUDO -
 * Highlight `2940:13465`, mm:C.3_KUDO Post `3127:21871`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ).
 *
 * Scoped to only the strings the card itself renders — unlike
 * `awards-copy.ts`/`standards-copy.ts` this does NOT compose
 * `SiteChromeCopy`: the card never renders header/footer chrome, so pulling
 * that type in would be dead weight. Real values come from
 * `messages/{vi,en}.json`'s `kudos.feed.*` namespace via phase 13's
 * `page.tsx`; `defaultKudosCopy` below is the static fallback Storybook and
 * this component's own tests use, never fetched or computed here.
 */
export type KudosCopy = {
  /** mm:B.4.4/C.4 "Xem chi tiết" — always rendered `disabled` (§ Out of scope). */
  detail: string;
  /** mm:C.4.2_Copy link button "Copy Link". */
  copyLink: string;
  /** Toast text on successful copy — English in both `vi`/`en` per design. */
  copiedToast: string;
  /**
   * Accessible label template for the heart count, e.g. `"{count} lượt
   * tim"`. NEVER used for the visible `kudos-card-heart-count` text itself
   * (C25 parses that as a plain integer) — only for `aria-label`.
   */
  heartLabel: string;
  /** Title shown on the heart button when the viewer is anonymous (FR-602). */
  signInToHeart: string;
};

export const defaultKudosCopy: KudosCopy = {
  detail: "Xem chi tiết",
  copyLink: "Copy Link",
  copiedToast: "Link copied — ready to share!",
  heartLabel: "{count} lượt tim",
  signInToHeart: "Đăng nhập để thả tim",
};
