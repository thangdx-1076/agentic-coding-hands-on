import type { HomeCopy } from "./home-copy";

export type EventInfoProps = {
  copy: HomeCopy;
};

/**
 * Event info block (mm:2167:9053 mms_B2_Thông tin sự kiện). Content is the
 * spec/TC values (`copy.event.*`), not the Figma placeholder — content
 * acceptance already overrode this in `home-copy.ts` per clarifications.md
 * § Hero/Countdown ("Thông tin sự kiện (B2)").
 *
 * Each line is ONE parent element so its normalized `textContent` reads as
 * the full "label value" string the E2E contract asserts on (`page.locator`
 * `text=...`), even though label (white) and value (gold `#FFEA9E`) are
 * two differently-styled spans inside it.
 */
export function EventInfo({ copy }: EventInfoProps) {
  const { event } = copy;

  return (
    /* mm:2167:9053 */
    <div className="flex w-full flex-col items-start gap-2">
      {/* mm:2167:9054 */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-[60px]">
        {/* mm:2167:9055 */}
        <p className="font-montserrat">
          {/* mm:2167:9056 */}
          <span className="text-base leading-6 font-bold tracking-[0.15px] text-white">
            {event.timeLabel}
          </span>{" "}
          {/* mm:2167:9057 */}
          <span className="text-2xl leading-8 font-bold text-[#FFEA9E]">
            {event.timeValue}
          </span>
        </p>
        {/* mm:2167:9058 */}
        <p className="font-montserrat">
          {/* mm:2167:9060 */}
          <span className="text-base leading-6 font-bold tracking-[0.15px] text-white">
            {event.venueLabel}
          </span>{" "}
          {/* mm:2167:9059 */}
          <span className="text-2xl leading-8 font-bold text-[#FFEA9E]">
            {event.venueValue}
          </span>
        </p>
      </div>
      {/* mm:2167:9061 */}
      <p className="font-montserrat text-base leading-6 font-bold tracking-[0.5px] text-white">
        {event.liveNote}
      </p>
    </div>
  );
}
