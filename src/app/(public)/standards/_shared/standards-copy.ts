import type { HeroTierSlug } from "@/constants/hero-tiers";

/**
 * Presentational copy contract for `/standards` (mm:3204:6051 "Thể lệ UPDATE",
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6).
 *
 * Shape mirrors the `standards` i18n namespace exactly (`messages/vi.json` /
 * `messages/en.json`) — phase 05's `build-standards-copy.ts` maps those keys
 * 1:1 into this type, the same relationship `awards-copy.ts` has with
 * `awards/page.tsx`'s `buildCopy`.
 *
 * `HERO_TIERS` and `SECRET_BOX_BADGES` are the single structural source for
 * asset path + intrinsic width/height — `StandardsScreen`, `buildCopy`
 * (phase 05), and the stories below all map over these two tables instead of
 * repeating the numbers, which is exactly the "width or height modified"
 * `next/image` trap `/awards` hit once already.
 */
export type StandardsCopy = {
  title: string;
  heroSection: {
    heading: string;
    intro: string;
    tiers: Record<
      HeroTierSlug,
      { alt: string; condition: string; description: string }
    >;
  };
  secretBoxSection: {
    heading: string;
    intro: string;
    badges: Record<SecretBoxBadgeSlug, { caption: string }>;
    closing: string;
  };
  nationKudosSection: { heading: string; body: string };
  footer: { close: string; writeKudos: string };
};

/** Re-exported from the shared table (`@/constants/hero-tiers`), which is
 * where these moved once `/kudos` needed the same four badges on its cards.
 * Kept as re-exports so this segment's existing importers do not change. */
export type {
  HeroTierSlug,
  HeroTierAsset as HeroTier,
} from "@/constants/hero-tiers";
export { HERO_TIERS } from "@/constants/hero-tiers";

export type SecretBoxBadgeSlug =
  | "revival"
  | "touchOfLight"
  | "stayGold"
  | "flowToHorizon"
  | "beyondTheBoundary"
  | "rootFurther";

export type SecretBoxBadge = {
  slug: SecretBoxBadgeSlug;
  asset: string;
  width: number;
  height: number;
};

/** Every badge's artwork is the same 64x64 circle — see `SECRET_BOX_BADGES`. */
export const SECRET_BOX_BADGE_SIZE = 64;

/**
 * Order REVIVAL → TOUCH OF LIGHT → STAY GOLD → FLOW TO HORIZON →
 * BEYOND THE BOUNDARY → ROOT FURTHER (C5).
 *
 * All 6 assets are the badge's 64x64 circle and nothing else. The raw
 * MoMorph export is the whole 80x88/80x104 instance box, which rasterizes
 * the caption INTO the image — pairing that with the DOM caption below
 * printed every name twice on the page, and for this badge printed two
 * different spellings ("ROOT FUTHER" baked in, "ROOT FURTHER" in the DOM).
 * The assets are therefore cropped to each badge's inner `Huy hiệu` frame
 * (`get_node`, 64x64 for all 6), leaving the caption to `SecretBoxBadge`'s
 * `<p>` alone — which is also what contract C5 asserts.
 */
const SECRET_BOX_BADGE_SLUGS: [SecretBoxBadgeSlug, string][] = [
  ["revival", "/standards/badge-revival.png"],
  ["touchOfLight", "/standards/badge-touch-of-light.png"],
  ["stayGold", "/standards/badge-stay-gold.png"],
  ["flowToHorizon", "/standards/badge-flow-to-horizon.png"],
  ["beyondTheBoundary", "/standards/badge-beyond-the-boundary.png"],
  ["rootFurther", "/standards/badge-root-further.png"],
];

export const SECRET_BOX_BADGES: SecretBoxBadge[] = SECRET_BOX_BADGE_SLUGS.map(
  ([slug, asset]) => ({
    slug,
    asset,
    width: SECRET_BOX_BADGE_SIZE,
    height: SECRET_BOX_BADGE_SIZE,
  }),
);

/**
 * Storybook-only fixture. Heading, the 4 condition lines, and the 6 badge
 * captions are copied **verbatim** from `messages/vi.json` — these are the
 * strings `tests/e2e/standards.spec.ts` asserts on, plus the two "trap"
 * characters (en-dash in "10–20", ❤️ in the two body paragraphs) and the
 * `ROOT FURTHER` spelling correction (layer name says "ROOT FUTHER";
 * `character` on `I3204:6088;737:20392` says "ROOT FURTHER" — see
 * clarifications.md). The 4 tier descriptions + the 2 intro/closing
 * paragraphs are SHORTENED here to avoid duplicating the full copy that
 * already lives in `messages/vi.json` — real content flows through phase
 * 05's `buildCopy`, never hardcoded in this file.
 */
export const sampleStandardsCopy: StandardsCopy = {
  title: "Thể lệ",
  heroSection: {
    heading: "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC",
    intro: "Dựa trên số lượng Kudos, bạn sẽ sở hữu Huy hiệu Hero tương ứng.",
    tiers: {
      newHero: {
        alt: "New Hero",
        condition: "Có 1-4 người gửi Kudos cho bạn",
        description: "Hành trình lan tỏa điều tốt đẹp bắt đầu.",
      },
      risingHero: {
        alt: "Rising Hero",
        condition: "Có 5-9 người gửi Kudos cho bạn",
        description: "Hình ảnh bạn đang lớn dần trong trái tim đồng đội.",
      },
      superHero: {
        alt: "Super Hero",
        condition: "Có 10–20 người gửi Kudos cho bạn",
        description: "Bạn đã trở thành biểu tượng được tin tưởng và yêu quý.",
      },
      legendHero: {
        alt: "Legend Hero",
        condition: "Có hơn 20 người gửi Kudos cho bạn",
        description: "Bạn đã trở thành huyền thoại.",
      },
    },
  },
  secretBoxSection: {
    heading:
      "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN",
    intro:
      "Mỗi lời Kudos bạn gửi sẽ nhận về những lượt ❤️ từ cộng đồng Sunner.",
    badges: {
      revival: { caption: "REVIVAL" },
      touchOfLight: { caption: "TOUCH OF LIGHT" },
      stayGold: { caption: "STAY GOLD" },
      flowToHorizon: { caption: "FLOW TO HORIZON" },
      beyondTheBoundary: { caption: "BEYOND THE BOUNDARY" },
      rootFurther: { caption: "ROOT FURTHER" },
    },
    closing: "Những Sunner thu thập trọn bộ 6 icon sẽ nhận một phần quà bí ẩn.",
  },
  nationKudosSection: {
    heading: "KUDOS QUỐC DÂN",
    body: "5 Kudos nhận nhiều ❤️ nhất toàn Sun* sẽ trở thành Kudos Quốc Dân.",
  },
  footer: { close: "Đóng", writeKudos: "Viết KUDOS" },
};
