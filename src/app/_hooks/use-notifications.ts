"use client";

import { useCallback, useRef, useState } from "react";

import { markAllReadAction, markReadAction } from "../_actions/notifications";

import { useNotificationsRealtime } from "./use-notifications-realtime";

import { fetchUnreadCount, listNotifications } from "@/api/notifications";
import type { NotificationRow } from "@/domain/notifications/types";

export type UseNotificationsOptions = {
  /** The signed-in viewer's id — read server-side and passed down, same
   * path `viewer`/`isAdmin` already travel (clarifications.md § "Nơi bơm
   * unreadCount"). Used only to scope the realtime channel; the list/count
   * reads themselves rely on RLS, never this value. */
  userId: string;
  /** Server-rendered count, valid at first paint. From then on this hook
   * owns `unreadCount` — see the sync block below for what happens when
   * this prop changes across a navigation. */
  initialUnreadCount: number;
};

export type UseNotifications = {
  open: boolean;
  /** Flips `open` and, the FIRST time it becomes `true`, triggers the
   * initial page load (FR-007 — the list is never fetched while closed).
   * Reopening after data has already loaded once does not refetch. */
  setOpen: (open: boolean) => void;
  items: NotificationRow[];
  nextCursor: string | null;
  /** Server count is the only source of truth (FR-204) — this NEVER
   * changes by client arithmetic, only by being reassigned to what a
   * fetch returned. */
  unreadCount: number;
  loading: boolean;
  error: boolean;
  loadMore: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

/**
 * Notification popup's client state (F012_NotificationsPanel, phase-05,
 * technical-spec.md § 5). No JSX — `src/app/_components/notification-bell.tsx`
 * (phase 08) renders against this.
 *
 * Every state-changing action here (`setOpen`, `loadMore`, `markRead`,
 * `markAllRead`) is a plain function invoked from a UI event handler, not
 * from inside a `useEffect` — so the `setState` calls each one makes stay
 * outside the "synchronous setState in an effect body" the React Compiler
 * ESLint rule bans (`react-hooks/set-state-in-effect`; see
 * `use-sunner-suggest.ts` for the same constraint on the read side). The
 * only effects live in `use-notifications-realtime.ts` (split out to stay
 * under this file's 200-line cap) — exactly the case that rule allows: it
 * synchronizes with an external system, and every `setState` it triggers
 * runs from that system's own callback, never synchronously in the effect
 * body itself.
 */
export function useNotifications({
  userId,
  initialUnreadCount,
}: UseNotificationsOptions): UseNotifications {
  const [open, setOpenState] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // "Adjusting state when a prop changes" (react.dev) — NOT a `useEffect`.
  // `initialUnreadCount` can change across a client-side navigation (a new
  // server-rendered value); comparing against the last prop value we saw
  // lets `unreadCount` re-sync to it exactly once per change, instead of
  // an unconditional effect that would fight every optimistic-free refetch
  // below and loop (clarifications.md § phase-05 Key Insight 4).
  const [syncedInitialCount, setSyncedInitialCount] =
    useState(initialUnreadCount);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  if (initialUnreadCount !== syncedInitialCount) {
    setSyncedInitialCount(initialUnreadCount);
    setUnreadCount(initialUnreadCount);
  }

  const loadedRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const refetchCount = useCallback(() => {
    void fetchUnreadCount().then((count) => {
      setUnreadCount(count);
    });
  }, []);

  // Stable identity ([] deps): reads no state, only calls setters + a ref
  // write, so the realtime effect below can depend on it without
  // resubscribing on every render.
  const fetchFirstPage = useCallback(() => {
    setLoading(true);
    setError(false);
    void listNotifications(null)
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
        loadedRef.current = true;
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function setOpen(next: boolean) {
    setOpenState(next);
    if (next && !loadedRef.current) {
      fetchFirstPage();
    }
  }

  function loadMore() {
    if (loadingMoreRef.current || nextCursor === null) return;

    loadingMoreRef.current = true;
    setLoading(true);
    void listNotifications(nextCursor)
      .then((page) => {
        setItems((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const fresh = page.items.filter((item) => !existingIds.has(item.id));
          return [...prev, ...fresh];
        });
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoading(false);
      });
  }

  function markRead(id: string) {
    void markReadAction(id)
      .then((result) => {
        if (result.ok) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, isRead: true } : item,
            ),
          );
        }
      })
      .catch(() => {
        // Transport failure only — the action fails closed server-side.
      })
      .finally(() => {
        // Never `count - 1` here (FR-204) — the server count is refetched,
        // not derived.
        refetchCount();
      });
  }

  function markAllRead() {
    void markAllReadAction()
      .then((result) => {
        if (result.ok) {
          loadedRef.current = false;
          fetchFirstPage();
        }
      })
      .catch(() => {
        // Transport failure only — the action fails closed server-side.
      })
      .finally(() => {
        refetchCount();
      });
  }

  useNotificationsRealtime(userId, open, refetchCount, fetchFirstPage);

  return {
    open,
    setOpen,
    items,
    nextCursor,
    unreadCount,
    loading,
    error,
    loadMore,
    markRead,
    markAllRead,
  };
}
