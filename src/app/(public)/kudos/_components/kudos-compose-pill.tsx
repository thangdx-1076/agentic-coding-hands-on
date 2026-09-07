import type { SVGProps } from "react";

export type KudosComposePillProps = {
  placeholder: string;
  ariaLabel: string;
};

/**
 * Compose-kudos pill (mm:2940:13449 `mms_A.1_Button ghi nhận`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ).
 *
 * Renders as a readonly `<input>`, NOT a button with an `onClick` — the
 * dialog it should open (Figma frame `ihQ26W78P2` "Viết Kudo") does not
 * exist in this repo yet (clarifications.md § Phạm vi F007), so wiring a
 * click handler here would either no-op silently or navigate to a route
 * that isn't real. C03 asserts exactly this shape: one `<input>`,
 * `readonly`, placeholder matching byte-for-byte, a visible icon.
 */
export function KudosComposePill({
  placeholder,
  ariaLabel,
}: KudosComposePillProps) {
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
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="w-full bg-transparent font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-white placeholder:text-white focus:outline-none"
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
