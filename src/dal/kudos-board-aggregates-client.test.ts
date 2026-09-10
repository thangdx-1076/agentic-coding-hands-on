import { describe, expect, it, vi } from "vitest";

import { toKudosAggregatesClient } from "./kudos-board-aggregates-client";

type ShimInput = Parameters<typeof toKudosAggregatesClient>[0];

/**
 * Same shape as `kudos-client.test.ts`: the shim's whole job is forwarding,
 * so each test drives one real call shape through it and asserts BOTH that
 * the underlying builder saw the right arguments and that the resolved value
 * came back untouched.
 *
 * Two call shapes exist because `getKudosTotal` and `getKudosFilterOptions`
 * ask for different things: the count read passes `select("*", {count,head})`
 * and awaits immediately, while the distinct-options read passes a plain
 * column list and chains `.order("value")`. The `opts ? … : …` branch in the
 * shim is exactly that split, so both paths need a test or the branch stays
 * uncovered.
 */
describe("toKudosAggregatesClient", () => {
  it("forwards select() WITH options and awaits directly — the exact-count read (FR-217)", async () => {
    const result = { count: 4210, error: null };
    const select = vi.fn(() => Promise.resolve(result));
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudosAggregatesClient(fakeSupabase);
    const awaited = await shim
      .from("kudos")
      .select("*", { count: "exact", head: true });

    expect(from).toHaveBeenCalledExactlyOnceWith("kudos");
    expect(select).toHaveBeenCalledExactlyOnceWith("*", {
      count: "exact",
      head: true,
    });
    expect(awaited).toEqual(result);
  });

  it("forwards select() WITHOUT options and re-issues .order() through the wrapper — the distinct-options read (FR-215)", async () => {
    const result = {
      data: [
        { kind: "hashtag", value: "Dedicated" },
        { kind: "department", value: "CEVC10" },
      ],
      error: null,
    };
    const builder = {
      order: vi.fn(),
      then: (onFulfilled: unknown, onRejected: unknown) =>
        Promise.resolve(result).then(onFulfilled as never, onRejected as never),
    };
    builder.order.mockReturnValue(builder);

    const select = vi.fn(() => builder);
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudosAggregatesClient(fakeSupabase);
    const awaited = await shim
      .from("kudos_filter_options")
      .select("kind,value")
      .order("value");

    expect(from).toHaveBeenCalledExactlyOnceWith("kudos_filter_options");
    expect(select).toHaveBeenCalledExactlyOnceWith("kind,value");
    expect(builder.order).toHaveBeenCalledExactlyOnceWith("value");
    expect(awaited).toEqual(result);
  });

  // `AggregatesQuery["order"]` only accepts the literal `"value"`, so a
  // second `.order("kind")` does not type-check — the column set is pinned by
  // the type, not by this test. What still needs proving is that the wrapper
  // returns a NEW wrapped query each time rather than the raw builder, which
  // a repeated call exercises.
  it("keeps .order() chainable, so a second call still reaches the real builder", async () => {
    const result = { data: [], error: null };
    const builder = {
      order: vi.fn(),
      then: (onFulfilled: unknown, onRejected: unknown) =>
        Promise.resolve(result).then(onFulfilled as never, onRejected as never),
    };
    builder.order.mockReturnValue(builder);

    const select = vi.fn(() => builder);
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudosAggregatesClient(fakeSupabase);
    const awaited = await shim
      .from("kudos_filter_options")
      .select("kind,value")
      .order("value")
      .order("value");

    expect(builder.order).toHaveBeenNthCalledWith(1, "value");
    expect(builder.order).toHaveBeenNthCalledWith(2, "value");
    expect(builder.order).toHaveBeenCalledTimes(2);
    expect(awaited).toEqual(result);
  });

  it("propagates a rejection instead of swallowing it — getKudosTotal's throw path depends on this", async () => {
    const boom = new Error("PostgREST unreachable");
    const builder = {
      order: vi.fn(),
      then: (onFulfilled: unknown, onRejected: unknown) =>
        Promise.reject(boom).then(onFulfilled as never, onRejected as never),
    };
    builder.order.mockReturnValue(builder);

    const select = vi.fn(() => builder);
    const from = vi.fn(() => ({ select }));
    const fakeSupabase = { from } as unknown as ShimInput;

    const shim = toKudosAggregatesClient(fakeSupabase);

    await expect(
      shim.from("kudos_filter_options").select("kind,value").order("value"),
    ).rejects.toThrow("PostgREST unreachable");
  });
});
