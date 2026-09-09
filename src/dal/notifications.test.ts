import { describe, expect, it } from "vitest";

import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  type NotificationsClient,
  type NotificationsSelectQuery,
  type NotificationsUpdateQuery,
} from "./notifications";

import { encodeCursor } from "@/domain/notifications/cursor";

/**
 * `getUnreadCount`/`listNotifications`/`markRead`/`markAllRead` never
 * construct their own Supabase client — every branch below is a plain
 * stub of the exact chain each function issues, recording the calls so
 * assertions can check the filters applied (mirrors `secret-box.test.ts`'s
 * "caller injects, test stubs" shape).
 */

type SelectResult = {
  data: unknown[] | null;
  count: number | null;
  error: unknown;
};

type SelectCalls = {
  eq: [string, string | boolean][];
  or: string[];
  order: [string, { ascending: boolean }][];
  limit: number[];
};

function stubSelectClient(result: Partial<SelectResult>): {
  client: NotificationsClient;
  calls: SelectCalls;
} {
  const calls: SelectCalls = { eq: [], or: [], order: [], limit: [] };
  const finalResult: SelectResult = {
    data: result.data ?? null,
    count: result.count ?? null,
    error: result.error ?? null,
  };

  function makeQuery(): NotificationsSelectQuery {
    const query: NotificationsSelectQuery = {
      eq: (column, value) => {
        calls.eq.push([column, value]);
        return query;
      },
      or: (filter) => {
        calls.or.push(filter);
        return query;
      },
      order: (column, opts) => {
        calls.order.push([column, opts]);
        return query;
      },
      limit: (count) => {
        calls.limit.push(count);
        return query;
      },
      then: (onFulfilled, onRejected) =>
        Promise.resolve(finalResult).then(onFulfilled, onRejected),
    };
    return query;
  }

  const client: NotificationsClient = {
    from: () => ({
      select: () => makeQuery(),
      update: () => {
        throw new Error("update should not be called by this test");
      },
    }),
  };

  return { client, calls };
}

function stubThrowingSelectClient(): NotificationsClient {
  return {
    from: () => ({
      select: () => {
        throw new Error("boom");
      },
      update: () => {
        throw new Error("update should not be called by this test");
      },
    }),
  };
}

type UpdateResult = { data: { id: string }[] | null; error: unknown };
type UpdateCalls = { eq: [string, string | boolean][]; select: string[] };

function stubUpdateClient(result: Partial<UpdateResult>): {
  client: NotificationsClient;
  calls: UpdateCalls;
} {
  const calls: UpdateCalls = { eq: [], select: [] };
  const finalResult: UpdateResult = {
    data: result.data ?? null,
    error: result.error ?? null,
  };

  function makeQuery(): NotificationsUpdateQuery {
    const query: NotificationsUpdateQuery = {
      eq: (column, value) => {
        calls.eq.push([column, value]);
        return query;
      },
      select: (columns) => {
        calls.select.push(columns);
        return Promise.resolve(finalResult);
      },
    };
    return query;
  }

  const client: NotificationsClient = {
    from: () => ({
      select: () => {
        throw new Error("select should not be called by this test");
      },
      update: () => makeQuery(),
    }),
  };

  return { client, calls };
}

function stubThrowingUpdateClient(): NotificationsClient {
  return {
    from: () => ({
      select: () => {
        throw new Error("select should not be called by this test");
      },
      update: () => {
        throw new Error("boom");
      },
    }),
  };
}

describe("getUnreadCount", () => {
  it("trả count thật khi thành công, lọc đúng user_id + is_read=false", async () => {
    const { client, calls } = stubSelectClient({ count: 5 });

    await expect(getUnreadCount(client, "user-1")).resolves.toBe(5);
    expect(calls.eq).toEqual([
      ["user_id", "user-1"],
      ["is_read", false],
    ]);
  });

  it("fail-open về 0 khi có error", async () => {
    const { client } = stubSelectClient({
      count: null,
      error: { message: "x" },
    });
    await expect(getUnreadCount(client, "user-1")).resolves.toBe(0);
  });

  it("fail-open về 0 khi count không phải number", async () => {
    const { client } = stubSelectClient({ count: null });
    await expect(getUnreadCount(client, "user-1")).resolves.toBe(0);
  });

  it("fail-open về 0 khi client ném exception", async () => {
    const client = stubThrowingSelectClient();
    await expect(getUnreadCount(client, "user-1")).resolves.toBe(0);
  });
});

const VALID_ROW = {
  id: "n1",
  type: "kudos_received",
  payload: { kudosId: "k1", senderName: "Anna" },
  is_read: false,
  created_at: "2026-09-09T10:00:00.000Z",
};

function makeRow(overrides: Partial<typeof VALID_ROW> = {}) {
  return { ...VALID_ROW, ...overrides };
}

