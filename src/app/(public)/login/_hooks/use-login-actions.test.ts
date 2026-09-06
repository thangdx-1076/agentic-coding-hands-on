import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../../../_actions/set-locale";

import { useLoginActions } from "./use-login-actions";

import { signInWithGoogle } from "@/lib/auth/sign-in-with-google";

/**
 * Cả 2 module ranh giới đều bị mock: `signInWithGoogle` để không chạm
 * `createClient`/Supabase thật (đã có bộ test riêng ở
 * `lib/auth/sign-in-with-google.test.ts`), `setLocale` vì đây là action
 * "use server" — mock ngay ranh giới, không cần chạy round-trip Next.js
 * thật để quan sát `isPending`.
 */
vi.mock("@/lib/auth/sign-in-with-google", () => ({
  signInWithGoogle: vi.fn(),
}));
vi.mock("../../../_actions/set-locale", () => ({
  setLocale: vi.fn(),
}));

describe("useLoginActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isPending bật true đồng bộ ngay khi bấm, và resolve { ok: false } bật hasClientError", async () => {
    let resolveSignIn!: (value: { ok: boolean }) => void;
    vi.mocked(signInWithGoogle).mockReturnValueOnce(
      new Promise<{ ok: boolean }>((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    const { result, unmount } = renderHook(() =>
      useLoginActions({ next: "/todo" }),
    );
    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.handleLoginClick();
    });
    // isPending bật true NGAY tại lời gọi startTransition, đồng bộ — không
    // cần await để quan sát (react.dev/reference/react/useTransition,
    // nguyên văn: "the isPending state switches to true at the first call
    // to startTransition").
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolveSignIn({ ok: false });
      await Promise.resolve(); // xả microtask để state update commit
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.hasClientError).toBe(true);
    expect(signInWithGoogle).toHaveBeenCalledExactlyOnceWith({
      origin: window.location.origin,
      next: "/todo",
    });

    unmount();
  });

  it("hasClientError vẫn false khi signInWithGoogle trả { ok: true }", async () => {
    vi.mocked(signInWithGoogle).mockResolvedValueOnce({ ok: true });

    const { result, unmount } = renderHook(() =>
      useLoginActions({ next: "/todo" }),
    );

    await act(async () => {
      result.current.handleLoginClick();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.hasClientError).toBe(false);

    unmount();
  });

  it("bấm lần 2 sau lỗi reset hasClientError về false trước khi transition mới chạy", async () => {
    vi.mocked(signInWithGoogle).mockResolvedValueOnce({ ok: false });

    const { result, unmount } = renderHook(() =>
      useLoginActions({ next: "/todo" }),
    );

    await act(async () => {
      result.current.handleLoginClick();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.hasClientError).toBe(true);

    // Lần bấm thứ 2 dùng promise CHƯA resolve, để bắt đúng khoảnh khắc
    // `setHasClientError(false)` đã chạy — dòng đó nằm TRƯỚC
    // `startTransition` trong `handleLoginClick`, nên chạy đồng bộ, không
    // chờ kết quả lần gọi mới về.
    let resolveSecond!: (value: { ok: boolean }) => void;
    vi.mocked(signInWithGoogle).mockReturnValueOnce(
      new Promise<{ ok: boolean }>((resolve) => {
        resolveSecond = resolve;
      }),
    );

    act(() => {
      result.current.handleLoginClick();
    });
    expect(result.current.hasClientError).toBe(false);
    expect(result.current.isPending).toBe(true);

    // Xả nốt lần gọi thứ 2 để không để lại transition treo lửng sang test khác.
    await act(async () => {
      resolveSecond({ ok: true });
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    unmount();
  });

  // Regression guard — KHÔNG "sửa cho đẹp": login và đổi ngôn ngữ cố ý dùng
  // CHUNG một `useTransition` (xem doc comment của hook). Hệ quả quan sát
  // được: đổi ngôn ngữ cũng đẩy isPending lên true. Test này khoá hành vi
  // đó lại — nếu nó đỏ, đấy là một quyết định thiết kế cần bàn, không phải
  // một lỗi cần vá lặng lẽ.
  it("[regression guard] handleSelectLocale dùng chung transition với login — cố ý giữ nguyên", () => {
    vi.mocked(setLocale).mockReturnValueOnce(new Promise<void>(() => {}));

    const { result, unmount } = renderHook(() =>
      useLoginActions({ next: "/todo" }),
    );
    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.handleSelectLocale("en");
    });

    expect(result.current.isPending).toBe(true);
    expect(setLocale).toHaveBeenCalledExactlyOnceWith("en");

    unmount();
  });
});
