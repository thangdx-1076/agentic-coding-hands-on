"use client";

import Link from "next/link";

import { IconPencil } from "../../../_components/icons/icon-pencil";
import { IconClose } from "../../../_components/icons/icon-close";
import { IconSunLogo } from "../../../_components/icons/icon-sun-logo";

import { ROUTES } from "@/constants/routes";
import { useMenuKeyboardNav } from "@/hooks/use-menu-keyboard-nav";

export type WidgetButtonProps = {
  standardsLabel: string;
  writeKudosLabel: string;
  buttonLabel: string;
  cancelLabel: string;
};

const ITEM_COUNT = 2;

const TRIGGER_PILL_CLASS =
  "flex h-16 w-[106px] cursor-pointer items-center gap-2 rounded-full bg-login-button p-4 text-login-button-text shadow-[0_4px_4px_0_rgba(0,0,0,0.25),0_0_6px_0_#FAE287] transition-[background-color,box-shadow] duration-200 ease-out hover:shadow-[0_6px_10px_0_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-login-button focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none";

const TRIGGER_CANCEL_CLASS =
  "flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#D4271D] text-white transition-[background-color,box-shadow] duration-200 ease-out hover:shadow-[0_6px_10px_0_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-login-button focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none";

const OPTION_CLASS =
  "flex h-16 items-center gap-2 rounded bg-login-button p-4 font-montserrat text-2xl leading-8 font-bold text-login-button-text outline-none transition-[background-color,box-shadow] duration-200 ease-out hover:shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-login-button focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none";

/**
 * Fixed bottom-right "quick actions" widget (mm:5022:15169
 * `mms_6_Widget Button`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM).
 * Closed state: pill 106×64 (`_hphd32jN2`, `313:9137`). Expanded state:
 * a 2-option panel (`Sv7DFwBw1h`, `313:9139`/`313:9140`) — "Thể lệ"
 * (`ROUTES.STANDARDS`) and "Viết KUDOS" (`ROUTES.KUDOS`) — that morphs the
 * SAME trigger `<button>` from the pill into a 56×56 red "×" (clarifications.md
 * § Hành vi). `aria-label` stays `buttonLabel` in both states; only
 * `aria-expanded` changes — this is load-bearing for `home.spec.ts` [TC
 * ID-35], which clicks this exact button a second time to close it while
 * open. `cancelLabel` is the "×"'s `title` tooltip only, never the
 * accessible name.
 *
 * The menu (`[role="menu"]`) and the trigger `<button>` are rendered inside
 * one fixed-length children array (`{open && menu}` then `{trigger}`) so the
 * trigger never unmounts/remounts across open/close — `registerButton`
 * would otherwise lose its node and `close()` couldn't return focus on
 * Escape (clarifications.md § Bẫy React identity).
 *
 * Open/close + keyboard nav reuse `useMenuKeyboardNav`, same hook and
 * pattern as `components/login/language-selector.tsx`.
 */
export function WidgetButton({
  standardsLabel,
  writeKudosLabel,
  buttonLabel,
  cancelLabel,
}: WidgetButtonProps) {
  const {
    open,
    activeIndex,
    registerRoot,
    registerButton,
    registerItem,
    close,
    handleButtonClick,
    handleButtonKeyDown,
    handleMenuKeyDown,
  } = useMenuKeyboardNav({ itemCount: ITEM_COUNT });

  return (
    /* mm:5022:15169 */
    <div data-testid="home-widget-fab" className="fixed right-6 bottom-6 z-30">
      {/* mm:313:9140 */}
      <div ref={registerRoot} className="flex flex-col items-end gap-5">
        {open && (
          <div
            role="menu"
            // Roving tabindex, same delegation note as `language-selector.tsx`.
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className="animate-login-menu-in flex flex-col items-end gap-5"
          >
            {/* mm:I313:9140;214:3799 */}
            <Link
              ref={registerItem(0)}
              href={ROUTES.STANDARDS}
              role="menuitem"
              tabIndex={activeIndex === 0 ? 0 : -1}
              onClick={() => close(false)}
              className={OPTION_CLASS}
            >
              {/* mm:214:3752 */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <IconSunLogo />
              </span>
              {standardsLabel}
            </Link>
            {/* mm:I313:9140;214:3732 */}
            <Link
              ref={registerItem(1)}
              href={ROUTES.KUDOS}
              role="menuitem"
              tabIndex={activeIndex === 1 ? 0 : -1}
              onClick={() => close(false)}
              className={OPTION_CLASS}
            >
              {/* mm:214:3812 */}
              <IconPencil className="h-6 w-6 shrink-0" />
              {writeKudosLabel}
            </Link>
          </div>
        )}

        <button
          ref={registerButton}
          type="button"
          aria-label={buttonLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          title={open ? cancelLabel : undefined}
          onClick={handleButtonClick}
          onKeyDown={handleButtonKeyDown}
          className={open ? TRIGGER_CANCEL_CLASS : TRIGGER_PILL_CLASS}
        >
          {open ? (
            /* mm:I313:9140;214:3827;214:3851 */
            <IconClose aria-hidden="true" className="h-6 w-6" />
          ) : (
            /* mm:I5022:15169;214:3839 */
            <>
              {/* mm:I5022:15169;214:3839;186:1935 */}
              <span className="flex h-8 w-[42px] items-center gap-2">
                {/* mm:I5022:15169;214:3839;186:1763 */}
                <IconPencil className="h-6 w-6 shrink-0" />
                {/* mm:I5022:15169;214:3839;186:1568 */}
                <span className="font-montserrat text-2xl leading-8 font-bold">
                  /
                </span>
              </span>
              {/* mm:I5022:15169;214:3839;186:1766 */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <IconSunLogo />
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
