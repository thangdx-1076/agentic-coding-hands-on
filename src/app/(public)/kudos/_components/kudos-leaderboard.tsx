import Image from "next/image";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";

/**
 * Slot `mm:2940:13510` `mms_D.3_10 SUNNER nhận quà` — reused for BOTH
 * sidebar leaderboards. The Figma frame only draws one literal list
 * ("10 SUNNER NHẬN QUÀ MỚI NHẤT", node `2940:13510`); the second board
 * ("10 SUNNER CÓ SỰ THĂNG HẠNG MỚI NHẤT") exists only in `D`'s own
 * description text (`2940:13488`) with no distinct frame — same
 * avatar+name+description row shape applies, so one component covers both
 * (`kudos-sidebar.tsx` renders it twice with different title/items).
 * `emptyLabel` still applies to both: `rankUps` has no rank-tracking source
 * yet (stays `[]` by design), while `giftRecipients` renders real Secret
 * Box openers (F007 FR-219/BR-020) once any exist — `Chưa có dữ liệu` is
 * only ever the honest "0 rows" result, not a stand-in for missing work.
 */
export type KudosLeaderboardItemData = {
  id: string;
  name: string;
  description: string;
  avatarSrc: string;
};

export type KudosLeaderboardProps = {
  title: string;
  /** Exact string is a TC contract (C08) — no trailing period, unlike the
   * feed's "Hiện tại chưa có Kudos nào." */
  emptyLabel: string;
  items: KudosLeaderboardItemData[];
};

export function KudosLeaderboard({
  title,
  emptyLabel,
  items,
}: KudosLeaderboardProps) {
  return (
    // mm:2940:13510
    <section
      data-testid="kudos-leaderboard"
      className="w-full rounded-[17px] border border-[#998C5F] bg-[#00070C] pt-6 pr-4 pb-6 pl-6"
    >
      {/* mm:2940:13512 */}
      <div className="flex w-full flex-col items-center gap-4">
        {/* mm:2940:13513 */}
        <h3 className="w-full text-center font-montserrat text-[22px] leading-7 font-bold text-login-button">
          {title}
        </h3>
        {items.length === 0 ? (
          <p className="w-full text-center font-montserrat text-base font-semibold text-white">
            {emptyLabel}
          </p>
        ) : (
          // mm:2940:13515 — independent scroll, budgeted to the design's
          // own 5-row height (`Frame 547`, 384px); the 2px gray bar Figma
          // draws beside the list (`Frame 545`) is a static scrollbar-thumb
          // mockup, replaced here by a real thin scrollbar via `scrollbarColor`.
          <ul
            className="flex max-h-[384px] w-full flex-col gap-4 overflow-y-auto"
            style={{
              scrollbarColor: "#999999 transparent",
              scrollbarWidth: "thin",
            }}
          >
            {items.map((item) => (
              // mm:2940:13516 (shared `256:7474` row instance)
              <li key={item.id}>
                <Link
                  href={`${ROUTES.PROFILE}?id=${encodeURIComponent(item.id)}`}
                  className="flex items-center gap-2"
                >
                  {/* mm:I2940:13516;256:7460 */}
                  <Image
                    src={item.avatarSrc}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full border-[1.87px] border-white object-cover"
                  />
                  {/* mm:I2940:13516;256:7461 */}
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-montserrat text-[22px] leading-7 font-bold text-login-button">
                      {item.name}
                    </span>
                    <span className="font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-white">
                      {item.description}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
