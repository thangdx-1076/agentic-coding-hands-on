import type { SVGProps } from "react";

/**
 * Diamond icon (mm:214:1817, component set `178:1020`) — 24px, sits before
 * the "Số lượng giải thưởng:" label in every award section (mm:I313:8467;
 * 214:2535 and siblings across `mms_D.2..D.6`). New icon; inlined per
 * code-rules 2a with `currentColor` replacing the exported `fill="white"` so
 * it follows the gold label color via the parent's `text-login-button`.
 */
export function IconDiamond(props: SVGProps<SVGSVGElement>) {
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
        d="M16 9H19L14 16M10 9H14L12 17M5 9H8L10 16M15 4H17L19 7H16M11 4H13L14 7H10M7 4H9L8 7H5M6 2L2 8L12 22L22 8L18 2H6Z"
        fill="currentColor"
      />
    </svg>
  );
}
