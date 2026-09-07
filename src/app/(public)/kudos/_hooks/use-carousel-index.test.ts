import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCarouselIndex } from "./use-carousel-index";

describe("useCarouselIndex", () => {
  it("count = 0 → index 0, cả hai nút disabled, next/prev không throw", () => {
    const { result } = renderHook(() => useCarouselIndex(0));

    expect(result.current.index).toBe(0);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(false);

    act(() => {
      result.current.next();
      result.current.prev();
    });

    expect(result.current.index).toBe(0);
  });

  it("count = 1 → cả hai nút disabled (chỉ 1 slide)", () => {
    const { result } = renderHook(() => useCarouselIndex(1));

    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(false);
  });

  it("count = 5: next() đi tới cuối thì canNext tắt, prev() quay lại đầu thì canPrev tắt", () => {
    const { result } = renderHook(() => useCarouselIndex(5));

    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);

    act(() => {
      result.current.next();
      result.current.next();
      result.current.next();
      result.current.next();
    });

    expect(result.current.index).toBe(4);
    expect(result.current.canNext).toBe(false);
    expect(result.current.canPrev).toBe(true);

    // Next tại slide cuối là no-op.
    act(() => {
      result.current.next();
    });
    expect(result.current.index).toBe(4);

    act(() => {
      result.current.prev();
      result.current.prev();
      result.current.prev();
      result.current.prev();
    });

    expect(result.current.index).toBe(0);
    expect(result.current.canPrev).toBe(false);

    // Prev tại slide đầu là no-op.
    act(() => {
      result.current.prev();
    });
    expect(result.current.index).toBe(0);
  });

  it("count đổi (bộ lọc mới) → reset index về 0", () => {
    const { result, rerender } = renderHook(
      ({ count }) => useCarouselIndex(count),
      { initialProps: { count: 5 } },
    );

    act(() => {
      result.current.next();
      result.current.next();
      result.current.next();
    });
    expect(result.current.index).toBe(3);

    rerender({ count: 3 });

    expect(result.current.index).toBe(0);
    expect(result.current.canNext).toBe(true);
  });

  it("rerender với count không đổi thì KHÔNG reset index đang có", () => {
    const { result, rerender } = renderHook(
      ({ count }) => useCarouselIndex(count),
      { initialProps: { count: 5 } },
    );

    act(() => {
      result.current.next();
      result.current.next();
    });
    expect(result.current.index).toBe(2);

    rerender({ count: 5 });

    expect(result.current.index).toBe(2);
  });
});
