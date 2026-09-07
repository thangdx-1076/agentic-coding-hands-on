import { describe, expect, it } from "vitest";

import { starTier } from "./star-tier";

describe("starTier", () => {
  it("dưới 10 kudos nhận được → 0 hoa thị", () => {
    expect(starTier(0)).toBe(0);
    expect(starTier(9)).toBe(0);
  });

  it("số âm (không nên xảy ra, nhưng không được throw) → 0 hoa thị", () => {
    expect(starTier(-1)).toBe(0);
  });

  it("đúng 10 hoặc tới trước 20 → 1 hoa thị", () => {
    expect(starTier(10)).toBe(1);
    expect(starTier(19)).toBe(1);
  });

  it("đúng 20 hoặc tới trước 50 → 2 hoa thị", () => {
    expect(starTier(20)).toBe(2);
    expect(starTier(49)).toBe(2);
  });

  it("đúng 50 trở lên → 3 hoa thị", () => {
    expect(starTier(50)).toBe(3);
    expect(starTier(1000)).toBe(3);
  });
});
