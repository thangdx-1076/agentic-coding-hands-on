"use client";

import { useState, useTransition } from "react";

import {
  createKudo,
  type CreateKudoFieldErrors,
} from "../_actions/create-kudo";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";
import {
  validateKudoDraft,
  type KudoDraftField,
} from "../_utils/validate-kudo-draft";

import {
  buildKudoFormData,
  toKudoDraftInput,
  type KudosComposeDraft,
  type KudosSunnerOption,
} from "./kudos-compose-draft";
import {
  deriveVisibleFieldErrors,
  resolveSubmitFailure,
} from "./kudos-compose-form-rules";
import {
  useKudosComposeHashtags,
  useKudosComposeImages,
} from "./use-kudos-compose-attachments";
import { useKudosComposeContent } from "./use-kudos-compose-content";
import { useRecipientSearch } from "./use-sunner-suggest";

export type {
  KudosComposeDraft,
  KudosComposeFieldErrors,
  KudosComposeImage,
  KudosSunnerOption,
} from "./kudos-compose-draft";

export type UseKudosComposeFormOptions = {
  copy: KudosComposeCopy;
  /** Called once, right after a successful `createKudo` — phase 13 closes
   * the dialog from here (this hook only resets its own draft). */
  onSubmitted?: () => void;
};

/**
 * Every piece of state the "Viết Kudo" dialog needs (A1-A4, SM-001).
 * Track A's field components (phases 08-12) stay presentational and only
 * ever read from / call into this. The draft is assembled each render from
 * four sources — this hook's own `title`/`isAnonymous`/`anonymousName`/
 * `recipient`, plus 3 sibling hooks that each own one self-contained
 * concern: `useRecipientSearch` (combobox), `useKudosComposeContent`
 * (textarea + toolbar + `@`-mentions), and `useKudosComposeHashtags` /
 * `useKudosComposeImages` (the two capped lists) — split out purely to
 * keep this orchestrator under 200 lines (phase decisions report).
 * Business-rule branching itself lives in `kudos-compose-form-rules.ts`.
 */
export function useKudosComposeForm({
  copy,
  onSubmitted,
}: UseKudosComposeFormOptions) {
  const [title, setTitle] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousName, setAnonymousName] = useState("");
  const [recipient, setRecipient] = useState<KudosSunnerOption | null>(null);
  const [touched, setTouched] = useState<
    Partial<Record<KudoDraftField, boolean>>
  >({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] =
    useState<CreateKudoFieldErrors | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  const recipientSearch = useRecipientSearch(setRecipient);
  const content = useKudosComposeContent();
  const hashtags = useKudosComposeHashtags();
  const images = useKudosComposeImages(copy.errorImageInvalid);

  const draft: KudosComposeDraft = {
    recipient,
    title,
    content: content.content,
    hashtags: hashtags.hashtags,
    images: images.images,
    isAnonymous,
    anonymousName,
  };

  const liveErrorCodes = validateKudoDraft(toKudoDraftInput(draft));
  const canSubmit = Object.keys(liveErrorCodes).length === 0;
  const errors = deriveVisibleFieldErrors(
    serverFieldErrors ?? liveErrorCodes,
    touched,
    hasAttemptedSubmit,
    copy,
  );

  function toggleAnonymous(): void {
    setIsAnonymous((prev) => {
      // Turning it OFF clears any typed name (ID-44) rather than hiding a
      // stale value that would resurface if the checkbox is re-checked.
      if (prev) setAnonymousName("");
      return !prev;
    });
  }

  function blurField(field: KudoDraftField): void {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function reset(): void {
    setTitle("");
    setIsAnonymous(false);
    setAnonymousName("");
    setRecipient(null);
    recipientSearch.reset();
    content.reset();
    hashtags.reset();
    images.reset();
    setTouched({});
    setHasAttemptedSubmit(false);
    setServerFieldErrors(null);
    setSubmitError(null);
  }

  function submit(): void {
    setHasAttemptedSubmit(true);
    setSubmitError(null);
    setServerFieldErrors(null);

    if (!canSubmit) {
      // AD-1 / C20 / ID-56: validate-on-click still runs, but NO request
      // goes out for an invalid draft.
      return;
    }

    startTransition(async () => {
      try {
        const result = await createKudo(buildKudoFormData(draft));
        if (result.ok) {
          reset();
          onSubmitted?.();
          return;
        }
        const effect = resolveSubmitFailure(result, copy);
        if (effect.fieldErrors) setServerFieldErrors(effect.fieldErrors);
        if (effect.imageErrorMessage) {
          images.setImageError(effect.imageErrorMessage);
        }
        if (effect.submitErrorMessage)
          setSubmitError(effect.submitErrorMessage);
      } catch {
        setSubmitError(copy.errorFormIncomplete);
      }
    });
  }

  return {
    draft,
    recipientQuery: recipientSearch.query,
    recipientOptions: recipientSearch.options,
    recipientLoading: recipientSearch.loading,
    setRecipientQuery: recipientSearch.setQuery,
    selectRecipient: recipientSearch.select,
    setTitle,
    setContent: content.setContent,
    setAnonymousName,
    toggleAnonymous,
    addHashtag: hashtags.addHashtag,
    removeHashtag: hashtags.removeHashtag,
    limitReached: hashtags.limitReached,
    hashtagQuery: hashtags.query,
    setHashtagQuery: hashtags.setQuery,
    hashtagPickerOpen: hashtags.pickerOpen,
    setHashtagPickerOpen: hashtags.setPickerOpen,
    addImages: images.addImages,
    removeImage: images.removeImage,
    imageError: images.imageError,
    applyFormat: content.applyFormat,
    mentionQuery: content.mentionQuery,
    mentionOptions: content.mentionOptions,
    mentionLoading: content.mentionLoading,
    insertMention: content.insertMention,
    blurField,
    errors,
    canSubmit,
    submitting,
    submitError,
    submit,
    reset,
  };
}

/** Derived from the implementation rather than hand-duplicated — phases
 * 08-13 import this one name for the hook's full return shape. */
export type KudosComposeForm = ReturnType<typeof useKudosComposeForm>;
