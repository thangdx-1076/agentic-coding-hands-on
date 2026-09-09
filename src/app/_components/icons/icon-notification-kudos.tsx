import type { SVGProps } from "react";

/**
 * `kudos_received` notification icon (phase-08, MoMorph frame `589:9132`).
 * **Provisional glyph** — this session had no MoMorph MCP access to pull
 * the exact vector path for this icon (unlike `icon-bell.tsx`/`icon-user.tsx`,
 * which were downloaded from Figma in an earlier phase). A generic 5-point
 * star stands in for "Kudos" (the app's own recognition/star-tier metaphor —
 * see `kudos-card-person.tsx`'s hero-tier badges), monochrome via
 * `currentColor` per code-rules 2a. Flagged for a visual QA pass against
 * the real frame before this ships (`plans/action-items.md`).
 */
export function IconNotificationKudos(props: SVGProps<SVGSVGElement>) {
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
        d="M12 2 14.9 8.26 22 9.27 16.9 14.14 18.18 21 12 17.63 5.82 21 7.1 14.14 2 9.27 9.1 8.26 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
