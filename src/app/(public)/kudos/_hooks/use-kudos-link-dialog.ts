"use client";

import { useCallback, useRef, useState, type SyntheticEvent } from "react";

import {
  validateLinkDraft,
  validateLinkUrl,
  type LinkDraftErrors,
} from "../_utils/validate-link-draft";

export type KudosLinkSelection = { start: number; end: number };

export type KudosLinkSaveResult = {
  text: string;
  url: string;
  selection: KudosLinkSelection;
};

export type KudosLinkDialogControls = {
  /** Mirrors the native nested `<dialog>`'s open/closed state (SM-002) —
   * same "never read the DOM node directly" discipline as
   * `use-kudos-compose-dialog.ts`. */
  isOpen: boolean;
  text: string;
  url: string;
  errors: LinkDraftErrors;
  /** Snapshots `selectionStart`/`selectionEnd` off the "Nội dung" textarea
   * (research report § 5 — focus has already left it by the time this
   * fires, so the snapshot is taken up front rather than read again
   * later), prefills the link-text field from that selection when there
   * is one, and opens the dialog via `showModal()`. A no-op before
   * `registerDialog` runs, same guard as `use-kudos-compose-dialog.ts`. */
  open: (textarea: HTMLTextAreaElement) => void;
  /** Clears only the `text` field's error (if any) — the `url` error, if
   * set, is untouched. */
  setText: (value: string) => void;
  /** Clears only the `url` field's error (if any). */
  setUrl: (value: string) => void;
  /** BR-008 — validates the URL field alone, in addition to the full
   * validation "Lưu" runs (clarifications.md § "Validate khi nào?"). */
  onUrlBlur: () => void;
  /** Validates both fields. Invalid → sets `errors`, returns `null`, the
   * dialog stays open (SM-002 `Validating -> Open`). Valid → returns the
   * trimmed `{text, url}` plus the selection snapshotted at `open()`,
   * closes the dialog, and resets both fields + errors (SM-002
   * `Validating -> Closed`) — the caller inserts the markdown itself. */
  save: () => KudosLinkSaveResult | null;
  /** Closes without validating and without a result — the textarea is
   * never touched (clarifications.md § "Sau Lưu / Hủy / Escape?"). */
  cancel: () => void;
  /** Ref CALLBACK (never a `RefObject` — `separate-hook-logic-from-components`),
   * attached by `kudos-link-dialog.tsx` via `ref={registerDialog}`. */
  registerDialog: (node: HTMLDialogElement | null) => void;
  /** Wired to the `<dialog>`'s `onCancel` (the native `cancel` event,
   * fired by Escape) — shares the same exit path as `cancel()`. */
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
};

const INITIAL_SELECTION: KudosLinkSelection = { start: 0, end: 0 };

/**
 * State machine for the "Thêm đường dẫn" dialog (A5, SM-002) — the ONE
 * place that calls `showModal()`/`close()` on the nested `<dialog>`,
 * snapshots the outer textarea's selection, and runs `validate-link-draft.ts`.
 * Deliberately has no `useEffect`/scroll-lock: the outer "Viết Kudo" dialog
 * (`useKudosComposeDialog`) already owns `document.body`'s scroll lock
 * while ANY dialog in this feature is open, and this one is always nested
 * inside it (plan.md § "Quyết định chốt" — never unmounted independently).
 */
export function useKudosLinkDialog(): KudosLinkDialogControls {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setTextState] = useState("");
  const [url, setUrlState] = useState("");
  const [errors, setErrors] = useState<LinkDraftErrors>({});
  const nodeRef = useRef<HTMLDialogElement | null>(null);
  const selectionRef = useRef<KudosLinkSelection>(INITIAL_SELECTION);

  const registerDialog = useCallback((node: HTMLDialogElement | null) => {
    nodeRef.current = node;
  }, []);

  const close = useCallback(() => {
    const node = nodeRef.current;
    if (node?.open) {
      node.close();
    }
    setIsOpen(false);
    setTextState("");
    setUrlState("");
    setErrors({});
    selectionRef.current = INITIAL_SELECTION;
  }, []);

  const open = useCallback((textarea: HTMLTextAreaElement) => {
    const node = nodeRef.current;
    if (!node) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    selectionRef.current = { start, end };
    setTextState(start === end ? "" : textarea.value.slice(start, end));
    setUrlState("");
    setErrors({});

    if (!node.open) {
      node.showModal();
    }
    setIsOpen(true);
  }, []);

  const setText = useCallback((value: string) => {
    setTextState(value);
    setErrors((prev) => (prev.text === undefined ? prev : { url: prev.url }));
  }, []);

  const setUrl = useCallback((value: string) => {
    setUrlState(value);
    setErrors((prev) => (prev.url === undefined ? prev : { text: prev.text }));
  }, []);

  const onUrlBlur = useCallback(() => {
    const urlError = validateLinkUrl(url);
    setErrors((prev) => ({ text: prev.text, url: urlError }));
  }, [url]);

  const save = useCallback((): KudosLinkSaveResult | null => {
    const draftErrors = validateLinkDraft({ text, url });
    if (draftErrors.text ?? draftErrors.url) {
      setErrors(draftErrors);
      return null;
    }

    const result: KudosLinkSaveResult = {
      text: text.trim(),
      url: url.trim(),
      selection: selectionRef.current,
    };
    close();
    return result;
  }, [text, url, close]);

  const cancel = useCallback(() => {
    close();
  }, [close]);

  const onCancel = useCallback(() => {
    close();
  }, [close]);

  return {
    isOpen,
    text,
    url,
    errors,
    open,
    setText,
    setUrl,
    onUrlBlur,
    save,
    cancel,
    registerDialog,
    onCancel,
  };
}
