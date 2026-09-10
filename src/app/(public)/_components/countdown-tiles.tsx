export type CountdownTilesProps = {
  days: string;
  hours: string;
  minutes: string;
  daysLabel: string;
  hoursLabel: string;
  minutesLabel: string;
};

/**
 * One frosted-glass digit box, one character (mm:2268:35141 "Group 5" /
 * mm:2268:35142 "Group 4" — the per-digit boxes inside "Frame 485"). Card
 * background carries the exact Figma values (0.5px `#FFEA9E` border,
 * white→transparent gradient, 50% opacity, 16.64px backdrop blur) on an
 * absolutely-positioned layer so the digit text itself stays at full
 * opacity, matching the design (only the "Rectangle 1" sibling has
 * `opacity: 0.5`, not the digit text node).
 *
 * Figma's `fontFamily` for the digits is "Digital Numbers", which isn't
 * loaded anywhere in this app yet (`app/fonts.ts` is outside this section's
 * owned files) — falls back to `monospace` with `tabular-nums` until a
 * later phase (font licensing is a human decision, not code) adds the real
 * typeface. Left exactly as-is.
 */
function DigitBox({ char }: { char: string }) {
  return (
    <div
      data-testid="tile-digit"
      className="relative inline-flex min-h-[56px] min-w-[35px] items-center justify-center px-1 sm:min-h-[70px] sm:min-w-[49px] sm:px-2 lg:min-h-[82px] lg:min-w-[51px]"
    >
      <div
        className="absolute inset-0 rounded-lg opacity-50 backdrop-blur-[16.64px]"
        style={{
          border: "0.5px solid #FFEA9E",
          background:
            "linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.1) 100%)",
        }}
      />
      <span
        className="relative text-[28px] leading-none font-normal text-white tabular-nums sm:text-[38px] lg:text-[49.152px]"
        style={{ fontFamily: '"Digital Numbers", monospace' }}
      >
        {char}
      </span>
    </div>
  );
}

/**
 * A unit's row of digit boxes (mm:2268:35140 "Frame 485"). Splits the
 * already zero-padded `value` into one `DigitBox` per character — design
 * (mm:2268:35139 "1_Days" → "Group 5"/"Group 4") draws 2 boxes because the
 * default zero-padded width is 2, but 2 is not a cap: `pad2`
 * (`src/utils/countdown.ts`) deliberately never clamps `days`
 * (`plans/260906-0042-homepage-saa-page/clarifications.md:39` — "Days
 * không giới hạn 2 chữ số"), so a 3- or 5-digit `days` string renders 3 or
 * 5 boxes here. Rule: **one box per character, minimum 2** (not "exactly
 * 2").
 *
 * `data-testid="tile-digits"` stays on this wrapper (not moved onto each
 * box) so its `textContent` is still the full padded string — the lowest
 * blast-radius option: existing assertions that read this testid's text or
 * match it against `/^\d{2,}$/` keep the same meaning unchanged; only
 * assertions that need the per-digit boxes look at the new
 * `data-testid="tile-digit"` children.
 */
function DigitBoxes({ value }: { value: string }) {
  return (
    <span
      data-testid="tile-digits"
      className="inline-flex items-center gap-[10px] sm:gap-[14px] lg:gap-[14px]"
    >
      {value.split("").map((char, index) => (
        <DigitBox key={index} char={char} />
      ))}
    </span>
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
 * Presentational countdown (mm:2268:35138 "Time") — pure, no timer state
 * and no "Coming soon" visibility logic. `HeroSection` renders this inside
 * its `countdown` slot; a later integration phase's `countdown-timer.tsx`
 * wraps live `days`/`hours`/`minutes` state around it.
 *
 * Contract (E2E contract, see `tests/e2e/home.spec.ts` +
 * `tests/e2e/prelaunch.spec.ts`): root is `role="timer"` wrapping exactly 3
 * tiles; each tile's direct children are the digits wrapper
 * (`data-testid="tile-digits"`, `textContent` matches `/^\d{2,}$/`, built
 * from N `data-testid="tile-digit"` boxes, N = `max(2, value.length)`) and
 * the label element.
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
    /* mm:2268:35138 */
    <div role="timer" className="flex items-center gap-4 sm:gap-6 lg:gap-10">
      {/* mm:2268:35139 */}
      <div
        data-testid="tile"
        className="flex h-20 w-20 flex-col items-start justify-center gap-2 sm:h-28 sm:w-28 sm:gap-3 lg:h-32 lg:w-[116px] lg:gap-[14px]"
      >
        {/* mm:2268:35140 */}
        <DigitBoxes value={days} />
        {/* mm:2268:35143 */}
        <TileLabel>{daysLabel}</TileLabel>
      </div>
      {/* mm:2268:35144 */}
      <div
        data-testid="tile"
        className="flex h-20 w-20 flex-col items-start justify-center gap-2 sm:h-28 sm:w-28 sm:gap-3 lg:h-32 lg:w-[116px] lg:gap-[14px]"
      >
        <DigitBoxes value={hours} />
        <TileLabel>{hoursLabel}</TileLabel>
      </div>
      {/* mm:2268:35149 */}
      <div
        data-testid="tile"
        className="flex h-20 w-20 flex-col items-start justify-center gap-2 sm:h-28 sm:w-28 sm:gap-3 lg:h-32 lg:w-[116px] lg:gap-[14px]"
      >
        <DigitBoxes value={minutes} />
        <TileLabel>{minutesLabel}</TileLabel>
      </div>
    </div>
  );
}
