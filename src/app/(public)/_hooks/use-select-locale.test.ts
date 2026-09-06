import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../../_actions/set-locale";

import { useSelectLocale } from "./use-select-locale";

/**
 * `setLocale` is a `"use server"` action — mocked at the boundary so this
 * test observes only what `useSelectLocale` itself does (start a
 * transition, call `setLocale` once), not a real Next.js round-trip. Does
 * NOT touch `hooks/use-login-actions.ts` (separate hook, separate test —
 * sharing `setLocale` under two different transitions is intentional, see
 * clarifications.md § Header).
 */
vi.mock("../../_actions/set-locale", () => ({
  setLocale: vi.fn(),
}));

describe("useSelectLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleSelectLocale gọi setLocale đúng 1 lần với locale được chọn", async () => {
    vi.mocked(setLocale).mockResolvedValueOnce(undefined);

    const { result, unmount } = renderHook(() => useSelectLocale());

    await act(async () => {
      result.current.handleSelectLocale("en");
      await Promise.resolve();
    });

    expect(setLocale).toHaveBeenCalledExactlyOnceWith("en");

    unmount();
  });

  it("isPending bật true đồng bộ ngay tại startTransition, rồi tắt khi action resolve", async () => {
    let resolveSetLocale!: () => void;
    vi.mocked(setLocale).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveSetLocale = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useSelectLocale());
    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.handleSelectLocale("vi");
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolveSetLocale();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    unmount();
  });
});
