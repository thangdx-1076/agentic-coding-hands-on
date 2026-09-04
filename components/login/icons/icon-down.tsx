import type { SVGProps } from "react";

/**
 * Chevron-down icon for the language selector (mm:I662:14391;186:1696;186:1821;186:1441).
 * Mono icon — solid fill replaced with `currentColor` so the parent controls color.
 */
export function IconDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M7 10L12 15L17 10H7Z" fill="currentColor" />
    </svg>
  );
}
