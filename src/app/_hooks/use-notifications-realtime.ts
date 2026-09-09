"use client";

import { useEffect, useRef } from "react";

import { subscribeToNotifications } from "@/api/notifications";

/**
 * The realtime half of `use-notifications.ts`, split out to keep that file
 * under this repo's 200-line cap (phase-05 Todo list). Subscribes once per
 * `userId` for the whole hook lifetime — the bell renders across all 4
 * pages — independent of `open`.
 *
 * `openRef` — not the `open` value itself — is what the subscription's
 * callback reads: the `useEffect` below intentionally does NOT list `open`
 * as a dependency, because doing so would tear down and recreate the
 * realtime channel on every panel toggle. Mirroring it into a ref lets the
 * callback see the CURRENT `open` state without resubscribing.
 */
export function useNotificationsRealtime(
  userId: string,
  open: boolean,
  refetchCount: () => void,
  fetchFirstPage: () => void,
): void {
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(userId, () => {
      refetchCount();
      if (openRef.current) {
        fetchFirstPage();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, refetchCount, fetchFirstPage]);
}
