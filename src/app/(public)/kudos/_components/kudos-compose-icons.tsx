import type { SVGProps } from "react";

/**
 * Shared 24×24 single-`currentColor`-path icon shell (code-rules §2a/§5).
 * Every `MM_MEDIA_*` icon reused across the Kudos compose surface shares
 * this exact SVG frame — factored once so `kudos-compose-footer.tsx` and
 * `kudos-format-toolbar.tsx` (Viết Kudo, screen `ihQ26W78P2`) and
 * `kudos-link-dialog.tsx` (Addlink Box, screen `OyDLDuSGEa`) render the same
 * icon markup without duplicating path data. Moved here from
 * `kudos-format-toolbar.tsx`, its original home.
 */
export function icon(path: string) {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path d={path} fill="currentColor" />
      </svg>
    );
  };
}

/**
 * `MM_MEDIA_Close` inlined with `currentColor` (code-rules §2a) — ships
 * baked `fill="white"` in Figma's export, invisible on the cream/light
 * backgrounds it's used on. Same icon component (`214:3851`/`186:2761`
 * variants) reused by:
 * - mm:I520:11647;520:9906;186:2761 (Viết Kudo footer H.1 "Hủy",
 *   `kudos-compose-footer.tsx`, its original home)
 * - mm:I1002:12682;1002:12544;186:2761 (Addlink Box D.1 "Hủy",
 *   `kudos-link-dialog.tsx`)
 */
export function IconClose(props: SVGProps<SVGSVGElement>) {
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
        d="M13.4759 12.0972L19.0159 17.6372V19.0972H17.5559L12.0159 13.5572L6.47587 19.0972H5.01587V17.6372L10.5559 12.0972L5.01587 6.55717V5.09717H6.47587L12.0159 10.6372L17.5559 5.09717H19.0159V6.55717L13.4759 12.0972Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * `MM_MEDIA_Link`, built on the shared `icon()` shell — same icon component
 * reused by:
 * - mm:I520:11647;662:10507;186:1420 (Viết Kudo toolbar C.5 "Link",
 *   `kudos-format-toolbar.tsx`, its original home)
 * - mm:I1002:12682;1002:12545;186:1766 (Addlink Box D.2 "Lưu",
 *   `kudos-link-dialog.tsx`)
 */
export const IconLink = icon(
  "M10.9619 13.1547C11.3719 13.5447 11.3719 14.1847 10.9619 14.5747C10.5719 14.9647 9.93189 14.9647 9.54189 14.5747C7.5919 12.6247 7.5919 9.4547 9.54189 7.5047L13.0819 3.9647C15.0319 2.0147 18.2019 2.0147 20.1519 3.9647C22.1019 5.9147 22.1019 9.0847 20.1519 11.0347L18.6619 12.5247C18.6719 11.7047 18.5419 10.8847 18.2619 10.1047L18.7319 9.6247C19.9119 8.4547 19.9119 6.5547 18.7319 5.3847C17.5619 4.2047 15.6619 4.2047 14.4919 5.3847L10.9619 8.9147C9.7819 10.0847 9.7819 11.9847 10.9619 13.1547ZM13.7819 8.9147C14.1719 8.5247 14.8119 8.5247 15.2019 8.9147C17.1519 10.8647 17.1519 14.0347 15.2019 15.9847L11.6619 19.5247C9.71189 21.4747 6.54189 21.4747 4.59189 19.5247C2.64189 17.5747 2.64189 14.4047 4.59189 12.4547L6.08189 10.9647C6.07189 11.7847 6.20189 12.6047 6.48189 13.3947L6.01189 13.8647C4.83189 15.0347 4.83189 16.9347 6.01189 18.1047C7.18189 19.2847 9.08189 19.2847 10.2519 18.1047L13.7819 14.5747C14.9619 13.4047 14.9619 11.5047 13.7819 10.3347C13.3719 9.9447 13.3719 9.3047 13.7819 8.9147Z",
);
