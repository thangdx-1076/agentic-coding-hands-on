"use client";

import { IconGoogle } from "./icons/icon-google";

export type GoogleLoginButtonProps = {
  label: string;
  /** True while the OAuth redirect is in flight. */
  pending?: boolean;
  onClick?: () => void;
};

/**
 * Primary Google sign-in action (mm:662:14426). Hover = shadow/elevated
 * effect (TC c18649fa); disabled + spinner while pending (TC 37eae882).
 * Not a submit button — Track B calls `signInWithOAuth` from `onClick`.
 *
 * Polish (2026-09-04): adds hover lift, focus-visible ring (visible on the
 * dark page background), and a pressed/active scale — additive states only,
 * no layout/text/role change.
 */
export function GoogleLoginButton({
  label,
  pending = false,
  onClick,
}: GoogleLoginButtonProps) {
  return (
    /* mm:662:14426 */
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
      className="flex w-full max-w-[305px] cursor-pointer items-center gap-2 rounded-lg bg-login-button px-6 py-4 shadow-none transition-[opacity,transform,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none hover:-translate-y-px hover:shadow-lg active:translate-y-0 active:scale-[0.98] active:bg-login-button/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100"
    >
      {/* mm:I662:14426;186:1935 */}
      <span className="flex flex-1 items-center gap-1">
        {/* mm:I662:14426;186:1568 */}
        <span className="font-montserrat text-[22px] leading-7 font-bold tracking-normal text-login-button-text">
          {label}
        </span>
      </span>
      {pending ? (
        <span
          aria-hidden
          className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-login-button-text/30 border-t-login-button-text"
        />
      ) : (
        /* mm:I662:14426;186:1766 */
        <IconGoogle className="h-6 w-6 shrink-0" />
      )}
    </button>
  );
}
