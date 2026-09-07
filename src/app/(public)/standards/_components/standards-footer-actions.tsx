import Image from "next/image";
import Link from "next/link";

import { IconPencil } from "../../_components/icons/icon-pencil";

export type StandardsFooterActionsProps = {
  copy: { close: string; writeKudos: string };
  onClose: () => void;
};

/**
 * Footer action bar (mm:3204:6092, "B_Button") — secondary/outlined
 * "Đóng" (`3204:6093`) + primary yellow "Viết KUDOS" (`3204:6094`). This
 * is a `<div>`, never a `<footer>` tag — C2 in `standards.spec.ts` asserts
 * 0 `<footer>` elements site-wide; the sticky positioning itself belongs
 * to the caller (`StandardsScreen`'s `<div sticky bottom-0>`), so this
 * component stays a plain, context-free action bar.
 *
 * "Đóng" icon: `/standards/close.svg` is `fill="white"` in the source SVG
 * (matches the white label text on the outlined button) — `next/image` is
 * correct here, unlike the pen icon below. "Viết KUDOS" icon: `IconPencil`
 * (`currentColor`) from `(public)/_components/icons/` — NOT
 * `/home/Pen.svg`, which is `fill="white"` and would be invisible on this
 * yellow primary button.
 */
export function StandardsFooterActions({
  copy,
  onClose,
}: StandardsFooterActionsProps) {
  return (
    // mm:3204:6092
    <div className="flex items-center gap-4 bg-login-background px-8 py-4">
      {/* mm:3204:6093 */}
      <button
        type="button"
        onClick={onClose}
        className="flex items-center justify-center gap-2 rounded border border-[#998C5F] bg-[rgba(255,234,158,0.10)] px-4 py-4 font-montserrat text-base leading-6 font-bold tracking-[0.5px] text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.18)] focus-visible:ring-2 focus-visible:ring-login-button focus-visible:outline-none"
      >
        <Image
          src="/standards/close.svg"
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
        />
        {copy.close}
      </button>
      {/* mm:3204:6094 */}
      <Link
        href="/kudos"
        className="flex flex-1 items-center justify-center gap-2 rounded bg-login-button px-4 py-4 font-montserrat text-base leading-6 font-bold tracking-[0.5px] text-login-button-text transition-colors duration-200 ease-out hover:bg-[#ffe07a] focus-visible:ring-2 focus-visible:ring-login-button focus-visible:outline-none"
      >
        <IconPencil
          className="h-6 w-6 text-login-button-text"
          aria-hidden="true"
        />
        {copy.writeKudos}
      </Link>
    </div>
  );
}
