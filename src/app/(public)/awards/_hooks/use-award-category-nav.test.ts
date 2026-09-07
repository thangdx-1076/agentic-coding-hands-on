import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent } from "react";

import { useAwardCategoryNav } from "./use-award-category-nav";

/**
 * `jsdom` project — this hook owns an `IntersectionObserver` and reads
 * `matchMedia`, neither of which jsdom implements. Both are stubbed here;
 * `scrollIntoView` is stubbed too (jsdom has no scroll layout engine).
 *
 * Every spy (`preventDefault`, `scrollIntoView`) is read back through its own
 * local variable rather than a property access off the event/element —
 * reading e.g. `event.preventDefault` directly in an assertion trips
 * `@typescript-eslint/unbound-method` (see `use-menu-keyboard-nav.test.ts`
 * for the same convention already established in this repo).
 */

type FakeEntryInit = {
  slug: string;
  isIntersecting: boolean;
  intersectionRatio?: number;
  top?: number;
};

function makeEntry({
  slug,
  isIntersecting,
  intersectionRatio = 1,
  top = 0,
}: FakeEntryInit): IntersectionObserverEntry {
  return {
    target: { id: slug } as Element,
    isIntersecting,
    intersectionRatio,
    boundingClientRect: { top } as DOMRectReadOnly,
  } as unknown as IntersectionObserverEntry;
}

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

  fire(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function makeClickEvent() {
  const preventDefault = vi.fn();
  const event = { preventDefault } as unknown as MouseEvent<HTMLAnchorElement>;
  return { event, preventDefault };
}

const SLUGS = ["top-talent", "top-project", "mvp"];

function registerAll(
  registerSection: (slug: string) => (node: Element | null) => void,
) {
  for (const slug of SLUGS) {
    const el = document.createElement("section");
    el.id = slug;
    registerSection(slug)(el);
  }
}

describe("useAwardCategoryNav", () => {
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    stubMatchMedia(false);
    scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("khởi tạo activeSlug = slug đầu tiên", () => {
    const { result } = renderHook(() => useAwardCategoryNav(SLUGS));
    expect(result.current.activeSlug).toBe("top-talent");
  });

  it("danh sách slug rỗng → activeSlug khởi tạo rỗng, không throw", () => {
    const { result } = renderHook(() => useAwardCategoryNav([]));
    expect(result.current.activeSlug).toBe("");
  });

  it("observer bắn entry intersecting → đổi activeSlug", () => {
    const { result } = renderHook(() => useAwardCategoryNav(SLUGS));
    registerAll(result.current.registerSection);

    act(() => {
      FakeIntersectionObserver.instances[0].fire([
        makeEntry({ slug: "mvp", isIntersecting: true }),
      ]);
    });

    expect(result.current.activeSlug).toBe("mvp");
  });

  it("registerSection(slug)(null) gỡ section khỏi map nội bộ, không throw", () => {
    const { result } = renderHook(() => useAwardCategoryNav(SLUGS));
    const register = result.current.registerSection;
    const el = document.createElement("section");
    el.id = "mvp";

    expect(() => {
      register("mvp")(el);
      register("mvp")(null);
    }).not.toThrow();
  });

  it("click thắng observer: đổi active ngay, khoá observer tới khi scrollend", () => {
    const { result } = renderHook(() => useAwardCategoryNav(SLUGS));
    registerAll(result.current.registerSection);
    const { event, preventDefault } = makeClickEvent();

    act(() => {
      result.current.handleNavClick("mvp", event);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.activeSlug).toBe("mvp");
    expect(scrollIntoViewSpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth", block: "start" }),
    );
    expect(window.location.hash).toBe("#mvp");

    // Smooth scroll passes intermediate sections on the way to "mvp" — the
    // observer firing for one of them must NOT drag activeSlug away from the
    // clicked item while the scroll is still in flight (BR-003 race).
    act(() => {
      FakeIntersectionObserver.instances[0].fire([
        makeEntry({ slug: "top-talent", isIntersecting: true }),
      ]);
    });

    expect(result.current.activeSlug).toBe("mvp");

    // Releasing the lock via `scrollend` lets the observer drive again.
    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });

    act(() => {
      FakeIntersectionObserver.instances[0].fire([
        makeEntry({ slug: "top-project", isIntersecting: true }),
      ]);
    });

    expect(result.current.activeSlug).toBe("top-project");
  });

  it("thiếu scrollend: hết 700ms fallback cũng mở khoá", () => {
    const { result } = renderHook(() => useAwardCategoryNav(SLUGS));
    registerAll(result.current.registerSection);
    const { event } = makeClickEvent();

    act(() => {
      result.current.handleNavClick("mvp", event);
    });

    act(() => {
      vi.advanceTimersByTime(700);
    });

    act(() => {
      FakeIntersectionObserver.instances[0].fire([
        makeEntry({ slug: "top-project", isIntersecting: true }),
      ]);
    });

    expect(result.current.activeSlug).toBe("top-project");
  });

  it("prefers-reduced-motion → scrollIntoView dùng behavior auto", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useAwardCategoryNav(SLUGS));
    registerAll(result.current.registerSection);
    const { event } = makeClickEvent();

    act(() => {
      result.current.handleNavClick("mvp", event);
    });

    expect(scrollIntoViewSpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "auto" }),
    );
  });

  it("slug không hợp lệ (chưa registerSection) → không throw, không đổi active", () => {
    const { result } = renderHook(() => useAwardCategoryNav(SLUGS));
    registerAll(result.current.registerSection);
    const { event, preventDefault } = makeClickEvent();

    expect(() => {
      act(() => {
        result.current.handleNavClick("unknown-slug", event);
      });
    }).not.toThrow();

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.activeSlug).toBe("top-talent");
  });

  it("unmount → observer.disconnect() được gọi, không rò timer/listener", () => {
    const { unmount } = renderHook(() => useAwardCategoryNav(SLUGS));
    const observer = FakeIntersectionObserver.instances[0];

    expect(() => unmount()).not.toThrow();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("unmount sau khi đã click (timer + scrollend listener đang chờ) → dọn sạch, không throw", () => {
    const { result, unmount } = renderHook(() => useAwardCategoryNav(SLUGS));
    registerAll(result.current.registerSection);
    const { event } = makeClickEvent();

    act(() => {
      result.current.handleNavClick("mvp", event);
    });

    expect(() => unmount()).not.toThrow();
  });
});
