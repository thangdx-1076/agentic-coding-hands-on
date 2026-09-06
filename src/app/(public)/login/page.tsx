import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { LoginClient } from "./_components/login-client";
import type { LoginCopy } from "./_shared/login-copy";

import { createClient } from "@/lib/supabase/server";
import { LOCALE_LABEL, normalizeLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Đăng nhập | SAA 2025",
};

type LoginPageSearchParams = {
  error?: string | string[];
};

type LoginPageProps = {
  searchParams: Promise<LoginPageSearchParams>;
};

/**
 * `/login` server entry point (A1, FR-201/FR-204/FR-601). Guards against an
 * already-authenticated visitor with the AUTHORITATIVE check (`proxy.ts`
 * already ran the optimistic redirect for the common case), builds the
 * localized `LoginCopy` from next-intl, and hands the rest of the
 * interaction (OAuth kickoff, locale switch, pending/error UI) to the
 * client boundary — `LoginScreen`'s function props can't cross a Server
 * Component render.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/");
  }

  const rawLocale = await getLocale();
  const locale = normalizeLocale(rawLocale);
  const t = await getTranslations("login");

  const copy: LoginCopy = {
    subtitle: t("subtitle"),
    tagline: t("tagline"),
    loginButton: t("loginButton"),
    footer: t("footer"),
    logoAlt: t("logoAlt"),
    heroAlt: t("heroAlt"),
    languageLabel: LOCALE_LABEL[locale],
  };

  // Fixed, translated copy — always resolved so the client boundary can
  // reuse it for an OAuth failure that never round-trips through
  // `?error=` (see login-client.tsx).
  const errorText = t("error");
  const { error } = await searchParams;
  const errorMessage = hasErrorParam(error) ? errorText : null;

  return (
    <LoginClient
      copy={copy}
      locale={locale}
      errorText={errorText}
      errorMessage={errorMessage}
    />
  );
}

/**
 * Authoritative session check (FR-601). Wrapped in try/catch — unlike
 * `/todo`, `/login` must fail OPEN on a Supabase outage: a transient error
 * here must never block a visitor from ever reaching the login form (the
 * optimistic `proxy.ts` guard already covers the common case).
 */
async function getAuthenticatedUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Boundary validation for untrusted query input: Next.js parses a repeated
 * `?error=` key as `string[]`, a single one as `string`. Normalize both
 * shapes to a boolean — the raw value is never rendered, only its
 * presence flips on the fixed, translated message (FR-204; avoids
 * reflecting attacker-controlled text into the page).
 */
function hasErrorParam(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry.length > 0);
  }
  return typeof value === "string" && value.length > 0;
}
