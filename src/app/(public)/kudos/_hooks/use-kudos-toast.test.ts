import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useKudosToast } from "./use-kudos-toast";

/** Matches `TOAST_DURATION_MS` in the hook — kept as a local literal the
 * same way `kudos-client.test.ts` duplicates `CARD_COLUMNS`, since the
 * constant is private to the module. */
const TOAST_DURATION_MS = 3000;

describe("useKudosToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("chưa gọi showToast → không có toast nào", () => {
    const { result, unmount } = renderHook(() => useKudosToast());

    expect(result.current.toastMessage).toBeNull();

    unmount();
  });

  it("showToast hiện message rồi tự tắt sau TOAST_DURATION_MS", () => {
    const { result, unmount } = renderHook(() => useKudosToast());

    act(() => {
      result.current.showToast("Link copied");
    });
    expect(result.current.toastMessage).toBe("Link copied");

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(result.current.toastMessage).toBeNull();

    unmount();
  });

  it("showToast lần hai reset đồng hồ — timer cũ không tắt message mới sớm", () => {
    const { result, unmount } = renderHook(() => useKudosToast());

    act(() => {
      result.current.showToast("Link copied");
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    });

    act(() => {
      result.current.showToast("Link copied again");
    });
    expect(result.current.toastMessage).toBe("Link copied again");

    // Đủ để timer ĐẦU TIÊN cháy nếu nó không bị clear.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.toastMessage).toBe("Link copied again");

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    });
    expect(result.current.toastMessage).toBeNull();

    unmount();
  });

  it("unmount khi toast còn hạn → clear timeout đang treo", () => {
    const { result, unmount } = renderHook(() => useKudosToast());

    act(() => {
      result.current.showToast("Link copied");
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("unmount khi chưa từng showToast → không có timer nào để clear", () => {
    const { unmount } = renderHook(() => useKudosToast());

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
