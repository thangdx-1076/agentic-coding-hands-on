import type { getTranslations } from "next-intl/server";

import type { KudosLeaderboardItemData } from "../_components/kudos-leaderboard";
import { isBadgeKey, type BadgeKey } from "../_utils/secret-box-badge-asset";

import type { GiftRecipient } from "@/dal/recent-gift-recipients";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Maps `getRecentGiftRecipients`'s raw DAL rows into the
 * `KudosLeaderboardItemData[]` the "10 SUNNER NHẬN QUÀ MỚI NHẤT" sidebar
 * renders (F007_KudosLiveBoard FR-219/BR-020, MoMorph row D.3.4).
 *
 * Kept as its own file rather than folded into `build-kudos-copy.ts` (that
 * file sits at 198/200 lines — adding this would blow the budget) — same
 * split `build-standards-copy.ts` draws from `standards-copy.ts`:
 * `getTranslations` is server-only and must never land in a client bundle,
 * so only `page.tsx` (a Server Component) may call this.
 *
 * D004 (`spec/system/permissions.md`): the design's row text is a physical
 * prize mock with no backing table in this repo — the description line
 * renders the badge's own caption instead, reusing the SAME
 * `standards.secretBoxSection.badges.<camelKey>.caption` leaves
 * `/standards` already ships in both locales (no new message key added).
 *
 * `badgeKey` is an untrusted raw view column until `isBadgeKey` narrows it
 * — a row whose badge fails that check is dropped rather than rendered
 * with a fabricated caption, mirroring `secretBoxBadgeAsset`'s own "fail
 * closed" rule for the same 6-value contract.
 *
 * A `null` `avatarUrl`/`fullName` is real (`0006_kudos.sql`'s own comment:
 * no avatar asset exists to invent for these Sunner) — falls back to the
 * existing `/kudos/avatar-gift-recipient.png` placeholder / an empty name
 * rather than breaking `KudosLeaderboardItemData`'s non-nullable shape.
 */
const AVATAR_FALLBACK = "/kudos/avatar-gift-recipient.png";

/** `"stay-gold"` → `"stayGold"` — the exact `SecretBoxBadgeSlug` casing
 * `messages/{vi,en}.json`'s `secretBoxSection.badges` keys use. */
function toCamelBadgeSlug(badgeKey: BadgeKey): string {
  return badgeKey.replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}

/** `t` must already be scoped to the `standards` namespace (e.g.
 * `getTranslations("standards")`), matching `build-standards-copy.ts`'s own
 * `t` — this function calls it as `t("secretBoxSection.badges...")`, never
 * with a leading `"standards."`. */
export function buildGiftRecipientItems(
  recipients: GiftRecipient[],
  t: Translator,
): KudosLeaderboardItemData[] {
  const items: KudosLeaderboardItemData[] = [];

  for (const recipient of recipients) {
    if (!isBadgeKey(recipient.badgeKey)) {
      continue;
    }

    items.push({
      id: recipient.userId,
      name: recipient.fullName ?? "",
      description: t(
        `secretBoxSection.badges.${toCamelBadgeSlug(recipient.badgeKey)}.caption`,
      ),
      avatarSrc: recipient.avatarUrl ?? AVATAR_FALLBACK,
    });
  }

  return items;
}
