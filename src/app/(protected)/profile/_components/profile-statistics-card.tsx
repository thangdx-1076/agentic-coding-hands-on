import Link from "next/link";
import { Fragment } from "react";

import { STATISTICS_ROWS, type ProfileCopy } from "../_shared/profile-copy";

import { ROUTES } from "@/constants/routes";

export type ProfileStatisticsCardProps = {
  copy: ProfileCopy["stats"];
  isSelf: boolean;
  /** The Sunner this profile belongs to. Only read when `!isSelf`, to aim
   * the write-Kudo bar at them. */
  profileId: string;
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
 * "Mở Secret Box" below stays disabled — that one really is still deferred.
 */
export function ProfileStatisticsCard({
  copy,
  isSelf,
  profileId,
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
              <span className="font-montserrat text-[32px] leading-[40px] font-bold text-login-button">
                0
              </span>
            </div>
            {row.dividerAfter && (
              // mm:362:5079
              <div role="separator" className="h-px w-full bg-login-divider" />
            )}
          </Fragment>
        ))}
        {/* mm:362:5082 */}
        <button
          type="button"
          disabled
          className={`mt-2 ${PRIMARY_BUTTON_CLASS}`}
        >
          {copy.openSecretBox}
        </button>
      </div>
    </div>
  );
}
