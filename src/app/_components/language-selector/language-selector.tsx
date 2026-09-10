"use client";

import type { ComponentType, SVGProps } from "react";

import { IconDown } from "./icon-down";
import { IconEnFlag } from "./icon-en-flag";
import { IconVnFlag } from "./icon-vn-flag";

import { useMenuKeyboardNav } from "@/hooks/use-menu-keyboard-nav";
import type { AppLocale } from "@/lib/i18n/locale";

export type LanguageSelectorProps = {
  /** Currently active locale label, as shown on the button ("VN" | "EN"). */
  label: "VN" | "EN";
  /** Fired when the user picks a menu item. Track B wires the cookie write. */
  onSelect?: (locale: AppLocale) => void;
};

const OPTIONS: { locale: AppLocale; label: "VN" | "EN" }[] = [
  { locale: "vi", label: "VN" },
  { locale: "en", label: "EN" },
];

/**
 * MoMorph `hUyaaugye2` rows A.1/A.2: every flag — trigger and each menu
 * option — must track its own locale, not a hardcoded VN flag.
 */
const FLAG: Record<"VN" | "EN", ComponentType<SVGProps<SVGSVGElement>>> = {
  VN: IconVnFlag,
  EN: IconEnFlag,
};

/**
 * Header language switcher (mm:I662:14391;186:1601 / mm:I662:14391;186:1696).
 * Trình bày thuần: JSX, class và a11y attribute. Vòng đời mở/đóng cùng điều
 * hướng bàn phím nằm ở `useMenuKeyboardNav`; không có logic cookie ở đây.
 */
export function LanguageSelector({ label, onSelect }: LanguageSelectorProps) {
  const {
    open,
    activeIndex,
    registerRoot,
    registerButton,
    registerItem,
    close,
    handleButtonClick,
    handleButtonKeyDown,
    handleMenuKeyDown,
  } = useMenuKeyboardNav({ itemCount: OPTIONS.length });

  function handleSelect(locale: AppLocale) {
    close(false);
    onSelect?.(locale);
  }

  const TriggerFlag = FLAG[label];

  return (
    <div
      ref={registerRoot}
      className="relative flex h-14 w-[108px] items-center"
    >
      {/* mm:I662:14391;186:1696;186:1821 */}
      <button
        ref={registerButton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        className="flex w-full cursor-pointer items-center justify-between gap-0.5 rounded p-4 text-white transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background"
      >
        {/* mm:I662:14391;186:1696;186:1821;186:1937 */}
        <span className="flex items-center gap-1">
          {/* mm:I662:14391;186:1696;186:1821;186:1709 */}
          <span
            data-testid={label === "VN" ? "flag-vn" : "flag-en"}
            className="flex h-6 w-6 shrink-0"
          >
            <TriggerFlag className="h-6 w-6 shrink-0" />
          </span>
          {/* mm:I662:14391;186:1696;186:1821;186:1439 */}
          <span className="font-montserrat text-base leading-6 font-bold tracking-[0.15px]">
            {label}
          </span>
        </span>
        {/* mm:I662:14391;186:1696;186:1821;186:1441 */}
        <IconDown
          className={`h-6 w-6 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="menu"
          // Roving tabindex: focus lives on the active `menuitem` button
          // (see `useMenuKeyboardNav`), never on this wrapper. `tabIndex={-1}`
          // documents that on purpose — jsx-a11y/interactive-supports-focus
          // can't see the roving-tabindex delegation and would otherwise
          // flag this node as needing its own focus stop.
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="animate-login-menu-in absolute top-full right-0 z-30 mt-1 w-full min-w-[110px] overflow-hidden rounded bg-[#0B0F12] shadow-lg"
        >
          {OPTIONS.map((option, index) => {
            const OptionFlag = FLAG[option.label];
            const isActive = option.label === label;

            return (
              <button
                key={option.locale}
                ref={registerItem(index)}
                type="button"
                role="menuitem"
                aria-current={isActive ? "true" : undefined}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => handleSelect(option.locale)}
                className={`flex h-14 w-[110px] cursor-pointer items-center gap-1 px-4 text-left font-montserrat text-base font-bold text-white transition-[background-color] duration-200 ease-out outline-none motion-reduce:transition-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${isActive ? "bg-[rgba(255,234,158,0.2)]" : ""}`}
              >
                <OptionFlag className="h-6 w-6 shrink-0" />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
