import { describe, expect, it, vi } from "vitest";

import { getAwards, type Award, type AwardsClient } from "./awards";

/**
 * `getAwards` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the minimal
 * `.from().select().eq().order()` surface it actually calls. No network,
 * no `@supabase/ssr` boundary to mock.
 */
type AwardRow = {
  slug: string;
  title: string;
  description: string;
  quantity_value: string;
  quantity_unit: string;
  prize_values: Array<{ amount: string; note: string }>;
};

function stubClient(
  order: () => Promise<{
    data: AwardRow[] | null;
    error: unknown;
  }>,
): AwardsClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ order }),
      }),
    }),
  };
}

const HAPPY_ROWS = [
  {
    slug: "top-talent",
    title: "Top Talent",
    description: "desc-1",
    quantity_value: "10",
    quantity_unit: "Cá nhân",
    prize_values: [{ amount: "7.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "top-project",
    title: "Top Project",
    description: "desc-2",
    quantity_value: "02",
    quantity_unit: "Tập thể",
    prize_values: [{ amount: "15.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "top-project-leader",
    title: "Top Project Leader",
    description: "desc-3",
    quantity_value: "03",
    quantity_unit: "Cá nhân",
    prize_values: [{ amount: "7.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "best-manager",
    title: "Best Manager",
    description: "desc-4",
    quantity_value: "01",
    quantity_unit: "Cá nhân",
    prize_values: [{ amount: "10.000.000 VNĐ", note: "" }],
  },
  {
    slug: "signature-2025-creator",
    title: "Signature 2025 - Creator",
    description: "desc-5",
    quantity_value: "01",
    quantity_unit: "Cá nhân hoặc tập thể",
    prize_values: [
      { amount: "5.000.000 VNĐ", note: "cho giải cá nhân" },
      { amount: "8.000.000 VNĐ", note: "cho giải tập thể" },
    ],
  },
  {
    slug: "mvp",
    title: "MVP (Most Valuable Person)",
    description: "desc-6",
    quantity_value: "01",
    quantity_unit: "Cá nhân",
    prize_values: [{ amount: "15.000.000 VNĐ", note: "" }],
  },
];

describe("getAwards", () => {
  it("happy path → maps 6 rows already sorted by sort_order into camelCase Award[]", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: HAPPY_ROWS, error: null }),
    );

    const result = await getAwards(client, "vi");

    const expected: Award[] = HAPPY_ROWS.map((row) => ({
      slug: row.slug,
      title: row.title,
      description: row.description,
      quantityValue: row.quantity_value,
      quantityUnit: row.quantity_unit,
      prizeValues: row.prize_values,
    }));
    expect(result).toEqual(expected);
    expect(result.map((a) => a.slug)).toEqual([
      "top-talent",
      "top-project",
      "top-project-leader",
      "best-manager",
      "signature-2025-creator",
      "mvp",
    ]);
  });

  it("error khác null → fail-open []", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: new Error("boom") }),
    );

    await expect(getAwards(client, "vi")).resolves.toEqual([]);
  });

  it("data null (không có row) → fail-open []", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: null }),
    );

    await expect(getAwards(client, "vi")).resolves.toEqual([]);
  });

  it("client ném exception → fail-open []", async () => {
    const client: AwardsClient = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(getAwards(client, "vi")).resolves.toEqual([]);
  });

  it("prize_values không phải mảng → coerce về [], không để component nổ", async () => {
    // jsonb chỉ bảo đảm JSON hợp lệ, không bảo đảm là mảng. Một giá trị
    // không phải mảng lọt xuống `prizeValues.map(...)` trong Server
    // Component là 500 — đúng thứ fail-open sinh ra để chặn.
    // Cast is the point, not a shortcut: the row type promises an array,
    // and this test exists precisely because jsonb does not keep that
    // promise. Only a cast can reproduce the row Postgres can really hand us.
    const malformedRow = {
      slug: "mvp",
      title: "MVP",
      description: "…",
      quantity_value: "01",
      quantity_unit: "Cá nhân",
      prize_values: { amount: "15.000.000 VNĐ" },
    } as unknown as AwardRow;

    const client = stubClient(() =>
      Promise.resolve({ data: [malformedRow], error: null }),
    );

    const result = await getAwards(client, "vi");

    expect(result).toHaveLength(1);
    expect(result[0].prizeValues).toEqual([]);
    expect(() => result[0].prizeValues.map((p) => p.amount)).not.toThrow();
  });

  it("locale không có row → fallback về 'vi' thay vì trả trang rỗng", async () => {
    // MoMorph chỉ có tiếng Việt nên bảng chỉ seed 'vi'. Không có fallback thì
    // đổi site sang English là /awards trắng trơn, trong khi / vẫn liệt kê đủ
    // 6 giải từ messages/en.json.
    const rows = [
      {
        slug: "mvp",
        title: "MVP",
        description: "…",
        quantity_value: "01",
        quantity_unit: "Cá nhân",
        prize_values: [{ amount: "15.000.000 VNĐ", note: "" }],
      },
    ];
    const locales: string[] = [];
    const client: AwardsClient = {
      from: () => ({
        select: () => ({
          eq: (_column: "locale", value: string) => {
            locales.push(value);
            return {
              order: () =>
                Promise.resolve({
                  data: value === "vi" ? rows : [],
                  error: null,
                }),
            };
          },
        }),
      }),
    };

    const result = await getAwards(client, "en");

    expect(locales).toEqual(["en", "vi"]);
    expect(result.map((a) => a.slug)).toEqual(["mvp"]);
  });

  it("'vi' rỗng → KHÔNG truy vấn lại lần hai", async () => {
    const locales: string[] = [];
    const client: AwardsClient = {
      from: () => ({
        select: () => ({
          eq: (_column: "locale", value: string) => {
            locales.push(value);
            return {
              order: () => Promise.resolve({ data: [], error: null }),
            };
          },
        }),
      }),
    };

    await expect(getAwards(client, "vi")).resolves.toEqual([]);
    expect(locales).toEqual(["vi"]);
  });

  it("truyền đúng bảng/cột/locale/order cho client được inject", async () => {
    const order = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    // 'vi' (DEFAULT_LOCALE) on purpose: this asserts the query SHAPE, and an
    // empty result for any other locale triggers the fallback re-query, which
    // would make every "exactly once" assertion below count two calls.
    await getAwards({ from }, "vi");

    expect(from).toHaveBeenCalledExactlyOnceWith("awards");
    expect(select).toHaveBeenCalledExactlyOnceWith(
      "slug,title,description,quantity_value,quantity_unit,prize_values",
    );
    expect(eq).toHaveBeenCalledExactlyOnceWith("locale", "vi");
    expect(order).toHaveBeenCalledExactlyOnceWith("sort_order", {
      ascending: true,
    });
  });
});
