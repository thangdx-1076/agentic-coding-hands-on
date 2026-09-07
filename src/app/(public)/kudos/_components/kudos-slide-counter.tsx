export type KudosSlideCounterProps = {
  /** 0-based, straight from `useCarouselIndex` (phase 06) — this component
   * never keeps its own copy of the slide position. */
  index: number;
  /** `items.length`, NOT a hardcoded `5` — a filtered board can read `1/3`
   * (phase-09 Key Insight). */
  count: number;
};

/**
 * mm:B.5.2_số trang (`2940:13473`) — `${index + 1}/${count}`. Styles read
 * straight off the node: `--Details-Text-Secondary-2` (`#999999`, already
 * reused by `kudos-card-time`), Montserrat 700, 28px/36px.
 */
export function KudosSlideCounter({ index, count }: KudosSlideCounterProps) {
  return (
    // mm:2940:13473
    <span
      data-testid="kudos-slide-counter"
      className="font-montserrat text-[28px] leading-9 font-bold text-[#999999]"
    >
      {index + 1}/{count}
    </span>
  );
}
