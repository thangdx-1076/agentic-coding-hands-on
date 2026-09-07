import { Fragment } from "react";

/**
 * Slot `mm:2940:13489` `mms_D.1_Thống kê tổng quat` — 5 personal counters +
 * the disabled "Mở Secret Box" trigger (`mms_D.1.8`). Anonymous viewers pass
 * `stats={null}` and this renders nothing at all (D001, C09): showing `0`
 * would read as "you have 0 kudos" instead of "you're not signed in".
 * Authenticated viewers always get real numbers here, including the two
 * Secret Box rows at `0` — no gift system exists yet, so `0` is the true
 * count, not a placeholder (AD-8). The "Mở quà" dialog itself (frame
 * `J3-4YFIpMM`) isn't built, so the button stays `disabled` with a `title`
 * explaining why — no click handler, no dead-end navigation.
 */
export type KudosStats = {
  received: number;
  sent: number;
  hearts: number;
  secretBoxOpened: number;
  secretBoxUnopened: number;
};

export type KudosStatListCopy = {
  received: string;
  sent: string;
  hearts: string;
  boxOpened: string;
  boxUnopened: string;
  openGift: string;
  /** Not part of the `kudos.sidebar` i18n namespace yet (Secret Box dialog
   * is deferred) — falls back to a static Vietnamese reason when omitted. */
  openGiftDisabledTitle?: string;
};

export type KudosStatListProps = {
  stats: KudosStats | null;
  copy: KudosStatListCopy;
};

const DEFAULT_OPEN_GIFT_DISABLED_TITLE = "Tính năng đang được phát triển";

/** mm:2940:13491/13492/13494(divider)/13495/13496 — same 5-row + divider
 * shape as `profile-statistics-card.tsx`'s `STATISTICS_ROWS`, but this
 * screen's own text is 22px/28px (queried from `2940:13491`), not the
 * profile page's 16px — the two screens share a pattern, not one file. */
const STAT_ROWS: Array<{
  key: keyof KudosStats;
  label: keyof Omit<KudosStatListCopy, "openGift" | "openGiftDisabledTitle">;
  dividerAfter?: boolean;
}> = [
  { key: "received", label: "received" },
  { key: "sent", label: "sent" },
  { key: "hearts", label: "hearts", dividerAfter: true },
  { key: "secretBoxOpened", label: "boxOpened" },
  { key: "secretBoxUnopened", label: "boxUnopened" },
];

/** mm:I2940:13497;186:1766 `MM_MEDIA_Open Gift` — inlined + `currentColor`
 * (code-rules 2a) so it inherits the button's `text-login-button-text`. */
function IconOpenGift(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M22.5 10.3698L19.76 8.77984C20 8.56984 20.23 8.29984 20.4 7.99984C21.23 6.56984 20.74 4.72984 19.3 3.89984C18.44 3.39984 17.43 3.39984 16.58 3.75984L16.59 3.74984L15.71 4.13984L15.6 3.17984L15.59 3.18984C15.5 2.27984 14.97 1.39984 14.11 0.899841C12.67 0.0748415 10.84 0.569842 10 1.99984C9.83 2.29984 9.72 2.62984 9.66 2.94984L6.91 1.36984C5.95 0.819842 4.73 1.13984 4.18 2.09984L2.68 4.69984C2.4 5.17984 2.57 5.78984 3.05 6.05984L4.78 7.05984L9 9.49984H2.5V19.4998C2.5 20.6098 3.4 21.4998 4.5 21.4998H20.5C21.61 21.4998 22.5 20.6098 22.5 19.4998V14.3698L23.23 13.0998C23.78 12.1398 23.46 10.9198 22.5 10.3698ZM16.94 5.99984C17.21 5.49984 17.83 5.35984 18.3 5.62984C18.78 5.90984 18.95 6.49984 18.67 6.99984C18.39 7.49984 17.78 7.63984 17.3 7.36984C16.83 7.08984 16.66 6.49984 16.94 5.99984ZM14.57 8.09984L21.5 12.0998L20.5 13.8298L13.57 9.82984L14.57 8.09984ZM11.5 19.4998H4.5V11.4998H11.5V19.4998ZM11.84 8.82984L4.91 4.82984L5.91 3.09984L12.84 7.09984L11.84 8.82984ZM12.11 4.36984C11.63 4.08984 11.47 3.49984 11.74 2.99984C12 2.49984 12.63 2.35984 13.11 2.62984C13.59 2.90984 13.75 3.49984 13.47 3.99984C13.2 4.49984 12.59 4.63984 12.11 4.36984ZM13.5 19.4998V12.0998L20.5 16.1398V19.4998H13.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function KudosStatList({ stats, copy }: KudosStatListProps) {
  if (!stats) {
    return null;
  }

  return (
    // mm:2940:13489
    <div className="w-full rounded-[17px] border border-[#998C5F] bg-[#00070C] p-6">
      {/* mm:2940:13490 */}
      <div className="flex flex-col gap-4">
        {STAT_ROWS.map((row) => (
          <Fragment key={row.key}>
            {/* mm:2940:1349x (shared `256:6756` row instance) */}
            <div
              data-testid="kudos-stat-row"
              className="flex w-full items-center justify-between gap-2"
            >
              <span className="font-montserrat text-[22px] leading-7 font-bold text-white">
                {copy[row.label]}
              </span>
              <span className="font-montserrat text-[32px] leading-[40px] font-bold text-login-button">
                {stats[row.key]}
              </span>
            </div>
            {row.dividerAfter && (
              // mm:2940:13494
              <div role="separator" className="h-px w-full bg-login-divider" />
            )}
          </Fragment>
        ))}
        {/* mm:2940:13497 */}
        <button
          type="button"
          disabled
          title={copy.openGiftDisabledTitle ?? DEFAULT_OPEN_GIFT_DISABLED_TITLE}
          data-testid="kudos-open-gift"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-login-button px-4 py-4 font-montserrat text-[22px] leading-7 font-bold text-login-button-text"
        >
          <IconOpenGift className="h-6 w-6" />
          {copy.openGift}
        </button>
      </div>
    </div>
  );
}
