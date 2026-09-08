"use client";

import { useRef } from "react";

import type {
  KudosComposeDraft,
  KudosComposeFieldErrors,
  KudosSunnerOption,
} from "../_hooks/use-kudos-compose-form";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";
import type { MarkdownMarkerKind } from "../_utils/insert-markdown-marker";

import { KudosComposeBody } from "./kudos-compose-body";
import { KudosContentField } from "./kudos-content-field";
import type { FormatKind } from "./kudos-format-toolbar";
import { KudosRecipientField } from "./kudos-recipient-field";
import type { KudosSunnerOption as KudosSunnerFieldOption } from "./kudos-sunner-options";
import { KudosTitleField } from "./kudos-title-field";

/** Hook's `fullName: string | null` vs `./kudos-sunner-options`'s
 * `fullName: string` (rendered as option text) — coalesced at this boundary. */
function toSunnerFieldOption(
  option: KudosSunnerOption,
): KudosSunnerFieldOption {
  return { ...option, fullName: option.fullName ?? "" };
}

export type KudosComposeFormProps = {
  copy: KudosComposeCopy;
  draft: KudosComposeDraft;
  errors: KudosComposeFieldErrors;
  /** Form-level failure (e.g. `unauthenticatedHint`) — per-field failures
   * live in `errors`/`imageError` instead. */
  submitError: string | null;
  /** `board.filters.hashtags`, unchanged — no extra query. */
  hashtagVocabulary: string[];
  imageError: string | null;
  recipientQuery: string;
  onRecipientQueryChange: (value: string) => void;
  recipientOptions: KudosSunnerOption[];
  recipientLoading: boolean;
  onSelectRecipient: (option: KudosSunnerOption) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  applyFormat: (
    format: MarkdownMarkerKind,
    textarea: HTMLTextAreaElement,
    url?: string,
  ) => void;
  mentionQuery: string | null;
  mentionOptions: KudosSunnerOption[];
  mentionLoading: boolean;
  onMentionSelect: (option: KudosSunnerOption) => void;
  hashtagQuery: string;
  onHashtagQueryChange: (value: string) => void;
  hashtagPickerOpen: boolean;
  onHashtagPickerOpenChange: (open: boolean) => void;
  onAddHashtag: (tag: string) => void;
  onRemoveHashtag: (tag: string) => void;
  hashtagLimitReached: boolean;
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (id: string) => void;
  onToggleAnonymous: () => void;
  onAnonymousNameChange: (value: string) => void;
};

/**
 * The "Viết Kudo" form body's TOP half (C04 order: Người nhận → Danh hiệu →
 * toolbar+Nội dung) in a native `<form>` — the bottom half lives in the
 * sibling `kudos-compose-body.tsx` (a second file, under the 200-line cap).
 * Every prop is destructured from `useKudosComposeForm`'s return at ITS call
 * site (`kudos-compose-launcher.tsx`), never the whole hook object.
 *
 * Owns one local `<textarea>` node ref, bridging `KudosContentField`'s
 * `onFormat(kind)` to `applyFormat(kind, textarea, url?)`. `<form>`'s
 * `onSubmit` only calls `preventDefault` — the real submit path is the
 * footer's `Gửi` button, a DOM sibling kept outside this form.
 */
export function KudosComposeForm({
  copy,
  draft,
  errors,
  submitError,
  hashtagVocabulary,
  imageError,
  recipientQuery,
  onRecipientQueryChange,
  recipientOptions,
  recipientLoading,
  onSelectRecipient,
  onTitleChange,
  onContentChange,
  applyFormat,
  mentionQuery,
  mentionOptions,
  mentionLoading,
  onMentionSelect,
  hashtagQuery,
  onHashtagQueryChange,
  hashtagPickerOpen,
  onHashtagPickerOpenChange,
  onAddHashtag,
  onRemoveHashtag,
  hashtagLimitReached,
  onAddImages,
  onRemoveImage,
  onToggleAnonymous,
  onAnonymousNameChange,
}: KudosComposeFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Closed once a recipient is picked (`draft.recipient` set); editing the
  // query text away from that name clears it back to `null` and reopens it.
  const recipientIsOpen =
    draft.recipient === null && recipientQuery.trim() !== "";

  function handleFormat(kind: FormatKind) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (kind === "link") {
      // `window.prompt` collects a URL; blank/cancelled is a no-op
      // (`insertMarkdownMarker` treats an empty `url` that way already).
      const url = window.prompt(copy.toolbar.link);
      if (!url) return;
      applyFormat(kind, textarea, url);
      return;
    }
    applyFormat(kind, textarea);
  }

  return (
    <form
      data-testid="kudos-compose-form"
      onSubmit={(event) => event.preventDefault()}
      className="flex w-full flex-col gap-8"
    >
      {submitError ? (
        <p
          role="alert"
          data-testid="kudos-compose-error"
          className="font-montserrat text-sm leading-5 font-bold text-[#FF8A80]"
        >
          {submitError}
        </p>
      ) : null}

      <KudosRecipientField
        copy={copy}
        error={errors.recipientId ?? null}
        query={recipientQuery}
        onQueryChange={onRecipientQueryChange}
        options={recipientOptions.map(toSunnerFieldOption)}
        isLoading={recipientLoading}
        isOpen={recipientIsOpen}
        onSelect={onSelectRecipient}
      />

      <KudosTitleField
        copy={copy}
        error={errors.title ?? null}
        value={draft.title}
        onValueChange={onTitleChange}
      />

      <KudosContentField
        copy={copy}
        value={draft.content}
        onChange={onContentChange}
        registerTextarea={(node) => {
          textareaRef.current = node;
        }}
        onFormat={handleFormat}
        error={errors.content ?? null}
        mentionOpen={mentionQuery !== null}
        mentionOptions={mentionOptions.map(toSunnerFieldOption)}
        mentionLoading={mentionLoading}
        onMentionSelect={onMentionSelect}
      />

      <KudosComposeBody
        copy={copy}
        draft={draft}
        errors={errors}
        hashtagVocabulary={hashtagVocabulary}
        imageError={imageError}
        hashtagQuery={hashtagQuery}
        onHashtagQueryChange={onHashtagQueryChange}
        hashtagPickerOpen={hashtagPickerOpen}
        onHashtagPickerOpenChange={onHashtagPickerOpenChange}
        onAddHashtag={onAddHashtag}
        onRemoveHashtag={onRemoveHashtag}
        hashtagLimitReached={hashtagLimitReached}
        onAddImages={onAddImages}
        onRemoveImage={onRemoveImage}
        onToggleAnonymous={onToggleAnonymous}
        onAnonymousNameChange={onAnonymousNameChange}
      />
    </form>
  );
}
