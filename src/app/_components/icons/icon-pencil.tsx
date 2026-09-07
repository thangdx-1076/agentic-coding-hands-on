import type { SVGProps } from "react";

/**
 * Pencil icon, shared component `186:1763` (MM_MEDIA_Pen, `public/home/Pen.svg`).
 * Mono icon — solid `fill="white"` replaced with `currentColor` per
 * code-rules 2a so the parent controls the color. Two known instances:
 * - Widget Button's "quick actions" trigger (mm:I5022:15169;214:3839;186:1763)
 *   on the yellow primary pill.
 * - Standards page footer "Viết KUDOS" button (mm:I3204:6094;186:1763) on
 *   the same yellow primary style — promoted here from `(home)/_components/`
 *   to `src/app/_components/` per the scope ladder (cross-route-group
 *   consumers): `public/home/Pen.svg` itself is `fill="white"`, invisible on
 *   the yellow button, so this `currentColor` version is reused instead of
 *   a second white-fill asset.
 */
export function IconPencil(props: SVGProps<SVGSVGElement>) {
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
        d="M20.8067 6.72951C21.1967 6.33951 21.1967 5.68951 20.8067 5.31951L18.4667 2.97951C18.0967 2.58951 17.4467 2.58951 17.0567 2.97951L15.2167 4.80951L18.9667 8.55951M3.09668 16.9395V20.6895H6.84668L17.9067 9.61951L14.1567 5.86951L3.09668 16.9395Z"
        fill="currentColor"
      />
    </svg>
  );
}
