import type { getTranslations } from "next-intl/server";

import {
  STATISTICS_ROWS,
  type ProfileCopy,
  type StatisticsRowKey,
} from "./profile-copy";

import { LOCALE_LABEL, type AppLocale } from "@/lib/i18n/locale";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Maps the `home` (chrome), `profile` (screen), and `login` (footer reuse)
 * i18n namespaces into the `ProfileCopy` shape `ProfileScreen` (phase 05)
 * renders.
 *
 * Deliberately its own file, never folded into `_shared/profile-copy.ts`:
 * that file is imported by `ProfileScreen`, a component that ships in the
 * client bundle, so `getTranslations` (server-only, `next-intl/server`)
 * must never land there — doing so would drag `next-intl/server` into the
 * client bundle. Only `page.tsx` (a Server Component) calls this function —
 * same precedent as `build-standards-copy.ts`.
 *
 * `footer.copyright` reuses `tLogin("footer")` instead of duplicating the
 * string — same precedent as `awards/page.tsx`'s `buildCopy` and
 * `(home)/page.tsx`. Statistics rows are built by mapping over
 * `STATISTICS_ROWS` (the single source of row keys, phase 05) instead of
 * hand-typing each of the 5 leaves — the exact trap the phase-05 risk
 * assessment calls out.
 */
export function buildProfileCopy(
  tHome: Translator,
  tProfile: Translator,
  tLogin: Translator,
  locale: AppLocale,
): ProfileCopy {
  return {
    nav: {
      about: tHome("nav.about"),
      awardsInfo: tHome("nav.awardsInfo"),
      kudos: tHome("nav.kudos"),
    },
    header: {
      logoAlt: tHome("header.logoAlt"),
      languageLabel: LOCALE_LABEL[locale] as "VN" | "EN",
      loginLabel: tHome("header.loginLabel"),
      notificationsLabel: tHome("header.notificationsLabel"),
      accountLabel: tHome("header.accountLabel"),
    },
    kudos: {
      label: tHome("kudos.label"),
      heading: tHome("kudos.heading"),
      description: tHome("kudos.description"),
      detailLabel: tHome("kudos.detailLabel"),
    },
    footer: {
      standards: tHome("footer.standards"),
      // `home.footer` has no `copyright` leaf — reuse `login.footer`
      // instead of duplicating the string (DRY, same precedent as
      // `awards/page.tsx`).
      copyright: tLogin("footer"),
    },
    account: {
      profile: tHome("account.profile"),
      admin: tHome("account.admin"),
      logout: tHome("account.logout"),
    },
    notifications: {
      empty: tHome("notifications.empty"),
    },
    hero: {
      fallbackName: tProfile("hero.fallbackName"),
    },
    badges: {
      headingSelf: tProfile("badges.headingSelf"),
      headingOther: tProfile("badges.headingOther"),
    },
    stats: {
      rows: Object.fromEntries(
        STATISTICS_ROWS.map((row) => [
          row.key,
          tProfile(`stats.rows.${row.key}`),
        ]),
      ) as Record<StatisticsRowKey, string>,
      openSecretBox: tProfile("stats.openSecretBox"),
      writeKudos: tProfile("stats.writeKudos"),
    },
    kudosDirection: {
      receivedLabel: tProfile("kudos.receivedLabel"),
      sentLabel: tProfile("kudos.sentLabel"),
      emptyReceived: tProfile("kudos.emptyReceived"),
      emptySent: tProfile("kudos.emptySent"),
    },
  };
}
