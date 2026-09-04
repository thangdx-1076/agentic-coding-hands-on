import type { SVGProps } from "react";

/**
 * Vietnam flag icon for the language selector (mm:I662:14391;186:1696;186:1821;186:1709).
 * Multi-color asset — original Figma palette preserved (no currentColor).
 */
export function IconVnFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#login-vn-flag-clip)">
        <rect width="20" height="15" transform="translate(2 5)" fill="white" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2 5H22V20H2V5Z"
          fill="#F7FCFF"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2 5V20H22V5H2Z"
          fill="#E31D1C"
        />
        <mask
          id="login-vn-flag-mask"
          style={{ maskType: "luminance" }}
          maskUnits="userSpaceOnUse"
          x="2"
          y="5"
          width="20"
          height="15"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M2 5V20H22V5H2Z"
            fill="white"
          />
        </mask>
        <g mask="url(#login-vn-flag-mask)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.0396 14.988L8.82029 17.0349L9.9001 13.4517L7.60389 11.1107L10.7696 11.0415L12.1702 7.50412L13.4465 11.0882L16.6047 11.1434L14.2314 13.5273L15.3396 16.9361L12.0396 14.988Z"
            fill="#FFD221"
          />
        </g>
      </g>
      <defs>
        <clipPath id="login-vn-flag-clip">
          <rect width="20" height="15" fill="white" transform="translate(2 5)" />
        </clipPath>
      </defs>
    </svg>
  );
}
