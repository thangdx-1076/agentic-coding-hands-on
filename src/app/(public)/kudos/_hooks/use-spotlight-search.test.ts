import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSpotlightSearch } from "./use-spotlight-search";

const NAMES = [
  "Đỗ hoàng Hiệp",
  "Dương thúy An",
  "Mai phương Thúy",
  "Lê Kiều Trang",
];

describe("useSpotlightSearch", () => {
  it("query rỗng → matched rỗng, canSubmit false", () => {
    const { result } = renderHook(() => useSpotlightSearch(NAMES));

    expect(result.current.query).toBe("");
    expect(result.current.matched.size).toBe(0);
    expect(result.current.canSubmit).toBe(false);
  });

  it("khớp bỏ dấu: gõ 'Hiep' vẫn khớp 'Đỗ hoàng Hiệp'", () => {
    const { result } = renderHook(() => useSpotlightSearch(NAMES));

    act(() => {
      result.current.setQuery("Hiep");
    });

    expect(result.current.matched).toEqual(new Set(["Đỗ hoàng Hiệp"]));
    expect(result.current.canSubmit).toBe(true);
  });

  it("không khớp tên nào → matched rỗng", () => {
    const { result } = renderHook(() => useSpotlightSearch(NAMES));

    act(() => {
      result.current.setQuery("Khong Ton Tai");
    });

    expect(result.current.matched.size).toBe(0);
  });

  it("chỉ toàn khoảng trắng → coi như rỗng, canSubmit false", () => {
    const { result } = renderHook(() => useSpotlightSearch(NAMES));

    act(() => {
      result.current.setQuery("   ");
    });

    expect(result.current.matched.size).toBe(0);
    expect(result.current.canSubmit).toBe(false);
  });

  it("đúng 100 ký tự → giữ nguyên, không cắt", () => {
    const { result } = renderHook(() => useSpotlightSearch(NAMES));
    const hundred = "a".repeat(100);

    act(() => {
      result.current.setQuery(hundred);
    });

    expect(result.current.query).toHaveLength(100);
    expect(result.current.query).toBe(hundred);
  });

  it("101 ký tự → cắt còn đúng 100", () => {
    const { result } = renderHook(() => useSpotlightSearch(NAMES));

    act(() => {
      result.current.setQuery("a".repeat(101));
    });

    expect(result.current.query).toHaveLength(100);
  });
});
