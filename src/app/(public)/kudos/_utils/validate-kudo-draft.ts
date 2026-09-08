/**
 * Validates a Kudo compose draft against its 4 required fields — Người
 * nhận, Danh hiệu, Nội dung, Hashtag (FR-201, FR-208, FR-402, DEC-002,
 * ID-56) — plus the conditional 5th field, tên ẩn danh (D001, BR-004).
 *
 * One function for both layers (AD-8/AD-9): the client form calls it to
 * drive per-field error display and the `Gửi` button's `aria-disabled`
 * (AD-1), and `create-kudo.ts`'s Server Action calls it again server-side
 * so a direct call that bypasses the client can never write an invalid
 * Kudo (FR-601). It returns error CODES, never Vietnamese text — those
 * live in `messages/*.json` (phase 03) and are looked up by the caller,
 * which is what lets this same module run inside a Server Action without
 * ever importing `next-intl`.
 *
 * Field values are still runtime-guarded (`typeof`/`Array.isArray`) even
 * though the type signature already declares them as `string`/`string[]`
 * — a Server Action is a real HTTP endpoint once compiled, and a request
 * that skips the generated client wrapper can send anything. Same
 * defensive posture as `toggle-kudo-heart.ts`'s `kudoId` check.
 */

export type KudoDraftInput = {
  recipientId: string;
  title: string;
  content: string;
  hashtags: string[];
  isAnonymous: boolean;
  anonymousName: string;
};

export type KudoDraftErrorCode = "required" | "tooMany";

export type KudoDraftField =
  "recipientId" | "title" | "content" | "hashtags" | "anonymousName";

export type KudoDraftErrors = Partial<
  Record<KudoDraftField, KudoDraftErrorCode>
>;

const MAX_HASHTAGS = 5;

function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Trims, drops empties, and de-dupes a hashtag list — a tag typed twice,
 * or re-picked from the suggestion dropdown after already being added,
 * counts once toward the 1..5 limit (BR-002). A non-array value reaching
 * this boundary (a direct Server Action call with a malformed body)
 * degrades to "no hashtags" instead of throwing.
 */
function normalizeHashtags(hashtags: unknown): string[] {
  if (!Array.isArray(hashtags)) {
    return [];
  }
  const trimmed = hashtags.filter(isFilled).map((tag) => tag.trim());
  return Array.from(new Set(trimmed));
}

/**
 * Checks every field independently rather than stopping at the first
 * failure — FR-402/DEC-002/ID-56 require each missing required field to
 * show its own error simultaneously, not just the first one found.
 */
export function validateKudoDraft(draft: KudoDraftInput): KudoDraftErrors {
  const errors: KudoDraftErrors = {};

  if (!isFilled(draft.recipientId)) {
    errors.recipientId = "required";
  }
  if (!isFilled(draft.title)) {
    errors.title = "required";
  }
  if (!isFilled(draft.content)) {
    errors.content = "required";
  }

  const hashtagCount = normalizeHashtags(draft.hashtags).length;
  if (hashtagCount < 1) {
    errors.hashtags = "required";
  } else if (hashtagCount > MAX_HASHTAGS) {
    errors.hashtags = "tooMany";
  }

  if (draft.isAnonymous === true && !isFilled(draft.anonymousName)) {
    errors.anonymousName = "required";
  }

  return errors;
}

/**
 * Convenience for the `Gửi` button's `aria-disabled` (AD-1, FR-208) — true
 * the instant every required field is valid, without the caller having to
 * enumerate which keys `validateKudoDraft` can produce.
 */
export function isKudoDraftValid(draft: KudoDraftInput): boolean {
  return Object.keys(validateKudoDraft(draft)).length === 0;
}
