"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import { useNotifications } from "../_hooks/use-notifications";
import type { SiteChromeCopy } from "../_shared/site-chrome";

import { IconBell } from "./icons/icon-bell";
import { NotificationPanel } from "./notifications/notification-panel";

import { createClient } from "@/lib/supabase/client";

export type NotificationBellProps = {
  label: string;
  /** Server-rendered count, valid at first paint (`SiteViewer.unreadCount`,
   * phase-07). From then on `useNotifications` owns the live value — see
   * `unreadCount` below. */
  unreadCount: number;
  copy: SiteChromeCopy["notifications"];
};

const MAX_BADGE_COUNT = 9;

/**
 * Header notification bell + panel (mm:I2167:9091;186:2101, MoMorph screen
 * `589:9132`). Badge is now a NUMBER (FR-002), not a dot: hidden at 0,
 * shown as-is up to 9, capped at `"9+"` beyond that (phase-08 Key Insight
 * 3 — a one-line rule, kept inline since `.tsx` isn't in the coverage
 * allowlist; TC-003/004/005 are the evidence).
 *
 * Escape-closes-and-refocuses + click-outside-closes is unchanged from the
 * empty-state-only version of this component (Key Insight 2) — only the
 * `open` boolean's owner changed, from a local `useState` to
 * `useNotifications`'s `open`/`setOpen`, so the component stops holding
 * data-fetching state itself.
 *
 * `userId` is resolved client-side via `supabase.auth.getUser()` purely to
 * scope `useNotifications`'s realtime channel filter (never a security
 * boundary — RLS is). `SiteViewer` (`_shared/site-chrome.ts`) does not
 * carry the raw auth id yet (only `email`/`isAdmin`/`unreadCount`,
 * phase-07 scope) — threading it there, mirroring how `/kudos` threads its
 * own `viewerId` prop, is the more idiomatic fix and is the right shape
 * for a follow-up phase (`plans/action-items.md`) rather than a scope
 * expansion of this one. Until the real id resolves, `useNotifications`
 * subscribes to a channel that matches nothing — harmless, and it
 * re-subscribes the moment the real id lands (`userId` is in that hook's
 * effect dependency array).
 */
export function NotificationBell({
  label,
  unreadCount: initialUnreadCount,
  copy,
}: NotificationBellProps) {
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!cancelled && data.user) {
          setUserId(data.user.id);
        }
      })
      .catch(() => {
        // Fails closed to the placeholder "" id above — the panel still
        // works (list/count reads rely on RLS, not this value), it just
        // won't receive realtime pushes until a later mount succeeds.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    open,
    setOpen,
    items,
    nextCursor,
    unreadCount,
    loading,
    error,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications({ userId, initialUnreadCount });

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
  }, [open, setOpen]);

  const badgeText = unreadCount > MAX_BADGE_COUNT ? "9+" : String(unreadCount);

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
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded text-white transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none"
      >
        {/* mm:I2167:9091;186:2101;186:2020;186:1420 */}
        <IconBell className="h-6 w-6" />
        {unreadCount > 0 && (
          // mm:I2167:9091;186:2101;186:2089 — dot → number badge (phase-08)
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D4271D] px-1 text-[10px] leading-none font-bold text-white">
            {badgeText}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          copy={copy}
          locale={locale}
          items={items}
          nextCursor={nextCursor}
          loading={loading}
          error={error}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}
