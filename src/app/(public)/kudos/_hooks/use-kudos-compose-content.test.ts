import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchSunners } from "../_actions/search-sunners";

import { useKudosComposeContent } from "./use-kudos-compose-content";

import type { SunnerSuggestion } from "@/dal/sunner-search";

/** Matches `use-sunner-suggest.ts`'s private `DEBOUNCE_MS`. */
const DEBOUNCE_MS = 250;

vi.mock("../_actions/search-sunners", () => ({
  searchSunners: vi.fn(),
}));

const mockedSearch = vi.mocked(searchSunners);

function makeSunner(id: string): SunnerSuggestion {
  return { id, fullName: `Sunner ${id}`, avatarUrl: null };
}

function makeTextarea(
  value: string,
  start: number,
  end = start,
): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setSelectionRange(start, end);
  return textarea;
}

describe("useKudosComposeContent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSearch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bắt đầu rỗng, mentionQuery null", () => {
    const { result, unmount } = renderHook(() => useKudosComposeContent());

    expect(result.current.content).toBe("");
    expect(result.current.mentionQuery).toBeNull();
    expect(result.current.mentionOptions).toEqual([]);
    unmount();
  });

  it("setContent cập nhật value và caret mặc định = cuối chuỗi", () => {
    const { result, unmount } = renderHook(() => useKudosComposeContent());

    act(() => {
      result.current.setContent("Cảm ơn");
    });

    expect(result.current.content).toBe("Cảm ơn");
    unmount();
  });

  it("gõ @Ngu tới caret → mentionQuery = 'Ngu', gọi searchSunners sau debounce (ID-33/C27)", async () => {
    const { result, rerender, unmount } = renderHook(() =>
      useKudosComposeContent(),
    );

    act(() => {
      result.current.setContent("Thanks @Ngu", 11);
    });
    rerender();

    expect(result.current.mentionQuery).toBe("Ngu");

    mockedSearch.mockResolvedValueOnce([makeSunner("1")]);
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(mockedSearch).toHaveBeenCalledExactlyOnceWith("Ngu");

    await act(async () => {
      await Promise.resolve();
    });
    unmount();
  });

  it("insertMention thay token @token bằng @Tên trơn, xoá mentionQuery", () => {
    const { result, unmount } = renderHook(() => useKudosComposeContent());

    act(() => {
      result.current.setContent("Thanks @Ngu", 11);
    });
    expect(result.current.mentionQuery).toBe("Ngu");

    act(() => {
      result.current.insertMention(makeSunner("1"));
    });

    expect(result.current.content).toBe("Thanks @Sunner 1 ");
    expect(result.current.mentionQuery).toBeNull();
    unmount();
  });

  it("applyFormat bọc vùng chọn bằng marker rồi setSelectionRange trên textarea thật (C09)", () => {
    const { result, unmount } = renderHook(() => useKudosComposeContent());
    const textarea = makeTextarea("hello", 0, 5);

    act(() => {
      result.current.setContent("hello");
    });
    act(() => {
      result.current.applyFormat("bold", textarea);
    });

    expect(result.current.content).toBe("**hello**");
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(7);
    unmount();
  });

  it("applyFormat dùng độ dài content khi selectionStart/End null → caret rỗng ở cuối (phòng vệ)", () => {
    const { result, unmount } = renderHook(() => useKudosComposeContent());
    const textarea = document.createElement("textarea");
    textarea.value = "hi";
    Object.defineProperty(textarea, "selectionStart", { value: null });
    Object.defineProperty(textarea, "selectionEnd", { value: null });

    act(() => {
      result.current.setContent("hi");
    });
    act(() => {
      result.current.applyFormat("italic", textarea);
    });

    // start/end both fall back to `content.length` (2) — an empty
    // selection AT the end, so `insertMarkdownMarker` inserts a collapsed
    // "**" pair rather than wrapping the whole (unselected) text.
    expect(result.current.content).toBe("hi**");
    unmount();
  });

  it("reset() đưa content và caret về rỗng", () => {
    const { result, unmount } = renderHook(() => useKudosComposeContent());

    act(() => {
      result.current.setContent("Thanks @Ngu", 11);
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.content).toBe("");
    expect(result.current.mentionQuery).toBeNull();
    unmount();
  });
});
