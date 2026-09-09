import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { markAllReadAction, markReadAction } from "../_actions/notifications";

import { useNotifications } from "./use-notifications";

import {
  fetchUnreadCount,
  listNotifications,
  subscribeToNotifications,
} from "@/api/notifications";
import type { NotificationRow } from "@/domain/notifications/types";

vi.mock("@/api/notifications", () => ({
  fetchUnreadCount: vi.fn(),
  listNotifications: vi.fn(),
  subscribeToNotifications: vi.fn(),
}));

vi.mock("../_actions/notifications", () => ({
  markReadAction: vi.fn(),
  markAllReadAction: vi.fn(),
}));

const USER_ID = "user-1";

function makeRow(
  id: string,
  overrides: Partial<NotificationRow> = {},
): NotificationRow {
  return {
    id,
    type: "kudos_received",
    payload: { kudosId: "k-1", senderName: "An" },
    isRead: false,
    createdAt: "2026-09-09T00:00:00Z",
    ...overrides,
  };
}

describe("useNotifications", () => {
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribe = vi.fn();
    vi.mocked(subscribeToNotifications).mockReturnValue(unsubscribe);
  });

  it("mở panel lần đầu → nạp danh sách đúng 1 lần", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [makeRow("n-1")],
      nextCursor: null,
    });

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    act(() => {
      result.current.setOpen(true);
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(listNotifications).toHaveBeenCalledExactlyOnceWith(null);

    unmount();
  });

  it("đóng rồi mở lại khi đã có dữ liệu → không nạp lại", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [makeRow("n-1")],
      nextCursor: null,
    });

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.setOpen(false);
    });
    act(() => {
      result.current.setOpen(true);
    });

    expect(listNotifications).toHaveBeenCalledOnce();

    unmount();
  });

  it("loadMore nối trang mới, loại trùng id với trang đã có", async () => {
    vi.mocked(listNotifications).mockResolvedValueOnce({
      items: [makeRow("n-1"), makeRow("n-2")],
      nextCursor: "cursor-1",
    });

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    vi.mocked(listNotifications).mockResolvedValueOnce({
      items: [makeRow("n-2"), makeRow("n-3")], // n-2 trùng với trang trước
      nextCursor: null,
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() =>
      expect(result.current.items.map((item) => item.id)).toEqual([
        "n-1",
        "n-2",
        "n-3",
      ]),
    );
    expect(listNotifications).toHaveBeenLastCalledWith("cursor-1");

    unmount();
  });

  it("loadMore lỗi → error=true, không kẹt loading", async () => {
    vi.mocked(listNotifications)
      .mockResolvedValueOnce({
        items: [makeRow("n-1")],
        nextCursor: "cursor-1",
      })
      .mockRejectedValueOnce(new Error("boom"));

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);

    unmount();
  });

  it("loadMore không gọi thêm khi nextCursor null", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [makeRow("n-1")],
      nextCursor: null,
    });

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.loadMore();
    });

    expect(listNotifications).toHaveBeenCalledOnce();

    unmount();
  });

  it("realtime INSERT → gọi fetchUnreadCount đúng 1 lần", async () => {
    vi.mocked(fetchUnreadCount).mockResolvedValue(5);

    renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    const onInsert = vi.mocked(subscribeToNotifications).mock.calls[0]?.[1];
    expect(onInsert).toBeDefined();

    act(() => {
      onInsert?.();
    });

    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalledOnce());
  });

  it("unmount → gọi hàm huỷ channel", () => {
    const { unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("markRead: action ok → đánh dấu ĐÚNG 1 item isRead tại chỗ, gọi lại fetchUnreadCount thay vì tự trừ", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [
        makeRow("n-1", { isRead: false }),
        makeRow("n-2", { isRead: false }),
      ],
      nextCursor: null,
    });
    vi.mocked(markReadAction).mockResolvedValue({ ok: true });
    vi.mocked(fetchUnreadCount).mockResolvedValue(2);

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 3 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    act(() => {
      result.current.markRead("n-1");
    });

    await waitFor(() => expect(result.current.items[0]?.isRead).toBe(true));
    // n-2 không được đánh dấu — chứng minh nhánh "không khớp id" của map giữ
    // nguyên item.
    expect(result.current.items[1]?.isRead).toBe(false);
    await waitFor(() => expect(result.current.unreadCount).toBe(2));
    expect(fetchUnreadCount).toHaveBeenCalledOnce();

    unmount();
  });

  it("markRead: action ok:false → không đổi item, vẫn refetch count", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [makeRow("n-1", { isRead: false })],
      nextCursor: null,
    });
    vi.mocked(markReadAction).mockResolvedValue({ ok: false });
    vi.mocked(fetchUnreadCount).mockResolvedValue(3);

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 3 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.markRead("n-1");
    });

    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalledOnce());
    expect(result.current.items[0]?.isRead).toBe(false);

    unmount();
  });

  it("markRead: action ném lỗi transport → vẫn refetch count, không throw", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [makeRow("n-1")],
      nextCursor: null,
    });
    vi.mocked(markReadAction).mockRejectedValue(new Error("network"));
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 1 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.markRead("n-1");
    });

    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalledOnce());

    unmount();
  });

  it("markAllRead: action ok → reset về trang đầu mới, refetch count", async () => {
    vi.mocked(listNotifications)
      .mockResolvedValueOnce({
        items: [makeRow("n-1", { isRead: false })],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        items: [makeRow("n-1", { isRead: true })],
        nextCursor: null,
      });
    vi.mocked(markAllReadAction).mockResolvedValue({ ok: true, updated: 1 });
    vi.mocked(fetchUnreadCount).mockResolvedValue(0);

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 1 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.markAllRead();
    });

    await waitFor(() => expect(result.current.items[0]?.isRead).toBe(true));
    await waitFor(() => expect(result.current.unreadCount).toBe(0));
    expect(listNotifications).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("markAllRead: action ok:false → không refetch trang, vẫn refetch count", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [makeRow("n-1")],
      nextCursor: null,
    });
    vi.mocked(markAllReadAction).mockResolvedValue({ ok: false });
    vi.mocked(fetchUnreadCount).mockResolvedValue(3);

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 3 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.markAllRead();
    });

    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalledOnce());
    expect(listNotifications).toHaveBeenCalledOnce();

    unmount();
  });

  it("markAllRead: transport lỗi → vẫn refetch count, không throw", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    vi.mocked(markAllReadAction).mockRejectedValue(new Error("network"));
    vi.mocked(fetchUnreadCount).mockResolvedValue(0);

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(listNotifications).toHaveBeenCalledOnce());

    act(() => {
      result.current.markAllRead();
    });

    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalledOnce());

    unmount();
  });

  it("initialUnreadCount đổi giữa các lần render (điều hướng) → unreadCount đồng bộ lại", () => {
    const { result, rerender, unmount } = renderHook(
      (props: { initialUnreadCount: number }) =>
        useNotifications({
          userId: USER_ID,
          initialUnreadCount: props.initialUnreadCount,
        }),
      { initialProps: { initialUnreadCount: 2 } },
    );

    expect(result.current.unreadCount).toBe(2);

    rerender({ initialUnreadCount: 5 });

    expect(result.current.unreadCount).toBe(5);

    unmount();
  });

  it("fetch trang đầu lỗi → error=true, loading trả về false", async () => {
    vi.mocked(listNotifications).mockRejectedValue(new Error("boom"));

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    act(() => {
      result.current.setOpen(true);
    });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);

    unmount();
  });

  it("realtime INSERT khi panel đang mở → refetch trang đầu", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [makeRow("n-1")],
      nextCursor: null,
    });
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);

    const { result, unmount } = renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 1 }),
    );

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(listNotifications).toHaveBeenCalledOnce());

    const onInsert = vi.mocked(subscribeToNotifications).mock.calls[0]?.[1];

    act(() => {
      onInsert?.();
    });

    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(2));

    unmount();
  });

  it("realtime INSERT khi panel đang đóng → không refetch trang, chỉ refetch count", async () => {
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);

    renderHook(() =>
      useNotifications({ userId: USER_ID, initialUnreadCount: 0 }),
    );

    const onInsert = vi.mocked(subscribeToNotifications).mock.calls[0]?.[1];

    act(() => {
      onInsert?.();
    });

    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalledOnce());
    expect(listNotifications).not.toHaveBeenCalled();
  });
});
