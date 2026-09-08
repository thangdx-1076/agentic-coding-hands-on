import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useKudosHearts, type ToggleHeartResult } from "./use-kudos-hearts";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

const VIEWER_ID = "viewer-1";

function makeCard(senderId: string): KudosCardModel {
  const person = {
    id: senderId,
    fullName: "Sender",
    avatarUrl: null,
    department: "Dev",
    kudosReceived: 3,
  };
  return {
    id: "kudo-1",
    content: "Cảm ơn bạn",
    hashtags: [],
    imageUrls: [],
    heartCount: 7,
    createdAt: "2026-09-07T00:00:00Z",
    sender: person,
    receiver: { ...person, id: "receiver-1" },
  };
}

describe("useKudosHearts", () => {
  it("khách chưa đăng nhập → không gọi Server Action, không ghi override", () => {
    const action = vi.fn<(kudoId: string) => Promise<ToggleHeartResult>>();
    const { result, unmount } = renderHook(() => useKudosHearts(null, action));

    act(() => {
      result.current.toggleHeart(makeCard("someone-else"));
    });

    expect(action).not.toHaveBeenCalled();
    expect(result.current.heartOverrides).toEqual({});

    unmount();
  });

  it("kudo do chính mình gửi → không gọi Server Action", () => {
    const action = vi.fn<(kudoId: string) => Promise<ToggleHeartResult>>();
    const { result, unmount } = renderHook(() =>
      useKudosHearts(VIEWER_ID, action),
    );

    act(() => {
      result.current.toggleHeart(makeCard(VIEWER_ID));
    });

    expect(action).not.toHaveBeenCalled();

    unmount();
  });

  it("action trả ok → ghi lại đúng hearted/heartCount của SERVER, không đoán trước", async () => {
    const action = vi
      .fn<(kudoId: string) => Promise<ToggleHeartResult>>()
      .mockResolvedValue({ ok: true, hearted: true, heartCount: 8 });
    const { result, unmount } = renderHook(() =>
      useKudosHearts(VIEWER_ID, action),
    );

    act(() => {
      result.current.toggleHeart(makeCard("someone-else"));
    });

    expect(result.current.heartOverrides).toEqual({});
    await waitFor(() =>
      expect(result.current.heartOverrides).toEqual({
        "kudo-1": { hearted: true, heartCount: 8 },
      }),
    );
    expect(action).toHaveBeenCalledExactlyOnceWith("kudo-1");

    unmount();
  });

  it("action trả ok:false → giữ nguyên trạng thái server đã render", async () => {
    const action = vi
      .fn<(kudoId: string) => Promise<ToggleHeartResult>>()
      .mockResolvedValue({ ok: false, reason: "unauthenticated" });
    const { result, unmount } = renderHook(() =>
      useKudosHearts(VIEWER_ID, action),
    );

    await act(async () => {
      result.current.toggleHeart(makeCard("someone-else"));
      await Promise.resolve();
    });

    expect(action).toHaveBeenCalledExactlyOnceWith("kudo-1");
    expect(result.current.heartOverrides).toEqual({});

    unmount();
  });

  it("action throw (lỗi transport) → nuốt lỗi, không override, không unhandled rejection", async () => {
    const action = vi
      .fn<(kudoId: string) => Promise<ToggleHeartResult>>()
      .mockRejectedValue(new Error("network down"));
    const { result, unmount } = renderHook(() =>
      useKudosHearts(VIEWER_ID, action),
    );

    await act(async () => {
      result.current.toggleHeart(makeCard("someone-else"));
      await Promise.resolve();
    });

    expect(action).toHaveBeenCalledExactlyOnceWith("kudo-1");
    expect(result.current.heartOverrides).toEqual({});

    unmount();
  });

  it("hai click nhanh cùng lúc → chỉ gọi Server Action MỘT lần (guard in-flight)", async () => {
    let release: (value: ToggleHeartResult) => void = () => {};
    const pending = new Promise<ToggleHeartResult>((resolve) => {
      release = resolve;
    });
    const action = vi.fn().mockReturnValue(pending);
    const card = makeCard("someone-else");

    const { result } = renderHook(() => useKudosHearts(VIEWER_ID, action));

    // Cả hai click nằm trong CÙNG một tick — đúng kịch bản double-click mà
    // `UNIQUE(kudo_id, user_id)` từng phải đứng ra dọn.
    act(() => {
      result.current.toggleHeart(card);
      result.current.toggleHeart(card);
    });

    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      release({ ok: true, hearted: true, heartCount: 8 });
      await pending;
    });

    await waitFor(() => {
      expect(result.current.heartOverrides["kudo-1"]).toEqual({
        hearted: true,
        heartCount: 8,
      });
    });
  });

  it("click lại SAU khi request xong → gọi được tiếp, guard không kẹt vĩnh viễn", async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, hearted: true, heartCount: 8 })
      .mockResolvedValueOnce({ ok: true, hearted: false, heartCount: 7 });
    const card = makeCard("someone-else");

    const { result } = renderHook(() => useKudosHearts(VIEWER_ID, action));

    await act(async () => {
      result.current.toggleHeart(card);
      // Nhả microtask để promise của action settle trong act, tránh
      // "update not wrapped in act" ở lần setState kế tiếp.
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.heartOverrides["kudo-1"]?.hearted).toBe(true);
    });

    await act(async () => {
      result.current.toggleHeart(card);
      // Nhả microtask để promise của action settle trong act, tránh
      // "update not wrapped in act" ở lần setState kế tiếp.
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.heartOverrides["kudo-1"]?.hearted).toBe(false);
    });

    expect(action).toHaveBeenCalledTimes(2);
  });

  it("request lỗi → guard được nhả, click sau vẫn gọi được", async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ok: true, hearted: true, heartCount: 8 });
    const card = makeCard("someone-else");

    const { result } = renderHook(() => useKudosHearts(VIEWER_ID, action));

    await act(async () => {
      result.current.toggleHeart(card);
      // Nhả microtask để promise của action settle trong act, tránh
      // "update not wrapped in act" ở lần setState kế tiếp.
      await Promise.resolve();
    });
    await act(async () => {
      result.current.toggleHeart(card);
      // Nhả microtask để promise của action settle trong act, tránh
      // "update not wrapped in act" ở lần setState kế tiếp.
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(2);
    });
  });
});
