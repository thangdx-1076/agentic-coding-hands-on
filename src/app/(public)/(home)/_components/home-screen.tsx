import type { ReactNode } from "react";

import { defaultHomeCopy, type HomeCopy } from "../_shared/home-copy";
import { KeyvisualBackground } from "../../../_components/keyvisual-background";
import { SiteHeader } from "../../../_components/site-header";
import { KudosSection } from "../../../_components/kudos-section";
import { SiteFooter } from "../../../_components/site-footer";
import type { SiteViewer } from "../../../_shared/site-chrome";
import { CountdownTiles } from "../../_components/countdown-tiles";

import { HeroSection } from "./hero-section";
import { CtaButtons } from "./cta-buttons";
import { RootFurtherContent } from "./root-further-content";
import { AwardsSection } from "./awards-section";
import { WidgetButton } from "./widget-button";

import { montserrat, montserratAlternates } from "@/styles/fonts";

export type HomeScreenProps = {
  copy?: HomeCopy;
  locale?: "vi" | "en";
  viewer?: SiteViewer | null;
  /**
   * Countdown slot (mm:2167:9035 `mms_B1_Countdown time`) — a ReactNode so a
   * 1s tick only re-renders this subtree (plan.md § Integration contract).
   * Default renders the static zero-state ("00/00/00" + "Coming soon") for
   * Storybook and any caller that hasn't wired the live timer yet; a later
   * integration phase's `countdown-timer.tsx` supplies the real value by
   * wrapping live state around the same `CountdownTiles` used here.
   */
  countdown?: ReactNode;
  onSelectLocale?: (locale: "vi" | "en") => void;
  logoutAction?: () => void | Promise<void>;
};

/**
 * Root composition of the Homepage SAA screen (mm:2167:9026 "Homepage SAA",
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM).
 * Full-bleed `w-full min-h-screen` — never a fixed 1512px canvas (code-rules
 * § 3). Presentational only; every prop defaults to the Figma `vi` copy and
 * an anonymous viewer so this renders standalone in Storybook. Track B wires
 * the real `viewer`, live `countdown`, locale, and server actions.
 *
 * Structure mirrors mm:2167:9026's direct children in order: Keyvisual+Cover
 * (background, `KeyvisualBackground`) → sticky `SiteHeader` → `<main>` (Hero +
 * CTA + RootFurther + Awards + Kudos, the mm:2167:9030 "Bìa" content column)
 * → `SiteFooter` → fixed `WidgetButton`. Exactly one `<h1>` exists on the
 * page (inside `HeroSection`) — nothing here adds another heading tag.
 */
export function HomeScreen({
  copy = defaultHomeCopy,
  locale = "vi",
  viewer = null,
  countdown,
  onSelectLocale,
  logoutAction,
}: HomeScreenProps) {
  const languageLabel = locale === "en" ? "EN" : "VN";

  const countdownSlot = countdown ?? (
    <>
      {/* mm:2167:9036 */}
      <p className="font-montserrat text-2xl leading-8 font-bold text-white">
        {copy.hero.comingSoon}
      </p>
      <CountdownTiles
        days="00"
        hours="00"
        minutes="00"
        daysLabel={copy.hero.days}
        hoursLabel={copy.hero.hours}
        minutesLabel={copy.hero.minutes}
      />
    </>
  );

  return (
    /* mm:2167:9026 */
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative isolate flex min-h-screen w-full flex-col overflow-x-hidden bg-login-background`}
    >
      <KeyvisualBackground />
      <SiteHeader
        copy={copy}
        languageLabel={languageLabel}
        viewer={viewer}
        onSelectLocale={onSelectLocale}
        logoutAction={logoutAction}
      />
      {/* mm:2167:9030 */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1224px] flex-1 flex-col gap-20 px-6 py-16 sm:px-8 lg:px-0 lg:py-24">
        <HeroSection copy={copy} countdown={countdownSlot} />
        <CtaButtons
          aboutAwardsLabel={copy.cta.aboutAwards}
          aboutKudosLabel={copy.cta.aboutKudos}
        />
        <RootFurtherContent copy={copy} />
        <AwardsSection copy={copy} />
        <KudosSection copy={copy} />
      </main>
      <SiteFooter copy={copy} />
      <WidgetButton
        standardsLabel={copy.widget.standardsItem}
        writeKudosLabel={copy.widget.writeKudosItem}
        buttonLabel={copy.widget.label}
        cancelLabel={copy.widget.cancelLabel}
      />
    </div>
  );
}
