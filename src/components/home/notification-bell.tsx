"use client";

import { useEffect, useRef, useState } from "react";

import { IconBell } from "./icons/icon-bell";

export type NotificationBellProps = {
  label?: string;
  unreadCount?: number;
  emptyStateText: string;
};

/**
 * Header notification bell (mm:I2167:9091;186:2101). Empty-state-only panel
 * for now — no notifications schema exists yet in `saa-app`
 * (clarifications.md § Header, ghi nợ nguồn dữ liệu thật). Badge dot
 * (mm:I2167:9091;186:2101;186:2089) renders only when `unreadCount > 0`; it
 * is 2 plain `RECTANGLE` layers in Figma, not an asset, so it's built as a
 * plain absolutely-positioned `span` per code-rules 2.
 *
 * A single `useState` boolean toggles the `[role="dialog"]` panel — the
 * documented exception in `separate-hook-logic-from-components` for a lone
 * boolean that only controls visibility (not a full menu, so it does not
 * reuse `useMenuKeyboardNav`).
 */
export function NotificationBell({
  label = "Thông báo",
  unreadCount = 0,
  emptyStateText,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    // mm:I2167:9091;186:2101
    <div
      ref={rootRef}
      className="relative flex h-10 w-10 items-center justify-center"
    >
      {/* mm:I2167:9091;186:2101;186:2020 */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded text-white transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none"
      >
        {/* mm:I2167:9091;186:2101;186:2020;186:1420 */}
        <IconBell className="h-6 w-6" />
        {unreadCount > 0 && (
          // mm:I2167:9091;186:2101;186:2089
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#D4271D]" />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="animate-login-menu-in absolute top-full right-0 z-30 mt-1 w-64 rounded bg-[#0B0F12] p-4 font-montserrat text-sm text-white shadow-lg"
        >
          {emptyStateText}
        </div>
      )}
    </div>
  );
}
