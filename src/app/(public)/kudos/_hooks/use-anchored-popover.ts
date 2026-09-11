"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type AnchoredPopoverPlacement = {
  top: number;
  left: number;
  maxHeight: number;
  /** The anchor's measured width. A `fixed` panel cannot inherit its
   * anchor's width the way an `absolute` one could with `min-w-full`, so a
   * panel that wants to match its control (the recipient combobox) applies
   * this; one with a fixed design width (the hashtag panel) ignores it. */
  anchorWidth: number;
};

export type AnchoredPopoverOptions = {
  /** The control the panel hangs under (the combobox box, the "+ Hashtag"
   * button). Placement is measured from this element's viewport rect. */
  anchorRef: RefObject<HTMLElement | null>;
  /** The floating panel itself — measured to decide whether it fits below. */
  panelRef: RefObject<HTMLElement | null>;
  /** Panel width in px, used to keep it inside the viewport's right edge.
   * Pass the panel's own fixed width, or `"anchor"` when the panel matches
   * the control it hangs under. */
  width: number | "anchor";
  /** Values that change the panel's size or the anchor's position, beyond
   * scroll and resize — e.g. the option count, or a chip count that re-wraps
   * the row the anchor sits on. */
  deps?: readonly unknown[];
};

/** Gap between anchor and panel (the design's own 4px `mt-1`). */
const GAP = 4;
/** Breathing room kept against every viewport edge. */
const MARGIN = 8;
/** Below-the-anchor placement is taken when at least this much room exists;
 * under that the panel flips above rather than squeezing into a sliver. */
const MIN_HEIGHT = 160;

function isSamePlacement(
  a: AnchoredPopoverPlacement | null,
  b: AnchoredPopoverPlacement,
): boolean {
  return (
    a !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.maxHeight === b.maxHeight &&
    a.anchorWidth === b.anchorWidth
  );
}

/**
 * Viewport placement for a dropdown panel that must FLOAT over the compose
 * form rather than live in its layout.
 *
 * Why this exists at all: the compose dialog's body is a scroll container
 * (`kudos-compose-dialog.tsx:103`), and an `absolute` panel inside it is
 * clipped at that container's edge — rows get drawn but cannot be reached,
 * with no scrollbar of their own. Scrolling the container to reveal them is
 * the wrong cure: it shoves the whole form up under the user to make room
 * for a popover. A `fixed` box is positioned against the VIEWPORT and
 * ancestor `overflow` does not clip it, so the panel escapes while leaving
 * the form's layout completely untouched. (Only a transformed or filtered
 * ancestor would capture it — the compose dialog has none.)
 *
 * The cost of `fixed` is that `top`/`left` must be computed rather than
 * declared, which is all this hook does. It re-measures on scroll (capture
 * phase, so the form body's own scrolling counts, not just the window's),
 * on resize, and whenever `deps` change. It flips the panel above the anchor
 * when the space below cannot hold it, and clamps `left` and `maxHeight` so
 * the panel never leaves the viewport.
 *
 * Returns `null` until the first measurement lands — render the panel hidden
 * for that one frame rather than letting it flash at 0,0.
 */
export function useAnchoredPopover({
  anchorRef,
  panelRef,
  width,
  deps = [],
}: AnchoredPopoverOptions): AnchoredPopoverPlacement | null {
  const [placement, setPlacement] = useState<AnchoredPopoverPlacement | null>(
    null,
  );

  useLayoutEffect(() => {
    function place() {
      const anchorEl = anchorRef.current;
      const panel = panelRef.current;
      if (!anchorEl || !panel) return;

      const anchor = anchorEl.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const spaceBelow = window.innerHeight - anchor.bottom - GAP - MARGIN;
      const spaceAbove = anchor.top - GAP - MARGIN;
      const below = spaceBelow >= Math.min(panelHeight, MIN_HEIGHT);

      const next: AnchoredPopoverPlacement = {
        top: below
          ? anchor.bottom + GAP
          : Math.max(
              MARGIN,
              anchor.top - GAP - Math.min(panelHeight, spaceAbove),
            ),
        left: Math.min(
          Math.max(MARGIN, anchor.left),
          Math.max(
            MARGIN,
            window.innerWidth -
              (width === "anchor" ? anchor.width : width) -
              MARGIN,
          ),
        ),
        maxHeight: Math.max(MIN_HEIGHT, below ? spaceBelow : spaceAbove),
        anchorWidth: anchor.width,
      };

      // Bail out when nothing actually moved. `place()` runs on every scroll
      // event, and a fresh object each time would re-render the panel on
      // every frame of a scroll that never changed its position.
      setPlacement((current) =>
        isSamePlacement(current, next) ? current : next,
      );
    }

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
    // `anchorRef`/`panelRef` are deliberately NOT dependencies. A ref object
    // is stable for its owner's lifetime, so listing it buys nothing — and it
    // actively breaks a caller that passes one inline (`{ current: el }`),
    // which is a new object every render: the effect would re-run, set state,
    // re-render, and loop until React's update-depth guard fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, ...deps]);

  return placement;
}
