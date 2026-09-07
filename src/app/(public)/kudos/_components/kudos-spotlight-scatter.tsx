export type KudosSpotlightScatterProps = {
  names: readonly string[];
  matched: ReadonlySet<string>;
  emptyMessage: string;
};

/**
 * `[x, y, fontSize]` slots copied from mm:2940:14174 B.7_Spotlight
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ),
 * one row per real `TEXT` node — position relative to the card's own
 * top-left corner, in px. The design bakes 106 individual name labels out
 * of only 7 real receivers repeated for word-cloud density
 * (clarifications.md § Spotlight); this is the STATIC layout half of that
 * decision. Widths/heights aren't kept — each span sizes itself to
 * whatever real name lands in that slot instead of the mock string's own
 * (different-length) box.
 */
const SLOTS: ReadonlyArray<readonly [number, number, number]> = [
  [945, 49, 6.7],
  [239, 67, 6.7],
  [841, 63, 6.7],
  [378, 72, 6.7],
  [988, 68, 6.7],
  [757, 74, 6.7],
  [514, 81, 6.7],
  [283, 87, 6.7],
  [902, 85, 6.7],
  [670, 91, 6.7],
  [428, 98, 6.7],
  [196, 104, 6.7],
  [1025, 99, 6.7],
  [703, 108, 10.2],
  [793, 105, 6.7],
  [945, 105, 6.7],
  [551, 112, 6.7],
  [229, 121, 10.2],
  [319, 118, 6.7],
  [471, 118, 6.7],
  [632, 127, 7.9],
  [864, 122, 6.7],
  [158, 140, 7.9],
  [390, 135, 6.7],
  [958, 136, 11.3],
  [729, 143, 6.7],
  [484, 149, 11.3],
  [255, 156, 6.7],
  [851, 154, 6.7],
  [639, 161, 6.7],
  [377, 167, 6.7],
  [165, 174, 6.7],
  [895, 174, 6.7],
  [682, 181, 6.7],
  [991, 180, 6.7],
  [421, 187, 6.7],
  [208, 194, 6.7],
  [517, 193, 6.7],
  [808, 191, 6.7],
  [596, 198, 6.7],
  [334, 204, 6.7],
  [932, 204, 6.7],
  [122, 211, 6.7],
  [719, 212, 6.7],
  [851, 210, 6.7],
  [1052, 210, 6.7],
  [458, 217, 6.7],
  [245, 225, 6.7],
  [377, 223, 6.7],
  [578, 223, 6.7],
  [770, 227, 6.7],
  [976, 224, 6.7],
  [165, 230, 6.7],
  [660, 233, 6.7],
  [296, 240, 6.7],
  [502, 237, 6.7],
  [868, 242, 6.7],
  [1020, 244, 6.7],
  [394, 255, 6.7],
  [546, 257, 6.7],
  [933, 261, 6.7],
  [133, 272, 6.7],
  [235, 279, 6.7],
  [459, 274, 6.7],
  [737, 269, 6.7],
  [1056, 274, 6.7],
  [976, 280, 6.7],
  [582, 287, 6.7],
  [502, 293, 6.7],
  [895, 297, 6.7],
  [329, 312, 6.7],
  [421, 310, 6.7],
  [992, 312, 6.7],
  [518, 325, 6.7],
  [653, 335, 6.7],
  [885, 330, 6.7],
  [296, 347, 6.7],
  [928, 349, 6.7],
  [697, 355, 6.7],
  [393, 362, 6.7],
  [545, 363, 6.7],
  [842, 366, 6.7],
  [610, 372, 6.7],
  [458, 380, 6.7],
  [965, 380, 6.7],
  [643, 389, 10.2],
  [733, 386, 6.7],
  [885, 386, 6.7],
  [804, 403, 6.7],
  [572, 408, 7.9],
  [898, 417, 11.3],
  [669, 424, 6.7],
  [791, 435, 6.7],
  [579, 442, 6.7],
  [835, 455, 6.7],
  [931, 461, 6.7],
  [622, 462, 6.7],
  [748, 472, 6.7],
  [872, 485, 6.7],
  [791, 491, 6.7],
  [579, 498, 6.7],
  [916, 505, 6.7],
  [996, 555, 6.7],
  [916, 561, 6.7],
  [835, 578, 6.7],
  [932, 593, 6.7],
];

/** Coral highlight color (`#F17676`) sampled from the ONE outlier node in
 * the design's own scatter (`2940:14198`, `Nguyễn Hoàng Linh`) that ships
 * with a different fill than the other 105 (all white) — the mock's own
 * demonstration of the "matched" search state, not a guessed accent. */
const MATCHED_COLOR_CLASS = "text-[#F17676]";
const DEFAULT_COLOR_CLASS = "text-white";

/**
 * mm:2940:14174's word-cloud body (canvas/header chrome live in
 * `kudos-spotlight.tsx`). Fills every one of the 106 static slots by
 * cycling through the real names (`names[index % names.length]`) —
 * matching the design's own scatter, which repeats the SAME 7–8 real
 * receivers ~106 times to cover the whole card (see the frame image: names
 * pack the box edge-to-edge, not just a narrow band at the top).
 *
 * ⚠ Reverses an earlier reading of this same design (previously: fewer
 * real names than slots → render fewer nodes, never repeat). That reading
 * matched `SLOTS.length` 1:1 against distinct receivers and produced an
 * ~80%-empty card against the actual design, which visual comparison
 * against `momorph/frame-image.png` caught. When `names.length >
 * SLOTS.length` the modulo has no effect for any in-range `index` (0..105
 * is always `< names.length`), so that case still naturally caps at
 * `SLOTS.length` real, non-repeated names — the one part of the earlier
 * reading (RISK-01) that was already correct.
 *
 * `matched` (from `useSpotlightSearch`) flags which of the currently-
 * rendered names carry `data-matched` for C21 — every repeated occurrence
 * of a matching name is flagged, not just one.
 */
export function KudosSpotlightScatter({
  names,
  matched,
  emptyMessage,
}: KudosSpotlightScatterProps) {
  if (names.length === 0) {
    return (
      <p
        data-testid="kudos-spotlight-empty"
        className="absolute inset-0 flex items-center justify-center px-8 text-center font-montserrat text-base text-white/70"
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      {SLOTS.map(([x, y, fontSize], index) => {
        const name = names[index % names.length];
        if (!name) {
          return null;
        }
        const isMatched = matched.has(name);
        return (
          <span
            key={`${name}-${index}`}
            data-testid="kudos-spotlight-name"
            data-matched={isMatched}
            style={{ left: x, top: y, fontSize }}
            className={`absolute font-montserrat font-bold whitespace-nowrap ${
              isMatched ? MATCHED_COLOR_CLASS : DEFAULT_COLOR_CLASS
            }`}
          >
            {name}
          </span>
        );
      })}
    </>
  );
}
