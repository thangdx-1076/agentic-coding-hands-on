"use client";

import { useEffect, type SyntheticEvent } from "react";

import type { KudosComposeContent } from "../_hooks/use-kudos-compose-content";
import { useKudosLinkDialog } from "../_hooks/use-kudos-link-dialog";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";
import type { LinkDraftErrorKey } from "../_utils/validate-link-draft";

import { KudosLinkDialog } from "./kudos-link-dialog";

export type KudosComposeLinkDialogProps = {
  copy: KudosComposeCopy;
  /** Same signature `useKudosComposeContent` exposes — kept as a type alias
   * (not re-declared) so this file and `kudos-compose-form.tsx` can never
   * drift on the `linkText?` 4th parameter. */
  applyFormat: KudosComposeContent["applyFormat"];
  /** The "Nội dung" textarea's current node. Read again at Save time
   * (rather than captured once at `open()`) because the hook only
   * snapshots the SELECTION, never the node itself. */
  getTextarea: () => HTMLTextAreaElement | null;
  /** Hands the imperative opener back up to `kudos-compose-form.tsx`, whose
   * `handleFormat("link")` branch has the textarea already in hand. */
  registerOpen: (open: (textarea: HTMLTextAreaElement) => void) => void;
};

/** `errorRequired` is shared with the rest of the compose form's copy
 * namespace (clarifications.md § "Copy lỗi và namespace"); every other
 * `LinkDraftErrorKey` lives under `copy.linkDialog`. */
function resolveLinkError(
  key: LinkDraftErrorKey | undefined,
  copy: KudosComposeCopy,
): string | null {
  if (key === undefined) return null;
  if (key === "errorRequired") return copy.errorRequired;
  return copy.linkDialog[key];
}

/**
 * Thin container for the "Thêm đường dẫn" sub-dialog (A5, SM-002): owns
 * `useKudosLinkDialog()`, resolves its `LinkDraftErrorKey`s to display
 * strings, and renders the presentational `KudosLinkDialog`. Kept out of
 * `kudos-compose-form.tsx` to respect that file's 200-line cap.
 */
export function KudosComposeLinkDialog({
  copy,
  applyFormat,
  getTextarea,
  registerOpen,
}: KudosComposeLinkDialogProps) {
  const link = useKudosLinkDialog();

  useEffect(() => {
    registerOpen(link.open);
  }, [registerOpen, link.open]);

  // React's synthetic `onCancel` BUBBLES (unlike the native, non-bubbling
  // `cancel` event — researcher-260908-0919-nested-dialog-study.md § 4):
  // without stopping it here, Escape on this nested dialog would also
  // reach the outer `KudosComposeDialog`'s own `onCancel` further up the
  // React tree and close IT too. `link.onCancel` itself only closes this
  // dialog (`use-kudos-link-dialog.ts`'s `close()`).
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.stopPropagation();
    link.onCancel(event);
  }

  function handleSave() {
    const result = link.save();
    if (!result) return;

    const textarea = getTextarea();
    if (!textarea) return;

    // Focus left the textarea while the sub-dialog was open — restore the
    // selection `open()` snapshotted before inserting the markdown marker.
    textarea.setSelectionRange(result.selection.start, result.selection.end);
    applyFormat("link", textarea, result.url, result.text);
  }

  return (
    <KudosLinkDialog
      copy={copy.linkDialog}
      text={link.text}
      url={link.url}
      textError={resolveLinkError(link.errors.text, copy)}
      urlError={resolveLinkError(link.errors.url, copy)}
      onTextChange={link.setText}
      onUrlChange={link.setUrl}
      onUrlBlur={link.onUrlBlur}
      onSave={handleSave}
      onCancelClick={link.cancel}
      registerDialog={link.registerDialog}
      onCancel={handleCancel}
    />
  );
}
