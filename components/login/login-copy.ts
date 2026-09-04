/**
 * Presentational copy contract for the Login screen (mm:662:14387).
 * `defaultLoginCopy` holds the exact Figma `characters` for the `vi`
 * locale — do not translate or edit these values here. Track B supplies
 * the localized `en` variant (see clarifications.md) via next-intl.
 */
export type LoginCopy = {
  subtitle: string;
  tagline: string;
  loginButton: string;
  footer: string;
  logoAlt: string;
  heroAlt: string;
  languageLabel: string;
};

export const defaultLoginCopy: LoginCopy = {
  subtitle: "Bắt đầu hành trình của bạn cùng SAA 2025.",
  tagline: "Đăng nhập để khám phá!",
  loginButton: "LOGIN With Google",
  footer: "Bản quyền thuộc về Sun* © 2025",
  logoAlt: "Sun* Annual Awards 2025",
  heroAlt: "ROOT FURTHER",
  languageLabel: "VN",
};
