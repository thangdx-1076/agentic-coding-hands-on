"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAnchoredPopover } from "../_hooks/use-anchored-popover";
import type { HeroTierCopy } from "../_shared/kudos-copy";

import type { HeroTierAsset } from "@/constants/hero-tiers";

export type KudosHeroBadgeProps = {
  tier: HeroTierAsset;
  copy: HeroTierCopy;
};

/** Matches the hover card the design draws for each tier. */
const CARD_WIDTH = 264;

/**
 * A Sunner's earned Hero badge, with the explanation card the design shows
 * on hover ("Hover danh hiệu New Hero" … "Legend Hero"): the badge artwork
 * again, the condition that earns it, and what it means.
 *
 * `rounded-full` on the artwork is not decoration — the PNG is a rectangle
 * around pill-shaped art, so without clipping its corners read as dark
 * notches on the card's cream ground.
 *
 * Reachable without a mouse: the trigger is a real `<button>`, and the card
 * opens on focus as well as hover, closes on blur, mouse-leave and Escape.
 * It closes IMMEDIATELY on mouse-leave, unlike `kudos-person-hover-card.tsx`
 * which holds a 120ms grace period — deliberate, not an oversight: that card
 * contains a button the pointer has to travel to, and this one is pure text
 * with nothing to reach.
 * It is `aria-describedby`-linked rather than announced as a dialog — it
 * describes the badge, it does not take over from it.
 *
 * Placement reuses `useAnchoredPopover` for the same reason the hashtag and
 * recipient dropdowns do: the card must float clear of whatever scroll
 * container or card boundary the badge happens to sit inside.
 *
 * Unlike those two, this one is PORTALLED to `document.body`, and it has to
 * be. A badge on a Highlight card sits inside the carousel's slide, which is
 * positioned with `transform: translate(...)`
 * (`kudos-highlight-carousel.tsx:98`) — and a transformed ancestor becomes
 * the containing block for `position: fixed`, so the card's
 * viewport-measured coordinates were being re-interpreted against the slide
 * and it landed far from its badge. The portal removes the ancestor, and the
 * measurement means what it says again.
 *
 * The dialog popovers deliberately do NOT portal: a modal `<dialog>` renders
 * in the browser's top layer, so a panel moved out to `document.body` would
 * be painted UNDERNEATH it.
 */
export function KudosHeroBadge({ tier, copy }: KudosHeroBadgeProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardId = useId();

  const position = useAnchoredPopover({
    anchorRef: triggerRef,
    panelRef: cardRef,
    width: CARD_WIDTH,
    deps: [open],
  });

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        data-testid="kudos-hero-badge"
        aria-describedby={open ? cardId : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="inline-flex cursor-pointer outline-none"
      >
        <Image
          src={tier.asset}
          alt={copy.label}
          width={tier.width}
          height={tier.height}
          className="rounded-full"
        />
      </button>
      {/* No `document` guard needed: `open` only ever becomes true from a
          real hover or focus, which cannot happen on the server or before
          hydration. */}
      {open
        ? createPortal(
            <div
              ref={cardRef}
              id={cardId}
              role="tooltip"
              data-testid="kudos-hero-badge-card"
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                width: CARD_WIDTH,
                maxHeight: position?.maxHeight,
                visibility: position ? "visible" : "hidden",
              }}
              className="fixed z-50 flex flex-col gap-2 overflow-y-auto rounded-xl bg-[#14181C] p-4 shadow-lg"
            >
              <Image
                src={tier.asset}
                alt=""
                width={tier.width}
                height={tier.height}
                className="rounded-full"
              />
              <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
                {copy.condition}
              </p>
              <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white/80">
                {copy.description}
              </p>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
