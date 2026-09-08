"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

export type SecretBoxDialogControls = {
  /** Calls `showModal()` on the registered node — a no-op when the node
   * isn't registered yet or is already open. */
  open: () => void;
  /** Calls `.close()` on the registered node (skipped if already closed). */
  close: () => void;
  /** Ref CALLBACK (never a `RefObject`) — `secret-box-dialog.tsx` attaches
   * this via `ref={registerDialog}`; `separate-hook-logic-from-components`
   * forbids a hook returning a `RefObject` directly. */
  registerDialog: (node: HTMLDialogElement | null) => void;
  /** Wired directly to the `<dialog>`'s `onCancel` prop (the native
   * `cancel` event, fired by Escape) — delegates to `close()` so Escape and
   * the X button (phase 05's `onClose` wiring) share the one exit path. */
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
};

/**
 * Imperative lifecycle for the Secret Box `<dialog>` (SM-001, mirrors
 * `use-kudos-compose-dialog.ts` verbatim per phase-03's architecture note):
 * the ONE place that calls `showModal()`/`close()` and locks page scroll
 * while open. `secret-box-dialog.tsx` stays presentational — it never
 * renders the `open` attribute itself, only forwards `registerDialog`/
 * `onCancel` onto the real `<dialog>` element it owns.
 *
 * Unlike `use-kudos-compose-dialog.ts`, there is no nesting concern here
 * (this dialog never opens inside another dialog) so the scroll lock is
 * owned entirely by this hook, not skipped in favor of an outer lock.
 *
 * Returns no `isOpen` — the launcher (phase 05) decides whether to MOUNT
 * this dialog at all from the server-rendered unopened count (S13: a
 * mounted-but-closed native `<dialog>` still counts as 1 element, so
 * mounting itself must never depend on this hook's internal state). This
 * hook only owns what happens once it IS mounted.
 */
export function useSecretBoxDialog(): SecretBoxDialogControls {
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
  }, []);

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

  return { open, close, registerDialog, onCancel };
}
