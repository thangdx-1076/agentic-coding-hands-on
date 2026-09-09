import type { SVGProps } from "react";

/**
 * `kudos_hidden` notification icon (phase-08, MoMorph frame `589:9132`).
 * **Provisional glyph** — see `icon-notification-kudos.tsx`'s docblock for
 * why (no MoMorph MCP access this session). A generic crossed-out eye
 * stands in for "ẩn" (hidden). Rendered with `stroke`/`fill="none"` rather
 * than this folder's usual single filled path — an eye-slash is naturally
 * a line glyph, and a hand-drawn filled compound shape here would be far
 * more error-prone than the sibling icons' solid silhouettes. `currentColor`
 * still drives the color (code-rules 2a), just via `stroke`. Flagged for a
 * visual QA pass against the real frame before this ships
 * (`plans/action-items.md`).
 */
export function IconNotificationEyeOff(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3.5 3.5 20.5 20.5" />
      <path d="M12 5c5 0 9 4.5 10 7-.66 1.52-2.02 3.53-4.05 5.02M6.1 6.62C3.98 8.1 2.6 10.13 2 11.5c1.4 3.2 5.1 7.5 10 7.5 1.44 0 2.78-.32 4-.85" />
      <path d="M9.9 10.1a2.5 2.5 0 0 0 3.99 2.99" />
    </svg>
  );
}
