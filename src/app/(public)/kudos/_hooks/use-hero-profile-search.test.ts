import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchSunners } from "../_actions/search-sunners";

import {
  HERO_SEARCH_MAX_LENGTH,
  useHeroProfileSearch,
} from "./use-hero-profile-search";

import type { SunnerSuggestion } from "@/dal/sunner-search";

/**
 * Two boundaries, both mocked: `useRouter` (the only Next.js surface this
 * hook touches — the test observes the exact `/profile?id=` it pushes, same
 * approach as `use-kudos-filters.test.ts`) and the `searchSunners` Server
 * Action underneath `useSunnerSuggest`, which runs FOR REAL here so the
 * debounce/gating contract between the two hooks is exercised rather than
 * stubbed away.
 */
const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../_actions/search-sunners", () => ({
  searchSunners: vi.fn(),
}));

const mockedSearch = vi.mocked(searchSunners);

/** Matches `use-sunner-suggest.ts`'s private `DEBOUNCE_MS`, duplicated the
 * same way its own test does. */
const DEBOUNCE_MS = 250;

function makeSunner(id: string, fullName: string | null): SunnerSuggestion {
  return { id, fullName, avatarUrl: null, department: "CEVC1" };
}

function renderSearch(isSignedIn = true) {
  return renderHook(() => useHeroProfileSearch({ isSignedIn }));
}

async function settleDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
}

describe("useHeroProfileSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSearch.mockReset();
    push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("trạng thái đầu: query rỗng, dropdown đóng, không gọi action", () => {
    const { result, unmount } = renderSearch();

    expect(result.current.query).toBe("");
    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockedSearch).not.toHaveBeenCalled();
    unmount();
  });

  it("gõ chữ → input nhận giá trị, dropdown mở, action chạy sau debounce", async () => {
    mockedSearch.mockResolvedValue([makeSunner("id-1", "Nguyễn Văn A")]);
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("Nguyễn");
    });

    expect(result.current.query).toBe("Nguyễn");
    expect(result.current.isOpen).toBe(true);
    expect(result.current.loading).toBe(true);

    await settleDebounce();

    expect(mockedSearch).toHaveBeenCalledExactlyOnceWith("Nguyễn");
    expect(result.current.options).toEqual([
      makeSunner("id-1", "Nguyễn Văn A"),
    ]);
    expect(result.current.loading).toBe(false);
    unmount();
  });

  it("query chỉ có khoảng trắng → dropdown vẫn đóng, không gọi action", async () => {
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("   ");
    });
    await settleDebounce();

    expect(result.current.isOpen).toBe(false);
    expect(mockedSearch).not.toHaveBeenCalled();
    unmount();
  });

  it(`cắt query ở ${HERO_SEARCH_MAX_LENGTH} ký tự — đúng cap của Server Action`, () => {
    mockedSearch.mockResolvedValue([]);
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("a".repeat(HERO_SEARCH_MAX_LENGTH + 5));
    });

    expect(result.current.query).toHaveLength(HERO_SEARCH_MAX_LENGTH);
    unmount();
  });

  it("chưa đăng nhập → không gọi action, options rỗng, loading false", async () => {
    const { result, unmount } = renderSearch(false);

    act(() => {
      result.current.setQuery("Nguyễn");
    });
    await settleDebounce();

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.current.options).toEqual([]);
    expect(result.current.loading).toBe(false);
    // Dropdown vẫn mở để hiện gợi ý đăng nhập (wrapper truyền signInHint).
    expect(result.current.isOpen).toBe(true);
    unmount();
  });

  it("chọn một kết quả → push /profile?id= và đóng dropdown", async () => {
    mockedSearch.mockResolvedValue([makeSunner("id-1", "Nguyễn Văn A")]);
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("Nguyễn");
    });
    await settleDebounce();

    act(() => {
      result.current.openProfile(result.current.options[0]);
    });

    expect(push).toHaveBeenCalledExactlyOnceWith("/profile?id=id-1");
    expect(result.current.isOpen).toBe(false);
    // Chữ đã gõ giữ nguyên — người dùng có thể back lại và sửa.
    expect(result.current.query).toBe("Nguyễn");
    unmount();
  });

  it("id được encode khi ghép vào query string", async () => {
    mockedSearch.mockResolvedValue([makeSunner("a b&c", "Lạ")]);
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("Lạ");
    });
    await settleDebounce();

    act(() => {
      result.current.openProfile(result.current.options[0]);
    });

    expect(push).toHaveBeenCalledExactlyOnceWith("/profile?id=a%20b%26c");
    unmount();
  });

  it("Enter → mở kết quả đầu tiên", async () => {
    mockedSearch.mockResolvedValue([
      makeSunner("id-1", "Nguyễn Văn A"),
      makeSunner("id-2", "Nguyễn Thị B"),
    ]);
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("Nguyễn");
    });
    await settleDebounce();

    act(() => {
      result.current.submit();
    });

    expect(push).toHaveBeenCalledExactlyOnceWith("/profile?id=id-1");
    unmount();
  });

  it("Enter khi chưa có kết quả → không điều hướng", async () => {
    mockedSearch.mockResolvedValue([]);
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("zzz");
    });
    await settleDebounce();

    act(() => {
      result.current.submit();
    });

    expect(push).not.toHaveBeenCalled();
    unmount();
  });

  it("dismiss() đóng dropdown nhưng giữ chữ; gõ tiếp thì mở lại", async () => {
    mockedSearch.mockResolvedValue([makeSunner("id-1", "Nguyễn Văn A")]);
    const { result, unmount } = renderSearch();

    act(() => {
      result.current.setQuery("Nguyễn");
    });
    await settleDebounce();

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe("Nguyễn");

    act(() => {
      result.current.setQuery("Nguyễn V");
    });

    expect(result.current.isOpen).toBe(true);
    unmount();
  });
});
