import { montserrat, montserratAlternates } from "@/app/fonts";
import { LoginBackground } from "./login-background";
import { LoginHeader } from "./login-header";
import { LoginHero } from "./login-hero";
import { LoginFooter } from "./login-footer";
import { defaultLoginCopy, type LoginCopy } from "./login-copy";

export type LoginScreenProps = {
  copy?: LoginCopy;
  locale?: "vi" | "en";
  onSelectLocale?: (locale: "vi" | "en") => void;
  onLoginClick?: () => void;
  loginPending?: boolean;
  errorMessage?: string | null;
};

/**
 * Root composition of the Login screen (mm:662:14387), full-bleed
 * `w-full min-h-screen` — never a fixed 1440px canvas. Presentational only;
 * defaults render the Figma `vi` copy as-is. Track B supplies real
 * copy/locale/handlers from Supabase + next-intl.
 */
export function LoginScreen({
  copy = defaultLoginCopy,
  locale = "vi",
  onSelectLocale,
  onLoginClick,
  loginPending = false,
  errorMessage = null,
}: LoginScreenProps) {
  const languageLabel = locale === "en" ? "EN" : "VN";

  return (
    /* mm:662:14387 */
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative flex min-h-screen w-full flex-col overflow-x-hidden bg-login-background`}
    >
      <LoginBackground />
      <LoginHeader
        logoAlt={copy.logoAlt}
        languageLabel={languageLabel}
        onSelectLocale={onSelectLocale}
      />
      <LoginHero
        copy={copy}
        onLoginClick={onLoginClick}
        loginPending={loginPending}
        errorMessage={errorMessage}
      />
      <LoginFooter copyright={copy.footer} />
    </div>
  );
}
