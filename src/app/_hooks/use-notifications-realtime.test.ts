import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotificationsRealtime } from "./use-notifications-realtime";

import { subscribeToNotifications } from "@/api/notifications";

vi.mock("@/api/notifications", () => ({
  subscribeToNotifications: vi.fn(),
}));

describe("useNotificationsRealtime", () => {
  let unsubscribe: ReturnType<typeof vi.fn>;
  let capturedOnInsert: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribe = vi.fn();
    vi.mocked(subscribeToNotifications).mockImplementation(
      (_userId, onInsert) => {
        capturedOnInsert = onInsert;
        return unsubscribe;
      },
    );
  });

  it("subscribe đúng userId khi mount", () => {
    const { unmount } = renderHook(() =>
      useNotificationsRealtime("user-1", false, vi.fn(), vi.fn()),
    );

    expect(subscribeToNotifications).toHaveBeenCalledExactlyOnceWith(
      "user-1",
      expect.any(Function),
    );

    unmount();
  });

  it("unmount → gọi hàm huỷ channel", () => {
    const { unmount } = renderHook(() =>
      useNotificationsRealtime("user-1", false, vi.fn(), vi.fn()),
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("open=true lúc INSERT tới → gọi cả refetchCount lẫn fetchFirstPage", () => {
    const refetchCount = vi.fn();
    const fetchFirstPage = vi.fn();
    const { unmount } = renderHook(() =>
      useNotificationsRealtime("user-1", true, refetchCount, fetchFirstPage),
    );

    act(() => {
      capturedOnInsert?.();
    });

    expect(refetchCount).toHaveBeenCalledOnce();
    expect(fetchFirstPage).toHaveBeenCalledOnce();

    unmount();
  });

  it("open=false lúc INSERT tới → chỉ gọi refetchCount, không refetch trang", () => {
    const refetchCount = vi.fn();
    const fetchFirstPage = vi.fn();
    const { unmount } = renderHook(() =>
      useNotificationsRealtime("user-1", false, refetchCount, fetchFirstPage),
    );

    act(() => {
      capturedOnInsert?.();
    });

    expect(refetchCount).toHaveBeenCalledOnce();
    expect(fetchFirstPage).not.toHaveBeenCalled();

    unmount();
  });

  it("open đổi qua rerender không subscribe lại — callback đọc open mới nhất qua ref", () => {
    const refetchCount = vi.fn();
    const fetchFirstPage = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ open }: { open: boolean }) =>
        useNotificationsRealtime("user-1", open, refetchCount, fetchFirstPage),
      { initialProps: { open: false } },
    );

    rerender({ open: true });

    expect(subscribeToNotifications).toHaveBeenCalledOnce();

    act(() => {
      capturedOnInsert?.();
    });
    expect(fetchFirstPage).toHaveBeenCalledOnce();

    unmount();
  });

  it("userId đổi → huỷ channel cũ, mở channel mới", () => {
    const { rerender, unmount } = renderHook(
      ({ userId }: { userId: string }) =>
        useNotificationsRealtime(userId, false, vi.fn(), vi.fn()),
      { initialProps: { userId: "user-1" } },
    );

    rerender({ userId: "user-2" });

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(subscribeToNotifications).toHaveBeenCalledTimes(2);
    expect(subscribeToNotifications).toHaveBeenLastCalledWith(
      "user-2",
      expect.any(Function),
    );

    unmount();
  });
});
