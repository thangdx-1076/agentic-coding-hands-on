import type { SVGProps } from "react";

/**
 * `secret_box_available` notification icon (phase-08, MoMorph frame
 * `589:9132`). **Provisional glyph** — see `icon-notification-kudos.tsx`'s
 * docblock for why (no MoMorph MCP access this session). A simple gift-box
 * shape (lid + body + ribbon cut-out) stands in for "Hộp bí mật", built
 * from plain rectangles rather than a hand-drawn curve to keep the shape
 * unambiguous while unverified. The ribbon cut-out is hardcoded to the
 * panel's own background (`#0B0F12`, `notification-panel.tsx`) since this
 * icon only ever renders on that surface — not a generally reusable
 * technique. Flagged for a visual QA pass against the real frame before
 * this ships (`plans/action-items.md`).
 */
export function IconNotificationBox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 8h18v3H3V8Z" fill="currentColor" />
      <path d="M4 12h16v9H4v-9Z" fill="currentColor" />
      <path d="M11 8h2v13h-2V8Z" fill="#0B0F12" />
      <path
        d="M9 8C7.62 8 6.5 6.88 6.5 5.5S7.62 3 9 3c1.93 0 3.5 2.24 3.5 5H9Z"
        fill="currentColor"
      />
      <path
        d="M15 8c1.38 0 2.5-1.12 2.5-2.5S16.38 3 15 3c-1.93 0-3.5 2.24-3.5 5H15Z"
        fill="currentColor"
      />
    </svg>
  );
}
