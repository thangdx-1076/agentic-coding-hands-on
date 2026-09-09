"use client";

import type { SiteChromeCopy } from "../../_shared/site-chrome";

import { NotificationItem } from "./notification-item";

import type { NotificationRow } from "@/domain/notifications/types";

export type NotificationPanelProps = {
  copy: SiteChromeCopy["notifications"];
  locale: string;
  items: NotificationRow[];
  nextCursor: string | null;
  loading: boolean;
  error: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
};

const PANEL_TITLE_ID = "notification-panel-title";

/**
 * `[role="dialog"]` popup body (phase-08 Key Insight 1 — deliberately kept
 * `dialog`, not extended into `useMenuKeyboardNav`'s `menu` pattern: this
 * panel's content is heading + button + list + button, not a uniform set
 * of `menuitem`s, and the hook's `itemCount` can't track a list that grows
 * via "Xem thêm" without risking the 3 other consumers it already serves).
 *
 * `aria-labelledby` points at the real `<h2>` instead of duplicating its
 * text into `aria-label`, per APG dialog practice — the heading IS the
 * accessible name.
 *
 * The `error` and "no items yet" (empty, not-loading) cases render the
 * same `copy.empty` text (FR-006/TC-008): the copy contract
 * (`site-chrome.ts`) has no dedicated error string, and adding one would
 * touch `messages/*.json`, which is out of this phase's file ownership —
 * tracked as a follow-up in `plans/action-items.md`.
 */
export function NotificationPanel({
  copy,
  locale,
  items,
  nextCursor,
  loading,
  error,
  onMarkRead,
  onMarkAllRead,
  onLoadMore,
}: NotificationPanelProps) {
  const now = new Date();
  const showEmptyState = !loading && (error || items.length === 0);

  return (
    <div
      role="dialog"
      aria-labelledby={PANEL_TITLE_ID}
      className="animate-login-menu-in absolute top-full right-0 z-30 mt-1 max-h-[28rem] w-80 overflow-y-auto rounded bg-[#0B0F12] font-montserrat text-sm text-white shadow-lg"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <h2 id={PANEL_TITLE_ID} className="text-base font-bold">
          {copy.title}
        </h2>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="cursor-pointer text-xs font-bold text-[#998C5F] transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {copy.markAllRead}
        </button>
      </div>

      {showEmptyState ? (
        <p className="px-4 py-6 text-center text-white/70">{copy.empty}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              templates={copy.types}
              locale={locale}
              now={now}
              onMarkRead={onMarkRead}
            />
          ))}
        </ul>
      )}

      {!showEmptyState && nextCursor && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="block w-full cursor-pointer border-t border-white/10 px-4 py-3 text-center font-bold text-[#998C5F] transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.loadMore}
        </button>
      )}
    </div>
  );
}
