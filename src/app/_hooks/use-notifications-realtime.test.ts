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

  it("userId rỗng → KHÔNG mở channel nào", () => {
    // `NotificationBell` render lần đầu với `userId` rỗng và chỉ điền sau
    // khi `auth.getUser()` trả về. Đăng ký lúc đó tạo một kênh với bộ lọc
    // `user_id=eq.` — không khớp dòng nào — rồi bị huỷ ngay.
    //
    // Kênh rác đó từng làm TC-019 đỏ: nó khiến "kênh đầu tiên đã join"
    // không còn đồng nghĩa với "sẵn sàng nhận thông báo".
    const { unmount } = renderHook(() =>
      useNotificationsRealtime("", false, vi.fn(), vi.fn()),
    );

    expect(subscribeToNotifications).not.toHaveBeenCalled();

    unmount();
  });

  it("userId rỗng rồi có giá trị → chỉ subscribe MỘT lần, bằng id thật", () => {
    const { rerender, unmount } = renderHook(
      ({ userId }: { userId: string }) =>
        useNotificationsRealtime(userId, false, vi.fn(), vi.fn()),
      { initialProps: { userId: "" } },
    );

    expect(subscribeToNotifications).not.toHaveBeenCalled();

    rerender({ userId: "user-1" });

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
