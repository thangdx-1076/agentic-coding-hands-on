import Image from "next/image";
import Link from "next/link";

import { starTier } from "../_utils/star-tier";

import { ROUTES } from "@/constants/routes";
import type { KudosPerson } from "@/dal/kudos";

export type KudosCardPersonProps = {
  person: KudosPerson;
  /** Named `personRole`, not `role` — a bare `role` JSX attribute trips
   * `jsx-a11y/aria-role` even on a non-DOM component prop. */
  personRole: "sender" | "receiver";
};

/**
 * mm:B.3.1/B.3.2_Avatar+Thông tin người gửi (`I2940:13465;335:9443`) ·
 * B.3.5/B.3.6 người nhận (`...;335:9446`) — same instance (`componentId
 * 256:4830`) reused for both sender and receiver, and again by
 * C.3.1/C.3.3 in the feed variant. Avatar 64x64 (`asset-dimensions.md`),
 * name links to `/profile?id=`, department + hero-tier badge sit on one row
 * separated by a 4x4 dot (`Ellipse 70`).
 *
 * The 4 badge PNGs are the SAME assets `/standards` ships
 * (`new-hero.png`/`rising-hero.png`/`super-hero.png`/`legend-hero.png`,
 * order New → Rising → Super → Legend confirmed by
 * `standards/_shared/standards-copy.ts`'s `HERO_TIER_ROWS`) — but that table
 * can't be imported here (ESLint bans cross-segment `_shared` imports), so
 * it is duplicated, scoped to this file. `starTier()` (phase 06) returns the
 * same 0-3 ordinal, just gated on kudos RECEIVED (B.3.2's 10/20/50 rule)
 * instead of Standards' distinct-sender count — different metric, same
 * visual ladder.
 */
const HERO_TIER_BADGES = [
  {
    asset: "/standards/new-hero.png",
    alt: "New Hero",
    width: 126,
    height: 22,
  },
  {
    asset: "/standards/rising-hero.png",
    alt: "Rising Hero",
    width: 110,
    height: 20,
  },
  {
    asset: "/standards/super-hero.png",
    alt: "Super Hero",
    width: 109,
    height: 19,
  },
  {
    asset: "/standards/legend-hero.png",
    alt: "Legend Hero",
    width: 110,
    height: 20,
  },
] as const;

export function KudosCardPerson({ person, personRole }: KudosCardPersonProps) {
  const badge = HERO_TIER_BADGES[starTier(person.kudosReceived)];
  const blockTestId =
    personRole === "sender" ? "kudos-card-sender" : "kudos-card-receiver";
  const nameTestId =
    personRole === "sender"
      ? "kudos-card-sender-name"
      : "kudos-card-receiver-name";

  return (
    <div data-testid={blockTestId} className="flex flex-col items-center gap-3">
      {/* mm:B.3.1/B.3.5_Avatar (MM_MEDIA_Avatar, 64x64) */}
      {person.avatarUrl ? (
        <Image
          src={person.avatarUrl}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 rounded-full border-2 border-white object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-[#EEEEEE] font-montserrat text-lg font-bold text-login-button-text">
          {(person.fullName ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col items-start gap-0.5">
        {/* mm:B.3.2/B.3.6_Thông tin — click tên mở profile. `person.id === null`
         * is AD-2's anonymity signal (an anonymous kudo's sender): render the
         * name as plain text, never a `/profile` link — C25 asserts no
         * `a[href*="/profile"]` for that sender. */}
        {person.id === null ? (
          <span
            data-testid={nameTestId}
            className="font-montserrat text-base font-bold text-login-button-text"
          >
            {person.fullName ?? "Sunner"}
          </span>
        ) : (
          <Link
            href={`${ROUTES.PROFILE}?id=${person.id}`}
            data-testid={nameTestId}
            className="font-montserrat text-base font-bold text-login-button-text"
          >
            {person.fullName ?? "Sunner"}
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          {person.department ? (
            <>
              <span className="font-montserrat text-sm font-bold text-[#999999]">
                {person.department}
              </span>
              {/* mm:Ellipse 70 — separator dot between department and badge */}
              <span className="h-1 w-1 rounded-full bg-[#999999]/40" />
            </>
          ) : null}
          <Image
            src={badge.asset}
            alt={badge.alt}
            width={badge.width}
            height={badge.height}
          />
        </div>
      </div>
    </div>
  );
}
