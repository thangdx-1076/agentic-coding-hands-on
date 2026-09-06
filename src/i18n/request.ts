import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  normalizeLocale,
} from "@/lib/i18n/locale";

/**
 * next-intl request config (no-routing mode — locale comes from the
 * `NEXT_LOCALE` cookie, never a URL prefix; see clarifications.md).
 * `normalizeLocale` already guarantees a whitelisted {vi,en} value, so the
 * dynamic `import` below is safe from path traversal / cookie injection.
 *
 * Defense-in-depth: if the message bundle for an already-normalized
 * locale somehow fails to load (e.g. a corrupted/missing JSON file), we
 * still fall back to the default locale's bundle instead of throwing and
 * breaking every page render.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  try {
    const messages = (
      (await import(`../../messages/${locale}.json`)) as {
        default: AbstractIntlMessages;
      }
    ).default;
    return { locale, messages };
  } catch {
    const fallbackMessages = (
      (await import(`../../messages/${DEFAULT_LOCALE}.json`)) as {
        default: AbstractIntlMessages;
      }
    ).default;
    return { locale: DEFAULT_LOCALE, messages: fallbackMessages };
  }
});
