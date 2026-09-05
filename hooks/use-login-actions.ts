"use client";

import { useState, useTransition } from "react";

import { setLocale } from "@/app/actions/locale";
import { signInWithGoogle } from "@/lib/auth/sign-in-with-google";
import type { AppLocale } from "@/lib/i18n/locale";

export type LoginActionsOptions = {
  /** Đường dẫn quay về sau khi đăng nhập thành công. */
  next: string;
};

export type LoginActions = {
  /**
   * True trong lúc một trong hai hành động đang chạy.
   *
   * Cố ý dùng CHUNG một transition cho cả đăng nhập lẫn đổi ngôn ngữ —
   * đúng như bản trước khi tách. Hệ quả: đổi ngôn ngữ cũng làm nút đăng
   * nhập vào trạng thái pending. Giữ nguyên để refactor không đổi hành vi.
   */
  isPending: boolean;
  /** True khi lần đăng nhập gần nhất hỏng ở phía client. */
  hasClientError: boolean;
  handleLoginClick: () => void;
  handleSelectLocale: (nextLocale: AppLocale) => void;
};

/**
 * Hai hành động của màn hình đăng nhập mà `LoginScreen` không tự làm được:
 * đẩy trình duyệt vào luồng Google OAuth, và ghi lựa chọn ngôn ngữ.
 *
 * Không cái nào là submit form — `signInWithOAuth` cần PKCE verifier của
 * trình duyệt, còn `setLocale` tự re-render qua vòng round-trip của Server
 * Action — nên cả hai chạy qua `useTransition` + handler thường, không
 * dùng `useActionState`.
 */
export function useLoginActions({ next }: LoginActionsOptions): LoginActions {
  const [isPending, startTransition] = useTransition();
  const [hasClientError, setHasClientError] = useState(false);

  function handleLoginClick() {
    setHasClientError(false);
    startTransition(async () => {
      const { ok } = await signInWithGoogle({
        origin: window.location.origin,
        next,
      });
      if (!ok) {
        setHasClientError(true);
      }
      // Không reset pending trong `finally`: khi thành công, trình duyệt
      // đang trên đường rời trang sang authorize URL của Google, nên để
      // `isPending` giữ true tới lúc unmount mới đúng (tránh nhấp nháy mà
      // TC 37eae882 từng bắt được).
    });
  }

  function handleSelectLocale(nextLocale: AppLocale) {
    // Trả về promise của Server Action (không fire-and-forget) để React 19
    // coi đây là async transition — `isPending` phản ánh thao tác ghi
    // cookie, và chính round-trip của action re-render lại cây với output
    // mới của `i18n/request.ts`; không cần `router.refresh()`.
    startTransition(() => setLocale(nextLocale));
  }

  return { isPending, hasClientError, handleLoginClick, handleSelectLocale };
}
