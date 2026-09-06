"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

import { pickActiveSlug, type SpyEntry } from "../_utils/scroll-spy";

const OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: "-96px 0px -60% 0px",
  threshold: 0,
};

/** Fallback release for browsers that don't fire `scrollend` (Safari/WebKit). */
const SCROLL_LOCK_FALLBACK_MS = 700;

export type AwardCategoryNav = {
  /** Slug of the section currently marked active in the nav. */
  activeSlug: string;
  /** Ref callback registering a section's DOM node under `slug`. */
  registerSection: (slug: string) => (node: Element | null) => void;
  /** Nav-link click handler: scrolls to the section and locks the observer. */
  handleNavClick: (slug: string, event: MouseEvent<HTMLAnchorElement>) => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Drives the awards nav: which slug is active (click OR scroll-spy) and the
 * click handler that scrolls a section into view. All slug-picking math is
 * delegated to the pure `pickActiveSlug` (`../_utils/scroll-spy`) — this
 * hook only wires React lifecycle around it.
 *
 * BR-003: a click must win over the observer immediately, and stay won while
 * a programmatic smooth-scroll is still in flight — otherwise the observer's
 * own callbacks firing for every intermediate section the scroll passes over
 * would drag `activeSlug` back to the wrong item before the scroll settles.
 * The lock releases on the `scrollend` event, or after
 * `SCROLL_LOCK_FALLBACK_MS` for browsers that don't fire it.
 *
 * `slugs` must be a stable reference (a module-level constant, or memoized)
 * — a new array literal every render would recreate the
 * `IntersectionObserver` on every render.
 */
export function useAwardCategoryNav(
  slugs: readonly string[],
): AwardCategoryNav {
  const [activeSlug, setActiveSlug] = useState(slugs[0] ?? "");
  const sectionsRef = useRef(new Map<string, Element>());
  const isLockedRef = useRef(false);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollEndHandlerRef = useRef<(() => void) | null>(null);

  const clearScrollLockTimers = useCallback(() => {
    if (unlockTimeoutRef.current !== null) {
      clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
    if (scrollEndHandlerRef.current !== null) {
      window.removeEventListener("scrollend", scrollEndHandlerRef.current);
      scrollEndHandlerRef.current = null;
    }
  }, []);

  const unlock = useCallback(() => {
    isLockedRef.current = false;
    clearScrollLockTimers();
  }, [clearScrollLockTimers]);

  const registerSection = useCallback(
    (slug: string) => (node: Element | null) => {
      if (node) {
        sectionsRef.current.set(slug, node);
      } else {
        sectionsRef.current.delete(slug);
      }
    },
    [],
  );

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (isLockedRef.current) {
        return;
      }

      const spyEntries: SpyEntry[] = entries.map((entry) => ({
        slug: entry.target.id,
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
        top: entry.boundingClientRect.top,
      }));
      setActiveSlug((current) => pickActiveSlug(spyEntries, current));
    }, OBSERVER_OPTIONS);

    sectionsRef.current.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      clearScrollLockTimers();
    };
  }, [slugs, clearScrollLockTimers]);

  const handleNavClick = useCallback(
    (slug: string, event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const target = sectionsRef.current.get(slug);
      if (!target) {
        return;
      }

      setActiveSlug(slug);
      isLockedRef.current = true;
      clearScrollLockTimers();

      const behavior: ScrollBehavior = prefersReducedMotion()
        ? "auto"
        : "smooth";
      target.scrollIntoView({ behavior, block: "start" });
      window.history.replaceState(null, "", `#${slug}`);

      const handleScrollEnd = () => unlock();
      scrollEndHandlerRef.current = handleScrollEnd;
      window.addEventListener("scrollend", handleScrollEnd, { once: true });
      unlockTimeoutRef.current = setTimeout(unlock, SCROLL_LOCK_FALLBACK_MS);
    },
    [clearScrollLockTimers, unlock],
  );

  return { activeSlug, registerSection, handleNavClick };
}
