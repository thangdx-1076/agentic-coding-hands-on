"use client";

import { LoginScreen } from "@/components/login/login-screen";
import type { LoginCopy } from "@/components/login/login-copy";
import { useLoginActions } from "@/hooks/use-login-actions";
import type { AppLocale } from "@/lib/i18n/locale";

export type LoginClientProps = {
  copy: LoginCopy;
  locale: AppLocale;
  /**
   * Fixed, translated error text — always available so a client-only
   * OAuth failure (never round-tripped through `?error=`) can show the
   * same copy the server renders for a `?error=` redirect.
   */
  errorText: string;
  /** Non-null when the server already resolved a `?error=` query param. */
  errorMessage: string | null;
};

/** Đích quay về sau khi `/auth/callback` đổi code lấy session. */
const NEXT_PATH = "/todo";

/**
 * Ranh giới client của `/login` (A2 · FR-202/FR-203, nấc đổi ngôn ngữ của
 * A1). Chỉ nối props với hành động: state, transition và lời gọi OAuth nằm
 * trong `useLoginActions`.
 */
export function LoginClient({
  copy,
  locale,
  errorText,
  errorMessage,
}: LoginClientProps) {
  const { isPending, hasClientError, handleLoginClick, handleSelectLocale } =
    useLoginActions({ next: NEXT_PATH });

  return (
    <LoginScreen
      copy={copy}
      locale={locale}
      loginPending={isPending}
      errorMessage={hasClientError ? errorText : errorMessage}
      onLoginClick={handleLoginClick}
      onSelectLocale={handleSelectLocale}
    />
  );
}
