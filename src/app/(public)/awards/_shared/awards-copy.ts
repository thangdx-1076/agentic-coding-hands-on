import {
  defaultSiteChromeCopy,
  type SiteChromeCopy,
} from "../../../_shared/site-chrome";

import type { Award } from "@/dal/awards";

/**
 * Presentational copy contract for `/awards` (mm:313:8436 "Hệ thống giải",
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD).
 * `AwardsCopy` composes `SiteChromeCopy` back the same way `HomeCopy` does
 * (`(home)/_shared/home-copy.ts`) — one `copy` object still flows through
 * `SiteHeader`/`SiteFooter`/`KudosSection` unchanged.
 *
 * `caption` deliberately keeps lower-case "annual" (design node 313:8454
 * renders "Sun* Annual Awards 2025", capitalized) — the Homepage's own
 * `awards.caption` already accepted "Sun* annual awards 2025" as the content
 * override for this exact phrase (`(home)/_shared/home-copy.ts:95`), and
 * `tests/e2e/awards.spec.ts` TC ID-4 asserts that same lower-case string.
 * Re-deriving a different case here would fork one phrase into two
 * spellings across the site for no reason.
 */
export type AwardsCopy = SiteChromeCopy & {
  caption: string;
  heading: string;
  navAriaLabel: string;
  quantityLabel: string;
  prizeLabel: string;
  empty: string;
};

export const defaultAwardsCopy: AwardsCopy = {
  ...defaultSiteChromeCopy,
  caption: "Sun* annual awards 2025",
  heading: "Hệ thống giải thưởng SAA 2025",
  navAriaLabel: "Danh mục giải thưởng",
  quantityLabel: "Số lượng giải thưởng:",
  prizeLabel: "Giá trị giải thưởng:",
  // Fail-open empty state (clarifications.md § Supabase fail thì trang hiển
  // thị gì) — design has no artwork for this state, so this is a plain,
  // necessary responsive/content inference, not an invented data value.
  empty: "Chưa có thông tin giải thưởng. Vui lòng quay lại sau.",
};

/**
 * Storybook-only fixture — 3 of the 6 categories with SHORTENED
 * descriptions, enough to demonstrate the alternating image/content layout
 * (odd index = image left, even index = image right) without duplicating
 * the full 6-award seed copy that already lives in the DB
 * (`plans/260906-2258-award-system-page/spec/award-seed-content.md`). Real
 * content is fetched by phase 06's `page.tsx` via `getAwards()`, never
 * hardcoded here.
 */
export const sampleAwards: Award[] = [
  {
    slug: "top-talent",
    title: "Top Talent",
    description:
      "Giải thưởng Top Talent vinh danh những cá nhân xuất sắc toàn diện – những người không ngừng khẳng định năng lực chuyên môn vững vàng, hiệu suất công việc vượt trội.",
    quantityValue: "10",
    quantityUnit: "Cá nhân",
    prizeValues: [{ amount: "7.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "top-project",
    title: "Top Project",
    description:
      "Giải thưởng Top Project vinh danh các tập thể dự án xuất sắc với kết quả kinh doanh vượt kỳ vọng, hiệu quả vận hành tối ưu và tinh thần làm việc tận tâm.",
    quantityValue: "02",
    quantityUnit: "Tập thể",
    prizeValues: [{ amount: "15.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "signature-2025-creator",
    title: "Signature 2025 - Creator",
    description:
      "Giải thưởng Signature vinh danh cá nhân hoặc tập thể thể hiện tinh thần đặc trưng mà Sun* hướng tới trong từng thời kỳ.\n\nTrong năm 2025, giải thưởng Signature vinh danh Creator.",
    quantityValue: "01",
    quantityUnit: "Cá nhân hoặc tập thể",
    prizeValues: [
      { amount: "5.000.000 VNĐ", note: "cho giải cá nhân" },
      { amount: "8.000.000 VNĐ", note: "cho giải tập thể" },
    ],
  },
];
