import Image from "next/image";
import Link from "next/link";

import type { KudosCopy } from "../_shared/kudos-copy";
import { heroTierIndex } from "../_utils/star-tier";

import { KudosHeroBadge } from "./kudos-hero-badge";
import { KudosPersonHoverCard } from "./kudos-person-hover-card";

import { HERO_TIERS } from "@/constants/hero-tiers";
import { ROUTES } from "@/constants/routes";
import type { KudosPerson } from "@/dal/kudos";

export type KudosCardPersonProps = {
  person: KudosPerson;
  /** Named `personRole`, not `role` — a bare `role` JSX attribute trips
   * `jsx-a11y/aria-role` even on a non-DOM component prop. */
  personRole: "sender" | "receiver";
  /** Only the hero-tier slice is needed here; the card already holds the
   * whole `KudosCopy` and passes this through. */
  heroTiers: KudosCopy["heroTiers"];
  personHover: KudosCopy["personHover"];
};

/**
 * mm:B.3.1/B.3.2_Avatar+Thông tin người gửi (`I2940:13465;335:9443`) ·
 * B.3.5/B.3.6 người nhận (`...;335:9446`) — same instance (`componentId
 * 256:4830`) reused for both sender and receiver, and again by
 * C.3.1/C.3.3 in the feed variant. Avatar 64x64 (`asset-dimensions.md`),
 * name links to `/profile?id=`, department + hero-tier badge sit on one row
 * separated by a 4x4 dot (`Ellipse 70`).
 *
 * The badge is `HERO_TIERS` (`@/constants/hero-tiers`) — one shared table
 * for this screen and `/standards`, which is where it moved to when this
 * file's own copy of it needed a second reader. `starTier()` (phase 06)
 * returns the same 0-3 ordinal, gated on kudos RECEIVED (B.3.2's 10/20/50
 * rule) rather than the distinct-sender count the tier COPY describes —
 * a pre-existing mismatch this file only renders, it does not decide.
 */
export function KudosCardPerson({
  person,
  personRole,
  heroTiers,
  personHover,
}: KudosCardPersonProps) {
  // `null` until at least one person has sent them a kudo — nobody wears
  // "New Hero" before that (see `heroTierIndex`).
  const tierIndex = heroTierIndex(person.distinctSenders);
  const tier = tierIndex === null ? null : HERO_TIERS[tierIndex];
  const blockTestId =
    personRole === "sender" ? "kudos-card-sender" : "kudos-card-receiver";
  const nameTestId =
    personRole === "sender"
      ? "kudos-card-sender-name"
      : "kudos-card-receiver-name";

  return (
    <div data-testid={blockTestId} className="flex flex-col items-center gap-3">
      {/* mm:B.3.1/B.3.5_Avatar (MM_MEDIA_Avatar, 64x64) — hovering it opens
          the Sunner's info card ("Hover Avatar info user"). */}
      <KudosPersonHoverCard
        person={person}
        tier={tier}
        tierLabel={tier ? heroTiers[tier.slug].label : ""}
        copy={personHover}
      >
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
      </KudosPersonHoverCard>
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
          {tier ? (
            <KudosHeroBadge tier={tier} copy={heroTiers[tier.slug]} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
