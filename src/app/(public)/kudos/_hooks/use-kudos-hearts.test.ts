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
});
