export type CountdownTilesProps = {
  days: string;
  hours: string;
  minutes: string;
  daysLabel: string;
  hoursLabel: string;
  minutesLabel: string;
};

/**
 * One frosted-glass digit tile (collapses the 2 per-digit boxes at
 * mm:2167:9039 / mm:2167:9044 / mm:2167:9049 — e.g. "Frame 485" wrapping
 * "Group 5"/"Group 4" — into a single element per clarifications.md §
 * Hero/Countdown: render the already zero-padded `days`/`hours`/`minutes`
 * string as-is, no per-digit split). The card background carries the exact
 * Figma values (0.5px `#FFEA9E` border, white→transparent gradient, 50%
 * opacity, 16.64px backdrop blur) on an absolutely-positioned layer so the
 * digit text itself stays at full opacity, matching the design (only the
 * "Rectangle 1" sibling has `opacity: 0.5`, not the "2" text node).
 *
 * Figma's `fontFamily` for the digits is "Digital Numbers", which isn't
 * loaded anywhere in this app yet (`app/fonts.ts` is outside this section's
 * owned files) — falls back to `monospace` with `tabular-nums` until a
 * later phase adds the real typeface.
 */
function DigitBox({ value }: { value: string }) {
  return (
    <div className="relative inline-flex min-h-[56px] min-w-[80px] items-center justify-center px-1 sm:min-h-[70px] sm:min-w-[112px] sm:px-2 lg:min-h-[82px] lg:min-w-[116px]">
      <div
        className="absolute inset-0 rounded-lg opacity-50 backdrop-blur-[16.64px]"
        style={{
          border: "0.5px solid #FFEA9E",
          background:
            "linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.1) 100%)",
        }}
      />
      <span
        data-testid="tile-digits"
        className="relative text-[28px] leading-none font-normal text-white tabular-nums sm:text-[38px] lg:text-[49.152px]"
        style={{ fontFamily: '"Digital Numbers", monospace' }}
      >
        {value}
      </span>
    </div>
  );
}

function TileLabel({ children }: { children: string }) {
  return (
    <span
      data-testid="tile-label"
      className="font-montserrat text-sm leading-5 font-bold text-white sm:text-lg sm:leading-6 lg:text-2xl lg:leading-8"
    >
      {children}
    </span>
  );
}

/**
 * Presentational countdown (mm:2167:9037 mms_B1.3_Countdown) — pure, no
 * timer state and no "Coming soon" visibility logic. `HeroSection` renders
 * this inside its `countdown` slot; a later integration phase's
 * `countdown-timer.tsx` wraps live `days`/`hours`/`minutes` state around it.
 *
 * Contract (clarifications.md § Hero/Countdown + E2E contract): root is
 * `role="timer"` wrapping exactly 3 tiles, each tile's direct children are
 * exactly the digits element (`textContent` matches `/^\d{2,}$/`) and the
 * label element.
 *
 * Phase 4 polish: tile size, gap, and font scale down below `lg` (mobile
 * `80px`/`sm:` `112px` tiles → the pixel-perfect `116px` at `lg:`) so the
 * 3-tile row never exceeds the viewport width at 375/768 — purely a size
 * reduction, the `lg:` values are untouched.
 */
export function CountdownTiles({
  days,
  hours,
  minutes,
  daysLabel,
  hoursLabel,
  minutesLabel,
}: CountdownTilesProps) {
  return (
    /* mm:2167:9037 */
    <div role="timer" className="flex items-center gap-4 sm:gap-6 lg:gap-10">
      {/* mm:2167:9038 */}
      <div
        data-testid="tile"
        className="flex h-20 w-20 flex-col items-start justify-center gap-2 sm:h-28 sm:w-28 sm:gap-3 lg:h-32 lg:w-[116px] lg:gap-[14px]"
      >
        {/* mm:2167:9039 */}
        <DigitBox value={days} />
        {/* mm:2167:9042 */}
        <TileLabel>{daysLabel}</TileLabel>
      </div>
      {/* mm:2167:9043 */}
      <div
        data-testid="tile"
        className="flex h-20 w-20 flex-col items-start justify-center gap-2 sm:h-28 sm:w-28 sm:gap-3 lg:h-32 lg:w-[116px] lg:gap-[14px]"
      >
        {/* mm:2167:9044 */}
        <DigitBox value={hours} />
        {/* mm:2167:9047 */}
        <TileLabel>{hoursLabel}</TileLabel>
      </div>
      {/* mm:2167:9048 */}
      <div
        data-testid="tile"
        className="flex h-20 w-20 flex-col items-start justify-center gap-2 sm:h-28 sm:w-28 sm:gap-3 lg:h-32 lg:w-[116px] lg:gap-[14px]"
      >
        {/* mm:2167:9049 */}
        <DigitBox value={minutes} />
        {/* mm:2167:9052 */}
        <TileLabel>{minutesLabel}</TileLabel>
      </div>
    </div>
  );
}
