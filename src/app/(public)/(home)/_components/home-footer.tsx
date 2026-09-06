import Image from "next/image";
import Link from "next/link";

import { defaultHomeCopy, type HomeCopy } from "../_shared/home-copy";

import { LogoLink } from "./logo-link";

export type HomeFooterProps = {
  copy?: HomeCopy;
};

/**
 * Homepage footer (mm:5001:14800 `mms_7_Footer`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM). Unlike
 * the Login screen's footer, this page scrolls — the footer sits at the
 * natural end of page flow, NOT `position: fixed`. Repeats the same 3 header
 * nav links (plain, no active-state) plus "Tiêu chuẩn chung"/`/standards`.
 * Phase 4 polish adds the shared hover/focus-visible treatment (same pattern
 * as `NavLink`'s non-active state) to all 4 links.
 */
export function HomeFooter({ copy = defaultHomeCopy }: HomeFooterProps) {
  const { nav, header, footer } = copy;

  return (
    /* mm:5001:14800 */
    <footer className="flex w-full flex-col items-center justify-between gap-6 border-t border-login-divider bg-login-background px-6 py-6 sm:px-12 sm:py-8 lg:flex-row lg:px-[90px] lg:py-10">
      {/* mm:I5001:14800;342:1407 */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-20">
        {/* mm:I5001:14800;342:1408 */}
        <LogoLink
          ariaLabel={header.logoAlt}
          className="flex shrink-0 items-center"
        >
          {/* mm:I5001:14800;342:1408;178:1030 */}
          <Image
            src="/home/Logo.png"
            alt={header.logoAlt}
            width={69}
            height={64}
          />
        </LogoLink>

        {/* mm:I5001:14800;342:1409 */}
        <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-6">
          {/* mm:I5001:14800;342:1410 */}
          <Link
            href="/"
            className="font-montserrat rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-white transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background"
          >
            {nav.about}
          </Link>
          {/* mm:I5001:14800;342:1411 */}
          <Link
            href="/awards"
            className="font-montserrat rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-white transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background"
          >
            {nav.awardsInfo}
          </Link>
          {/* mm:I5001:14800;342:1412 */}
          <Link
            href="/kudos"
            className="font-montserrat rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-white transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background"
          >
            {nav.kudos}
          </Link>
          {/* mm:I5001:14800;1161:9487 */}
          <Link
            href="/standards"
            className="font-montserrat rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-white transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background"
          >
            {footer.standards}
          </Link>
        </nav>
      </div>

      {/* mm:I5001:14800;342:1413 */}
      <p className="font-montserrat-alternates text-center text-base leading-6 font-bold tracking-normal text-white">
        {footer.copyright}
      </p>
    </footer>
  );
}
