import { Fragment } from "react";

import type { SecretBoxDialogCopy } from "./secret-box-dialog";
import { SecretBoxLauncher } from "./secret-box-launcher";

/**
 * Slot `mm:2940:13489` `mms_D.1_Thống kê tổng quat` — 5 personal counters +
 * the "Mở Secret Box" trigger (`mms_D.1.8`). Anonymous viewers pass
 * `stats={null}` and this renders nothing at all (D001, C09): showing `0`
 * would read as "you have 0 kudos" instead of "you're not signed in".
 * Authenticated viewers always get real numbers here, including the two
 * Secret Box rows, which read straight off `getKudosStats` (phase 04) — no
 * more `0` placeholders (AD-8 resolved). The button + dialog themselves are
 * `SecretBoxLauncher`'s composition root (phase 05); this component stays
 * purely presentational and renders it at `mm:2940:13497`'s position.
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
  /** `kudos.secretBox.*` (phase 05) — threaded unchanged to `SecretBoxDialog`
   * via `SecretBoxLauncher`, plus the one error string the launcher itself
   * displays on a failed `openSecretBoxAction`. */
  secretBox: SecretBoxDialogCopy & { error: string };
};

export type KudosStatListProps = {
  stats: KudosStats | null;
  copy: KudosStatListCopy;
};

/** mm:2940:13491/13492/13494(divider)/13495/13496 — same 5-row + divider
 * shape as `profile-statistics-card.tsx`'s `STATISTICS_ROWS`, but this
 * screen's own text is 22px/28px (queried from `2940:13491`), not the
 * profile page's 16px — the two screens share a pattern, not one file. */
const STAT_ROWS: Array<{
  key: keyof KudosStats;
  label: keyof Omit<
    KudosStatListCopy,
    "openGift" | "openGiftDisabledTitle" | "secretBox"
  >;
  dividerAfter?: boolean;
}> = [
  { key: "received", label: "received" },
  { key: "sent", label: "sent" },
  { key: "hearts", label: "hearts", dividerAfter: true },
  { key: "secretBoxOpened", label: "boxOpened" },
  { key: "secretBoxUnopened", label: "boxUnopened" },
];

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
        <SecretBoxLauncher stats={stats} copy={copy} />
      </div>
    </div>
  );
}
