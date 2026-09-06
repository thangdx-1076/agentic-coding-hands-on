import Image from "next/image";

import type { LoginCopy } from "../_shared/login-copy";

import { GoogleLoginButton } from "./google-login-button";
import { LoginErrorAlert } from "./login-error-alert";

export type LoginHeroProps = {
  copy: LoginCopy;
  onLoginClick?: () => void;
  loginPending?: boolean;
  errorMessage?: string | null;
};

/**
 * Main hero content: Root Further logomark, intro copy, and the Google
 * sign-in call to action, stacked with 96px/144px design padding scaled
 * responsively (mm:662:14393). `LoginFooter` is `position: fixed`, so it
 * reserves no flex-flow space; `lg:max-h-[845px]` caps this section to the
 * frame's own fixed design height (instead of stretching to fill the whole
 * remaining viewport) and `lg:mt-2` reproduces the 8px gap Figma has between
 * the header bottom (y=80) and this section's start (y=88) — both keep the
 * `justify-center` content vertically centered at the same offsets as the
 * design (logo y≈288, button y≈672) instead of ~40px lower.
 *
 * Polish (2026-09-04): `py-*` split into `pt-*`/`pb-*` so mobile/tablet get
 * extra bottom clearance (~footer height + buffer) without the fixed footer
 * covering the button on short viewports — `lg:pb-24` keeps the exact 96px
 * bottom value the pixel-perfect 1440×1024 capture was validated against.
 */
export function LoginHero({
  copy,
  onLoginClick,
  loginPending,
  errorMessage,
}: LoginHeroProps) {
  return (
    /* mm:662:14393 */
    <section className="relative z-10 flex w-full flex-1 flex-col items-start justify-center px-6 pt-10 pb-24 sm:px-12 sm:pt-16 sm:pb-28 lg:mt-2 lg:max-h-[845px] lg:px-36 lg:pt-24 lg:pb-24">
      {/* mm:662:14394 */}
      <div className="flex w-full max-w-[1152px] flex-col items-start justify-center gap-20">
        {/* mm:662:14395 */}
        <div className="flex flex-col items-start">
          {/* mm:2939:9548 */}
          <Image
            src="/login/Root_Further_Logo.png"
            alt={copy.heroAlt}
            width={451}
            height={200}
            priority
            className="h-auto w-full max-w-[451px] object-contain"
          />
        </div>
        {/* mm:662:14755 */}
        <div className="flex w-full max-w-[496px] flex-col items-start gap-6 pl-4">
          {/* mm:662:14753 */}
          <div className="font-montserrat text-xl leading-10 font-bold tracking-[0.5px] text-white">
            <p>{copy.subtitle}</p>
            <p>{copy.tagline}</p>
          </div>
          {/* mm:662:14425 */}
          <div className="flex w-full max-w-[305px] flex-col items-start gap-10">
            <GoogleLoginButton
              label={copy.loginButton}
              pending={loginPending}
              onClick={onLoginClick}
            />
            <LoginErrorAlert message={errorMessage ?? null} />
          </div>
        </div>
      </div>
    </section>
  );
}
