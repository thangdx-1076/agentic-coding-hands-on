import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInfiniteFeed, type FeedPage } from "./use-infinite-feed";

type Kudo = { id: string };

/**
 * Minimal fake mirroring `use-award-category-nav.test.ts`'s
 * `FakeIntersectionObserver` — jsdom has no real `IntersectionObserver`,
 * so this is what lets a test fire an "entry intersecting" callback
 * synchronously and deterministically.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  observed: Element[] = [];
  disconnect = vi.fn();

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve(el: Element) {
    this.observed = this.observed.filter((node) => node !== el);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  fire(isIntersecting: boolean) {
    const entry = { isIntersecting } as unknown as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

function makeSentinel(): Element {
  return document.createElement("div");
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const FIRST_PAGE: FeedPage<Kudo> = {
  items: [{ id: "1" }, { id: "2" }],
  nextCursor: "cursor-1",
};

describe("useInfiniteFeed", () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("khởi tạo với trang đầu; hasMore = true khi initialPage có nextCursor", () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useInfiniteFeed(FIRST_PAGE, loadMore));

    expect(result.current.items).toEqual(FIRST_PAGE.items);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("nextCursor null (hết dữ liệu) → hasMore false, sentinel bắn cũng không gọi loader", () => {
    const exhaustedPage: FeedPage<Kudo> = {
      items: [{ id: "1" }],
      nextCursor: null,
    };
    const loadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteFeed(exhaustedPage, loadMore),
    );

    expect(result.current.hasMore).toBe(false);

    act(() => {
      result.current.sentinelRef(makeSentinel());
    });
    act(() => {
      FakeIntersectionObserver.instances[0]?.fire(true);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it("entry không intersecting → không gọi loader", () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useInfiniteFeed(FIRST_PAGE, loadMore));

    act(() => {
      result.current.sentinelRef(makeSentinel());
    });
    act(() => {
      FakeIntersectionObserver.instances[0]?.fire(false);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it("sentinel bắn 3 lần liên tiếp trước khi loader resolve → loader chỉ chạy đúng 1 lần", async () => {
    const { promise, resolve } = deferred<FeedPage<Kudo>>();
    const loadMore = vi.fn().mockReturnValue(promise);
    const { result } = renderHook(() => useInfiniteFeed(FIRST_PAGE, loadMore));

    act(() => {
      result.current.sentinelRef(makeSentinel());
    });

    act(() => {
      FakeIntersectionObserver.instances[0]?.fire(true);
      FakeIntersectionObserver.instances[0]?.fire(true);
      FakeIntersectionObserver.instances[0]?.fire(true);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);

    resolve({ items: [{ id: "3" }], nextCursor: "cursor-2" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([...FIRST_PAGE.items, { id: "3" }]);
    expect(result.current.hasMore).toBe(true);
  });

  it("loader ném lỗi → isLoading về false, items/cursor giữ nguyên, lần bắn sau vẫn thử lại được", async () => {
    const loadMore = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ items: [{ id: "3" }], nextCursor: null });
    const { result } = renderHook(() => useInfiniteFeed(FIRST_PAGE, loadMore));

    act(() => {
      result.current.sentinelRef(makeSentinel());
    });

    act(() => {
      FakeIntersectionObserver.instances[0]?.fire(true);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual(FIRST_PAGE.items);
    expect(result.current.hasMore).toBe(true);

    act(() => {
      FakeIntersectionObserver.instances[0]?.fire(true);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([...FIRST_PAGE.items, { id: "3" }]);
    expect(result.current.hasMore).toBe(false);
  });

  it("gỡ sentinel (node null) ngắt observer cũ; unmount ngắt observer đang hoạt động", () => {
    const loadMore = vi.fn();
    const { result, unmount } = renderHook(() =>
      useInfiniteFeed(FIRST_PAGE, loadMore),
    );

    act(() => {
      result.current.sentinelRef(makeSentinel());
    });
    const firstObserver = FakeIntersectionObserver.instances[0];

    act(() => {
      result.current.sentinelRef(null);
    });
    expect(firstObserver?.disconnect).toHaveBeenCalled();

    act(() => {
      result.current.sentinelRef(makeSentinel());
    });
    const secondObserver = FakeIntersectionObserver.instances[1];

    unmount();
    expect(secondObserver?.disconnect).toHaveBeenCalled();
  });
});
