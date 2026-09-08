"use client";

import type {
  KudosComposeDraft,
  KudosComposeFieldErrors,
} from "../_hooks/use-kudos-compose-form";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosAnonymousField } from "./kudos-anonymous-field";
import { KudosHashtagField } from "./kudos-hashtag-field";
import { KudosImageField } from "./kudos-image-field";

export type KudosComposeBodyProps = {
  copy: KudosComposeCopy;
  draft: Pick<
    KudosComposeDraft,
    "hashtags" | "images" | "isAnonymous" | "anonymousName"
  >;
  errors: KudosComposeFieldErrors;
  /** `board.filters.hashtags`, threaded through unchanged (clarifications.md
   * "Hashtag là free-text..." — no extra query). */
  hashtagVocabulary: string[];
  imageError: string | null;
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
 * The bottom half of the "Viết Kudo" form body — Hashtag, Image, ẩn danh
 * (C04 order) — split out of `kudos-compose-form.tsx` purely to keep that
 * file under the 200-line cap (phase 13's file ownership explicitly grants
 * this second file for exactly that reason).
 *
 * The hashtag picker's open/query state now lives in phase 07's form hook
 * (`useKudosComposeForm`'s `hashtagQuery`/`hashtagPickerOpen`), not a local
 * `useState` here — a local state a prior version of this file owned was
 * unreachable by the hook's `reset()`, so `Hủy` → reopen left the picker
 * stuck open. This component stays purely presentational for both.
 */
export function KudosComposeBody({
  copy,
  draft,
  errors,
  hashtagVocabulary,
  imageError,
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
}: KudosComposeBodyProps) {
  const images = draft.images.map((image) => ({
    id: image.id,
    previewUrl: image.previewUrl,
    name: image.file.name,
  }));

  return (
    <>
      <KudosHashtagField
        hashtags={draft.hashtags}
        suggestions={hashtagVocabulary}
        pickerOpen={hashtagPickerOpen}
        query={hashtagQuery}
        onQueryChange={onHashtagQueryChange}
        onPickerOpenChange={onHashtagPickerOpenChange}
        onAdd={onAddHashtag}
        onRemove={onRemoveHashtag}
        limitReached={hashtagLimitReached}
        error={errors.hashtags ?? null}
        label={copy.hashtagLabel}
        addLabel={copy.hashtagAdd}
        limitNote={copy.limitNote}
        pickerLabel={copy.hashtagPickerLabel}
        removeLabelTemplate={copy.hashtagRemove}
        maxMessage={copy.errorHashtagMax}
      />

      <KudosImageField
        images={images}
        onFilesSelected={onAddImages}
        onRemove={onRemoveImage}
        error={imageError}
        label={copy.imageLabel}
        addLabel={copy.imageAdd}
        limitNote={copy.limitNote}
        removeLabel={copy.imageRemove}
      />

      <KudosAnonymousField
        checked={draft.isAnonymous}
        onCheckedChange={onToggleAnonymous}
        name={draft.anonymousName}
        onNameChange={onAnonymousNameChange}
        nameError={errors.anonymousName ?? null}
        label={copy.anonymousLabel}
        nameLabel={copy.anonymousNameLabel}
        namePlaceholder={copy.anonymousNamePlaceholder}
      />
    </>
  );
}
