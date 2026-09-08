/**
 * Pure, hookless helpers for `use-kudos-compose-form.ts` — split into their
 * own module (a deviation from the phase's 3-hook file_ownership, allowed
 * by the phase brief "split a helper into a second owned file ONLY if it
 * stays within `_hooks/` and you list it") purely to keep the hook itself
 * under 200 lines. Nothing here touches React: nothing exported is a hook,
 * nothing carries JSX/`className`/Vietnamese text, matching the phase's
 * own Todo List rule for the whole `_hooks/` folder. Field-error/hashtag/
 * image/mention business rules live in the sibling
 * `kudos-compose-form-rules.ts` instead — this file stays the draft's
 * SHAPE and its two pure serializations (`KudoDraftInput`, `FormData`).
 *
 * Types named here (`KudosSunnerOption`, `KudosComposeImage`,
 * `KudosComposeDraft`, `KudosComposeFieldErrors`) are the public shape
 * `use-kudos-compose-form.ts` re-exports — phase 13 and phases 08-12 import
 * them from there, not from this file, so this module stays an
 * implementation detail of the form hook.
 */

import type {
  KudoDraftField,
  KudoDraftInput,
} from "../_utils/validate-kudo-draft";

import type { SunnerSuggestion } from "@/dal/sunner-search";

/** Re-exported under the compose-form's own name (task contract) — same
 * shape as the DAL's `SunnerSuggestion`, no fields added or dropped. */
export type KudosSunnerOption = SunnerSuggestion;

export type KudosComposeImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export type KudosComposeDraft = {
  recipient: KudosSunnerOption | null;
  title: string;
  content: string;
  hashtags: string[];
  images: KudosComposeImage[];
  isAnonymous: boolean;
  anonymousName: string;
};

export type KudosComposeFieldErrors = Partial<Record<KudoDraftField, string>>;

/** Mirrors `validate-kudo-draft.ts`'s private `MAX_HASHTAGS` — kept as a
 * local literal the same way `use-kudos-toast.test.ts` duplicates
 * `TOAST_DURATION_MS`, since the source constant is not exported. */
export const MAX_HASHTAG_CHIPS = 5;

export function createEmptyDraft(): KudosComposeDraft {
  return {
    recipient: null,
    title: "",
    content: "",
    hashtags: [],
    images: [],
    isAnonymous: false,
    anonymousName: "",
  };
}

export function toKudoDraftInput(draft: KudosComposeDraft): KudoDraftInput {
  return {
    recipientId: draft.recipient?.id ?? "",
    title: draft.title,
    content: draft.content,
    hashtags: draft.hashtags,
    isAnonymous: draft.isAnonymous,
    anonymousName: draft.anonymousName,
  };
}

/** Builds the exact `FormData` shape `createKudo` (phase 06) reads —
 * `hashtags` is the CHIP list only, the title is a separate field the
 * action prepends itself. */
export function buildKudoFormData(draft: KudosComposeDraft): FormData {
  const formData = new FormData();
  formData.set("recipientId", draft.recipient?.id ?? "");
  formData.set("title", draft.title);
  formData.set("content", draft.content);
  draft.hashtags.forEach((tag) => formData.append("hashtags", tag));
  formData.set("isAnonymous", draft.isAnonymous ? "true" : "false");
  formData.set("anonymousName", draft.anonymousName);
  draft.images.forEach((image) => formData.append("images", image.file));
  return formData;
}
