import {
  defaultSiteChromeCopy,
  type SiteChromeCopy,
} from "../../../_shared/site-chrome";

/**
 * Presentational copy contract for `/profile` (mm:362:5037 "Profile bản
 * thân", https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb).
 * Shape mirrors the `profile` i18n namespace exactly (`messages/vi.json` /
 * `messages/en.json`, written by phase 04) — phase 07's `build-profile-copy.ts`
 * maps those keys 1:1 into this type, the same relationship `AwardsCopy` has
 * with `awards/page.tsx`'s `buildCopy`. Composes `SiteChromeCopy` because
 * this screen (unlike `/standards`) renders `SiteHeader`/`SiteFooter`.
 */
export type ProfileCopy = SiteChromeCopy & {
  hero: { fallbackName: string };
  badges: { headingSelf: string; headingOther: string };
  stats: {
    rows: Record<StatisticsRowKey, string>;
    openSecretBox: string;
    writeKudos: string;
  };
  /**
   * `messages/{vi,en}.json`'s `profile.kudos` namespace, mapped to a
   * distinct TS field name here — `SiteChromeCopy` already declares its own
   * unrelated `kudos` field (the "Sun* Kudos" marketing widget copy used by
   * `KudosSection` on `/`/`/awards`), so reusing the same key would collide
   * under the `&` intersection below (TS2322).
   */
  kudosDirection: {
    receivedLabel: string;
    sentLabel: string;
    emptyReceived: string;
    emptySent: string;
  };
};

export type StatisticsRowKey =
  "received" | "sent" | "hearts" | "secretBoxOpened" | "secretBoxLeft";

/**
 * 5-row structure for the statistics card (mm:362:5076-362:5081) — a
 * structured table, not 5 hand-copied JSX blocks (Key Insights, phase-05
 * plan). `dividerAfter` places the 1px hairline (mm:362:5079) between row 3
 * ("hearts") and row 4 ("secretBoxOpened") — the only divider the design
 * draws (GUI_004, C6).
 */
export type StatisticsRow = { key: StatisticsRowKey; dividerAfter: boolean };

export const STATISTICS_ROWS: StatisticsRow[] = [
  { key: "received", dividerAfter: false },
  { key: "sent", dividerAfter: false },
  { key: "hearts", dividerAfter: true },
  { key: "secretBoxOpened", dividerAfter: false },
  { key: "secretBoxLeft", dividerAfter: false },
];

export type BadgeSlotSlug =
  | "badgeSlot1"
  | "badgeSlot2"
  | "badgeSlot3"
  | "badgeSlot4"
  | "badgeSlot5"
  | "badgeSlot6";

export type BadgeSlot = {
  slug: BadgeSlotSlug;
  asset: string;
  width: number;
  height: number;
};

/** Every slot's artwork is the same 64x64 circle (mm:I362:5066;3053:10046). */
export const BADGE_SLOT_SIZE = 64;

/**
 * 6 fixed slots (mm:362:5066-362:5071), always locked. Node ids carry no
 * semantic name for these slots (unlike F005's 6 named secret-box badges) —
 * technical-spec.md § 5.2 says to invent technical slugs and keep the count
 * at 6. Artwork reuses the 6 secret-box PNGs already shipped with F005
 * (`public/standards/badge-*.png`, all confirmed 64x64) since no distinct
 * profile-badge artwork exists yet; `BadgeCollection` renders each through a
 * CSS `grayscale` filter so a locked slot never looks identical to an
 * unlocked secret-box badge on `/standards`.
 */
const BADGE_SLOT_ROWS: [BadgeSlotSlug, string][] = [
  ["badgeSlot1", "/standards/badge-revival.png"],
  ["badgeSlot2", "/standards/badge-touch-of-light.png"],
  ["badgeSlot3", "/standards/badge-stay-gold.png"],
  ["badgeSlot4", "/standards/badge-flow-to-horizon.png"],
  ["badgeSlot5", "/standards/badge-beyond-the-boundary.png"],
  ["badgeSlot6", "/standards/badge-root-further.png"],
];

export const BADGE_SLOTS: BadgeSlot[] = BADGE_SLOT_ROWS.map(
  ([slug, asset]) => ({
    slug,
    asset,
    width: BADGE_SLOT_SIZE,
    height: BADGE_SLOT_SIZE,
  }),
);

export type KudosDirection = "received" | "sent";

/** Self offers both; other offers Received only — SEC_001 closes the leak
 * by removing "sent" from this list entirely, not by disabling/hiding it. */
export const KUDOS_DIRECTIONS: KudosDirection[] = ["received", "sent"];

/**
 * Storybook-only fixture, copied verbatim from `messages/vi.json`'s
 * `profile` namespace (phase 04) — the same strings
 * `tests/e2e/profile.spec.ts` asserts on. Real content flows through phase
 * 07's `buildProfileCopy`, never hardcoded elsewhere.
 */
export const sampleProfileCopy: ProfileCopy = {
  ...defaultSiteChromeCopy,
  hero: { fallbackName: "Sunner" },
  badges: {
    headingSelf: "Bộ sưu tập icon của tôi",
    headingOther: "Bộ sưu tập icon",
  },
  stats: {
    rows: {
      received: "Số Kudos bạn nhận được:",
      sent: "Số Kudos bạn đã gửi:",
      hearts: "Số tim bạn nhận được:",
      secretBoxOpened: "Số Secret Box bạn đã mở:",
      secretBoxLeft: "Số Secret Box chưa mở:",
    },
    openSecretBox: "Mở Secret Box 🎁",
    writeKudos: "Viết Kudo",
  },
  kudosDirection: {
    receivedLabel: "Đã nhận",
    sentLabel: "Đã gửi",
    emptyReceived: "Bạn chưa có Kudos nào được nhận.",
    emptySent: "Bạn chưa có Kudos nào được gửi.",
  },
};
