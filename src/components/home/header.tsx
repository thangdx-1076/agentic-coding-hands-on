import Image from "next/image";

import { LogoLink } from "./logo-link";
import { NavLink } from "./nav-link";
import { AccountMenu } from "./account-menu";
import { NotificationBell } from "./notification-bell";
import { IconUser } from "./icons/icon-user";
import type { HomeCopy } from "./home-copy";

import { LanguageSelector } from "@/components/login/language-selector";

export type HeaderViewer = {
  email: string;
  isAdmin: boolean;
};

export type HeaderProps = {
  copy: HomeCopy;
  languageLabel: "VN" | "EN";
  viewer?: HeaderViewer | null;
  unreadCount?: number;
  onSelectLocale?: (locale: "vi" | "en") => void;
  logoutAction?: () => void | Promise<void>;
};

/**
 * Sticky top navigation bar for the Homepage screen (mm:2167:9091,
 * mms_A1_Header). Presentational only — Track B supplies the real `viewer`,
 * `unreadCount`, and server actions.
 *
 * Anonymous visitors (`viewer` falsy) get a `/login` link in the account
 * slot and NO notification bell — exactly one
 * `button[aria-haspopup="menu"]` renders inside `<header>` in that state
 * (`LanguageSelector`'s own button), per clarifications.md § Header.
 *
 * Below 768px nav links wrap onto a second row under the logo while the
 * right-side controls stay put — the pixel-perfect baseline only; the full
 * responsive pass is a separate polish phase.
 */
export function Header({
  copy,
  languageLabel,
  viewer,
  unreadCount = 0,
  onSelectLocale,
  logoutAction,
}: HeaderProps) {
  return (
    /* mm:2167:9091 */
    <header className="sticky top-0 z-20 flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-login-background/80 px-6 py-3 sm:px-12 lg:px-36">
      {/* mm:I2167:9091;186:2166 */}
      <div className="flex flex-wrap items-center gap-6 sm:gap-16">
        {/* mm:I2167:9091;178:1033 */}
        <LogoLink
          ariaLabel={copy.header.logoAlt}
          className="flex h-12 w-[52px] shrink-0 items-center"
        >
          {/* mm:I2167:9091;178:1033;178:1030 */}
          <Image
            src="/home/Logo.png"
            alt={copy.header.logoAlt}
            width={52}
            height={48}
            preload
            className="h-12 w-[52px] object-contain"
          />
        </LogoLink>
        {/* mm:I2167:9091;178:653 */}
        <nav className="flex flex-wrap items-center gap-6">
          {/* mm:I2167:9091;186:1579 / mm:I2167:9091;186:1587 */}
          <NavLink href="/">{copy.nav.about}</NavLink>
          <NavLink href="/awards">{copy.nav.awardsInfo}</NavLink>
          <NavLink href="/kudos">{copy.nav.kudos}</NavLink>
        </nav>
      </div>
      {/* mm:I2167:9091;186:1601 */}
      <div className="flex shrink-0 items-center gap-4">
        {/* mm:I2167:9091;186:1696 */}
        <LanguageSelector label={languageLabel} onSelect={onSelectLocale} />
        {viewer ? (
          <>
            {/* mm:I2167:9091;186:2101 */}
            <NotificationBell
              label={copy.header.notificationsLabel}
              unreadCount={unreadCount}
              emptyStateText={copy.notifications.empty}
            />
            {/* mm:I2167:9091;186:1597 */}
            <AccountMenu
              label={copy.header.accountLabel}
              isAdmin={viewer.isAdmin}
              profileLabel={copy.account.profile}
              adminLabel={copy.account.admin}
              logoutLabel={copy.account.logout}
              logoutAction={logoutAction}
            />
          </>
        ) : (
          // mm:I2167:9091;186:1597 (anon: login link reuses the account slot)
          <a
            aria-label={copy.header.loginLabel}
            href="/login"
            className="flex h-10 w-10 items-center justify-center rounded border border-[#998C5F] text-white transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none"
          >
            {/* mm:I2167:9091;186:1597;186:1420 */}
            <IconUser className="h-6 w-6" />
          </a>
        )}
      </div>
    </header>
  );
}
