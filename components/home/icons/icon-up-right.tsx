import type { SVGProps } from "react";

/**
 * Diagonal "go to" arrow used across the Homepage screen (mm:I2167:9063;186:1766
 * and its 8 duplicate `MM_MEDIA_Up` instances — CTA buttons, "Chi tiết" links on
 * every award card, the Kudos CTA and the Widget menu). Downloaded once as
 * `public/home/Up.svg`; extracted here per code-rules 2a/5 (shared ≥2 times,
 * SVG icon → inline component + `currentColor`) so every caller controls its
 * own color instead of baking in the exported `fill="white"`.
 */
export function IconUpRight(props: SVGProps<SVGSVGElement>) {
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
        d="M8.49945 18.3104L5.68945 15.5004L12.0595 9.12043H7.10945V5.69043H18.3095V16.8904H14.8895V11.9404L8.49945 18.3104Z"
        fill="currentColor"
      />
    </svg>
  );
}
