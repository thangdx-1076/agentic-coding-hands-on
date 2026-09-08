"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

export type KudosComposeDialogControls = {
  /** Mirrors the native `<dialog>`'s open/closed state — set by `open()`,
   * `close()`, and `onCancel` (Escape), never read directly off the DOM
   * node, so a re-render always agrees with the last action taken here. */
  isOpen: boolean;
  /** Calls `showModal()` on the registered node — a no-op when the node
   * isn't registered yet or is already open. */
  open: () => void;
  /** Calls `.close()` on the registered node (skipped if already closed),
   * then notifies `onClose` — the ONE place "the dialog just closed" fires
   * from, regardless of whether Cancel, Escape, or a successful submit
   * triggered it. */
  close: () => void;
  /** Ref CALLBACK (never a `RefObject`) — the presentational dialog
   * (phase 08) attaches this via `ref={registerDialog}`;
   * `separate-hook-logic-from-components` forbids a hook returning a
   * `RefObject` directly. */
  registerDialog: (node: HTMLDialogElement | null) => void;
  /** Wired directly to the `<dialog>`'s `onCancel` prop (the native
   * `cancel` event, fired by Escape) — delegates to `close()` so Escape and
   * the Cancel button share the one exit path below. */
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
};

/**
 * Imperative lifecycle for the "Viết Kudo" `<dialog>` (SM-001): the ONE
 * place that calls `showModal()`/`close()`, locks page scroll while open,
 * and syncs `isOpen` with Escape. `kudos-compose-dialog.tsx` (phase 08)
 * stays presentational — it never renders the `open` attribute itself, it
 * only forwards `registerDialog`/`onCancel` from here onto the real
 * `<dialog>` element it owns.
 *
 * `onClose` is optional and fires exactly once per close, from every exit
 * path — phase 13 uses it to reset the compose form's draft so reopening
 * the dialog always starts empty (C07/C08's "no draft save").
 */
export function useKudosComposeDialog(
  onClose?: () => void,
): KudosComposeDialogControls {
  const [isOpen, setIsOpen] = useState(false);
  const nodeRef = useRef<HTMLDialogElement | null>(null);

  const registerDialog = useCallback((node: HTMLDialogElement | null) => {
    nodeRef.current = node;
  }, []);

  const open = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    if (!node.open) {
      node.showModal();
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    const node = nodeRef.current;
    if (node?.open) {
      node.close();
    }
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const onCancel = useCallback(() => {
    close();
  }, [close]);

  // Scroll lock: engaged only while `isOpen`, and the cleanup — which runs
  // on both `isOpen` flipping to false AND on unmount — always restores
  // whatever `overflow` value was there before this hook touched it.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return { isOpen, open, close, registerDialog, onCancel };
}
