import { describe, expect, it } from "vitest";

import { heroTierIndex } from "./star-tier";

describe("heroTierIndex", () => {
  it("chưa ai gửi Kudos → không có huy hiệu nào", () => {
    // The old rule floored at tier 0, which IS a badge — so a Sunner with
    // nothing yet wore "New Hero" over the caption "1-4 người gửi".
    expect(heroTierIndex(0)).toBeNull();
  });

  it("số âm (không nên xảy ra, nhưng không được throw) → không có huy hiệu", () => {
    expect(heroTierIndex(-1)).toBeNull();
  });

  it("1-4 người gửi → New Hero", () => {
    expect(heroTierIndex(1)).toBe(0);
    expect(heroTierIndex(4)).toBe(0);
  });

  it("5-9 người gửi → Rising Hero", () => {
    expect(heroTierIndex(5)).toBe(1);
    expect(heroTierIndex(9)).toBe(1);
  });

  it("10-20 người gửi → Super Hero (20 vẫn là Super, vì Legend là 'hơn 20')", () => {
    expect(heroTierIndex(10)).toBe(2);
    expect(heroTierIndex(20)).toBe(2);
  });

  it("hơn 20 người gửi → Legend Hero", () => {
    expect(heroTierIndex(21)).toBe(3);
    expect(heroTierIndex(1000)).toBe(3);
  });

  it("đếm NGƯỜI chứ không đếm kudo: 50 kudo từ 3 người vẫn chỉ là New Hero", () => {
    // The distinction the old total-based rule collapsed.
    expect(heroTierIndex(3)).toBe(0);
  });
});
