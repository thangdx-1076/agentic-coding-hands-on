import { describe, expect, it } from "vitest";

import {
  getKudosBoard,
  type AggregatesQuery,
  type FilterOptionRow,
  type KudosAggregatesClient,
  type KudosBoard,
  type KudosCardsQuery,
  type KudosClient,
} from "./kudos";

/**
 * `getKudosBoard` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the minimal
 * `.from("kudos_cards").select(columns)` surface it actually calls, with
 * `contains`/`eq`/`lt`/`order`/`limit` recorded so the filter/order/limit
 * shape of each of the two `kudos_cards` reads (Highlight, Feed) can be
 * asserted directly. No network, no `@supabase/ssr` boundary to mock.
 *
 * The board-wide Spotlight total and the Hashtag/Phòng ban filter option
 * lists no longer come from a third `kudos_cards` read (BR-017/FR-217 —
 * that read was capped at PostgREST's `max_rows = 1000`) — they come from
 * a SEPARATE, optional `aggregatesClient` (`getKudosTotal`/
 * `getKudosFilterOptions`, `kudos-board-aggregates.ts`), stubbed below via
 * `stubAggregatesClient`.
 */
type Row = {
  id: string;
  content: string;
  hashtags: string[] | null;
  image_urls: string[] | null;
  heart_count: number;
  created_at: string;
  sender_id: string | null;
  sender_full_name: string | null;
  sender_avatar_url: string | null;
  sender_department: string | null;
  sender_kudos_received: number;
  receiver_id: string;
  receiver_full_name: string | null;
  receiver_avatar_url: string | null;
  receiver_department: string | null;
  receiver_kudos_received: number;
};

type StubResult = { data: Row[] | null; error: unknown };
type StubCall = { method: string; args: unknown[] };

