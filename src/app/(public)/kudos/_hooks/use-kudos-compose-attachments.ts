"use client";

import { useRef, useState } from "react";

import {
  MAX_HASHTAG_CHIPS,
  type KudosComposeImage,
} from "./kudos-compose-draft";
import { addHashtagToList, intakeImageFiles } from "./kudos-compose-form-rules";

export type KudosComposeHashtags = {
  hashtags: string[];
  limitReached: boolean;
  /** The picker's own transient search text — NOT one of the 1..5 chips
   * (`E.2`). Kept here (not in the picker's presentational component) so
   * `reset()` below can actually reach it; a component-local `useState`
   * for this, as `kudos-compose-body.tsx` used before this fix, has no way
   * to be cleared when the surrounding form resets (C07/C08). */
  query: string;
  setQuery: (value: string) => void;
  /** Whether the "Chọn hashtag" dropdown is open. Same reasoning as
   * `query` — must live where `reset()` can close it. */
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  addHashtag: (tag: string) => void;
  removeHashtag: (tag: string) => void;
  reset: () => void;
};

/**
 * BR-002/C13/C14's hashtag chip list — split out of
 * `use-kudos-compose-form.ts` purely to keep that orchestrator hook under
 * 200 lines (see the phase's decisions report). Cap/dedupe logic itself
 * lives in the pure `addHashtagToList` (`kudos-compose-form-rules.ts`);
 * this hook is just the `useState` around it.
 *
 * `limitReached` is DERIVED — `hashtags.length >= MAX_HASHTAG_CHIPS` — per
 * `kudos-hashtag-field.tsx`'s own contract (ID-16/17/C14): it is true as
 * soon as the 5th chip exists, not just as a side effect of ATTEMPTING a
 * 6th add. `addHashtagToList` still independently blocks that 6th add.
 *
 * `hashtagsRef` mirrors `hashtags` and is updated SYNCHRONOUSLY inside
 * every setter (never in a `useEffect`) so two `addHashtag` calls in the
 * same event handler — e.g. a paste that adds several tags at once — each
 * see the other's result instead of both reading the same pre-batch
 * `hashtags` closure and the second silently clobbering the first's
 * `setHashtags` call.
 */
export function useKudosComposeHashtags(): KudosComposeHashtags {
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const hashtagsRef = useRef(hashtags);
  const limitReached = hashtags.length >= MAX_HASHTAG_CHIPS;

  function addHashtag(tag: string): void {
    const result = addHashtagToList(
      hashtagsRef.current,
      tag,
      MAX_HASHTAG_CHIPS,
    );
    if (result.hashtags !== hashtagsRef.current) {
      hashtagsRef.current = result.hashtags;
      setHashtags(result.hashtags);
    }
  }

  function removeHashtag(tag: string): void {
    const next = hashtagsRef.current.filter((existing) => existing !== tag);
    hashtagsRef.current = next;
    setHashtags(next);
  }

  function reset(): void {
    hashtagsRef.current = [];
    setHashtags([]);
    setQuery("");
    setPickerOpen(false);
  }

  return {
    hashtags,
    limitReached,
    query,
    setQuery,
    pickerOpen,
    setPickerOpen,
    addHashtag,
    removeHashtag,
    reset,
  };
}

export type KudosComposeImages = {
  images: KudosComposeImage[];
  imageError: string | null;
  addImages: (files: FileList | File[]) => void;
  removeImage: (id: string) => void;
  setImageError: (message: string | null) => void;
  reset: () => void;
};

/**
 * BR-003/C15-C17's image picker — same split rationale, and the same
 * ref-mirrors-state reasoning, as the hashtags hook above. `setImageError`
 * is exposed (not just `addImages`/`removeImage`) so
 * `use-kudos-compose-form.ts`'s submit handler can also surface a
 * SERVER-side `fieldErrors.images` rejection through this one state.
 */
export function useKudosComposeImages(
  errorMessage: string,
): KudosComposeImages {
  const [images, setImages] = useState<KudosComposeImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const imagesRef = useRef(images);

  function addImages(files: FileList | File[]): void {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const { newFiles, hasRejection } = intakeImageFiles(
      imagesRef.current.map((image) => image.file),
      incoming,
    );
    setImageError(hasRejection ? errorMessage : null);
    if (newFiles.length === 0) return;

    const newImages: KudosComposeImage[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    const next = [...imagesRef.current, ...newImages];
    imagesRef.current = next;
    setImages(next);
  }

  function removeImage(id: string): void {
    setImageError(null);
    const target = imagesRef.current.find((image) => image.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    const next = imagesRef.current.filter((image) => image.id !== id);
    imagesRef.current = next;
    setImages(next);
  }

  function reset(): void {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    imagesRef.current = [];
    setImages([]);
    setImageError(null);
  }

  return { images, imageError, addImages, removeImage, setImageError, reset };
}
