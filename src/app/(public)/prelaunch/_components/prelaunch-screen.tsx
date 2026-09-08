import type { ReactNode } from "react";
import Image from "next/image";

import { CountdownTiles } from "@/components/countdown-tiles";
import { montserrat, montserratAlternates } from "@/styles/fonts";

export type PrelaunchScreenProps = {
  /** `prelaunch.title` — next-intl copy, vi/en (clarifications.md § Copy tiêu đề). */
  title: string;
  /**
   * Countdown slot (mm:2268:35138 "Time") — a `ReactNode` so the page's 1s
   * client tick never re-renders this otherwise-static screen. Defaults to
   * the static zero-state for Storybook and any caller that hasn't wired the
   * live timer — the fallback labels below are the literal Figma copy,
   * identical in both `vi` and `en` `messages/*.json` (`home.hero.*`), so
   * hardcoding them here doesn't diverge from either locale.
   */
  countdown?: ReactNode;
};

/**
 * Root composition of the `/prelaunch` screen (mm:2268:35127 "Countdown -
 * Prelaunch page", https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU).
 * Full-bleed, non-scrolling: a full-viewport background photo + dark scrim
 * (mm:2268:35129/35130) behind a single centered content column — title +
 * `CountdownTiles`. No header, no footer, no other route content leaks in
 * (spec.md § 2 Layout Regions lists only R1 background / R2 content).
 *
 * Deliberately does NOT reuse `(home)/_components/keyvisual-background.tsx`
 * (that component pins a 1512×1392 hero aspect ratio meant to scroll away
 * under a sticky header — this screen is a static full-viewport cover with
 * its own crop) nor `(home)/_components/countdown-timer.tsx` (carries
 * "Coming soon" visibility logic this screen's spec doesn't have).
 */
export function PrelaunchScreen({ title, countdown }: PrelaunchScreenProps) {
  const countdownSlot = countdown ?? (
    <CountdownTiles
      days="00"
      hours="00"
      minutes="00"
      daysLabel="DAYS"
      hoursLabel="HOURS"
      minutesLabel="MINUTES"
    />
  );

  return (
    /* mm:2268:35127 */
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative isolate flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-login-background`}
    >
      {/* mm:2268:35129 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/prelaunch/Prelaunch_BG.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      {/* mm:2268:35130 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(18deg, #00101A 15.48%, rgba(0, 18, 29, 0.46) 52.13%, rgba(0, 19, 32, 0.00) 63.41%)",
        }}
      />
      {/* mm:2268:35131 / mm:2268:35136 */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 py-16 text-center sm:px-8 lg:px-36">
        {/* mm:2268:35137 */}
        <h1 className="font-montserrat text-3xl leading-[1.3] font-bold text-white lg:text-4xl lg:leading-[48px]">
          {title}
        </h1>
        {countdownSlot}
      </div>
    </div>
  );
}