function makeCardsQuery(
  result: StubResult,
  calls: StubCall[] = [],
): KudosCardsQuery {
  const record = (method: string, args: unknown[]): KudosCardsQuery => {
    calls.push({ method, args });
    return query;
  };

  const query: KudosCardsQuery = {
    contains: (column, value) => record("contains", [column, value]),
    eq: (column, value) => record("eq", [column, value]),
    lt: (column, value) => record("lt", [column, value]),
    order: (column, opts) => record("order", [column, opts]),
    limit: (count) => record("limit", [count]),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
}

/**
 * `getKudosBoard` issues exactly two `kudos_cards` reads through `client`,
 * always in this order: Highlight, then Feed (`Promise.all` builds the
 * array synchronously even though the reads resolve concurrently) — so a
 * 2-result tuple keyed by call order is enough to control each
 * independently without inspecting call arguments to tell them apart.
 */
function stubClient(results: [StubResult, StubResult]): {
  client: KudosClient;
  callsByQuery: StubCall[][];
} {
  const callsByQuery: StubCall[][] = [[], []];
  let callIndex = 0;

  const client: KudosClient = {
    from: () => ({
      select: () => {
        const index = callIndex++;
        return makeCardsQuery(
          results[index] ?? results[1],
          callsByQuery[index] ?? [],
        );
      },
    }),
  };

  return { client, callsByQuery };
}

type AggregatesStubResult = {
  count?: number | null;
  data?: FilterOptionRow[] | null;
  error?: unknown;
};

function makeAggregatesQuery(result: {
  count: number | null;
  data: FilterOptionRow[] | null;
  error: unknown;
}): AggregatesQuery {
  const query: AggregatesQuery = {
    order: () => query,
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return query;
}

/** Defaults to count `0` / empty option lists — every test that doesn't
 * care about the aggregate values can omit `opts` entirely. */
function stubAggregatesClient(
  opts: {
    count?: AggregatesStubResult;
    options?: AggregatesStubResult;
  } = {},
): KudosAggregatesClient {
  const countResult = {
    count: opts.count?.count ?? 0,
    data: null,
    error: opts.count?.error ?? null,
  };
  const optionsResult = {
    count: null,
    data: opts.options?.data ?? [],
    error: opts.options?.error ?? null,
  };
  return {
    from: (table) => ({
      select: () =>
        table === "kudos"
          ? makeAggregatesQuery(countResult)
          : makeAggregatesQuery(optionsResult),
    }),
  };
}

const OK = (data: Row[]): StubResult => ({ data, error: null });

const HIGHLIGHT_ROW: Row = {
  id: "kudo-1",
  content: "Cảm ơn bạn rất nhiều vì đã hỗ trợ dự án!",
  hashtags: ["#Dedicated", "#TeamPlayer"],
  image_urls: ["https://example.com/1.png"],
  heart_count: 12,
  created_at: "2025-10-30T10:00:00.000Z",
  sender_id: "user-a",
  sender_full_name: "Nguyễn Văn A",
  sender_avatar_url: "https://example.com/a.png",
  sender_department: "CEVC10",
  sender_kudos_received: 3,
  receiver_id: "user-b",
  receiver_full_name: "Trần Thị B",
  receiver_avatar_url: "https://example.com/b.png",
  receiver_department: "CEVC20",
  receiver_kudos_received: 21,
};

const EMPTY_BOARD: KudosBoard = {
  highlight: [],
  feed: { items: [], nextCursor: null },
  spotlightTotal: 0,
  spotlightNames: [],
  filters: { hashtags: [], departments: [] },
};

describe("getKudosBoard", () => {
  it("happy path → maps rows into camelCase cards + total/filters từ aggregatesClient", async () => {
    const { client } = stubClient([OK([HIGHLIGHT_ROW]), OK([HIGHLIGHT_ROW])]);
    const aggregatesClient = stubAggregatesClient({
      count: { count: 1 },
      options: {
        data: [
          { kind: "hashtag", value: "#Dedicated" },
          { kind: "hashtag", value: "#TeamPlayer" },
          { kind: "department", value: "CEVC20" },
        ],
      },
    });

    const board = await getKudosBoard(client, {}, aggregatesClient);

    expect(board.highlight).toEqual([
      {
        id: "kudo-1",
        content: "Cảm ơn bạn rất nhiều vì đã hỗ trợ dự án!",
        hashtags: ["#Dedicated", "#TeamPlayer"],
        imageUrls: ["https://example.com/1.png"],
        heartCount: 12,
        createdAt: "2025-10-30T10:00:00.000Z",
        sender: {
          id: "user-a",
          fullName: "Nguyễn Văn A",
          avatarUrl: "https://example.com/a.png",
          department: "CEVC10",
          kudosReceived: 3,
        },
        receiver: {
          id: "user-b",
          fullName: "Trần Thị B",
          avatarUrl: "https://example.com/b.png",
          department: "CEVC20",
          kudosReceived: 21,
        },
      },
    ]);
    expect(board.feed.items).toHaveLength(1);
    expect(board.spotlightTotal).toBe(1);
    expect(board.spotlightNames).toEqual(["Trần Thị B"]);
    expect(board.filters).toEqual({
      hashtags: ["#Dedicated", "#TeamPlayer"],
      departments: ["CEVC20"],
    });
  });

  it("options bỏ trống, aggregatesClient bỏ trống (mặc định) vẫn chạy được", async () => {
    const { client } = stubClient([OK([]), OK([])]);

    await expect(getKudosBoard(client)).resolves.toEqual(EMPTY_BOARD);
  });

  it("aggregatesClient bỏ trống (như loadMoreKudos gọi) → spotlightTotal 0, filters rỗng, feed vẫn đúng", async () => {
    const { client } = stubClient([OK([]), OK([HIGHLIGHT_ROW])]);

    const board = await getKudosBoard(client, {});

    expect(board.spotlightTotal).toBe(0);
    expect(board.filters).toEqual({ hashtags: [], departments: [] });
    expect(board.feed.items).toHaveLength(1);
  });

  it("spotlightTotal đọc đúng COUNT chính xác từ aggregatesClient, ĐỘC LẬP với số dòng kudos_cards mock trả về (BR-017/FR-217, không còn đứng ở 1000/1200)", async () => {
    const bigHighlightSet = Array.from({ length: 1200 }, (_, i) => ({
      ...HIGHLIGHT_ROW,
      id: `kudo-${i}`,
    }));
    const { client } = stubClient([OK(bigHighlightSet), OK([])]);
    const aggregatesClient = stubAggregatesClient({ count: { count: 4210 } });

    const board = await getKudosBoard(client, {}, aggregatesClient);

    expect(board.spotlightTotal).toBe(4210);
  });

  it("filters đến từ aggregatesClient, KHÔNG suy ra từ mảng card mock (chứng minh nguồn đã đổi)", async () => {
    const cardOnlyRow: Row = {
      ...HIGHLIGHT_ROW,
      hashtags: ["#OnlyOnThisCard"],
      receiver_department: "CardOnlyDept",
    };
    const { client } = stubClient([OK([cardOnlyRow]), OK([])]);
    const aggregatesClient = stubAggregatesClient({
      options: {
        data: [
          { kind: "hashtag", value: "#Dedicated" },
          { kind: "department", value: "CEVC10" },
        ],
      },
    });

    const board = await getKudosBoard(client, {}, aggregatesClient);

    expect(board.filters).toEqual({
      hashtags: ["#Dedicated"],
      departments: ["CEVC10"],
    });
    expect(board.filters.hashtags).not.toContain("#OnlyOnThisCard");
    expect(board.filters.departments).not.toContain("CardOnlyDept");
  });

  it("dedupe tên trùng lặp trong tập ĐANG HIỂN THỊ (Highlight + Feed), không phải aggregate board-wide", async () => {
    const feedRow: Row = { ...HIGHLIGHT_ROW, id: "kudo-2" };
    const { client } = stubClient([OK([HIGHLIGHT_ROW]), OK([feedRow])]);

    const board = await getKudosBoard(client, {});

    expect(board.spotlightNames).toEqual(["Trần Thị B"]);
  });

  it("receiver_full_name null trong Highlight/Feed bị lọc khỏi spotlightNames", async () => {
    const row: Row = { ...HIGHLIGHT_ROW, receiver_full_name: null };
    const { client } = stubClient([OK([row]), OK([])]);

    const board = await getKudosBoard(client, {});

    expect(board.spotlightNames).toEqual([]);
  });

  it("sender_id null (kudo ẩn danh) → sender.id null, tên/avatar/phòng ban/đếm theo view (anonymous_name/NULL/0), không throw", async () => {
    const anonymousRow: Row = {
      ...HIGHLIGHT_ROW,
      sender_id: null,
      sender_full_name: "Một Sunner",
      sender_avatar_url: null,
      sender_department: null,
      sender_kudos_received: 0,
    };
    const { client } = stubClient([OK([anonymousRow]), OK([])]);

    const board = await getKudosBoard(client, {});

    expect(board.highlight[0].sender).toEqual({
      id: null,
      fullName: "Một Sunner",
      avatarUrl: null,
      department: null,
      kudosReceived: 0,
    });
    // Receiver stays a real identity — the view only masks the sender side.
    expect(board.highlight[0].receiver.id).toBe("user-b");
  });

  it("hashtags/image_urls không phải mảng → coerce về [], không throw", async () => {
    const malformed = {
      ...HIGHLIGHT_ROW,
      hashtags: null,
      image_urls: null,
    } as unknown as Row;
    const { client } = stubClient([OK([malformed]), OK([])]);

    const board = await getKudosBoard(client, {});

    expect(board.highlight[0].hashtags).toEqual([]);
    expect(board.highlight[0].imageUrls).toEqual([]);
  });

  it("error khác null trên 1 trong 2 lượt đọc kudos_cards → toàn bộ board rỗng", async () => {
    const { client } = stubClient([
      { data: null, error: new Error("boom") },
      OK([HIGHLIGHT_ROW]),
    ]);

    await expect(getKudosBoard(client, {})).resolves.toEqual(EMPTY_BOARD);
  });

  it("data null (không có error) trên 1 trong 2 lượt đọc kudos_cards → board rỗng", async () => {
    const { client } = stubClient([
      OK([HIGHLIGHT_ROW]),
      { data: null, error: null },
    ]);

    await expect(getKudosBoard(client, {})).resolves.toEqual(EMPTY_BOARD);
  });

  it("aggregatesClient ném lỗi (count query lỗi) → toàn bộ board rỗng, không throw ra ngoài", async () => {
    const { client } = stubClient([OK([HIGHLIGHT_ROW]), OK([HIGHLIGHT_ROW])]);
    const aggregatesClient = stubAggregatesClient({
      count: { count: null, error: new Error("boom") },
    });

    await expect(getKudosBoard(client, {}, aggregatesClient)).resolves.toEqual(
      EMPTY_BOARD,
    );
  });

  it("client ném exception (from() lỗi) → board rỗng, không ném ra ngoài", async () => {
    const client: KudosClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(getKudosBoard(client, {})).resolves.toEqual(EMPTY_BOARD);
  });

  it("lọc hashtag → contains('hashtags', [tag]) áp cho Highlight và Feed", async () => {
    const { client, callsByQuery } = stubClient([
      OK([HIGHLIGHT_ROW]),
      OK([HIGHLIGHT_ROW]),
    ]);

    await getKudosBoard(client, { hashtag: "#Dedicated" });

    expect(callsByQuery[0]).toContainEqual({
      method: "contains",
      args: ["hashtags", ["#Dedicated"]],
    });
    expect(callsByQuery[1]).toContainEqual({
      method: "contains",
      args: ["hashtags", ["#Dedicated"]],
    });
  });

  it("lọc phòng ban → eq('receiver_department', dept) áp cho Highlight và Feed", async () => {
    const { client, callsByQuery } = stubClient([
      OK([HIGHLIGHT_ROW]),
      OK([HIGHLIGHT_ROW]),
    ]);

    await getKudosBoard(client, { department: "CEVC20" });

    expect(callsByQuery[0]).toContainEqual({
      method: "eq",
      args: ["receiver_department", "CEVC20"],
    });
    expect(callsByQuery[1]).toContainEqual({
      method: "eq",
      args: ["receiver_department", "CEVC20"],
    });
  });

  it("cursor → lt('created_at', cursor) chỉ áp cho Feed, KHÔNG áp cho Highlight", async () => {
    const { client, callsByQuery } = stubClient([
      OK([HIGHLIGHT_ROW]),
      OK([HIGHLIGHT_ROW]),
    ]);

    await getKudosBoard(client, { cursor: "2025-10-30T09:00:00.000Z" });

    expect(callsByQuery[0]).not.toContainEqual(
      expect.objectContaining({ method: "lt" }),
    );
    expect(callsByQuery[1]).toContainEqual({
      method: "lt",
      args: ["created_at", "2025-10-30T09:00:00.000Z"],
    });
  });

  it("Highlight sắp heart_count desc rồi created_at desc, giới hạn 5", async () => {
    const { client, callsByQuery } = stubClient([
      OK([HIGHLIGHT_ROW]),
      OK([HIGHLIGHT_ROW]),
    ]);

    await getKudosBoard(client, {});

    expect(callsByQuery[0]).toEqual([
      { method: "order", args: ["heart_count", { ascending: false }] },
      { method: "order", args: ["created_at", { ascending: false }] },
      { method: "limit", args: [5] },
    ]);
  });

  it("Feed sắp created_at desc, giới hạn 10", async () => {
    const { client, callsByQuery } = stubClient([
      OK([HIGHLIGHT_ROW]),
      OK([HIGHLIGHT_ROW]),
    ]);

    await getKudosBoard(client, {});

    expect(callsByQuery[1]).toEqual([
      { method: "order", args: ["created_at", { ascending: false }] },
      { method: "limit", args: [10] },
    ]);
  });

  it("Feed trả đủ 10 dòng (đầy trang) → nextCursor là created_at dòng cuối", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      ...HIGHLIGHT_ROW,
      id: `kudo-${i}`,
      created_at: `2025-10-2${i}T00:00:00.000Z`,
    }));
    const { client } = stubClient([OK([]), OK(rows)]);

    const board = await getKudosBoard(client, {});

    expect(board.feed.nextCursor).toBe("2025-10-29T00:00:00.000Z");
  });

  it("Feed trả ít hơn 10 dòng (hết trang) → nextCursor null", async () => {
    const { client } = stubClient([OK([]), OK([HIGHLIGHT_ROW])]);

    const board = await getKudosBoard(client, {});

    expect(board.feed.nextCursor).toBeNull();
  });

  it("Feed rỗng → nextCursor null, không đọc created_at của phần tử không tồn tại", async () => {
    const { client } = stubClient([OK([]), OK([])]);

    const board = await getKudosBoard(client, {});

    expect(board.feed.items).toEqual([]);
    expect(board.feed.nextCursor).toBeNull();
  });
});
