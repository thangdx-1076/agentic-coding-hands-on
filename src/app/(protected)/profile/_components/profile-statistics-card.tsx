import Link from "next/link";
import { Fragment } from "react";

import {
  STATISTICS_ROWS,
  type ProfileCopy,
  type StatisticsRowKey,
} from "../_shared/profile-copy";

import { ROUTES, SECRET_BOX_OPEN_PARAM } from "@/constants/routes";
import type { KudosStatsSummary } from "@/dal/kudos-stats";

export type ProfileStatisticsCardProps = {
  copy: ProfileCopy["stats"];
  isSelf: boolean;
  /** The Sunner this profile belongs to. Only read when `!isSelf`, to aim
   * the write-Kudo bar at them. */
  profileId: string;
  /** `null` on another Sunner's profile, where this slot is the write-Kudo
   * bar instead and no counters render — `page.tsx` skips the query rather
   * than fetching numbers nothing will show. */
  stats: KudosStatsSummary | null;
};

/**
 * Row key → counter name. Only `secretBoxLeft` differs: the design's label
 * ("số hộp chưa mở") and the DAL's `secretBoxUnopened` name the same number.
 */
const STAT_VALUE_KEYS: Record<StatisticsRowKey, keyof KudosStatsSummary> = {
  received: "received",
  sent: "sent",
  hearts: "hearts",
  secretBoxOpened: "secretBoxOpened",
  secretBoxLeft: "secretBoxUnopened",
};

const PANEL_CLASS =
  "w-full max-w-[680px] rounded-[17px] border border-[#998C5F] bg-[#00070C] p-10";
const PRIMARY_BUTTON_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-login-button px-4 py-4 font-montserrat text-[22px] leading-7 font-bold text-login-button-text";

/**
 * Slot mm:362:5073 `mms_B_Thống kê` — self renders the 5-row statistics
 * panel + disabled "Mở Secret Box" (mm:362:5082); other renders ONLY a
 * disabled "Viết Kudo" bar that REPLACES the whole slot. Mutually
 * exclusive, never both (technical-spec.md § 3.3, C8) — this is the slot
 * the write-Kudo bar replaces, confirmed via MoMorph, not a co-render.
 *
 * The write-Kudo bar WORKS now. It was a `disabled` button while
 * FUN_006/007 were "deferred to F007+" — those shipped, so the deferral
 * expired. It is a link rather than a button because the compose dialog is
 * not on this screen: it belongs to `/kudos`, which opens it from
 * `?compose=<id>` with this Sunner already selected. Sending the reader to
 * the one screen that owns the dialog beats mounting a second copy of that
 * whole state machine here.
 *
 * "Mở Secret Box" follows that same precedent, for the same reason. It was
 * hardcoded `disabled` with no handler at all, so it never worked once
 * F000_SecretBoxModal shipped. The dialog and its open action live on
 * `/kudos` (`SecretBoxLauncher`), so this is a link there when the viewer
 * actually holds an unopened box, and a disabled button — carrying the
 * reason in its `title` — when they do not. Mounting a second copy of that
 * 3-state machine here would duplicate the one on `/kudos`.
 */
export function ProfileStatisticsCard({
  copy,
  isSelf,
  profileId,
  stats,
}: ProfileStatisticsCardProps) {
  if (!isSelf) {
    return (
      <div className={PANEL_CLASS}>
        <Link
          href={`${ROUTES.KUDOS}?compose=${encodeURIComponent(profileId)}`}
          data-testid="profile-write-kudo"
          className={PRIMARY_BUTTON_CLASS}
        >
          {copy.writeKudos}
        </Link>
      </div>
    );
  }

  return (
    <div className={PANEL_CLASS}>
      {/* mm:362:5075 */}
      <div className="flex flex-col items-center gap-4">
        {STATISTICS_ROWS.map((row) => (
          <Fragment key={row.key}>
            {/* mm:362:5076 (template shared by 362:5077-362:5081) */}
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-montserrat text-base leading-6 font-bold text-white">
                {copy.rows[row.key]}
              </span>
              <span
                data-testid={`profile-stat-${row.key}`}
                className="font-montserrat text-[32px] leading-10 font-bold text-login-button"
              >
                {stats ? stats[STAT_VALUE_KEYS[row.key]] : 0}
              </span>
            </div>
            {row.dividerAfter && (
              // mm:362:5079
              <div role="separator" className="h-px w-full bg-login-divider" />
            )}
          </Fragment>
        ))}
        {/* mm:362:5082 */}
        {stats && stats.secretBoxUnopened > 0 ? (
          <Link
            href={`${ROUTES.KUDOS}?${SECRET_BOX_OPEN_PARAM}=open`}
            data-testid="profile-open-secret-box"
            className={`mt-2 ${PRIMARY_BUTTON_CLASS}`}
          >
            {copy.openSecretBox}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            data-testid="profile-open-secret-box"
            title={copy.openSecretBoxDisabledTitle}
            className={`mt-2 ${PRIMARY_BUTTON_CLASS}`}
          >
            {copy.openSecretBox}
          </button>
        )}
      </div>
    </div>
  );
}
