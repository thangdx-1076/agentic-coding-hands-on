import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { HomeClient } from "./home-client";

import { logoutAction } from "@/app/todo/actions";
import { createClient } from "@/lib/supabase/server";
import { toUsersRoleClient } from "@/lib/supabase/users-role-client";
import { getUserRole } from "@/lib/auth/get-user-role";
import { parseTargetDate } from "@/lib/countdown/countdown";
import { LOCALE_LABEL, normalizeLocale } from "@/lib/i18n/locale";
import { defaultHomeCopy, type HomeCopy } from "@/components/home/home-copy";
import type { HeaderViewer } from "@/components/home/header";

export const metadata: Metadata = {
  title: "SAA 2025",
};

/**
 * `/` public homepage entry point (mm:2167:9026 · FR-001/FR-601). Mirrors
 * `app/login/page.tsx`'s shape: a Server Component reads session, role,
 * the countdown target, and localized copy, then hands every interactive
 * concern to `HomeClient` — `HomeScreen`'s function props can't cross a
 * Server Component render.
 *
 * PUBLIC by design (clarifications.md § Route & điều hướng): unlike
 * `/todo`, there is no auth guard here — an anonymous visitor renders the
 * exact same markup as an authenticated one, just with `viewer: null`.
 */
export default async function HomePage() {
  const viewer = await getViewer();
  const targetIso = resolveTargetIso();
  const initialNowMs = getInitialNowMs();

  const rawLocale = await getLocale();
  const locale = normalizeLocale(rawLocale);
  const t = await getTranslations("home");
  const tLogin = await getTranslations("login");

  // `messages/*.json` `home.awards.items` carries only `{ title,
  // description }` (translated content) — `slug`/`image` are stable,
  // untranslated identifiers that only exist on `defaultHomeCopy` (Track
  // A). `t.raw` is next-intl's documented escape hatch for non-string
  // leaves; the cast is safe here because both locale files are
  // repo-controlled and guarded by `messages-parity.test.ts` to carry the
  // same 6 entries, in the same order, as `defaultHomeCopy`.
  const translatedAwardItems = t.raw("awards.items") as {
    title: string;
    description: string;
  }[];

  const copy: HomeCopy = {
    nav: {
      about: t("nav.about"),
      awardsInfo: t("nav.awardsInfo"),
      kudos: t("nav.kudos"),
    },
    header: {
      logoAlt: t("header.logoAlt"),
      // Fixed VN/EN button label, not translated copy — see
      // `lib/i18n/locale.ts` § `LOCALE_LABEL`. Cast narrows `Record<AppLocale,
      // string>`'s widened `string` back to the 2-literal union `HomeCopy`
      // declares; `LOCALE_LABEL`'s own values are always exactly "VN"/"EN".
      languageLabel: LOCALE_LABEL[locale] as "VN" | "EN",
      loginLabel: t("header.loginLabel"),
      notificationsLabel: t("header.notificationsLabel"),
      accountLabel: t("header.accountLabel"),
    },
    hero: {
      heading: t("hero.heading"),
      comingSoon: t("hero.comingSoon"),
      days: t("hero.days"),
      hours: t("hero.hours"),
      minutes: t("hero.minutes"),
    },
    event: {
      timeLabel: t("event.timeLabel"),
      timeValue: t("event.timeValue"),
      venueLabel: t("event.venueLabel"),
      venueValue: t("event.venueValue"),
      liveNote: t("event.liveNote"),
    },
    cta: {
      aboutAwards: t("cta.aboutAwards"),
      aboutKudos: t("cta.aboutKudos"),
    },
    rootFurther: {
      heading: t("rootFurther.heading"),
      // Array leaf — `t()` only resolves strings, `t.raw` is the
      // documented way to read it (clarifications.md § Nội dung tĩnh).
      paragraphs: t.raw("rootFurther.paragraphs") as string[],
    },
    awards: {
      caption: t("awards.caption"),
      heading: t("awards.heading"),
      items: defaultHomeCopy.awards.items.map((item, index) => ({
        slug: item.slug,
        image: item.image,
        title: translatedAwardItems[index]?.title ?? item.title,
        description:
          translatedAwardItems[index]?.description ?? item.description,
      })),
    },
    kudos: {
      label: t("kudos.label"),
      heading: t("kudos.heading"),
      description: t("kudos.description"),
      detailLabel: t("kudos.detailLabel"),
    },
    footer: {
      standards: t("footer.standards"),
      // `home.footer` deliberately has no `copyright` leaf — reuse the
      // existing `login.footer` string instead of duplicating it (DRY,
      // clarifications.md § Nội dung tĩnh).
      copyright: tLogin("footer"),
    },
    account: {
      profile: t("account.profile"),
      admin: t("account.admin"),
      logout: t("account.logout"),
    },
    notifications: {
      empty: t("notifications.empty"),
    },
    widget: {
      label: t("widget.label"),
      kudosItem: t("widget.kudosItem"),
      awardsItem: t("widget.awardsItem"),
    },
  };

  return (
    <HomeClient
      copy={copy}
      locale={locale}
      viewer={viewer}
      targetIso={targetIso}
      initialNowMs={initialNowMs}
      logoutAction={logoutAction}
    />
  );
}

/**
 * Session + role read for the header (FR-003/FR-601/INT-001/BR-002).
 * Wrapped in try/catch and fails OPEN to `null` — like `/login`, unlike
 * `/todo`: a Supabase outage must never block the public homepage from
 * rendering, it just renders as if nobody were signed in.
 */
async function getViewer(): Promise<HeaderViewer | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const role = await getUserRole(toUsersRoleClient(supabase), user.id);
    return { email: user.email ?? "", isAdmin: role === "admin" };
  } catch {
    return null;
  }
}

/**
 * Validates `EVENT_START_AT` (server-only, BR-003/BR-004) into the ISO
 * string `useCountdown` expects. An absent value is the documented
 * "unknown date" state (no warning, still "Coming soon"); a PRESENT but
 * malformed value is a misconfiguration worth one server-side warning —
 * either way the countdown degrades to the zero-state instead of
 * crashing the page.
 */
function resolveTargetIso(): string | null {
  const raw = process.env.EVENT_START_AT;
  const target = parseTargetDate(raw);

  if (!target && raw) {
    console.warn(
      `[home] Invalid EVENT_START_AT env value "${raw}" — countdown falls back to 00/00/00.`,
    );
  }

  return target ? target.toISOString() : null;
}

/**
 * `useCountdown` (phase 03) seeds its first client tick from this value so
 * SSR and hydration render byte-identical output — the countdown must
 * capture "now" exactly once per request, here, and never again on the
 * client's first render (clarifications.md § Hero/Countdown). Factored out
 * of `HomePage`'s body so the (correctly impure, once-per-request) clock
 * read isn't flagged as an impure call during component render.
 */
function getInitialNowMs(): number {
  return Date.now();
}
