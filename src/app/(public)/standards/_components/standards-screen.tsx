import {
  HERO_TIERS,
  SECRET_BOX_BADGES,
  type StandardsCopy,
} from "../_shared/standards-copy";

import { HeroBadgeTierRow } from "./hero-badge-tier-row";
import { SecretBoxBadge } from "./secret-box-badge";
import { StandardsFooterActions } from "./standards-footer-actions";

import { montserrat } from "@/styles/fonts";

export type StandardsScreenProps = {
  copy: StandardsCopy;
  onClose: () => void;
};

const heading =
  "font-montserrat text-[22px] leading-7 font-bold text-login-button";
const body =
  "font-montserrat text-base leading-6 font-bold tracking-[0.5px] text-white";

/**
 * Root composition of the "Thể lệ" screen (mm:3204:6051,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6).
 * Presentational only — phase 05's `standards-client.tsx`/`page.tsx` own
 * `onClose` (via `useStandardsClose`) and `copy` (via `buildCopy` reading
 * `messages/{vi,en}.json`); this component never touches i18n, routing, or
 * Supabase.
 *
 * Deliberately does NOT wrap `SiteHeader`/`SiteFooter`/`KeyvisualBackground`
 * — the design draws no chrome for this screen (clarifications.md § Session
 * bổ sung), so the page starts directly at the panel title. `<main>` is the
 * SOLE scroll container (`h-dvh overflow-y-auto`) — C8/C9 assert
 * `main.scrollTop`/`scrollHeight` directly, so window scroll would fail both
 * silently. The action bar below is a plain sticky `<div>`, never a
 * `<footer>` (C2 asserts 0 `<footer>` site-wide).
 *
 * Document order mirrors `tests/e2e/standards.spec.ts`: `<h1>` → 3
 * `<section>` (hero tiers → secret-box badges → nation kudos) → sticky
 * footer action bar.
 */
export function StandardsScreen({ copy, onClose }: StandardsScreenProps) {
  return (
    // mm:3204:6051
    <main
      className={`${montserrat.variable} h-dvh w-full overflow-y-auto bg-login-background`}
    >
      {/* mm:3204:6053 — panel bám phải, tỉ lệ theo design 1440 (473px nội dung + padding) */}
      <div className="ml-auto flex w-full max-w-[552px] flex-col gap-6 px-8 pt-8">
        {/* mm:3204:6055 */}
        <h1 className="font-montserrat text-[45px] leading-[52px] font-bold text-login-button">
          {copy.title}
        </h1>

        {/* mm:3204:6131 */}
        <section className="flex flex-col gap-6">
          <h2 className={heading}>{copy.heroSection.heading}</h2>
          <p className={body}>{copy.heroSection.intro}</p>
          <div className="flex flex-col gap-4">
            {HERO_TIERS.map((tier) => (
              <HeroBadgeTierRow
                key={tier.slug}
                tier={tier}
                copy={copy.heroSection.tiers[tier.slug]}
              />
            ))}
          </div>
        </section>

        {/* mm:3204:6077 */}
        <section className="flex flex-col gap-6">
          <h2 className={heading}>{copy.secretBoxSection.heading}</h2>
          <p className={body}>{copy.secretBoxSection.intro}</p>
          {/* mm:3204:6079 — 3 cột × 2 hàng */}
          <ul className="grid grid-cols-3 gap-x-6 gap-y-6">
            {SECRET_BOX_BADGES.map((badge) => (
              <SecretBoxBadge
                key={badge.slug}
                badge={badge}
                caption={copy.secretBoxSection.badges[badge.slug].caption}
              />
            ))}
          </ul>
          <p className={body}>{copy.secretBoxSection.closing}</p>
        </section>

        {/* mm:3204:6090 */}
        <section className="flex flex-col gap-4 pb-8">
          <h2 className="font-montserrat text-2xl leading-8 font-bold text-login-button">
            {copy.nationKudosSection.heading}
          </h2>
          <p className={body}>{copy.nationKudosSection.body}</p>
        </section>
      </div>

      {/* mm:3204:6092 — sticky trong main, không phải <footer> */}
      <div className="sticky bottom-0 ml-auto w-full max-w-[552px]">
        <StandardsFooterActions copy={copy.footer} onClose={onClose} />
      </div>
    </main>
  );
}
