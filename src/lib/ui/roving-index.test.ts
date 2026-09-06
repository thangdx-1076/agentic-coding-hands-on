import { describe, expect, it } from "vitest";

import { lastIndex, nextIndex, prevIndex } from "./roving-index";

describe("lastIndex", () => {
  it("trả chỉ số cuối của danh sách có phần tử", () => {
    expect(lastIndex(2)).toBe(1);
    expect(lastIndex(5)).toBe(4);
  });

  it("trả 0 khi danh sách rỗng", () => {
    expect(lastIndex(0)).toBe(0);
  });
});

describe("nextIndex", () => {
  it("tiến một bước ở giữa danh sách", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(1, 3)).toBe(2);
  });

  it("vòng từ cuối về đầu", () => {
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(1, 2)).toBe(0);
  });

  it("không vượt ra ngoài khi chỉ số đã quá cuối", () => {
    expect(nextIndex(9, 3)).toBe(0);
  });

  it("trả 0 với danh sách rỗng", () => {
    expect(nextIndex(0, 0)).toBe(0);
  });
});

describe("prevIndex", () => {
  it("lùi một bước ở giữa danh sách", () => {
    expect(prevIndex(2, 3)).toBe(1);
    expect(prevIndex(1, 3)).toBe(0);
  });

  it("vòng từ đầu về cuối", () => {
    expect(prevIndex(0, 3)).toBe(2);
    expect(prevIndex(0, 2)).toBe(1);
  });

  it("coi chỉ số âm như đang ở đầu", () => {
    expect(prevIndex(-1, 3)).toBe(2);
  });

  it("trả 0 với danh sách rỗng", () => {
    expect(prevIndex(0, 0)).toBe(0);
  });
});
