import type { getTranslations } from "next-intl/server";

import {
  HERO_TIERS,
  SECRET_BOX_BADGES,
  type StandardsCopy,
} from "./standards-copy";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Maps the `standards` i18n namespace (`messages/{vi,en}.json`) into the
 * `StandardsCopy` shape `StandardsScreen` (phase 04) renders.
 *
 * Deliberately its own file, never folded into `_shared/standards-copy.ts`:
 * that file is imported by `StandardsScreen`, a component that ships in the
 * client bundle, so `getTranslations` (server-only, `next-intl/server`)
 * must never land there — doing so would drag `next-intl/server` into the
 * client bundle. Only `page.tsx` (a Server Component) calls this function.
 *
 * Maps over `HERO_TIERS`/`SECRET_BOX_BADGES` instead of hand-typing each of
 * the 4 + 6 leaves, so a slug rename in `standards-copy.ts` updates both
 * sides at once — the exact trap the phase 05 risk assessment calls out.
 */
export function buildStandardsCopy(t: Translator): StandardsCopy {
  return {
    title: t("title"),
    heroSection: {
      heading: t("heroSection.heading"),
      intro: t("heroSection.intro"),
      tiers: Object.fromEntries(
        HERO_TIERS.map((tier) => [
          tier.slug,
          {
            alt: t(`heroSection.tiers.${tier.slug}.alt`),
            condition: t(`heroSection.tiers.${tier.slug}.condition`),
            description: t(`heroSection.tiers.${tier.slug}.description`),
          },
        ]),
      ) as StandardsCopy["heroSection"]["tiers"],
    },
    secretBoxSection: {
      heading: t("secretBoxSection.heading"),
      intro: t("secretBoxSection.intro"),
      badges: Object.fromEntries(
        SECRET_BOX_BADGES.map((badge) => [
          badge.slug,
          { caption: t(`secretBoxSection.badges.${badge.slug}.caption`) },
        ]),
      ) as StandardsCopy["secretBoxSection"]["badges"],
      closing: t("secretBoxSection.closing"),
    },
    nationKudosSection: {
      heading: t("nationKudosSection.heading"),
      body: t("nationKudosSection.body"),
    },
    footer: {
      close: t("footer.close"),
      writeKudos: t("footer.writeKudos"),
    },
  };
}
