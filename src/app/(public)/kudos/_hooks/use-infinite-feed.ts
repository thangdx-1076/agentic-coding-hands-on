"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FeedPage<TItem> = {
  items: TItem[];
  nextCursor: string | null;
};

export type InfiniteFeed<TItem> = {
  items: TItem[];
  hasMore: boolean;
  isLoading: boolean;
  sentinelRef: (node: Element | null) => void;
};

/**
 * Drives ALL KUDOS' infinite scroll (C18/C19): observes the sentinel
 * element a caller renders only while `hasMore` is true, and calls
 * `loadMore` with the current keyset cursor (AD-5 — `created_at`, never
 * `OFFSET`) the moment that sentinel enters the viewport.
 *
 * `isLoadingRef` — not just the `isLoading` state — is what keeps a burst
 * of `IntersectionObserver` callbacks (it keeps firing for as long as the
 * sentinel stays intersecting, not once) from starting more than one
 * fetch: the ref is set synchronously, before `loadMore`'s first `await`,
 * so every callback that fires while a fetch is already in flight sees it
 * immediately and returns without calling `loadMore` again.
 *
 * `loadMore` must be a referentially stable function (wrap it in
 * `useCallback` at the call site) — a new function identity every render
 * tears down and re-creates the `IntersectionObserver`.
 */
export function useInfiniteFeed<TItem>(
  initialPage: FeedPage<TItem>,
  loadMore: (cursor: string) => Promise<FeedPage<TItem>>,
): InfiniteFeed<TItem> {
  const [items, setItems] = useState<TItem[]>(initialPage.items);
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const cursorRef = useRef(cursor);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Refs are read/written outside render (event handlers, effects) only —
  // never assigned directly in the render body (`react-hooks/refs`), so
  // this mirrors `cursor` into the ref straight after each commit instead.
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  const fetchNextPage = useCallback(async () => {
    const currentCursor = cursorRef.current;
    if (isLoadingRef.current || currentCursor === null) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const page = await loadMore(currentCursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // A transport failure calling the Server Action itself —
      // `loadMoreKudos` already fails open server-side, so this only
      // guards network/runtime errors reaching the client. `items`/
      // `cursor` are left untouched: the sentinel stays mounted and the
      // next intersection retries, instead of freezing the feed at
      // whatever page happened to load before the failure.
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [loadMore]);

  const sentinelRef = useCallback(
    (node: Element | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!node) {
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage();
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    },
    [fetchNextPage],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { items, hasMore: cursor !== null, isLoading, sentinelRef };
}
