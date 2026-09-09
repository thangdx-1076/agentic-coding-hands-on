"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";

import { IconNotificationBox } from "../icons/icon-notification-box";
import { IconNotificationEyeOff } from "../icons/icon-notification-eye-off";
import { IconNotificationHeart } from "../icons/icon-notification-heart";
import { IconNotificationKudos } from "../icons/icon-notification-kudos";

import { ROUTES } from "@/constants/routes";
import type {
  NotificationRow,
  NotificationType,
} from "@/domain/notifications/types";
import { formatRelativeTime } from "@/utils/datetime/relative-time";
import {
  formatNotificationMessage,
  type NotificationMessageTemplates,
} from "@/utils/notification-message";

export type NotificationItemProps = {
  item: NotificationRow;
  templates: NotificationMessageTemplates;
  locale: string;
  now: Date;
  onMarkRead: (id: string) => void;
};

const ICON_BY_TYPE: Record<NotificationType, typeof IconNotificationKudos> = {
  kudos_received: IconNotificationKudos,
  heart_received: IconNotificationHeart,
  secret_box_available: IconNotificationBox,
  kudos_hidden: IconNotificationEyeOff,
};

/**
 * One row inside `NotificationPanel` (phase-08, FR-005/FR-201/FR-202).
 * `data-testid="notification-item"` is a fixed contract — the RED e2e spec
 * (`tests/e2e/notifications.spec.ts` TC-018) counts pagination results by
 * it, so the string can't be renamed independently of that test.
 *
 * The whole row is `role="button"` on a `<div>`, NOT a real `<button>`:
 * `kudos_hidden`'s message embeds a real `<Link>` (FR-202, TC-015), and
 * `<a>` inside `<button>` is invalid HTML nesting. Clicking the row body
 * marks the notification read (FR-201) and never navigates; the embedded
 * link stops its own click from bubbling so the two actions stay distinct
 * per clarifications.md's "Bấm thân mục = mark-read, KHÔNG điều hướng."
 */
export function NotificationItem({
  item,
  templates,
  locale,
  now,
  onMarkRead,
}: NotificationItemProps) {
  const Icon = ICON_BY_TYPE[item.type];
  const segments = formatNotificationMessage(templates, item);
  const relativeTime = formatRelativeTime(item.createdAt, now, locale);

  function handleActivate() {
    onMarkRead(item.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  }

  return (
    <li data-testid="notification-item">
      <div
        role="button"
        tabIndex={0}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors duration-200 ease-out outline-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#998C5F]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="break-words">
            {segments.map((segment, index) => {
              if (segment.type === "bold") {
                return (
                  <strong key={index} className="font-bold">
                    {segment.value}
                  </strong>
                );
              }
              if (segment.type === "link") {
                return (
                  <Link
                    key={index}
                    href={ROUTES.STANDARDS}
                    onClick={(event) => event.stopPropagation()}
                    className="underline hover:no-underline"
                  >
                    {segment.value}
                  </Link>
                );
              }
              return <span key={index}>{segment.value}</span>;
            })}
          </p>
          <span className="text-xs text-white/60">{relativeTime}</span>
        </div>
        {!item.isRead && (
          <span
            aria-hidden="true"
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D4271D]"
          />
        )}
      </div>
    </li>
  );
}
