import Image from "next/image";

import type { ProfileCopy } from "../_shared/profile-copy";

import type { ProfileCard } from "@/dal/profile-cards";

export type ProfileHeroProps = {
  /** SEC_004 — component reads only `fullName`/`avatarUrl`, never `email`/`role`. */
  profile: Pick<ProfileCard, "fullName" | "avatarUrl">;
  copy: ProfileCopy["hero"];
};

/**
 * Hero band (mm:362:5050 "Bìa" → mm:1210:12622 "Keyvisual" → mm:362:5052
 * `mms_A_Info`, https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb).
 * Full-bleed keyvisual (Figma instance 1440x512, `aspect-[1440/512]` below)
 * with a bottom gradient fading into `bg-login-background`, same asset as
 * the Homepage hero (`/home/Keyvisual_BG.png`, confirmed 1512x1392 — cropped
 * via `object-cover object-top` rather than reusing the shared
 * `KeyvisualBackground` component, whose aspect ratio is tuned for a taller
 * 1392px band, not this screen's shorter 512px one).
 *
 * The avatar circle (200x200, mm:362:5053) is pulled up by half its own
 * height (`-mt-[100px]`) so it straddles the band's lower edge — "đè mép
 * dưới" per the plan. Name (mm:362:5054 → mm:362:5055) renders directly
 * below it.
 *
 * Deliberately does NOT render mm:362:5056 ("A.2.2. Thông tin chi tiết" —
 * department text + Hero-tier badge + separator dot, nested inside
 * mm:362:5054 as a sibling of the name text): GUI_009 specifies omitting
 * this line entirely for a sparse profile, and `users` has no
 * department/tier/star columns to source it from (clarifications.md,
 * functional-spec.md § 11 RISK-02). C3 asserts its absence.
 */
export function ProfileHero({ profile, copy }: ProfileHeroProps) {
  const displayName = profile.fullName ?? copy.fallbackName;

  return (
    // mm:362:5050 + mm:1210:12622
    <div className="relative w-full">
      <div className="relative aspect-[1440/512] w-full overflow-hidden">
        {/* mm:I1210:12622;2167:5140 */}
        <Image
          src="/home/Keyvisual_BG.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover object-top"
        />
        {/* mm:I1210:12622;1210:12612 — Cover, fades into bg-login-background */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,16,26,0) 55%, #00101A 100%)",
          }}
        />
      </div>

      {/* mm:362:5052 */}
      <div className="relative z-10 -mt-[100px] flex flex-col items-center gap-8 px-6 pb-8 text-center">
        {profile.avatarUrl ? (
          // mm:362:5053 — remote avatar host has no `next.config` `images.remotePatterns`
          // entry yet; a plain `<img>` is used on purpose (Key Insights, phase-05 plan) —
          // `next.config.ts` is not owned by this phase.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            aria-hidden="true"
            width={200}
            height={200}
            className="h-[200px] w-[200px] rounded-full border-4 border-white object-cover"
          />
        ) : (
          <div className="h-[200px] w-[200px] rounded-full border-4 border-white bg-[#323231]" />
        )}
        {/* mm:362:5054 → mm:362:5055 only, NOT mm:362:5056 */}
        <h1 className="font-montserrat text-[36px] leading-[44px] font-bold text-login-button">
          {displayName}
        </h1>
      </div>
    </div>
  );
}