describe("listNotifications", () => {
  it("không cursor: đủ trang (10) → nextCursor mã hoá từ dòng cuối", async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({
        id: `n${i}`,
        created_at: `2026-09-0${(i % 9) + 1}T00:00:00.000Z`,
      }),
    );
    const { client, calls } = stubSelectClient({ data: rows });

    const result = await listNotifications(client, "user-1");

    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).not.toBeNull();
    expect(calls.or).toEqual([]);
    expect(calls.limit).toEqual([10]);
  });

  it("ít hơn 1 trang → nextCursor null", async () => {
    const rows = [makeRow()];
    const { client } = stubSelectClient({ data: rows });

    const result = await listNotifications(client, "user-1");

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("có cursor hợp lệ → build filter .or() theo keyset (created_at, id)", async () => {
    const cursor = encodeCursor({
      createdAt: "2026-09-01T00:00:00.000Z",
      id: "n0",
    });
    const { client, calls } = stubSelectClient({ data: [] });

    await listNotifications(client, "user-1", cursor);

    expect(calls.or).toEqual([
      "created_at.lt.2026-09-01T00:00:00.000Z,and(created_at.eq.2026-09-01T00:00:00.000Z,id.lt.n0)",
    ]);
  });

  it("cursor rác → bỏ qua, không .or(), coi như trang đầu", async () => {
    const { client, calls } = stubSelectClient({ data: [] });

    await listNotifications(client, "user-1", "!!!garbage!!!");

    expect(calls.or).toEqual([]);
  });

  it("Supabase trả error → throw", async () => {
    const { client } = stubSelectClient({
      data: null,
      error: { message: "x" },
    });
    await expect(listNotifications(client, "user-1")).rejects.toThrow();
  });

  it("data null (không kèm error) → throw", async () => {
    const { client } = stubSelectClient({ data: null });
    await expect(listNotifications(client, "user-1")).rejects.toThrow();
  });

  it("dòng không phải object → throw", async () => {
    const { client } = stubSelectClient({ data: ["not-an-object"] });
    await expect(listNotifications(client, "user-1")).rejects.toThrow();
  });

  it("dòng thiếu id string → throw", async () => {
    const { client } = stubSelectClient({
      data: [makeRow({ id: 123 as unknown as string })],
    });
    await expect(listNotifications(client, "user-1")).rejects.toThrow();
  });

  it("dòng thiếu created_at string → throw", async () => {
    const { client } = stubSelectClient({
      data: [makeRow({ created_at: null as unknown as string })],
    });
    await expect(listNotifications(client, "user-1")).rejects.toThrow();
  });

  it("dòng is_read không phải boolean → throw", async () => {
    const { client } = stubSelectClient({
      data: [makeRow({ is_read: "false" as unknown as boolean })],
    });
    await expect(listNotifications(client, "user-1")).rejects.toThrow();
  });

  it("dòng type không thuộc 4 giá trị hợp lệ → throw", async () => {
    const { client } = stubSelectClient({ data: [makeRow({ type: "bogus" })] });
    await expect(listNotifications(client, "user-1")).rejects.toThrow();
  });
});

describe("markRead", () => {
  it("cập nhật thành công (1 dòng bị ảnh hưởng) → { ok: true }", async () => {
    const { client, calls } = stubUpdateClient({ data: [{ id: "n1" }] });

    await expect(markRead(client, "user-1", "n1")).resolves.toEqual({
      ok: true,
    });
    expect(calls.eq).toEqual([
      ["id", "n1"],
      ["user_id", "user-1"],
    ]);
  });

  it("id không tồn tại và id của người khác cho CÙNG một kết quả { ok:false }, không có 'reason' khác biệt", async () => {
    const notFound = stubUpdateClient({ data: [] });
    const belongsToSomeoneElse = stubUpdateClient({ data: [] });

    const resultNotFound = await markRead(
      notFound.client,
      "user-1",
      "missing-id",
    );
    const resultOtherUser = await markRead(
      belongsToSomeoneElse.client,
      "user-1",
      "someone-elses-id",
    );

    expect(resultNotFound).toStrictEqual({ ok: false });
    expect(resultOtherUser).toStrictEqual({ ok: false });
    expect(resultNotFound).toStrictEqual(resultOtherUser);
  });

  it("Supabase trả error → { ok: false } (fail closed)", async () => {
    const { client } = stubUpdateClient({
      data: null,
      error: { message: "x" },
    });
    await expect(markRead(client, "user-1", "n1")).resolves.toEqual({
      ok: false,
    });
  });

  it("data null (không kèm error) → { ok: false }", async () => {
    const { client } = stubUpdateClient({ data: null });
    await expect(markRead(client, "user-1", "n1")).resolves.toEqual({
      ok: false,
    });
  });

  it("client ném exception → { ok: false }", async () => {
    const client = stubThrowingUpdateClient();
    await expect(markRead(client, "user-1", "n1")).resolves.toEqual({
      ok: false,
    });
  });
});

describe("markAllRead", () => {
  it("có N dòng chưa đọc → { updated: N }", async () => {
    const { client, calls } = stubUpdateClient({
      data: [{ id: "n1" }, { id: "n2" }],
    });

    await expect(markAllRead(client, "user-1")).resolves.toEqual({
      updated: 2,
    });
    expect(calls.eq).toEqual([
      ["user_id", "user-1"],
      ["is_read", false],
    ]);
  });

  it("0 dòng chưa đọc → { updated: 0 }, không phải lỗi", async () => {
    const { client } = stubUpdateClient({ data: [] });
    await expect(markAllRead(client, "user-1")).resolves.toEqual({
      updated: 0,
    });
  });

  it("Supabase trả error → { updated: 0 }", async () => {
    const { client } = stubUpdateClient({
      data: null,
      error: { message: "x" },
    });
    await expect(markAllRead(client, "user-1")).resolves.toEqual({
      updated: 0,
    });
  });

  it("client ném exception → { updated: 0 }", async () => {
    const client = stubThrowingUpdateClient();
    await expect(markAllRead(client, "user-1")).resolves.toEqual({
      updated: 0,
    });
  });
});
