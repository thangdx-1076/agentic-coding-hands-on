"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useKudosComposeDialog } from "../_hooks/use-kudos-compose-dialog";
import { useKudosComposeForm } from "../_hooks/use-kudos-compose-form";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosComposeDialog } from "./kudos-compose-dialog";
import { KudosComposeFooter } from "./kudos-compose-footer";
import { KudosComposeForm } from "./kudos-compose-form";
import { KudosComposePill } from "./kudos-compose-pill";

import { ROUTES } from "@/constants/routes";

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
