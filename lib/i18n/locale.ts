/**
 * Locale whitelist and helpers shared by the i18n request config, the
 * `setLocale` Server Action, and (later, phase-04) the language selector.
 * `vi` is the only default per clarifications.md — an absent or invalid
 * `NEXT_LOCALE` cookie value always resolves back to it.
 */

/** Supported locale codes. Order also defines the language menu order. */
export const SUPPORTED_LOCALES = ["vi", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale used whenever the cookie is absent, empty, or invalid. */
export const DEFAULT_LOCALE: AppLocale = "vi";

/** Cookie name next-intl reads/writes for locale persistence. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** 1 year in seconds, per FR-401 / § E2E contract. */
export const LOCALE_COOKIE_MAX_AGE = 31536000;

/**
 * Fixed locale-code labels shown on the language selector ("VN" / "EN").
 * These are NOT translated copy — they are identical in both locales by
 * design, so they live here (single source, DRY) instead of in the
 * `messages/*.json` bundles.
 */
export const LOCALE_LABEL: Record<AppLocale, string> = {
  vi: "VN",
  en: "EN",
};

/** Narrows an unknown value to a supported, case-sensitive locale code. */
export function isSupportedLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Normalizes any external input (cookie value, Server Action argument)
 * into a trusted `AppLocale`. This is the single choke point every
 * locale-bearing value must pass through before use — in particular
 * before it reaches the dynamic `import(messages/${locale}.json)` in
 * `i18n/request.ts`, where an un-normalized value would be a path
 * traversal / cookie injection risk.
 */
export function normalizeLocale(value?: string | null): AppLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
