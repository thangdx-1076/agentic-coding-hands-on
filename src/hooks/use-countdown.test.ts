import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "./use-countdown";

/**
 * jsdom project — this hook owns a `setInterval` tick, so every test runs
 * under `vi.useFakeTimers()`. No real timers, no flakiness (phase-03 risk
 * table).
 */
describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("render đầu tiên dùng initialNowMs, KHÔNG gọi Date.now()", () => {
    const initialNowMs = new Date("2026-01-01T00:00:00.000Z").getTime();
    // Đồng hồ hệ thống lệch xa initialNowMs một cách cố ý: nếu hook lỡ đọc
    // Date.now() lúc render đầu thay vì seed từ prop, test này sẽ đỏ.
    vi.setSystemTime(new Date("2030-06-15T00:00:00.000Z"));
    const targetIso = new Date(initialNowMs + 90_000).toISOString(); // +1p30s

    const { result, unmount } = renderHook(() =>
      useCountdown(targetIso, initialNowMs),
    );

    expect(result.current).toEqual({
      days: "00",
      hours: "00",
      minutes: "01",
      showComingSoon: true,
    });

    unmount();
  });

  it("setInterval(1000) cập nhật trạng thái sau mỗi tick", () => {
    const initialNowMs = new Date("2026-01-01T00:00:00.000Z").getTime();
    vi.setSystemTime(initialNowMs);
    const targetIso = new Date(initialNowMs + 1_000).toISOString();

    const { result, unmount } = renderHook(() =>
      useCountdown(targetIso, initialNowMs),
    );

    expect(result.current.showComingSoon).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.showComingSoon).toBe(false);
    expect(result.current).toEqual({
      days: "00",
      hours: "00",
      minutes: "00",
      showComingSoon: false,
    });

    unmount();
  });

  it("targetIso null → 00/00/00 và showComingSoon true", () => {
    const { result, unmount } = renderHook(() =>
      useCountdown(null, Date.now()),
    );

    expect(result.current).toEqual({
      days: "00",
      hours: "00",
      minutes: "00",
      showComingSoon: true,
    });

    unmount();
  });

  it("đã qua mốc → 00/00/00 và ẩn showComingSoon", () => {
    const initialNowMs = new Date("2026-01-01T00:00:00.000Z").getTime();
    const pastIso = new Date(initialNowMs - 60_000).toISOString();

    const { result, unmount } = renderHook(() =>
      useCountdown(pastIso, initialNowMs),
    );

    expect(result.current).toEqual({
      days: "00",
      hours: "00",
      minutes: "00",
      showComingSoon: false,
    });

    unmount();
  });

  it("dọn dẹp setInterval khi unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const initialNowMs = new Date("2026-01-01T00:00:00.000Z").getTime();
    const targetIso = new Date(initialNowMs + 120_000).toISOString();

    const { unmount } = renderHook(() => useCountdown(targetIso, initialNowMs));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("targetIso null không set interval nào (không có gì để dọn dẹp)", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { unmount } = renderHook(() => useCountdown(null, Date.now()));

    unmount();

    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });
});
