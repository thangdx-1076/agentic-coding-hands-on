import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchUnreadCount,
  listNotifications,
  subscribeToNotifications,
} from "./notifications";

import { createClient } from "@/lib/supabase/client";

/**
 * `@/lib/supabase/client` is mocked entirely — same convention as
 * `auth.test.ts`. Each function under test gets its own minimal fake
 * builder shaped only like the chain it actually calls, so no test drags
 * in the full Supabase SDK surface.
 */
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

type FakeResult = {
  data?: unknown[] | null;
  error?: unknown;
  count?: number | null;
};

/**
 * A self-referencing chainable fake: every chain method returns the same
 * object, and it resolves like a real PostgREST builder (`await` calls
 * `.then()`). `as unknown as` (never `any`) crosses into the real return
 * type, mirroring `auth.test.ts`'s `stubOAuth`.
 */
function makeSelectBuilder(result: FakeResult) {
  const builder = {
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (
      onFulfilled?: (value: FakeResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

function stubList(result: FakeResult) {
  const select = vi.fn(() => makeSelectBuilder(result));
  vi.mocked(createClient).mockReturnValue({
    from: vi.fn(() => ({ select })),
  } as unknown as ReturnType<typeof createClient>);
  return select;
}

function stubCount(result: FakeResult) {
  const select = vi.fn(() => makeSelectBuilder(result));
  vi.mocked(createClient).mockReturnValue({
    from: vi.fn(() => ({ select })),
  } as unknown as ReturnType<typeof createClient>);
  return select;
}

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "n-1",
    type: "kudos_received",
    payload: { kudosId: "k-1", senderName: "An" },
    is_read: false,
    created_at: "2026-09-09T00:00:00Z",
    ...overrides,
  };
}

describe("listNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("11 dòng trả về → 10 item + nextCursor từ item thứ 10", async () => {
    const rows = Array.from({ length: 11 }, (_, i) =>
      row({ id: `n-${i}`, created_at: `2026-09-09T00:00:0${i}Z` }),
    );
    stubList({ data: rows, error: null });

    const result = await listNotifications();

    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.id)).toEqual(
      rows.slice(0, 10).map((r) => r.id),
    );
    expect(result.nextCursor).not.toBeNull();
  });

  it("≤10 dòng trả về → hết trang, nextCursor null", async () => {
    const rows = [row({ id: "n-1" }), row({ id: "n-2" })];
    stubList({ data: rows, error: null });

    const result = await listNotifications();

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it("0 dòng → items rỗng, nextCursor null", async () => {
    stubList({ data: [], error: null });

    const result = await listNotifications();

    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("cursor hợp lệ → gọi .or() với filter keyset đúng", async () => {
    const select = stubList({ data: [], error: null });
    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: "2026-09-01T00:00:00Z",
        id: "99999999-8888-4777-8666-555555555555",
      }),
    ).toString("base64url");

    await listNotifications(cursor);

    const builder = select.mock.results[0]?.value as {
      or: ReturnType<typeof vi.fn>;
    };
    expect(builder.or).toHaveBeenCalledExactlyOnceWith(
      "created_at.lt.2026-09-01T00:00:00Z,and(created_at.eq.2026-09-01T00:00:00Z,id.lt.99999999-8888-4777-8666-555555555555)",
    );
  });

  it("cursor rác → không gọi .or(), coi như trang đầu", async () => {
    const select = stubList({ data: [], error: null });

    await listNotifications("not-a-real-cursor");

    const builder = select.mock.results[0]?.value as {
      or: ReturnType<typeof vi.fn>;
    };
    expect(builder.or).not.toHaveBeenCalled();
  });

  it("Supabase trả error → throw", async () => {
    stubList({ data: null, error: new Error("boom") });

    await expect(listNotifications()).rejects.toThrow(
      "notifications query failed",
    );
  });

  it("data null → throw", async () => {
    stubList({ data: null, error: null });

    await expect(listNotifications()).rejects.toThrow(
      "notifications query failed",
    );
  });

  it("dòng méo (thiếu type hợp lệ) → throw thay vì âm thầm bỏ qua", async () => {
    stubList({ data: [row({ type: "not_a_real_type" })], error: null });

    await expect(listNotifications()).rejects.toThrow(
      "notifications row: unrecognized shape",
    );
  });

  it("dòng không phải object (vd. chuỗi thô) → throw", async () => {
    stubList({ data: ["not-a-row"], error: null });

    await expect(listNotifications()).rejects.toThrow(
      "notifications row: not an object",
    );
  });
});

describe("fetchUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trả đúng count khi Supabase thành công", async () => {
    stubCount({ count: 3, error: null });

    await expect(fetchUnreadCount()).resolves.toBe(3);
  });

  it("Supabase trả error → 0 (fail open)", async () => {
    stubCount({ count: null, error: new Error("boom") });

    await expect(fetchUnreadCount()).resolves.toBe(0);
  });

  it("count không phải số → 0", async () => {
    stubCount({ count: null, error: null });

    await expect(fetchUnreadCount()).resolves.toBe(0);
  });

  it("createClient ném lỗi → 0", async () => {
    vi.mocked(createClient).mockImplementationOnce(() => {
      throw new Error("client factory failed");
    });

    await expect(fetchUnreadCount()).resolves.toBe(0);
  });
});

describe("subscribeToNotifications", () => {
  function stubRealtime() {
    type InsertCallback = (payload: unknown) => void;
    let capturedCallback: InsertCallback | undefined;

    const channelObj = {
      on: vi.fn((_type: string, _filter: unknown, callback: InsertCallback) => {
        capturedCallback = callback;
        return channelObj;
      }),
      subscribe: vi.fn(() => channelObj),
    };
    const channel = vi.fn(() => channelObj);
    const removeChannel = vi.fn().mockResolvedValue({ status: "ok" });

    vi.mocked(createClient).mockReturnValue({
      channel,
      removeChannel,
    } as unknown as ReturnType<typeof createClient>);

    return {
      channel,
      channelObj,
      removeChannel,
      fireInsert: () => capturedCallback?.({}),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mở channel đúng tên, lọc theo user_id, bắt INSERT", () => {
    const { channel, channelObj } = stubRealtime();

    subscribeToNotifications("user-1", vi.fn());

    expect(channel).toHaveBeenCalledExactlyOnceWith("notifications:user-1");
    expect(channelObj.on).toHaveBeenCalledExactlyOnceWith(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: "user_id=eq.user-1",
      },
      expect.any(Function),
    );
    expect(channelObj.subscribe).toHaveBeenCalledOnce();
  });

  it("INSERT khớp filter → gọi onInsert", () => {
    const { fireInsert } = stubRealtime();
    const onInsert = vi.fn();

    subscribeToNotifications("user-1", onInsert);
    fireInsert();

    expect(onInsert).toHaveBeenCalledOnce();
  });

  it("hàm huỷ trả về gọi supabase.removeChannel đúng channel", () => {
    const { channelObj, removeChannel } = stubRealtime();

    const unsubscribe = subscribeToNotifications("user-1", vi.fn());
    unsubscribe();

    expect(removeChannel).toHaveBeenCalledExactlyOnceWith(channelObj);
  });
});
