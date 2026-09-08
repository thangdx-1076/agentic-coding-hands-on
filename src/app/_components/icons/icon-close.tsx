import type { SVGProps } from "react";

/**
 * `MM_MEDIA_Close` inlined with `currentColor` (code-rules §2a) — ships
 * baked `fill="white"` in Figma's export, invisible on the cream/light
 * backgrounds it's used on. Promoted here from
 * `(public)/kudos/_components/kudos-compose-icons.tsx` per the scope
 * ladder (`nextjs-route-colocation-architecture`): a 3rd consumer in a
 * different route group needs it. Same icon component (`214:3851`) reused
 * by:
 * - mm:I520:11647;520:9906;186:2761 (Viết Kudo footer H.1 "Hủy",
 *   `kudos-compose-footer.tsx`)
 * - mm:I1002:12682;1002:12544;186:2761 (Addlink Box D.1 "Hủy",
 *   `kudos-link-dialog.tsx`)
 * - mm:I313:9140;214:3827;214:3851 (Widget Button FAB "×" trigger,
 *   `(home)/_components/widget-button.tsx`)
 * `kudos-compose-icons.tsx` re-exports this so the first 2 call sites
 * don't have to change their import.
 */
export function IconClose(props: SVGProps<SVGSVGElement>) {
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
        d="M13.4759 12.0972L19.0159 17.6372V19.0972H17.5559L12.0159 13.5572L6.47587 19.0972H5.01587V17.6372L10.5559 12.0972L5.01587 6.55717V5.09717H6.47587L12.0159 10.6372L17.5559 5.09717H19.0159V6.55717L13.4759 12.0972Z"
        fill="currentColor"
      />
    </svg>
  );
}
