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
 * The Navigation API (`window.navigation`) isn't implemented by jsdom, so
 * each test defines or deletes it directly on `window` and `afterEach`
 * restores the absent-by-default state — same pattern as stubbing
 * `history.length` in the sibling hook test, just for a property jsdom
 * never defines at all rather than one it defines read-only.
 *
 * Real-Chromium values behind these three cases (measured against the dev
 * server, Chromium via Playwright, see the hook's own doc comment for the
 * full numbers): in-app `<Link>` navigation → `canGoBack: true`; a direct
 * `page.goto()` load → `canGoBack: false`; Firefox/Safari, which don't
 * implement `window.navigation` at all → the API is simply absent.
 */
function stubNavigationApi(canGoBack: boolean | undefined) {
  if (canGoBack === undefined) {
    Reflect.deleteProperty(window, "navigation");
    return;
  }
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: { canGoBack },
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
    Reflect.deleteProperty(window, "navigation");
  });

  it("Navigation API present, canGoBack true (in-app nav từ /) → gọi router.back(), không push", () => {
    stubNavigationApi(true);

    const { result } = renderHook(() => useStandardsClose());

    act(() => {
      result.current.handleClose();
    });

    expect(back).toHaveBeenCalledExactlyOnceWith();
    expect(push).not.toHaveBeenCalled();
  });

  it("Navigation API present, canGoBack false (direct-load / tab mới) → gọi router.push(ROUTES.HOME), không back", () => {
    stubNavigationApi(false);

    const { result } = renderHook(() => useStandardsClose());

    act(() => {
      result.current.handleClose();
    });

    expect(push).toHaveBeenCalledExactlyOnceWith(ROUTES.HOME);
    expect(back).not.toHaveBeenCalled();
  });

  it("Navigation API vắng mặt (Firefox/Safari) → fallback an toàn router.push(ROUTES.HOME), không back", () => {
    stubNavigationApi(undefined);

    const { result } = renderHook(() => useStandardsClose());

    act(() => {
      result.current.handleClose();
    });

    expect(push).toHaveBeenCalledExactlyOnceWith(ROUTES.HOME);
    expect(back).not.toHaveBeenCalled();
  });
});
