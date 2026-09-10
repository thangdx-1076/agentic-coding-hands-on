import { describe, expect, it } from "vitest";

import {
  getKudosFilterOptions,
  getKudosTotal,
  type AggregatesQuery,
  type FilterOptionRow,
  type KudosAggregatesClient,
} from "./kudos-board-aggregates";

/**
 * `getKudosTotal`/`getKudosFilterOptions` never construct their own
 * Supabase client — the caller injects one, so every stub here is a plain
 * awaitable-and-chainable `AggregatesQuery`, mirroring `kudos.test.ts`'s
 * own card-query stub.
 */
type StubResult = {
  count?: number | null;
  data?: FilterOptionRow[] | null;
  error?: unknown;
};
type StubCall = { method: string; args: unknown[] };

function makeQuery(result: StubResult, calls: StubCall[]): AggregatesQuery {
  const query: AggregatesQuery = {
    order: (column) => {
      calls.push({ method: "order", args: [column] });
      return query;
    },
    then: (onFulfilled, onRejected) =>
      Promise.resolve({
        count: result.count ?? null,
        data: result.data ?? null,
        error: result.error ?? null,
      }).then(onFulfilled, onRejected),
  };
  return query;
}

function stubClient(result: StubResult): {
  client: KudosAggregatesClient;
  calls: StubCall[];
} {
  const calls: StubCall[] = [];
  const client: KudosAggregatesClient = {
    from: (table) => ({
      select: (columns, opts) => {
        calls.push({ method: "select", args: [table, columns, opts] });
        return makeQuery(result, calls);
      },
    }),
  };
  return { client, calls };
}

const HASHTAG_ROW = (value: string): FilterOptionRow => ({
  kind: "hashtag",
  value,
});
const DEPARTMENT_ROW = (value: string): FilterOptionRow => ({
  kind: "department",
  value,
});

describe("getKudosTotal", () => {
  it("gọi select với { count: 'exact', head: true } trên bảng kudos, trả count chính xác", async () => {
    const { client, calls } = stubClient({ count: 4210 });

    const total = await getKudosTotal(client);

    expect(total).toBe(4210);
    expect(calls[0]).toEqual({
      method: "select",
      args: ["kudos", "*", { count: "exact", head: true }],
    });
  });

  it("count null (không có error) → throw — getKudosBoard là nơi fail-open, không phải ở đây", async () => {
    const { client } = stubClient({ count: null });

    await expect(getKudosTotal(client)).rejects.toThrow();
  });

  it("error khác null → throw", async () => {
    const { client } = stubClient({ count: null, error: new Error("boom") });

    await expect(getKudosTotal(client)).rejects.toThrow();
  });
});

describe("getKudosFilterOptions", () => {
  it("đọc kudos_filter_options, order theo value, tách hashtags/departments theo kind", async () => {
    const { client, calls } = stubClient({
      data: [
        HASHTAG_ROW("#Dedicated"),
        HASHTAG_ROW("#TeamPlayer"),
        DEPARTMENT_ROW("CEVC10"),
        DEPARTMENT_ROW("CEVC20"),
      ],
    });

    const options = await getKudosFilterOptions(client);

    expect(options).toEqual({
      hashtags: ["#Dedicated", "#TeamPlayer"],
      departments: ["CEVC10", "CEVC20"],
    });
    expect(calls[0]).toEqual({
      method: "select",
      args: ["kudos_filter_options", "kind,value", undefined],
    });
    expect(calls[1]).toEqual({ method: "order", args: ["value"] });
  });

  it("data rỗng → 2 danh sách rỗng, không throw", async () => {
    const { client } = stubClient({ data: [] });

    await expect(getKudosFilterOptions(client)).resolves.toEqual({
      hashtags: [],
      departments: [],
    });
  });

  it("data null (không có error) → throw", async () => {
    const { client } = stubClient({ data: null });

    await expect(getKudosFilterOptions(client)).rejects.toThrow();
  });

  it("error khác null → throw", async () => {
    const { client } = stubClient({ data: null, error: new Error("boom") });

    await expect(getKudosFilterOptions(client)).rejects.toThrow();
  });
});
