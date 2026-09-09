import "server-only";

import { getTranslations } from "next-intl/server";

import type { SiteChromeCopy } from "../_shared/site-chrome";

export type NotificationsCopy = SiteChromeCopy["notifications"];

/**
 * Maps the top-level `notifications` i18n namespace (`messages/{vi,en}.json`,
 * phase-06) into the `SiteChromeCopy["notifications"]` shape every page that
 * renders `SiteHeader` needs (phase-07 Key Insight 5). One helper instead of
 * 4 pages each re-typing the same `types.*` tree — same DRY precedent
 * `build-kudos-copy.ts`/`build-profile-copy.ts` already follow for their own
 * screen-only namespaces.
 *
 * `types.*` carries `{senderName}`/`{actorName}` placeholders plus one
 * `<link>` tag (`kudos_hidden`) that only the panel item — per-notification,
 * at render time (phase 08) — can resolve. Calling `t("types.kudos_received")`
 * here would throw next-intl's `FORMATTING_ERROR` for the missing variable
 * (same trap `build-kudos-copy.ts`'s `card.heartLabel` documents), so `.raw()`
 * returns the 4 templates untouched instead.
 *
 * Server-only (`getTranslations` is `next-intl/server`) — only a `page.tsx`
 * Server Component may call this, never a client component.
 */
export async function getNotificationsCopy(): Promise<NotificationsCopy> {
  const t = await getTranslations("notifications");

  return {
    empty: t("empty"),
    title: t("title"),
    markAllRead: t("markAllRead"),
    loadMore: t("loadMore"),
    types: t.raw("types") as NotificationsCopy["types"],
  };
}
