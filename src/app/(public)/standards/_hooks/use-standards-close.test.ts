import { act, renderHook } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useStandardsClose } from "./use-standards-close";

import { ROUTES } from "@/constants/routes";

/**
 * `next/navigation`'s `useRouter` is mocked at the boundary — this test
 * observes only what `useStandardsClose` itself decides (`back()` vs
 * `push()`), not a real App Router history stack.
 */
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

/**
 * jsdom's `window.history.length` is a real, read-only property that
 * defaults to `1`. `Object.defineProperty` with `configurable: true` lets
 * each test stub its own value and `afterEach` restores the original
 * descriptor so no test leaks state into the next.
 */
const originalHistoryLength = Object.getOwnPropertyDescriptor(
  window.history,
  "length",
);

function stubHistoryLength(length: number) {
  Object.defineProperty(window.history, "length", {
    configurable: true,
    get: () => length,
  });
}

describe("useStandardsClose", () => {
  const back = vi.fn();
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      back,
      push,
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    if (originalHistoryLength) {
      Object.defineProperty(window.history, "length", originalHistoryLength);
    }
  });

  it("có lịch sử (history.length > 1) → gọi router.back(), không push", () => {
    stubHistoryLength(2);

    const { result } = renderHook(() => useStandardsClose());

    act(() => {
      result.current.handleClose();
    });

    expect(back).toHaveBeenCalledExactlyOnceWith();
    expect(push).not.toHaveBeenCalled();
  });

  it("không có lịch sử (history.length <= 1, direct-load) → gọi router.push(ROUTES.HOME), không back", () => {
    stubHistoryLength(1);

    const { result } = renderHook(() => useStandardsClose());

    act(() => {
      result.current.handleClose();
    });

    expect(push).toHaveBeenCalledExactlyOnceWith(ROUTES.HOME);
    expect(back).not.toHaveBeenCalled();
  });
});
