"use client";

import type { SVGProps } from "react";

import { KudosHeartButton } from "./kudos-heart-button";

export type KudosCardActionsProps = {
  hearted: boolean;
  heartDisabled?: boolean;
  heartTitle?: string;
  heartCount: number;
  onToggleHeart?: () => void;
  onCopyLink?: () => void;
  copy: { copyLink: string; detail: string; heartLabel: string };
  /**
   * Corrected 260907-2001: the CSV/node data settle this — `B.4.4` (highlight)
   * lists Copy Link AND "Xem chi tiết"; `C.4` (feed) lists ONLY the heart and
   * Copy Link, no detail button (feed's content itself is the click target
   * for detail, per `C.3.5`'s own description). Design owns "does this
   * button exist" (MoMorph rule 1); a shared action bar still applies, it
   * just doesn't always render all 3 controls. Additive + defaults to `true`
   * so this stays backward compatible for any other current caller.
   */
  showDetail?: boolean;
};

/**
 * mm:B.4.4_Action (`I2940:13465;335:9461`) / C.4_Button
 * (`I3127:21871;256:5194`) — heart on the left, Copy Link (+ "Xem chi tiết"
 * on highlight only, see `showDetail`) grouped on the right
 * (`justify-content: space-between`, matching the frame's x-positions).
 *
 * "Xem chi tiết" is a plain `disabled` `<button>`, never a `<Link>` — C24
 * asserts exactly that (the destination frame doesn't exist).
 */
export function KudosCardActions({
  hearted,
  heartDisabled = false,
  heartTitle,
  heartCount,
  onToggleHeart,
  onCopyLink,
  copy,
  showDetail = true,
}: KudosCardActionsProps) {
  return (
    <div className="flex w-full flex-row items-center justify-between gap-6">
      <KudosHeartButton
        hearted={hearted}
        disabled={heartDisabled}
        title={heartTitle}
        count={heartCount}
        heartLabel={copy.heartLabel}
        onToggle={onToggleHeart}
      />
      <div className="flex flex-row items-center gap-2">
        {/* mm:C.4.2_Copy link button (`I3127:21871;256:5216`) */}
        <button
          type="button"
          data-testid="kudos-card-copy-link"
          onClick={onCopyLink}
          className="flex items-center gap-1 rounded p-4 font-montserrat text-base font-bold text-login-button-text"
        >
          {copy.copyLink}
          <IconLink aria-hidden="true" className="h-6 w-6" />
        </button>
        {/* mm:B.4.4 "Xem chi tiết" — highlight only (C.4 has no detail
         * button); always disabled, no <Link> (C24) */}
        {showDetail ? (
          <button
            type="button"
            data-testid="kudos-card-detail"
            disabled
            title={copy.detail}
            className="flex items-center gap-1 rounded p-4 font-montserrat text-base font-bold text-login-button-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.detail}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * `MM_MEDIA_Link` (`I3127:21871;256:5216;186:1441`) inlined with
 * `currentColor` (code-rules 2a) — `public/kudos/icon-link.svg` ships with a
 * baked `fill="white"`, invisible against this card's cream background;
 * inherits `text-login-button-text` from the parent button. Used once here.
 */
function IconLink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10.9619 13.1547C11.3719 13.5447 11.3719 14.1847 10.9619 14.5747C10.5719 14.9647 9.93189 14.9647 9.54189 14.5747C7.5919 12.6247 7.5919 9.4547 9.54189 7.5047L13.0819 3.9647C15.0319 2.0147 18.2019 2.0147 20.1519 3.9647C22.1019 5.9147 22.1019 9.0847 20.1519 11.0347L18.6619 12.5247C18.6719 11.7047 18.5419 10.8847 18.2619 10.1047L18.7319 9.6247C19.9119 8.4547 19.9119 6.5547 18.7319 5.3847C17.5619 4.2047 15.6619 4.2047 14.4919 5.3847L10.9619 8.9147C9.7819 10.0847 9.7819 11.9847 10.9619 13.1547ZM13.7819 8.9147C14.1719 8.5247 14.8119 8.5247 15.2019 8.9147C17.1519 10.8647 17.1519 14.0347 15.2019 15.9847L11.6619 19.5247C9.71189 21.4747 6.54189 21.4747 4.59189 19.5247C2.64189 17.5747 2.64189 14.4047 4.59189 12.4547L6.08189 10.9647C6.07189 11.7847 6.20189 12.6047 6.48189 13.3947L6.01189 13.8647C4.83189 15.0347 4.83189 16.9347 6.01189 18.1047C7.18189 19.2847 9.08189 19.2847 10.2519 18.1047L13.7819 14.5747C14.9619 13.4047 14.9619 11.5047 13.7819 10.3347C13.3719 9.9447 13.3719 9.3047 13.7819 8.9147Z"
        fill="currentColor"
      />
    </svg>
  );
}
