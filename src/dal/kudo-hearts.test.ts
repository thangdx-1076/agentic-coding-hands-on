import { describe, expect, it, vi } from "vitest";

import { getViewerHeartedKudoIds, type KudoHeartsClient } from "./kudo-hearts";

/**
 * `getViewerHeartedKudoIds` never constructs its own Supabase client — the
 * caller injects one, so every branch here is a plain stub of the minimal
 * `.from().select().eq().in()` surface it actually calls. No network, no
 * `@supabase/ssr` boundary to mock.
 */
function stubClient(
  inResult: () => Promise<{
    data: { kudo_id: string }[] | null;
    error: unknown;
  }>,
): KudoHeartsClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ in: inResult }),
      }),
    }),
  };
}

describe("getViewerHeartedKudoIds", () => {
  it("trả Set các kudo_id viewer đã thả tim", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [{ kudo_id: "kudo-1" }, { kudo_id: "kudo-2" }],
        error: null,
      }),
    );

    await expect(
      getViewerHeartedKudoIds(client, "user-1", ["kudo-1", "kudo-2", "kudo-3"]),
    ).resolves.toEqual(new Set(["kudo-1", "kudo-2"]));
  });

  it("kudoIds rỗng → Set rỗng, không gọi client", async () => {
    const from = vi.fn();
    const client: KudoHeartsClient = { from };

    await expect(
      getViewerHeartedKudoIds(client, "user-1", []),
    ).resolves.toEqual(new Set());
    expect(from).not.toHaveBeenCalled();
  });

  it("userId rỗng → Set rỗng, không gọi client", async () => {
    const from = vi.fn();
    const client: KudoHeartsClient = { from };

    await expect(
      getViewerHeartedKudoIds(client, "", ["kudo-1"]),
    ).resolves.toEqual(new Set());
    expect(from).not.toHaveBeenCalled();
  });

  it("error khác null → fail-open Set rỗng", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: new Error("boom") }),
    );

    await expect(
      getViewerHeartedKudoIds(client, "user-1", ["kudo-1"]),
    ).resolves.toEqual(new Set());
  });

  it("data null → fail-open Set rỗng", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: null }),
    );

    await expect(
      getViewerHeartedKudoIds(client, "user-1", ["kudo-1"]),
    ).resolves.toEqual(new Set());
  });

  it("client ném exception → fail-open Set rỗng", async () => {
    const client: KudoHeartsClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(
      getViewerHeartedKudoIds(client, "user-1", ["kudo-1"]),
    ).resolves.toEqual(new Set());
  });

  it("truyền đúng bảng/cột/giá trị cho client được inject", async () => {
    const inFn = vi.fn(() =>
      Promise.resolve({ data: [{ kudo_id: "kudo-1" }], error: null }),
    );
    const eq = vi.fn(() => ({ in: inFn }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await getViewerHeartedKudoIds({ from }, "user-42", ["kudo-1", "kudo-2"]);

    expect(from).toHaveBeenCalledExactlyOnceWith("kudo_hearts");
    expect(select).toHaveBeenCalledExactlyOnceWith("kudo_id");
    expect(eq).toHaveBeenCalledExactlyOnceWith("user_id", "user-42");
    expect(inFn).toHaveBeenCalledExactlyOnceWith("kudo_id", [
      "kudo-1",
      "kudo-2",
    ]);
  });
});
