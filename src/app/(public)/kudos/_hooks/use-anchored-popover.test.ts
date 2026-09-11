import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAnchoredPopover } from "./use-anchored-popover";

const VIEWPORT_HEIGHT = 800;
const VIEWPORT_WIDTH = 1000;

function setViewport(): void {
  Object.defineProperty(window, "innerHeight", {
    value: VIEWPORT_HEIGHT,
    configurable: true,
  });
  Object.defineProperty(window, "innerWidth", {
    value: VIEWPORT_WIDTH,
    configurable: true,
  });
}

/** jsdom lays nothing out — every rect is 0×0 and `offsetHeight` is 0 — so
 * both measurements the hook takes are stubbed explicitly per case. */
function makeAnchor(rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement("button");
  el.getBoundingClientRect = () =>
    ({ top: 0, bottom: 0, left: 0, width: 0, height: 0, ...rect }) as DOMRect;
  return el;
}

function makePanel(height: number): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "offsetHeight", {
    value: height,
    configurable: true,
  });
  return el;
}

function render(
  anchor: HTMLElement | null,
  panel: HTMLElement | null,
  width: number | "anchor" = 300,
) {
  setViewport();
  return renderHook(() =>
    useAnchoredPopover({
      anchorRef: { current: anchor },
      panelRef: { current: panel },
      width,
    }),
  );
}

describe("useAnchoredPopover", () => {
  it("returns null while either element is missing, so the panel can stay hidden", () => {
    expect(render(null, makePanel(100)).result.current).toBeNull();
    expect(render(makeAnchor({ bottom: 100 }), null).result.current).toBeNull();
  });

  it("places the panel just below the anchor when there is room", () => {
    const { result } = render(
      makeAnchor({ top: 100, bottom: 140, left: 50, width: 200 }),
      makePanel(200),
    );

    // 140 (anchor bottom) + 4 (GAP)
    expect(result.current?.top).toBe(144);
    expect(result.current?.left).toBe(50);
    expect(result.current?.anchorWidth).toBe(200);
  });

  it("flips above the anchor when the space below cannot hold the panel", () => {
    // Anchor near the bottom: 800 - 780 - 4 - 8 = 8px below, far under the
    // 160px minimum, so below-placement is rejected.
    const { result } = render(
      makeAnchor({ top: 740, bottom: 780, left: 50, width: 200 }),
      makePanel(300),
    );

    // spaceAbove = 740 - 4 - 8 = 728; panel (300) fits, so it sits directly
    // above: 740 - 4 - 300.
    expect(result.current?.top).toBe(436);
  });

  it("keeps a flipped panel on screen when it is taller than the space above", () => {
    const { result } = render(
      makeAnchor({ top: 200, bottom: 790, left: 0, width: 100 }),
      makePanel(500),
    );

    // spaceAbove = 200 - 4 - 8 = 188, smaller than the 500px panel, so the
    // panel is clamped to that space rather than running off the top.
    expect(result.current?.top).toBe(8);
    expect(result.current?.maxHeight).toBe(188);
  });

  it("never reports a maxHeight below the usable minimum", () => {
    // Squeezed both ways: 88px above (100 - 4 - 8) and 88px below
    // (800 - 700 - 4 - 8), both under the 160px minimum a 300px panel needs.
    const { result } = render(
      makeAnchor({ top: 100, bottom: 700, left: 0, width: 100 }),
      makePanel(300),
    );

    expect(result.current?.maxHeight).toBe(160);
  });

  it("clamps left so a panel near the right edge stays inside the viewport", () => {
    const { result } = render(
      makeAnchor({ top: 10, bottom: 50, left: 950, width: 40 }),
      makePanel(100),
      300,
    );

    // 1000 (viewport) - 300 (panel) - 8 (margin) — left of the anchor's own
    // 950, which is what "clamped" means here.
    expect(result.current?.left).toBe(692);
  });

  it('measures the clamp against the anchor itself when width is "anchor"', () => {
    const anchor = { top: 10, bottom: 50, left: 980, width: 40 };

    // A 300px-wide panel gets pulled well left of the anchor...
    expect(render(makeAnchor(anchor), makePanel(100), 300).result.current?.left)
      // 1000 - 300 - 8
      .toBe(692);

    // ...while an anchor-width panel only needs 1000 - 40 - 8.
    expect(
      render(makeAnchor(anchor), makePanel(100), "anchor").result.current?.left,
    ).toBe(952);
  });

  it("never places the panel left of the viewport margin", () => {
    const { result } = render(
      makeAnchor({ top: 10, bottom: 50, left: -40, width: 100 }),
      makePanel(100),
    );

    expect(result.current?.left).toBe(8);
  });

  it("re-measures on scroll and on resize, since either moves the anchor", () => {
    setViewport();
    const panel = makePanel(100);
    const anchor = document.createElement("button");
    let bottom = 140;
    anchor.getBoundingClientRect = () =>
      ({ top: bottom - 40, bottom, left: 0, width: 100 }) as DOMRect;

    const { result } = renderHook(() =>
      useAnchoredPopover({
        anchorRef: { current: anchor },
        panelRef: { current: panel },
        width: 300,
      }),
    );
    expect(result.current?.top).toBe(144);

    bottom = 300;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current?.top).toBe(304);

    bottom = 500;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current?.top).toBe(504);
  });

  it("detaches both listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      makeAnchor({ top: 10, bottom: 50, left: 0, width: 100 }),
      makePanel(100),
    );

    unmount();

    const events = remove.mock.calls.map((call) => call[0]);
    expect(events).toContain("scroll");
    expect(events).toContain("resize");
    remove.mockRestore();
  });
});
