import { describe, expect, it } from "vitest";

import {
  selectCards,
  type CardRow,
  type KudosCardsQuery,
  type KudosClient,
} from "./kudos-cards-query";

/**
 * `selectCards` never constructs its own Supabase client — the caller
 * (`getKudosBoard`, `kudos.ts`) injects one, so every stub here is a plain
 * awaitable-and-chainable `KudosCardsQuery`, mirroring `kudos.test.ts`'s
 * own card-query stub. Focused on the exact `select()` column list
 * (migration `0016`'s `is_own` is now part of it — F008 BR-005) and the
 * filter/order/limit chain `selectCards` itself builds; `kudos.test.ts`
 * covers `getKudosBoard`'s composition of two `selectCards` reads.
 */
type StubResult = { data: CardRow[] | null; error: unknown };
type StubCall = { method: string; args: unknown[] };

function makeQuery(result: StubResult, calls: StubCall[]): KudosCardsQuery {
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

function stubClient(result: StubResult): {
  client: KudosClient;
  selectCalls: string[];
  calls: StubCall[];
} {
  const selectCalls: string[] = [];
  const calls: StubCall[] = [];
  const client: KudosClient = {
    from: () => ({
      select: (columns) => {
        selectCalls.push(columns);
        return makeQuery(result, calls);
      },
    }),
  };
  return { client, selectCalls, calls };
}

const CARD_COLUMNS =
  "id,content,hashtags,image_urls,heart_count,created_at,sender_id,sender_full_name,sender_avatar_url,sender_department,sender_kudos_received,receiver_id,receiver_full_name,receiver_avatar_url,receiver_department,receiver_kudos_received,is_own";

const ROW: CardRow = {
  id: "kudo-1",
  content: "Cảm ơn bạn",
  hashtags: ["#TeamWork"],
  image_urls: [],
  heart_count: 3,
  created_at: "2026-09-07T00:00:00Z",
  sender_id: "sender-1",
  sender_full_name: "Sender",
  sender_avatar_url: null,
  sender_department: "Dev",
  sender_kudos_received: 5,
  receiver_id: "receiver-1",
  receiver_full_name: "Receiver",
  receiver_avatar_url: null,
  receiver_department: "QA",
  receiver_kudos_received: 2,
  is_own: false,
};

describe("selectCards", () => {
  it("always selects the exact column list, is_own included (F008 BR-005/migration 0016)", async () => {
    const { client, selectCalls } = stubClient({ data: [ROW], error: null });

    await selectCards(client, {});

    expect(selectCalls).toEqual([CARD_COLUMNS]);
  });

  it("applies hashtag/department/cursor filters and the highlight sort+limit, in order", async () => {
    const { client, calls } = stubClient({ data: [ROW], error: null });

    await selectCards(client, {
      hashtag: "#TeamWork",
      department: "CEVC10",
      cursor: "2026-09-01T00:00:00Z",
      sort: "highlight",
      limit: 5,
    });

    expect(calls).toEqual([
      { method: "contains", args: ["hashtags", ["#TeamWork"]] },
      { method: "eq", args: ["receiver_department", "CEVC10"] },
      { method: "lt", args: ["created_at", "2026-09-01T00:00:00Z"] },
      { method: "order", args: ["heart_count", { ascending: false }] },
      { method: "order", args: ["created_at", { ascending: false }] },
      { method: "limit", args: [5] },
    ]);
  });

  it("feed sort orders by created_at only, descending", async () => {
    const { client, calls } = stubClient({ data: [ROW], error: null });

    await selectCards(client, { sort: "feed" });

    expect(calls).toEqual([
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it("no filters supplied → no chained calls, still returns rows", async () => {
    const { client, calls } = stubClient({ data: [ROW], error: null });

    const rows = await selectCards(client, {});

    expect(calls).toEqual([]);
    expect(rows).toEqual([ROW]);
  });

  it("Supabase error → throws (single fail-open branch lives in getKudosBoard)", async () => {
    const { client } = stubClient({ data: null, error: new Error("boom") });

    await expect(selectCards(client, {})).rejects.toThrow(
      "kudos_cards query failed",
    );
  });

  it("null data with no error → throws all the same", async () => {
    const { client } = stubClient({ data: null, error: null });

    await expect(selectCards(client, {})).rejects.toThrow(
      "kudos_cards query failed",
    );
  });
});
