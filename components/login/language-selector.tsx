"use client";

import { useEffect, useRef, useState } from "react";

import { IconDown } from "./icons/icon-down";
import { IconVnFlag } from "./icons/icon-vn-flag";

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

const LAST_INDEX = OPTIONS.length - 1;

/**
 * Header language switcher (mm:I662:14391;186:1601 / mm:I662:14391;186:1696).
 * Purely local open/close state — no cookie logic lives here.
 *
 * Keyboard follows the ARIA APG menu-button pattern: ArrowDown/ArrowUp (and
 * Enter/Space) open the menu onto the first/last item, arrows roll through the
 * items with wrap-around, Home/End jump to the ends, and Escape or Tab closes.
 * Focus is roving — only the active item is tabbable — so Tab always leaves the
 * menu instead of walking its items.
 */
export function LanguageSelector({ label, onSelect }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Move real DOM focus onto the active item whenever it changes while open,
  // so screen readers announce the item the arrow keys landed on.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function closeMenu(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function openMenuAt(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }

  function handleSelect(locale: AppLocale) {
    setOpen(false);
    onSelect?.(locale);
  }

  // Pointer opens go through openMenuAt(0) too, not a bare toggle: the focus effect
  // fires on every open, so an activeIndex left over from an earlier keyboard session
  // (ArrowUp → Escape → click) would silently land focus on the wrong item.
  function handleButtonClick() {
    if (open) {
      setOpen(false);
    } else {
      openMenuAt(0);
    }
  }

  function handleButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenuAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenuAt(LAST_INDEX);
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev === LAST_INDEX ? 0 : prev + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev === 0 ? LAST_INDEX : prev - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(LAST_INDEX);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu();
        break;
      case "Tab":
        closeMenu(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative flex h-14 w-[108px] items-center">
      {/* mm:I662:14391;186:1696;186:1821 */}
      <button
        ref={buttonRef}
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
          <IconVnFlag className="h-6 w-6 shrink-0" />
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
          // (see the effect above), never on this wrapper. `tabIndex={-1}`
          // documents that on purpose — jsx-a11y/interactive-supports-focus
          // can't see the roving-tabindex delegation and would otherwise
          // flag this node as needing its own focus stop.
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="animate-login-menu-in absolute top-full right-0 z-30 mt-1 w-full min-w-[108px] overflow-hidden rounded bg-[#0B0F12] shadow-lg"
        >
          {OPTIONS.map((option, index) => (
            <button
              key={option.locale}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="menuitem"
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => handleSelect(option.locale)}
              className="w-full cursor-pointer px-4 py-2 text-left font-montserrat text-base font-bold text-white transition-[background-color] duration-200 ease-out outline-none motion-reduce:transition-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
