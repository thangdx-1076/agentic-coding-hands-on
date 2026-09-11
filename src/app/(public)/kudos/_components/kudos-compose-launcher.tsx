"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  useKudosCompose,
  type OpenCompose,
} from "../_contexts/kudos-compose-context";
import { useKudosComposeDialog } from "../_hooks/use-kudos-compose-dialog";
import { useKudosComposeForm } from "../_hooks/use-kudos-compose-form";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosComposeDialog } from "./kudos-compose-dialog";
import { KudosComposeFooter } from "./kudos-compose-footer";
import { KudosComposeForm } from "./kudos-compose-form";
import { KudosComposePill } from "./kudos-compose-pill";

import { ROUTES } from "@/constants/routes";
import type { SunnerSuggestion } from "@/dal/sunner-search";

export type KudosComposeLauncherProps = {
  copy: KudosComposeCopy;
  pillPlaceholder: string;
  pillAriaLabel: string;
  /** `viewerId !== null`, resolved server-side in `page.tsx` (BR-006). The
   * dialog itself never re-checks this — it is layer 1 of the two-layer
   * gate (clarifications.md § "Chặn truy cập khi chưa đăng nhập"); layer 2
   * is `createKudo`'s own `auth.getUser()`, fail-closed regardless of what
   * this prop says. */
  isSignedIn: boolean;
  /** `board.filters.hashtags`, threaded through unchanged (clarifications.md
   * "Hashtag là free-text..." — no extra query). */
  hashtagVocabulary: string[];
  /** When set, the dialog opens on mount with this Sunner selected — the
   * `/profile` write-Kudo bar's entry point (`?compose=<id>`). */
  initialRecipient?: SunnerSuggestion | null;
};

/**
 * Owns the "Viết Kudo" compose flow end to end: the pill's activation
 * decision (open the dialog when signed in, `/login` otherwise — AD-7,
 * C01/C03), the dialog's imperative lifecycle (`useKudosComposeDialog`) and
 * the form's entire state machine (`useKudosComposeForm`) — the pill,
 * dialog shell and form body themselves stay purely presentational.
 *
 * `dialog` and `form` close over each other by design (phase 07's own
 * contract): `useKudosComposeDialog`'s `onClose` fires on EVERY exit path
 * (Cancel, Escape, and a successful-submit `close()` call) and resets the
 * draft here, so C07/C08's "reopen empty" holds no matter which exit was
 * taken; `useKudosComposeForm`'s `onSubmitted` fires once after a
 * successful `createKudo` and closes the dialog here. `useKudosComposeDialog`
 * is called BEFORE `useKudosComposeForm`, so its `onClose` cannot reference
 * `form` directly (`form` does not exist yet at that point in the render —
 * the React Compiler's linter flags this as an unsafe forward reference,
 * `react-hooks/immutability`, even though the callback itself only ever
 * RUNS later, well after both hooks have returned). `formResetRef` breaks
 * that forward reference: `dialog` reads the ref (already declared above
 * it), and an effect keeps the ref in sync with the latest `form.reset`
 * after every render — `form.reset`'s identity is stable across renders in
 * practice (a plain function, not a `useCallback`), but the effect still
 * re-syncs on every `form` identity change defensively.
 */
