import type { KeyboardEvent, SVGProps } from "react";

export type KudosComposePillProps = {
  placeholder: string;
  ariaLabel: string;
  /**
   * Fired on click, or on `Enter`/`Space` while the readonly input is
   * focused — the launcher (`kudos-compose-launcher.tsx`, phase 13) decides
   * what "activated" means (open the dialog when signed in, redirect to
   * `/login` otherwise, C01/C03). This component stays presentational: it
   * only reports the activation, never the destination.
   */
  onActivate: () => void;
  /** Mirrors `useKudosComposeDialog`'s `isOpen` — drives `aria-expanded`
   * only; this component renders no dialog of its own. */
  dialogOpen: boolean;
};

/**
 * Compose-kudos pill (mm:2940:13449 `mms_A.1_Button ghi nhận`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ).
 *
 * Renders as a readonly `<input>`, NOT a `<button>` — `kudos.spec.ts` C03
 * asserts exactly this shape: one `<input>`, `readonly`, placeholder
 * matching byte-for-byte, a visible icon; and an `<input>` nested inside a
 * `<button>`/`<a>` would be invalid HTML (interactive-in-interactive). The
 * "Viết Kudo" dialog now exists (phase 13) and is wired straight onto this
 * same readonly input instead: `onClick`/`onKeyDown` (Enter/Space, same
 * activation keys `notification-bell.tsx`'s toggle button honors natively)
 * call `onActivate`, and `aria-haspopup="dialog"` + `aria-expanded`
 * advertise it to assistive tech — a readonly input is still focusable and
 * keyboard-reachable, so no `tabIndex` override is needed. `role="button"`
 * overrides the `<input>`'s implicit `textbox` role, which WAI-ARIA does not
 * allow to carry `aria-expanded` (`jsx-a11y/role-supports-aria-props`); a
 * `button` role legitimately does (the same disclosure-button pattern
 * `notification-bell.tsx`'s real `<button>` uses), and matches this
 * control's actual behavior — it never accepts typed input.
 */
export function KudosComposePill({
  placeholder,
  ariaLabel,
  onActivate,
  dialogOpen,
}: KudosComposePillProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  }

  return (
    // mm:2940:13449
    <div
      data-testid="kudos-compose-pill"
      className="flex w-full max-w-[738px] items-center gap-2 rounded-[68px] border border-[#998C5F] bg-[rgba(255,234,158,0.10)] px-4 py-6"
    >
      {/* mm:I2940:13449;186:2758 */}
      <div className="flex flex-1 items-center gap-4">
        {/* mm:I2940:13449;186:2759 MM_MEDIA_Pen */}
        <IconPen
          data-testid="kudos-compose-icon"
          aria-hidden="true"
          className="h-6 w-6 shrink-0 text-white"
        />
        {/* mm:I2940:13449;186:2760 */}
        <input
          type="text"
          readOnly
          role="button"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={dialogOpen}
          placeholder={placeholder}
          onClick={onActivate}
          onKeyDown={handleKeyDown}
          className="w-full cursor-pointer bg-transparent font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-white placeholder:text-white focus:outline-none"
        />
      </div>
    </div>
  );
}

/** `MM_MEDIA_Pen` (`I2940:13449;186:2759`) inlined with `currentColor` —
 * used once here, so it stays local rather than a shared icon file (this
 * phase's file ownership doesn't include an `icons/` directory). */
function IconPen(props: SVGProps<SVGSVGElement>) {
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
