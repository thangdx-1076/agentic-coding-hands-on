/**
 * Pure business-rule helpers for `use-kudos-compose-form.ts` — the second
 * extra file this phase's helpers needed (see `kudos-compose-draft.ts`'s
 * own header for why splitting is allowed here). Everything below is a
 * plain function: field-error display gating (AD-1), the hashtag cap
 * (BR-002), the image intake cap (BR-003), mapping a failed `createKudo`
 * result to state updates, and `@`-mention token parsing (FR-204). No
 * hooks, no JSX, no Vietnamese string literals.
 */

import type {
  CreateKudoFieldErrors,
  CreateKudoResult,
} from "../_actions/create-kudo";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";
import type {
  KudoDraftErrorCode,
  KudoDraftField,
} from "../_utils/validate-kudo-draft";
import { validateKudoImages } from "../_utils/validate-kudo-images";

import type { KudosComposeFieldErrors } from "./kudos-compose-draft";

/**
 * The 5 required-field keys `use-kudos-compose-form.ts`'s `errors` covers —
 * exported so both `deriveVisibleFieldErrors` and the hook's own
 * `blurField(field: KudoDraftField)` type against the same list.
 */
export const REQUIRED_DRAFT_FIELDS: KudoDraftField[] = [
  "recipientId",
  "title",
  "content",
  "hashtags",
  "anonymousName",
];

/** The only two error codes `validateKudoDraft` produces map to exactly
 * two copy strings — `hashtags` is the one field that can ever be
 * `"tooMany"` (§ validate-kudo-draft.ts), everything else is `"required"`. */
export function resolveFieldErrorMessage(
  field: KudoDraftField,
  code: KudoDraftErrorCode,
  copy: KudosComposeCopy,
): string {
  if (field === "hashtags" && code === "tooMany") {
    return copy.errorHashtagMax;
  }
  return copy.errorRequired;
}

/**
 * AD-1/C05/C20 — a field's error is only ever VISIBLE after the user
 * either attempted a submit or left that field (blur), never on every
 * keystroke. `codes` is whichever is authoritative right now: the server's
 * `fieldErrors` after a `reason: "validation"` response, or the client's
 * own live `validateKudoDraft` result otherwise — the hook decides which
 * to pass in.
 */
export function deriveVisibleFieldErrors(
  codes: Partial<Record<KudoDraftField, KudoDraftErrorCode>>,
  touched: Partial<Record<KudoDraftField, boolean>>,
  hasAttemptedSubmit: boolean,
  copy: KudosComposeCopy,
): KudosComposeFieldErrors {
  const visible: KudosComposeFieldErrors = {};
  for (const field of REQUIRED_DRAFT_FIELDS) {
    const code = codes[field];
    if (code && (hasAttemptedSubmit || touched[field])) {
      visible[field] = resolveFieldErrorMessage(field, code, copy);
    }
  }
  return visible;
}

export type HashtagAddResult = { hashtags: string[]; limitReached: boolean };

/** BR-002/C13/C14 — trims and dedupes before counting, and never adds past
 * the 5-chip cap; an already-present tag or an already-full list both
 * return the SAME array reference (`hashtags` unchanged) so the caller can
 * skip a re-render when nothing actually changed. */
export function addHashtagToList(
  hashtags: string[],
  tag: string,
  maxChips: number,
): HashtagAddResult {
  const trimmed = tag.trim();
  if (trimmed === "" || hashtags.includes(trimmed)) {
    return { hashtags, limitReached: false };
  }
  if (hashtags.length >= maxChips) {
    return { hashtags, limitReached: true };
  }
  return { hashtags: [...hashtags, trimmed], limitReached: false };
}

export type ImageIntakeResult = { newFiles: File[]; hasRejection: boolean };

/**
 * BR-003/C15-C17 — validates `existing` (already-accepted files) together
 * with `incoming` (freshly picked) through the ONE shared validator
 * (AD-8), then returns only the NEWLY accepted files. `accepted` preserves
 * input order and every `existing` file is already valid (it passed this
 * same check before), so it always occupies the first `existing.length`
 * slots of `accepted` — everything after that is a newly-accepted
 * `incoming` file, same object reference, only re-typed to `KudoImageLike`
 * by the validator's signature.
 */
export function intakeImageFiles(
  existing: File[],
  incoming: File[],
): ImageIntakeResult {
  const { accepted, rejected } = validateKudoImages([...existing, ...incoming]);
  return {
    newFiles: accepted.slice(existing.length) as File[],
    hasRejection: rejected.length > 0,
  };
}

export type SubmitFailureEffect = {
  fieldErrors?: CreateKudoFieldErrors;
  imageErrorMessage?: string;
  submitErrorMessage?: string;
};

/** Maps every non-`ok` `createKudo` result to the state updates
 * `use-kudos-compose-form.ts` should apply — kept out of the hook so each
 * reason's mapping (including the deliberate "upload"/"error" fallback to
 * `errorFormIncomplete`, since neither has a dedicated copy string) is
 * covered by a plain unit test instead of a `startTransition` callback. */
export function resolveSubmitFailure(
  result: Exclude<CreateKudoResult, { ok: true }>,
  copy: KudosComposeCopy,
): SubmitFailureEffect {
  if (result.reason === "validation") {
    return {
      fieldErrors: result.fieldErrors,
      imageErrorMessage: result.fieldErrors.images
        ? copy.errorImageInvalid
        : undefined,
    };
  }
  if (result.reason === "unauthenticated") {
    return { submitErrorMessage: copy.unauthenticatedHint };
  }
  return { submitErrorMessage: copy.errorFormIncomplete };
}

/** FR-204/ID-33 — an `@` with one or more non-space characters between it
 * and the caret, scanning back from the caret so only the CLOSEST `@`
 * counts (typing a second `@` restarts the token). */
export function deriveMentionQuery(
  content: string,
  caret: number,
): string | null {
  const uptoCaret = content.slice(0, caret);
  const atIndex = uptoCaret.lastIndexOf("@");
  if (atIndex === -1) {
    return null;
  }
  const afterAt = uptoCaret.slice(atIndex + 1);
  if (afterAt.length === 0 || /\s/.test(afterAt)) {
    return null;
  }
  return afterAt;
}

export type MentionInsertResult = { value: string; caret: number };

/** Replaces the in-progress `@token` (as located by `deriveMentionQuery`'s
 * same rule) with a plain `@Tên ` — no entity/link, per clarifications.md
 * "`@ + tên` trong nội dung lưu thành gì". A caret with no active token
 * (defensive — the option list should already be empty in that case) is a
 * no-op. */
export function insertMentionText(
  content: string,
  caret: number,
  fullName: string | null,
): MentionInsertResult {
  const uptoCaret = content.slice(0, caret);
  const atIndex = uptoCaret.lastIndexOf("@");
  if (atIndex === -1) {
    return { value: content, caret };
  }
  const before = content.slice(0, atIndex);
  const after = content.slice(caret);
  const inserted = `@${fullName ?? ""} `;
  return {
    value: `${before}${inserted}${after}`,
    caret: before.length + inserted.length,
  };
}