export function KudosComposeLauncher({
  copy,
  pillPlaceholder,
  pillAriaLabel,
  isSignedIn,
  hashtagVocabulary,
  initialRecipient = null,
}: KudosComposeLauncherProps) {
  const router = useRouter();
  const formResetRef = useRef<() => void>(() => {});

  const dialog = useKudosComposeDialog(() => formResetRef.current());
  const form = useKudosComposeForm({
    copy,
    onSubmitted: () => dialog.close(),
  });

  useEffect(() => {
    formResetRef.current = form.reset;
  }, [form.reset]);

  // Publish the opener so a kudo CARD can start a compose aimed at the
  // Sunner it shows (`kudos-compose-context.tsx` explains why this is a
  // registration rather than a prop). Signed-out visitors are sent to
  // /login here for the same reason the pill does it — one gate, both
  // entry points.
  const compose = useKudosCompose();
  // The opener behaviour goes through a ref, mirroring `formResetRef` above
  // and for the same reason: `dialog` and `form` are fresh objects on every
  // render, so depending on them directly would tear down and re-register
  // the opener on each one — churn that contradicts the "register on mount,
  // unregister on unmount" contract the provider is written against.
  // Kept in sync from an EFFECT, not assigned during render — writing to a
  // ref mid-render is what `react-hooks` bans as "Cannot access refs during
  // render", and `formResetRef` above already takes this exact shape.
  const openComposeRef = useRef<OpenCompose>(() => {});
  useEffect(() => {
    openComposeRef.current = (recipient) => {
      if (!isSignedIn) {
        router.push(ROUTES.LOGIN);
        return;
      }
      dialog.open();
      if (recipient) {
        form.selectRecipient(recipient);
      }
    };
  });

  useEffect(() => {
    if (!compose) return;
    compose.register((recipient) => openComposeRef.current(recipient));
    return () => compose.register(null);
  }, [compose]);

  const {
    draft,
    recipientQuery,
    recipientOptions,
    recipientLoading,
    setRecipientQuery,
    selectRecipient,
    setTitle,
    setContent,
    setAnonymousName,
    toggleAnonymous,
    hashtagQuery,
    setHashtagQuery,
    hashtagPickerOpen,
    setHashtagPickerOpen,
    addHashtag,
    removeHashtag,
    limitReached,
    limitRejected,
    addImages,
    removeImage,
    imageError,
    applyFormat,
    mentionQuery,
    mentionOptions,
    mentionLoading,
    insertMention,
    errors,
    canSubmit,
    submitting,
    submitError,
    submit,
  } = form;

  // Arriving from a profile's write-Kudo bar. Runs once: `openedRef` guards
  // the dialog from re-opening if the reader closes it and something else
  // re-renders this component while `?compose=` is still in the URL.
  const openedRef = useRef(false);
  useEffect(() => {
    if (!initialRecipient || openedRef.current || !isSignedIn) return;
    openedRef.current = true;
    dialog.open();
    form.selectRecipient(initialRecipient);
  }, [initialRecipient, isSignedIn, dialog, form]);

  function handleActivate() {
    if (isSignedIn) {
      dialog.open();
    } else {
      router.push(ROUTES.LOGIN);
    }
  }

  return (
    <>
      <KudosComposePill
        placeholder={pillPlaceholder}
        ariaLabel={pillAriaLabel}
        onActivate={handleActivate}
        dialogOpen={dialog.isOpen}
      />
      <KudosComposeDialog
        onCancel={dialog.close}
        registerDialog={dialog.registerDialog}
        title={copy.title}
        footer={
          <KudosComposeFooter
            cancelLabel={copy.cancel}
            submitLabel={copy.submit}
            submittingLabel={copy.submitting}
            canSubmit={canSubmit}
            submitting={submitting}
            onCancel={dialog.close}
            onSubmit={submit}
          />
        }
      >
        <KudosComposeForm
          copy={copy}
          draft={draft}
          errors={errors}
          submitError={submitError}
          hashtagVocabulary={hashtagVocabulary}
          imageError={imageError}
          recipientQuery={recipientQuery}
          onRecipientQueryChange={setRecipientQuery}
          recipientOptions={recipientOptions}
          recipientLoading={recipientLoading}
          onSelectRecipient={selectRecipient}
          onTitleChange={setTitle}
          onContentChange={setContent}
          applyFormat={applyFormat}
          mentionQuery={mentionQuery}
          mentionOptions={mentionOptions}
          mentionLoading={mentionLoading}
          onMentionSelect={insertMention}
          hashtagQuery={hashtagQuery}
          onHashtagQueryChange={setHashtagQuery}
          hashtagPickerOpen={hashtagPickerOpen}
          onHashtagPickerOpenChange={setHashtagPickerOpen}
          onAddHashtag={addHashtag}
          onRemoveHashtag={removeHashtag}
          hashtagLimitReached={limitReached}
          hashtagLimitRejected={limitRejected}
          onAddImages={addImages}
          onRemoveImage={removeImage}
          onToggleAnonymous={toggleAnonymous}
          onAnonymousNameChange={setAnonymousName}
        />
      </KudosComposeDialog>
    </>
  );
}
