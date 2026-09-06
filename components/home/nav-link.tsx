"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

export type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/**
 * Header nav item — collapses the 2 Figma variants (mm:I2167:9091;186:1579
 * "Selected state", mm:I2167:9091;186:1587 "Hover/Normal state") into one
 * component with a computed active state, following Next's own "Checking
 * active links" pattern (`usePathname() === href`).
 *
 * Clicking the already-active link doesn't navigate — a `Link` to the
 * current route is a no-op — so it scrolls to top instead, mirroring
 * `LogoLink`'s behavior (clarifications.md § Route & điều hướng, TC ID-2/3).
 */
export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isActive) {
      event.preventDefault();
      window.scrollTo({ top: 0 });
    }
  }

  return (
    // mm:I2167:9091;186:1579 (selected) / mm:I2167:9091;186:1587 (normal)
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={handleClick}
      className={`font-montserrat rounded p-4 text-sm leading-5 font-bold tracking-[0.1px] transition-colors duration-200 ease-out motion-reduce:transition-none ${
        isActive
          ? "border-b border-[#FFEA9E] text-[#FFEA9E] [text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287]"
          : "border-b border-transparent text-white hover:bg-white/10"
      } ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
