"use client";

import { useEffect, useMemo } from "react";
import type { MouseEvent } from "react";

import { useAwardCategoryNav } from "../_hooks/use-award-category-nav";

import { IconTarget } from "./icons/icon-target";

export type AwardCategoryNavItem = { slug: string; title: string };

export type AwardCategoryNavProps = {
  items: readonly AwardCategoryNavItem[];
  ariaLabel: string;
};

const LINK_BASE =
  "group flex shrink-0 items-center gap-2 whitespace-nowrap rounded p-4 font-montserrat text-sm leading-5 font-bold tracking-[0.25px] transition-colors duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background";
const LINK_ACTIVE =
  "border-b border-login-button text-login-button [text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] lg:border-b-0 lg:border-l-2 lg:pl-[14px]";
const LINK_INACTIVE =
  "border-b border-transparent text-white hover:bg-white/10 lg:border-b-0 lg:border-l-2 lg:border-transparent lg:pl-[14px]";

/**
 * Left category nav (mm:313:8459 `mms_C_Menu list`) — the ONLY interactive
 * leaf on `/awards`, per `../_hooks/use-award-category-nav.ts`'s scroll-spy +
 * click-to-scroll behavior (clarifications.md § Nav trái). Exactly ONE
 * `<nav aria-label="Danh mục giải thưởng">` renders; it is a chip bar sticky
 * below the header below `lg`, and a sticky sidebar from `lg` — one element
 * that changes class per breakpoint (NEVER two separate nav renders, see
 * phase-05 plan § Key Insights — a duplicate would double `toHaveCount(6)`
 * to 12 and break every strict-mode `a[href="#..."]` locator in
 * `tests/e2e/awards.spec.ts`).
 *
 * `AwardSection` (sibling, not a child) renders the actual `<section id>`
 * nodes as a plain server component — so instead of a ref prop threaded
 * across that boundary, this client leaf resolves `document.getElementById`
 * for each slug after mount and feeds the result into the hook's
 * `registerSection`, which only needs an `Element`, not a same-tree ref.
 */
export function AwardCategoryNav({ items, ariaLabel }: AwardCategoryNavProps) {
  const slugs = useMemo(() => items.map((item) => item.slug), [items]);
  const { activeSlug, registerSection, handleNavClick } =
    useAwardCategoryNav(slugs);

  useEffect(() => {
    for (const slug of slugs) {
      registerSection(slug)(document.getElementById(slug));
    }
    return () => {
      for (const slug of slugs) {
        registerSection(slug)(null);
      }
    };
  }, [slugs, registerSection]);

  function onLinkClick(slug: string, event: MouseEvent<HTMLAnchorElement>) {
    handleNavClick(slug, event);
  }

  return (
    // mm:313:8459
    <nav
      aria-label={ariaLabel}
      className="sticky top-[72px] z-10 -mx-6 flex gap-2 overflow-x-auto border-b border-login-divider bg-login-background/95 px-6 py-3 backdrop-blur sm:-mx-12 sm:px-12 lg:sticky lg:top-24 lg:mx-0 lg:w-[240px] lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0"
    >
      {items.map(({ slug, title }) => {
        const isActive = slug === activeSlug;
        return (
          // mm:313:8460..8465 (mms_C.1..C.6)
          <a
            key={slug}
            href={`#${slug}`}
            aria-current={isActive ? "true" : undefined}
            onClick={(event) => onLinkClick(slug, event)}
            className={`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`}
          >
            <IconTarget className="h-6 w-6 shrink-0" />
            {title}
          </a>
        );
      })}
    </nav>
  );
}
