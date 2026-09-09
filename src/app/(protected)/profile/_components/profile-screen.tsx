import { SiteFooter } from "../../../_components/site-footer";
import { SiteHeader } from "../../../_components/site-header";
import type { SiteViewer } from "../../../_shared/site-chrome";
import { KUDOS_DIRECTIONS, type ProfileCopy } from "../_shared/profile-copy";

import { BadgeCollection } from "./badge-collection";
import { KudosDirectionSelect } from "./kudos-direction-select";
import { ProfileHero } from "./profile-hero";
import { ProfileStatisticsCard } from "./profile-statistics-card";

import type { ProfileCard } from "@/dal/profile-cards";
import { montserrat, montserratAlternates } from "@/styles/fonts";

export type ProfileScreenProps = {
  copy: ProfileCopy;
  profile: ProfileCard;
  isSelf: boolean;
  /** Never null — `/profile` only renders after `(protected)/layout.tsx`'s
   * gate, unlike `AwardsScreen`, which still accepts an anonymous visitor. */
  viewer: SiteViewer;
  locale?: "vi" | "en";
  onSelectLocale?: (locale: "vi" | "en") => void;
  logoutAction?: () => void | Promise<void>;
};

const KUDOS_EYEBROW_MAX_WIDTH = "max-w-[680px]";

/**
 * Root composition of "Profile bản thân" (mm:362:5037,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb).
 * Presentational only — phase 07's `page.tsx`/`profile-client.tsx` fetch
 * `profile` via `getProfileCard()` and resolve `isSelf`/`viewer`/locale;
 * this component never touches Supabase, `fetch`, `useEffect`, or cookies.
 *
 * Unlike `/standards` (F005), this screen DOES carry chrome — exactly 1
 * `<header>`/`<footer>` (C1), always the authenticated `SiteHeader` variant.
 *
 * Document order mirrors `tests/e2e/profile.spec.ts`: header → hero (avatar
 * + name only, no department/tier/stars — GUI_009, C3) → 6 locked badge
 * slots + heading below them (C4/C5) → statistics card **or** disabled
 * "Viết Kudo" bar, mutually exclusive (C8) → KUDOS header + direction
 * dropdown (C9/C10) → footer. No Kudos feed renders (`mms_D_Post all` stays
 * out of scope — deferred to F007+, C18 asserts 0 spam chips).
 */
export function ProfileScreen({
  copy,
  profile,
  isSelf,
  viewer,
  locale = "vi",
  onSelectLocale,
  logoutAction,
}: ProfileScreenProps) {
  const languageLabel = locale === "en" ? "EN" : "VN";
  const badgeHeading = isSelf
    ? copy.badges.headingSelf
    : copy.badges.headingOther;
  const directions = isSelf ? KUDOS_DIRECTIONS : (["received"] as const);

  return (
    // mm:362:5037
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col bg-login-background`}
    >
      <SiteHeader
        copy={copy}
        languageLabel={languageLabel}
        viewer={viewer}
        onSelectLocale={onSelectLocale}
        logoutAction={logoutAction}
      />
      <main className="relative flex w-full flex-1 flex-col items-center">
        {/* mm:362:5050 */}
        <ProfileHero profile={profile} copy={copy.hero} />

        <div className="flex w-full max-w-[1060px] flex-col items-center gap-16 px-6 pb-24 sm:px-8">
          {/* mm:362:5064 */}
          <BadgeCollection heading={badgeHeading} />
          {/* mm:362:5073 */}
          <ProfileStatisticsCard copy={copy.stats} isSelf={isSelf} />

          {/* mm:362:5084 */}
          <section
            className={`flex w-full ${KUDOS_EYEBROW_MAX_WIDTH} flex-col items-center gap-4`}
          >
            {/* mm:362:5085 — reuses `copy.header.logoAlt`, the same
                verbatim string ("Sun* Annual Awards 2025") the design
                confirms for this eyebrow (avoids a second copy key for an
                identical value). */}
            <p className="font-montserrat w-full text-left text-2xl leading-8 font-bold text-white">
              {copy.header.logoAlt}
            </p>
            {/* mm:362:5086 */}
            <div className="h-px w-full bg-login-divider" />
            {/* mm:362:5087 */}
            <div className="flex w-full flex-wrap items-center justify-between gap-8">
              {/* mm:362:5088 — "KUDOS" has no i18n key (brand word, same in
                  vi/en, like "Sun* Kudos" elsewhere in the chrome). */}
              <h2 className="font-montserrat text-[57px] leading-[64px] font-bold tracking-[-0.25px] text-login-button">
                KUDOS
              </h2>
              {/* mm:362:5089 */}
              <KudosDirectionSelect
                directions={[...directions]}
                copy={copy.kudosDirection}
              />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter copy={copy} />
    </div>
  );
}
