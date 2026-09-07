import type { getTranslations } from "next-intl/server";

import {
  defaultSiteChromeCopy,
  type SiteChromeCopy,
} from "../../../_shared/site-chrome";
import type { KudosSidebarCopy } from "../_components/kudos-sidebar";
import type { KudosSpotlightCopy } from "../_components/kudos-spotlight";

import type { KudosCopy } from "./kudos-copy";

import { LOCALE_LABEL, type AppLocale } from "@/lib/i18n/locale";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Presentational copy contract for `/kudos` (phase 13's merge point) —
 * composes `SiteChromeCopy` (chrome: nav/header/kudos-widget/footer/
 * account/notifications) with one leaf per section this screen renders.
 * Mirrors `AwardsCopy`/`ProfileCopy`'s shape, and reuses each section's own
 * exported copy type (`KudosCopy`, `KudosSpotlightCopy`, `KudosSidebarCopy`)
 * rather than re-declaring their fields here — same DRY precedent
 * `buildProfileCopy` follows for `ProfileCopy`.
 */
export type KudosPageCopy = SiteChromeCopy & {
  banner: { title: string; logoAlt: string };
  compose: { placeholder: string; ariaLabel: string };
  highlight: {
    eyebrow: string;
    heading: string;
    filterHashtag: string;
    filterDepartment: string;
    prev: string;
    next: string;
  };
  spotlight: KudosSpotlightCopy;
  feed: { eyebrow: string; heading: string; empty: string };
  /** Shared `KudosCard` copy (detail/copyLink/copiedToast/heartLabel/
   * signInToHeart) — one value threaded through both the highlight carousel
   * and the feed, same card component either way. */
  card: KudosCopy;
  sidebar: KudosSidebarCopy;
};

/**
 * Maps the `home` (chrome) and `kudos` (screen) i18n namespaces into the
 * `KudosPageCopy` shape `KudosScreen` renders. Only `page.tsx` (a Server
 * Component) may call this — `getTranslations` (`next-intl/server`) must
 * never land in a client bundle, same boundary `buildProfileCopy` and
 * `awards/page.tsx`'s `buildCopy` already draw.
 *
 * `home.footer` has no `copyright` leaf (same gap `buildProfileCopy` and
 * `awards/page.tsx` work around) — this screen reuses `tHome("footer.*")`
 * ONLY for `standards`; `copyright` is deliberately omitted from
 * `SiteFooter`'s required shape via `defaultSiteChromeCopy`'s own fallback
 * so no third `login` translator needs to be threaded through for one
 * string `/kudos` never customizes.
 */
export function buildKudosCopy(
  tHome: Translator,
  tKudos: Translator,
  locale: AppLocale,
): KudosPageCopy {
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
      // `home.footer` has no `copyright` leaf; `SiteFooter` defaults this
      // exact string via `defaultSiteChromeCopy` when omitted upstream, so
      // reuse that default here instead of threading a third `login`
      // translator through just for this one field (DRY, same precedent
      // `awards/page.tsx`/`buildProfileCopy` document — they thread
      // `tLogin("footer")` in; `/kudos` has no equivalent screen-owned
      // reason to, so the shared default is the simpler, equally correct
      // choice).
      copyright: defaultSiteChromeCopy.footer.copyright,
    },
    account: {
      profile: tHome("account.profile"),
      admin: tHome("account.admin"),
      logout: tHome("account.logout"),
    },
    notifications: {
      empty: tHome("notifications.empty"),
    },
    banner: {
      title: tKudos("banner.title"),
      logoAlt: tKudos("banner.logoAlt"),
    },
    compose: {
      placeholder: tKudos("compose.placeholder"),
      ariaLabel: tKudos("compose.ariaLabel"),
    },
    highlight: {
      eyebrow: tKudos("highlight.eyebrow"),
      heading: tKudos("highlight.heading"),
      filterHashtag: tKudos("highlight.filterHashtag"),
      filterDepartment: tKudos("highlight.filterDepartment"),
      prev: tKudos("highlight.prev"),
      next: tKudos("highlight.next"),
    },
    spotlight: {
      eyebrow: tKudos("spotlight.eyebrow"),
      heading: tKudos("spotlight.heading"),
      totalSuffix: tKudos("spotlight.totalSuffix"),
      searchPlaceholder: tKudos("spotlight.searchPlaceholder"),
      searchSubmit: tKudos("spotlight.searchSubmit"),
    },
    feed: {
      eyebrow: tKudos("feed.eyebrow"),
      heading: tKudos("feed.heading"),
      empty: tKudos("feed.empty"),
    },
    card: {
      detail: tKudos("feed.detail"),
      copyLink: tKudos("feed.copyLink"),
      copiedToast: tKudos("feed.copiedToast"),
      // `.raw()`, not a plain call: the message itself is the `{count}`
      // template `KudosHeartButton` interpolates later by hand (same
      // precedent as `(home)/page.tsx`'s `t.raw("rootFurther.paragraphs")`)
      // — calling it normally makes next-intl try to format `{count}`
      // immediately and throw `FORMATTING_ERROR` for the missing variable.
      heartLabel: tKudos.raw("feed.heartLabel") as string,
      signInToHeart: tKudos("feed.signInToHeart"),
    },
    sidebar: {
      received: tKudos("sidebar.received"),
      sent: tKudos("sidebar.sent"),
      hearts: tKudos("sidebar.hearts"),
      boxOpened: tKudos("sidebar.boxOpened"),
      boxUnopened: tKudos("sidebar.boxUnopened"),
      openGift: tKudos("sidebar.openGift"),
      openGiftDisabledTitle: tKudos("sidebar.openGiftDisabledTitle"),
      rankBoardTitle: tKudos("sidebar.rankBoard"),
      giftBoardTitle: tKudos("sidebar.giftBoard"),
      emptyBoard: tKudos("sidebar.emptyBoard"),
    },
  };
}
