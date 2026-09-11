"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useKudosCompose } from "../_contexts/kudos-compose-context";
import { useAnchoredPopover } from "../_hooks/use-anchored-popover";
import type { KudosPersonHoverCopy } from "../_shared/kudos-copy";

import type { HeroTierAsset } from "@/constants/hero-tiers";
import type { KudosPerson } from "@/dal/kudos";

export type KudosPersonHoverCardProps = {
  person: KudosPerson;
  /** `null` for a Sunner nobody has sent a kudo to yet — the card simply
   * omits the badge row rather than inventing a tier they have not earned. */
  tier: HeroTierAsset | null;
  tierLabel: string;
  copy: KudosPersonHoverCopy;
  /** The avatar this card hangs under. */
  children: ReactNode;
};

/** Width the design draws for the hover card. */
const CARD_WIDTH = 336;

/**
 * The "Hover Avatar info user" card: a Sunner's name, unit, earned Hero
 * badge, their two Kudos counts, and a "Gửi KUDO" call to action.
 *
 * Opens on hover AND on keyboard focus, and — unlike a pure tooltip — the
 * card itself is hoverable, because it holds a link the reader has to be
 * able to travel to. That is why the open state is owned by the wrapper
 * that spans trigger and card, not by the trigger alone, and why closing is
 * deferred a beat: moving the pointer from the avatar to the card crosses a
 * gap, and closing on the first `mouseleave` would snatch the card away
 * mid-journey.
 *
 * Portalled to `document.body` for the same reason `kudos-hero-badge.tsx`
 * is: a Highlight card sits inside the carousel's `transform`ed slide
 * (`kudos-highlight-carousel.tsx:98`), and a transformed ancestor becomes
 * the containing block for `position: fixed`, which would leave the card
 * measured against the slide instead of the viewport.
 *
 * Rendered for an anonymous sender too, minus the parts that would identify
 * them: `person.id === null` is that signal (AD-2), and it suppresses the
 * profile link exactly as `kudos-card-person.tsx` already does for the name.
 */
export function KudosPersonHoverCard({
  person,
  tier,
  tierLabel,
  copy,
  children,
}: KudosPersonHoverCardProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardId = useId();
  const compose = useKudosCompose();

  const position = useAnchoredPopover({
    anchorRef,
    panelRef: cardRef,
    width: CARD_WIDTH,
    deps: [open],
  });

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function show() {
    cancelClose();
    setOpen(true);
  }

  /** Grace period covering the pointer's trip from avatar to card. */
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => cancelClose, []);

  return (
    <>
      {/* A real button, not a `<span>` with handlers: the card is genuine
          content (counts, and an action), so it has to be reachable by
          keyboard too — focus opens it exactly as hover does. */}
      <button
        ref={anchorRef}
        type="button"
        className="inline-flex cursor-pointer rounded-full outline-none"
        data-testid="kudos-person-hover-trigger"
        aria-describedby={open ? cardId : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onBlur={scheduleClose}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {children}
      </button>
      {/* No `document` guard needed: `open` only ever becomes true from a
          real hover or focus, which cannot happen on the server or before
          hydration. */}
      {open
        ? createPortal(
            <div
              ref={cardRef}
              id={cardId}
              data-testid="kudos-person-hover-card"
              onMouseEnter={show}
              onMouseLeave={scheduleClose}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                width: CARD_WIDTH,
                maxHeight: position?.maxHeight,
                visibility: position ? "visible" : "hidden",
              }}
              className="fixed z-50 flex flex-col gap-3 overflow-y-auto rounded-xl bg-[#14181C] p-5 shadow-lg"
            >
              <p className="font-montserrat text-xl leading-7 font-bold text-login-button">
                {person.fullName ?? copy.unknownName}
              </p>
              {person.department ? (
                <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
                  {copy.unitLabel} {person.department}
                </p>
              ) : null}
              {tier ? (
                <Image
                  src={tier.asset}
                  alt={tierLabel}
                  width={tier.width}
                  height={tier.height}
                  className="rounded-full"
                />
              ) : null}
              <span className="h-px w-full bg-white/15" />
              <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
                {copy.receivedLabel}{" "}
                <span className="text-login-button">
                  {person.kudosReceived}
                </span>
              </p>
              <p className="font-montserrat text-sm leading-5 font-bold tracking-[0.1px] text-white">
                {copy.sentLabel}{" "}
                <span className="text-login-button">{person.kudosSent}</span>
              </p>
              {/* Suppressed for an anonymous sender: there is no identity to
                  address a kudo to (`person.id === null`, AD-2). */}
              {person.id === null ? null : (
                <button
                  type="button"
                  data-testid="kudos-person-hover-cta"
                  onClick={() => {
                    setOpen(false);
                    compose?.open({
                      id: person.id as string,
                      fullName: person.fullName,
                      avatarUrl: person.avatarUrl,
                      department: person.department,
                    });
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-login-button px-4 py-3 font-montserrat text-base leading-6 font-bold text-login-button-text"
                >
                  {copy.sendKudo}
                </button>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
