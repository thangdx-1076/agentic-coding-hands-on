"use client";

import { IconUser } from "./icons/icon-user";

import { useMenuKeyboardNav } from "@/hooks/use-menu-keyboard-nav";

export type AccountMenuProps = {
  label: string;
  isAdmin: boolean;
  profileLabel: string;
  adminLabel: string;
  logoutLabel: string;
  logoutAction?: () => void | Promise<void>;
};

/**
 * Header account button + menu (mm:I2167:9091;186:1597, authed state only —
 * anonymous visitors get a plain `/login` link instead, rendered by
 * `Header`). Mirrors `components/login/language-selector.tsx`'s use of
 * `useMenuKeyboardNav` for open/close + roving-tabindex keyboard nav
 * (clarifications.md § Header).
 *
 * `itemCount` is 2 (Hồ sơ, Đăng xuất) or 3 (+ Trang quản trị) depending on
 * `isAdmin` — fixed for the lifetime of one render tree per the hook's
 * documented limitation, which holds here since a signed-in user's role
 * doesn't change mid-session.
 */
export function AccountMenu({
  label,
  isAdmin,
  profileLabel,
  adminLabel,
  logoutLabel,
  logoutAction,
}: AccountMenuProps) {
  const itemCount = isAdmin ? 3 : 2;
  const logoutIndex = isAdmin ? 2 : 1;
  const {
    open,
    activeIndex,
    registerRoot,
    registerButton,
    registerItem,
    handleButtonClick,
    handleButtonKeyDown,
    handleMenuKeyDown,
  } = useMenuKeyboardNav({ itemCount });

  const itemClassName =
    "block w-full cursor-pointer px-4 py-2 text-left font-montserrat text-base font-bold text-white outline-none transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white motion-reduce:transition-none";

  return (
    // mm:I2167:9091;186:1597
    <div
      ref={registerRoot}
      className="relative flex h-10 w-10 items-center justify-center"
    >
      <button
        ref={registerButton}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-[#998C5F] bg-transparent text-white transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none"
      >
        {/* mm:I2167:9091;186:1597;186:1420 */}
        <IconUser className="h-6 w-6" />
      </button>
      {open && (
        <div
          role="menu"
          // Roving tabindex delegates focus to the active menuitem (see
          // `useMenuKeyboardNav`) — same documented pattern as
          // `language-selector.tsx`.
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="animate-login-menu-in absolute top-full right-0 z-30 mt-1 min-w-[168px] overflow-hidden rounded bg-[#0B0F12] shadow-lg"
        >
          <a
            ref={registerItem(0)}
            role="menuitem"
            href="/profile"
            tabIndex={activeIndex === 0 ? 0 : -1}
            className={itemClassName}
          >
            {profileLabel}
          </a>
          {isAdmin && (
            <a
              ref={registerItem(1)}
              role="menuitem"
              href="/admin"
              tabIndex={activeIndex === 1 ? 0 : -1}
              className={itemClassName}
            >
              {adminLabel}
            </a>
          )}
          <form action={logoutAction}>
            <button
              ref={registerItem(logoutIndex)}
              type="submit"
              role="menuitem"
              tabIndex={activeIndex === logoutIndex ? 0 : -1}
              className={itemClassName}
            >
              {logoutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
