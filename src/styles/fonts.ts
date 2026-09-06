import { Montserrat, Montserrat_Alternates } from "next/font/google";

/**
 * Design fonts for the Login screen (mm:662:14387).
 * Figma `fontFamily` values: "Montserrat" (header/hero/button copy) and
 * "Montserrat Alternates" (footer copyright). Both weights used are 700.
 * Exposed as CSS variables so `LoginScreen` can apply them on its own root
 * without editing `app/layout.tsx` (Track B stays untouched here).
 */
export const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const montserratAlternates = Montserrat_Alternates({
  subsets: ["latin", "vietnamese"],
  weight: ["700"],
  variable: "--font-montserrat-alternates",
  display: "swap",
});

/** Combined className to spread on the Login screen root element. */
export const loginFontVariables = `${montserrat.variable} ${montserratAlternates.variable}`;
