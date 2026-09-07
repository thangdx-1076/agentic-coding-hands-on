import { describe, expect, it } from "vitest";

import { pickActiveSlug, type SpyEntry } from "./scroll-spy";

/**
 * `node` project — pure logic, no DOM, no `IntersectionObserver` stub needed.
 * Entries are plain literals (see `scroll-spy.ts` doc comment for why the
 * real `IntersectionObserverEntry` shape is deliberately not used here).
 */
function entry(
  overrides: Partial<SpyEntry> & Pick<SpyEntry, "slug">,
): SpyEntry {
  return {
    isIntersecting: true,
    intersectionRatio: 1,
    top: 0,
    ...overrides,
  };
}

describe("pickActiveSlug", () => {
  it("entries rỗng → giữ current", () => {
    expect(pickActiveSlug([], "mvp")).toBe("mvp");
  });

  it("không entry nào intersecting → giữ current", () => {
    const entries = [entry({ slug: "top-talent", isIntersecting: false })];
    expect(pickActiveSlug(entries, "mvp")).toBe("mvp");
  });

  it("một entry intersecting → chọn slug đó", () => {
    const entries = [entry({ slug: "top-project", top: 10 })];
    expect(pickActiveSlug(entries, "top-talent")).toBe("top-project");
  });

  it("nhiều entry intersecting, top >= 0 → chọn top nhỏ nhất (gần đỉnh viewport nhất)", () => {
    const entries = [
      entry({ slug: "top-talent", top: 40 }),
      entry({ slug: "top-project", top: 5 }),
      entry({ slug: "mvp", top: 120 }),
    ];
    expect(pickActiveSlug(entries, "top-talent")).toBe("top-project");
  });

  it("mọi entry intersecting đều top < 0 → fallback chọn ratio lớn nhất", () => {
    // 3 entries để reduce đi qua cả nhánh "ratio mới lớn hơn" (top-project
    // thắng top-talent) lẫn nhánh "ratio mới không lớn hơn" (mvp thua,
    // top-project vẫn giữ vị trí dẫn đầu).
    const entries = [
      entry({ slug: "top-talent", top: -20, intersectionRatio: 0.2 }),
      entry({ slug: "top-project", top: -5, intersectionRatio: 0.9 }),
      entry({ slug: "mvp", top: -10, intersectionRatio: 0.5 }),
    ];
    expect(pickActiveSlug(entries, "top-talent")).toBe("top-project");
  });

  it("trộn entry không intersecting với entry intersecting → bỏ qua entry không intersecting", () => {
    const entries = [
      entry({ slug: "top-talent", isIntersecting: false, top: -100 }),
      entry({ slug: "mvp", top: 8 }),
    ];
    expect(pickActiveSlug(entries, "top-talent")).toBe("mvp");
  });
});
