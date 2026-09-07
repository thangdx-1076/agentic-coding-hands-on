"use client";

import { useCarouselIndex } from "../_hooks/use-carousel-index";
import { defaultKudosCopy, type KudosCopy } from "../_shared/kudos-copy";

import { KudosCard, type KudosCardProps } from "./kudos-card";
import { KudosCarouselNav } from "./kudos-carousel-nav";
import { KudosSlideCounter } from "./kudos-slide-counter";

/** Every `KudosCard` prop except `variant` (always `"highlight"` here) and
 * `copy` (one shared value for the whole carousel, below). Reusing
 * `KudosCardProps` instead of a parallel type keeps this in lockstep with
 * whatever phase 07 still owns on the card itself. */
export type KudosHighlightCarouselItem = Omit<
  KudosCardProps,
  "variant" | "copy"
>;

export type KudosHighlightCarouselProps = {
  /** Already sorted top-5-by-`heart_count` by the caller's DAL query
   * (BR-001) — this component never sorts or slices. */
  items: KudosHighlightCarouselItem[];
  copy?: KudosCopy;
  /** `kudos.feed.empty` — the exact same string the (not-yet-built) feed
   * empty state uses (BR-011), passed once by the caller rather than
   * duplicated here. */
  emptyLabel: string;
  /** `kudos.highlight.prev` */
  prevLabel: string;
  /** `kudos.highlight.next` */
  nextLabel: string;
};

const CARD_WIDTH = 528;
const CARD_GAP = 24;
const CARD_STEP = CARD_WIDTH + CARD_GAP;

/**
 * mm:B.2_HIGHLIGHT KUDOS (`2940:13461`) / mm:B.2.3_content (`2940:13463`).
 *
 * The Figma frame is a screenshot frozen at slide 2/5, showing only 3 card
 * slots. Rendering literally 3 slots would fail C11 (`toHaveCount(5)` on
 * `[data-testid=kudos-card][data-variant=highlight]`), so every item in
 * `items` gets its own slot in the DOM at all times; only the active
 * slot's `aria-hidden`/`inert` are omitted, matching "slide hiện tại nổi
 * bật ở center, 2 bên để mờ" (BR-002) while keeping every card queryable.
 * `useCarouselIndex` (phase 06) is the single source of the slide index —
 * both `KudosCarouselNav` placements below read the same `index`/`canPrev`/
 * `canNext` (spec: "cả 2 vị trí nút dùng chung 1 state").
 */
export function KudosHighlightCarousel({
  items,
  copy = defaultKudosCopy,
  emptyLabel,
  prevLabel,
  nextLabel,
}: KudosHighlightCarouselProps) {
  const { index, canPrev, canNext, next, prev } = useCarouselIndex(
    items.length,
  );

  return (
    // mm:2940:13461
    <section
      data-testid="kudos-highlight-carousel"
      className="relative w-full bg-login-background"
    >
      {items.length === 0 ? (
        // mm:2940:13451 — empty board, same string as the feed (BR-011)
        <p
          data-testid="kudos-empty"
          className="w-full py-16 text-center font-montserrat text-xl font-bold text-white"
        >
          {emptyLabel}
        </p>
      ) : (
        <>
          {/* mm:2940:13463 */}
          <div className="relative h-[525px] w-full overflow-hidden">
            {items.map((item, itemIndex) => {
              const offset = itemIndex - index;
              const isActive = offset === 0;
              const isNeighbor = Math.abs(offset) === 1;

              return (
                // mm:2940:13465 — one slot per real item, not the design's
                // frozen 3; inactive slots drop out of the a11y tree and
                // tab order entirely (no attribute at all when active).
                <div
                  key={item.card.id}
                  aria-hidden={isActive ? undefined : true}
                  inert={isActive ? undefined : true}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: CARD_WIDTH,
                    transform: `translate(calc(-50% + ${offset * CARD_STEP}px), -50%)`,
                    opacity: isActive ? 1 : isNeighbor ? 0.35 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                    zIndex: isActive ? 1 : 0,
                    transition: "transform 300ms ease, opacity 300ms ease",
                  }}
                >
                  <KudosCard {...item} variant="highlight" copy={copy} />
                </div>
              );
            })}
            <KudosCarouselNav
              placement="card"
              canPrev={canPrev}
              canNext={canNext}
              onPrev={prev}
              onNext={next}
              prevLabel={prevLabel}
              nextLabel={nextLabel}
            />
          </div>

          {/* mm:2940:13471 */}
          <div className="flex w-full items-center justify-center py-6">
            <KudosCarouselNav
              placement="counter"
              canPrev={canPrev}
              canNext={canNext}
              onPrev={prev}
              onNext={next}
              prevLabel={prevLabel}
              nextLabel={nextLabel}
            >
              <KudosSlideCounter index={index} count={items.length} />
            </KudosCarouselNav>
          </div>
        </>
      )}
    </section>
  );
}
