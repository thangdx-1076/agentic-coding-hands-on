import type { SVGProps } from "react";

/**
 * `heart_received` notification icon (phase-08, MoMorph frame `589:9132`).
 * **Provisional glyph** — see `icon-notification-kudos.tsx`'s docblock for
 * why (no MoMorph MCP access this session). A generic heart stands in for
 * "thả tim" (the heart-reaction feature, `F008_KudosHeartReaction`),
 * monochrome via `currentColor`. Flagged for a visual QA pass against the
 * real frame before this ships (`plans/action-items.md`).
 */
export function IconNotificationHeart(props: SVGProps<SVGSVGElement>) {
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
        d="M12 21s-6.98-4.35-9.66-8.03C.63 10.86.9 8.02 3.03 6.34 5.02 4.77 7.86 5.07 9.5 7L12 9.86 14.5 7c1.64-1.93 4.48-2.23 6.47-.66 2.13 1.68 2.4 4.52.69 6.63C18.98 16.65 12 21 12 21Z"
        fill="currentColor"
      />
    </svg>
  );
}
