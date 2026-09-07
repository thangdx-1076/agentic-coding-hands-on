"use client";

import { useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 3000;

export type KudosToast = {
  toastMessage: string | null;
  showToast: (message: string) => void;
};

/**
 * The one transient toast `/kudos` renders (today only the "link copied"
 * confirmation): a single message at a time, cleared `TOAST_DURATION_MS`
 * after it appears.
 *
 * A second `showToast` before the first expires clears the pending
 * timeout and starts a fresh one — otherwise the older timer would blank
 * the newer message early. The same clear runs on unmount, so a toast
 * that outlives its page never calls `setState` on a torn-down tree.
 */
export function useKudosToast(): KudosToast {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function showToast(message: string): void {
    setToastMessage(message);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => setToastMessage(null),
      TOAST_DURATION_MS,
    );
  }

  return { toastMessage, showToast };
}
