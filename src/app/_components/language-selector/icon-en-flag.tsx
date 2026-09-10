import type { SVGProps } from "react";

/**
 * United Kingdom (Union Jack) flag icon for the language selector
 * (mm:I525:11713;362:6128;186:1903;186:1709 — MoMorph row A.2, `hUyaaugye2`).
 * Multi-color asset — original Figma palette preserved (no currentColor).
 * Same box/clip convention as `icon-vn-flag.tsx`: 20x15 flag area translated
 * (2,5) inside a 24x24 viewBox.
 */
export function IconEnFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#login-en-flag-clip)">
        <rect
          width="20"
          height="15"
          transform="translate(2 5)"
          fill="#012169"
        />
        <polygon
          points="0.92,6.44 3.08,3.56 23.08,18.56 20.92,21.44"
          fill="white"
        />
        <polygon
          points="20.92,3.56 23.08,6.44 3.08,21.44 0.92,18.56"
          fill="white"
        />
        <polygon
          points="1.46,5.72 2.54,4.28 22.54,19.28 21.46,20.72"
          fill="#C8102E"
        />
        <polygon
          points="21.46,4.28 22.54,5.72 2.54,20.72 1.46,19.28"
          fill="#C8102E"
        />
        <rect x="10" y="5" width="4" height="15" fill="white" />
        <rect x="2" y="10.5" width="20" height="4" fill="white" />
        <rect x="11" y="5" width="2" height="15" fill="#C8102E" />
        <rect x="2" y="11.5" width="20" height="2" fill="#C8102E" />
      </g>
      <defs>
        <clipPath id="login-en-flag-clip">
          <rect
            width="20"
            height="15"
            fill="white"
            transform="translate(2 5)"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
