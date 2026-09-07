"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { ROUTES } from "@/constants/routes";

export type LogoLinkProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
};

/**
 * Shared brand-logo link reused by both `SiteHeader` (mm:I2167:9091;178:1033)
 * and `SiteFooter` (mm:I5001:14800;342:1408) — same asset, same href `/`,
 * same behavior. Per clarifications.md § Route & điều hướng: clicking the
 * logo while already on `/` doesn't navigate (Next `Link` to the current
 * route is a no-op), so it scrolls to top instead so the click always does
 * something visible.
 *
 * Phase 4 polish: hover/focus-visible feedback lives here (not per-caller)
 * so both the header and footer instances stay in sync — a rounded,
 * opacity-based hover (no layout shift) plus the shared white focus ring.
 */
export function LogoLink({ ariaLabel, children, className }: LogoLinkProps) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname === ROUTES.HOME) {
      event.preventDefault();
      window.scrollTo({ top: 0 });
    }
  }

  return (
    <Link
      href={ROUTES.HOME}
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`rounded transition-opacity duration-200 ease-out motion-reduce:transition-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
