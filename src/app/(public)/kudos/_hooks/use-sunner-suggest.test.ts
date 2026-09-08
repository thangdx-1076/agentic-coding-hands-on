import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchSunners } from "../_actions/search-sunners";

import { useRecipientSearch, useSunnerSuggest } from "./use-sunner-suggest";

import type { SunnerSuggestion } from "@/dal/sunner-search";

/** Matches the hook's private `DEBOUNCE_MS` — kept as a local literal the
 * same way `use-kudos-toast.test.ts` duplicates `TOAST_DURATION_MS`. */
const DEBOUNCE_MS = 250;

vi.mock("../_actions/search-sunners", () => ({
  searchSunners: vi.fn(),
}));

const mockedSearch = vi.mocked(searchSunners);

function makeSunner(id: string): SunnerSuggestion {
  return { id, fullName: `Sunner ${id}`, avatarUrl: null };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useSunnerSuggest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSearch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("query rỗng → không gọi action, options rỗng, loading false", () => {
    const { result, unmount } = renderHook(() => useSunnerSuggest(""));

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.current).toEqual({ options: [], loading: false });
    unmount();
  });

  it("query null → không gọi action", () => {
    const { result, unmount } = renderHook(() => useSunnerSuggest(null));

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.current).toEqual({ options: [], loading: false });
    unmount();
  });

  it("enabled=false → không gọi action dù có query hợp lệ", async () => {
    const { result, unmount } = renderHook(() =>
      useSunnerSuggest("Ngu", { enabled: false }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    unmount();
  });

  it("query chỉ toàn khoảng trắng → coi như rỗng, không gọi action", async () => {
    const { unmount } = renderHook(() => useSunnerSuggest("   "));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(mockedSearch).not.toHaveBeenCalled();
    unmount();
  });

  it("gõ 3 lần liên tiếp trong lúc debounce đang chờ → action gọi đúng 1 lần với query cuối", async () => {
    mockedSearch.mockResolvedValue([]);
    const { rerender, unmount } = renderHook(
      ({ query }: { query: string }) => useSunnerSuggest(query),
      { initialProps: { query: "N" } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ query: "Ng" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ query: "Ngu" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(mockedSearch).toHaveBeenCalledExactlyOnceWith("Ngu");
    unmount();
  });

  it("loading bật ngay khi bắt đầu chờ debounce, tắt kèm options khi action resolve", async () => {
    const deferred = createDeferred<SunnerSuggestion[]>();
    mockedSearch.mockReturnValueOnce(deferred.promise);
    const { result, unmount } = renderHook(() => useSunnerSuggest("Ngu"));

    expect(result.current.loading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(mockedSearch).toHaveBeenCalledExactlyOnceWith("Ngu");

    await act(async () => {
      deferred.resolve([makeSunner("1")]);
      await Promise.resolve();
    });

    expect(result.current).toEqual({
      options: [makeSunner("1")],
      loading: false,
    });
    unmount();
  });

  it("action throw → nuốt lỗi, options rỗng, loading tắt", async () => {
    mockedSearch.mockRejectedValueOnce(new Error("network down"));
    const { result, unmount } = renderHook(() => useSunnerSuggest("Ngu"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(result.current).toEqual({ options: [], loading: false });
    unmount();
  });

  it("kết quả của query MỚI về trước thì giữ nguyên — request CŨ về sau bị bỏ qua", async () => {
    const first = createDeferred<SunnerSuggestion[]>();
    const second = createDeferred<SunnerSuggestion[]>();
    mockedSearch
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, rerender, unmount } = renderHook(
      ({ query }: { query: string }) => useSunnerSuggest(query),
      { initialProps: { query: "a" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    rerender({ query: "ab" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(mockedSearch).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve([makeSunner("2")]);
      await Promise.resolve();
    });
    expect(result.current.options).toEqual([makeSunner("2")]);

    await act(async () => {
      first.resolve([makeSunner("1")]);
      await Promise.resolve();
    });
    expect(result.current.options).toEqual([makeSunner("2")]);

    unmount();
  });

  it("request CŨ throw SAU khi request MỚI đã set kết quả → không ghi đè", async () => {
    const first = createDeferred<SunnerSuggestion[]>();
    mockedSearch.mockReturnValueOnce(first.promise);
    mockedSearch.mockResolvedValueOnce([makeSunner("2")]);

    const { result, rerender, unmount } = renderHook(
      ({ query }: { query: string }) => useSunnerSuggest(query),
      { initialProps: { query: "a" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    rerender({ query: "ab" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(result.current.options).toEqual([makeSunner("2")]);

    await act(async () => {
      first.reject(new Error("stale network error"));
      await first.promise.catch(() => undefined);
    });

    expect(result.current.options).toEqual([makeSunner("2")]);
    unmount();
  });

  it("unmount trước khi debounce chạy → huỷ timer, action không bao giờ được gọi", () => {
    const { unmount } = renderHook(() => useSunnerSuggest("Ngu"));
    unmount();

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("unmount trong lúc action đang chạy → resolve muộn không gây lỗi, không set state nữa", async () => {
    const deferred = createDeferred<SunnerSuggestion[]>();
    mockedSearch.mockReturnValueOnce(deferred.promise);
    const { unmount } = renderHook(() => useSunnerSuggest("Ngu"));

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(mockedSearch).toHaveBeenCalledTimes(1);

    unmount();

    await expect(
      act(async () => {
        deferred.resolve([makeSunner("1")]);
        await Promise.resolve();
      }),
    ).resolves.not.toThrow();
  });

  it("unmount trong lúc action đang chạy rồi action đó throw → không set state, không unhandled rejection", async () => {
    const deferred = createDeferred<SunnerSuggestion[]>();
    mockedSearch.mockReturnValueOnce(deferred.promise);
    const { unmount } = renderHook(() => useSunnerSuggest("Ngu"));

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    unmount();

    await expect(
      act(async () => {
        deferred.reject(new Error("late error"));
        await deferred.promise.catch(() => undefined);
      }),
    ).resolves.not.toThrow();
  });

  it("React Strict Mode double-invokes the mount effect → options vẫn tới nơi (isMountedRef không bị khoá vĩnh viễn)", async () => {
    const deferred = createDeferred<SunnerSuggestion[]>();
    mockedSearch.mockReturnValueOnce(deferred.promise);
    const { result, unmount } = renderHook(() => useSunnerSuggest("Ngu"), {
      wrapper: StrictMode,
    });

    // Strict Mode double-invokes BOTH effects on mount (run → cleanup →
    // run again) — the first search effect's `setTimeout` is cancelled by
    // its own cleanup before it ever fires, so exactly one call reaches
    // `searchSunners`, from the SECOND run.
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(mockedSearch).toHaveBeenCalledExactlyOnceWith("Ngu");

    await act(async () => {
      deferred.resolve([makeSunner("1")]);
      await Promise.resolve();
    });

    expect(result.current.options).toEqual([makeSunner("1")]);
    expect(result.current.loading).toBe(false);
    unmount();
  });
});

describe("useRecipientSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSearch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bắt đầu rỗng, không gọi action khi chưa gõ gì", () => {
    const onSelectionChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRecipientSearch(onSelectionChange),
    );

    expect(result.current.query).toBe("");
    expect(result.current.options).toEqual([]);
    expect(mockedSearch).not.toHaveBeenCalled();
    unmount();
  });

  it("gõ tên → gọi action sau debounce, trả options (C21)", async () => {
    const deferred = createDeferred<SunnerSuggestion[]>();
    mockedSearch.mockReturnValueOnce(deferred.promise);
    const onSelectionChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRecipientSearch(onSelectionChange),
    );

    act(() => {
      result.current.setQuery("Nguyễn");
    });
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(mockedSearch).toHaveBeenCalledExactlyOnceWith("Nguyễn");

    await act(async () => {
      deferred.resolve([makeSunner("1")]);
      await Promise.resolve();
    });

    expect(result.current.options).toEqual([makeSunner("1")]);
    unmount();
  });

  it("select() điền tên vào query, đóng dropdown (tắt search), báo cho caller", async () => {
    mockedSearch.mockResolvedValueOnce([makeSunner("1")]);
    const onSelectionChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRecipientSearch(onSelectionChange),
    );

    act(() => {
      result.current.setQuery("Nguyễn");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    const picked = makeSunner("1");
    act(() => {
      result.current.select(picked);
    });

    expect(result.current.query).toBe(picked.fullName);
    expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(picked);

    // Dropdown "closed": search is now disabled, so it never fires again
    // even though the debounce delay has fully elapsed.
    mockedSearch.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    expect(mockedSearch).not.toHaveBeenCalled();
    unmount();
  });

  it("select() với fullName null → điền chuỗi rỗng vào query (phòng vệ)", () => {
    const onSelectionChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRecipientSearch(onSelectionChange),
    );

    act(() => {
      result.current.select({ id: "1", fullName: null, avatarUrl: null });
    });

    expect(result.current.query).toBe("");
    unmount();
  });

  it("gõ lại SAU khi đã chọn → mở lại search, báo caller clear selection (null)", () => {
    const onSelectionChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRecipientSearch(onSelectionChange),
    );

    act(() => {
      result.current.select(makeSunner("1"));
    });
    onSelectionChange.mockClear();

    act(() => {
      result.current.setQuery("a");
    });

    expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(null);
    unmount();
  });

  it("gõ tiếp mà CHƯA từng chọn → không gọi onSelectionChange(null) thừa", () => {
    const onSelectionChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRecipientSearch(onSelectionChange),
    );

    act(() => {
      result.current.setQuery("a");
    });
    act(() => {
      result.current.setQuery("ab");
    });

    expect(onSelectionChange).not.toHaveBeenCalled();
    unmount();
  });

  it("reset() xoá query và mở lại search", async () => {
    const onSelectionChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRecipientSearch(onSelectionChange),
    );

    act(() => {
      result.current.select(makeSunner("1"));
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.query).toBe("");

    mockedSearch.mockResolvedValueOnce([]);
    act(() => {
      result.current.setQuery("a");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    expect(mockedSearch).toHaveBeenCalledExactlyOnceWith("a");
    unmount();
  });
});
