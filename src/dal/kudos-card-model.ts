/**
 * `KudosPerson`/`KudosCard` — the app-level shape `kudos.ts`'s `toCard`
 * maps a `CardRow` (`./kudos-cards-query`) onto, and every `/kudos`
 * component (`kudos-client.tsx`, `kudos-card.tsx`, …) imports as
 * `@/dal/kudos`'s `KudosCard`. Split out of `kudos.ts` for size alone —
 * this repo holds code files under 200 lines, same reasoning
 * `kudos-cards-query.ts` already split off for the row/column-list side.
 * `kudos.ts` re-exports both types below, so no import path moved.
 */

export type KudosPerson = {
  /** `null` on the sender of an anonymous kudo (AD-2) — the view's only
   * anonymity signal, never a second `isAnonymous` flag. Never `null` for a
   * receiver: `kudos_cards` masks the sender side only. */
  id: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  department: string | null;
  kudosReceived: number;
  /** Kudos this Sunner has SENT. 0 for the sender of an anonymous kudo,
   * masked by `kudos_cards` (0021) for the same de-anonymisation reason
   * `kudosReceived` is. */
  kudosSent: number;
  /** How many DIFFERENT Sunners have sent this person a kudo — what the
   * Hero badge ranks on (`heroTierIndex`). 0 for the sender of an anonymous
   * kudo, masked by `kudos_cards` (0022). */
  distinctSenders: number;
};

export type KudosCard = {
  id: string;
  content: string;
  hashtags: string[];
  imageUrls: string[];
  heartCount: number;
  createdAt: string;
  sender: KudosPerson;
  receiver: KudosPerson;
  /** Server-computed "did the CURRENT viewer send this?" (F008 BR-005,
   * migration `0016`'s `is_own`) — true even for an anonymous kudo's own
   * sender, whose `sender.id` above is `null`. `null`/`undefined` when the
   * request has no authenticated viewer. This is the only ownership signal
   * the UI should read; never re-derive it by comparing `sender.id` to a
   * viewer id (that comparison is exactly what broke for anonymous
   * kudos). Optional so fixtures outside F008's scope (stories, other
   * DAL tests) that predate this field keep type-checking unchanged. */
  isOwn?: boolean | null;
};
