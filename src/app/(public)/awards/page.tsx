import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { logoutAction } from "../../_actions/logout";
import { getViewer } from "../_utils/get-viewer";

import { AwardsClient } from "./_components/awards-client";
import type { AwardsCopy } from "./_shared/awards-copy";

import { getAwards } from "@/dal/awards";
import { toAwardsClient } from "@/dal/awards-client";
import { createClient } from "@/lib/supabase/server";
import {
  LOCALE_LABEL,
  normalizeLocale,
  type AppLocale,
} from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Hệ thống giải thưởng SAA 2025",
};

/**
 * `/awards` public route entry point (mm:313:8436, FR-004/BR-001). Mirrors
 * `(home)/page.tsx`'s shape: a Server Component reads session, role, and
 * localized copy, then hands every interactive concern to `AwardsClient` —
 * `AwardsScreen`'s function props can't cross a Server Component render.
 *
 * PUBLIC by design (clarifications.md § Route & điều hướng): unlike `/todo`,
 * there is no auth guard here — an anonymous visitor renders the exact same
 * markup as an authenticated one, just with `viewer: null`.
 *
 * Fail-open is a hard requirement (BR-002, SC-005): `getViewer()` and
 * `getAwards()` both swallow their own errors and resolve to `null`/`[]`,
 * so this page never `throw`s, `notFound()`s, or `redirect()`s — a Supabase
 * outage renders the header/hero/empty-state/footer chrome instead of a
 * 500.
 */
export default async function AwardsPage() {
  const viewer = await getViewer();

  const rawLocale = await getLocale();
  const locale = normalizeLocale(rawLocale);
  const t = await getTranslations("awards");
  const tHome = await getTranslations("home");
  const tLogin = await getTranslations("login");

  const supabase = await createClient();
  const awards = await getAwards(toAwardsClient(supabase), locale);

  const copy = buildCopy(t, tHome, tLogin, locale);

  return (
    <AwardsClient
      copy={copy}
      locale={locale}
      viewer={viewer}
      awards={awards}
      logoutAction={logoutAction}
    />
  );
}

/**
 * `AwardsCopy` extends `SiteChromeCopy`, so the chrome leaves (nav, header,
 * kudos, account, notifications) read from the `home` namespace — the same
 * strings `(home)/page.tsx` builds — while the award-specific leaves read
 * from the `awards` namespace (phase 03). `footer.copyright` reuses
 * `login.footer` rather than duplicating the string, same precedent as
 * `(home)/page.tsx:108-113`.
 *
 * Factored out of the page body (rather than inlined like `(home)/page.tsx`)
 * to keep `page.tsx` under the 200-line file-size limit — pure string
 * assembly, no I/O, so a plain function is enough; no need for the
 * `_utils/` coverage allowlist.
 */
type Translator = Awaited<ReturnType<typeof getTranslations>>;

function buildCopy(
  t: Translator,
  tHome: Translator,
  tLogin: Translator,
  locale: AppLocale,
): AwardsCopy {
  return {
    nav: {
      about: tHome("nav.about"),
      awardsInfo: tHome("nav.awardsInfo"),
      kudos: tHome("nav.kudos"),
    },
    header: {
      logoAlt: tHome("header.logoAlt"),
      // Fixed VN/EN button label, not translated copy — see
      // `lib/i18n/locale.ts` § `LOCALE_LABEL`, same precedent as
      // `(home)/page.tsx:59-62`.
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
      // `home.footer` deliberately has no `copyright` leaf — reuse the
      // existing `login.footer` string instead of duplicating it (DRY,
      // clarifications.md § Nội dung tĩnh; same precedent as
      // `(home)/page.tsx:108-113`).
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
    caption: t("caption"),
    heading: t("heading"),
    navAriaLabel: t("navLabel"),
    quantityLabel: t("quantityLabel"),
    prizeLabel: t("prizeLabel"),
    empty: t("empty"),
  };
}
