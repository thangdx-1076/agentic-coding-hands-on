import type { HeroTierSlug } from "@/constants/hero-tiers";

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
  /** One entry per `HeroTierSlug`, in the hover card the badge opens: the
   * tier's name, how it is earned, and what it means. Same words
   * `/standards` prints, read from the same `standards.heroSection.tiers.*`
   * messages — a badge must not explain itself differently on two screens. */
  heroTiers: Record<HeroTierSlug, HeroTierCopy>;
  /** The card an avatar opens on hover. */
  personHover: KudosPersonHoverCopy;
};

export type KudosPersonHoverCopy = {
  /** Prefix before the Sunner's unit, e.g. `"Tên đơn vị:"`. */
  unitLabel: string;
  receivedLabel: string;
  sentLabel: string;
  sendKudo: string;
  /** Fallback heading when a Sunner has no name on record. */
  unknownName: string;
};

export type HeroTierCopy = {
  label: string;
  condition: string;
  description: string;
};

export const defaultKudosCopy: KudosCopy = {
  detail: "Xem chi tiết",
  copyLink: "Copy Link",
  copiedToast: "Link copied — ready to share!",
  heartLabel: "{count} lượt tim",
  signInToHeart: "Đăng nhập để thả tim",
  heroTiers: {
    newHero: {
      label: "New Hero",
      condition: "Có 1-4 người gửi Kudos cho bạn",
      description:
        "Hành trình lan tỏa điều tốt đẹp bắt đầu – những lời cảm ơn và ghi nhận đầu tiên đã tìm đến bạn.",
    },
    risingHero: {
      label: "Rising Hero",
      condition: "Có 5-9 người gửi Kudos cho bạn",
      description:
        "Hình ảnh bạn đang lớn dần trong trái tim đồng đội bằng sự tử tế và cống hiến của mình.",
    },
    superHero: {
      label: "Super Hero",
      condition: "Có 10–20 người gửi Kudos cho bạn",
      description:
        "Bạn đã trở thành biểu tượng được tin tưởng và yêu quý, người luôn sẵn sàng hỗ trợ và được nhiều đồng đội nhớ đến.",
    },
    legendHero: {
      label: "Legend Hero",
      condition: "Có hơn 20 người gửi Kudos cho bạn",
      description:
        "Bạn đã trở thành huyền thoại – người để lại dấu ấn khó quên trong tập thể bằng trái tim và hành động của mình.",
    },
  },
  personHover: {
    unitLabel: "Tên đơn vị:",
    receivedLabel: "Số Kudos nhận được:",
    sentLabel: "Số Kudos đã gửi:",
    sendKudo: "Gửi KUDO",
    unknownName: "Sunner",
  },
};
