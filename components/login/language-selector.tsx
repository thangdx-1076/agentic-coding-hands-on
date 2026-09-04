"use client";

import { useEffect, useRef, useState } from "react";
import type { AppLocale } from "@/lib/i18n/locale";
import { IconDown } from "./icons/icon-down";
import { IconVnFlag } from "./icons/icon-vn-flag";

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
 * Header language switcher (mm:I662:14391;186:1601 / mm:I662:14391;186:1696).
 * Purely local open/close state — no cookie logic lives here.
 */
export function LanguageSelector({ label, onSelect }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(locale: AppLocale) {
    setOpen(false);
    onSelect?.(locale);
  }

  return (
    <div ref={rootRef} className="relative flex h-14 w-[108px] items-center">
      {/* mm:I662:14391;186:1696;186:1821 */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
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
          className="animate-login-menu-in absolute top-full right-0 z-30 mt-1 w-full min-w-[108px] overflow-hidden rounded bg-[#0B0F12] shadow-lg"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.locale}
              type="button"
              role="menuitem"
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
