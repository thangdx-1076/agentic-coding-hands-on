import Image from "next/image";

import {
  SECRET_BOX_BADGE_SIZE,
  type SecretBoxBadge as SecretBoxBadgeAsset,
} from "../_shared/standards-copy";

export type SecretBoxBadgeProps = {
  badge: SecretBoxBadgeAsset;
  /** DOM text, not `alt` — FR-103 / C5: screen readers and Playwright both
   * need a real text node, not an image attribute. */
  caption: string;
};

/**
 * One secret-box badge cell (mm:3204:6082, template shared by
 * `3204:6086`/`6087`/`6083`/`6084`/`6088`). All 6 assets are the badge's
 * 64x64 circle only — the caption below is this component's `<p>`, never
 * part of the artwork (see `SECRET_BOX_BADGES` for why the raw export is
 * not used directly). Uniform intrinsic size means a plain sized `Image`
 * is enough; no `fill` frame is needed to align the grid.
 */
export function SecretBoxBadge({ badge, caption }: SecretBoxBadgeProps) {
  return (
    // mm:3204:6082
    <li className="flex flex-col items-center gap-2">
      <Image
        src={badge.asset}
        alt=""
        aria-hidden="true"
        width={badge.width}
        height={badge.height}
        sizes={`${SECRET_BOX_BADGE_SIZE}px`}
      />
      {/* mm:I3204:6082;737:20342 */}
      <p className="font-montserrat text-center text-xs leading-4 font-bold tracking-[0.5px] text-white">
        {caption}
      </p>
    </li>
  );
}
