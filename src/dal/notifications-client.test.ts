import { describe, expect, it, vi } from "vitest";

import { toNotificationsClient } from "./notifications-client";

/**
 * `toNotificationsClient` only ever forwards calls to whatever
 * `.from("notifications")` hands back — this fakes just enough of the
 * real `@supabase/ssr` builder shape (self-returning `eq`/`or`/`order`/
 * `limit`, and an `update().eq().select()` chain) to prove the forwarding
 * and the chain rewrapping both work, mirroring `kudos-client.test.ts`'s
 * "fake the real builder" shape.
 */

function createFakeSelectBuilder(finalResult: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder = {
    eq: vi.fn((...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return builder;
    }),
    or: vi.fn((...args: unknown[]) => {
      calls.push({ method: "or", args });
      return builder;
    }),
    order: vi.fn((...args: unknown[]) => {
      calls.push({ method: "order", args });
      return builder;
    }),
    limit: vi.fn((...args: unknown[]) => {
      calls.push({ method: "limit", args });
      return builder;
    }),
    then: (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(finalResult).then(onFulfilled, onRejected),
  };
  return { builder, calls };
}

function createFakeUpdateBuilder(finalResult: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder = {
    eq: vi.fn((...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return builder;
    }),
    select: vi.fn((...args: unknown[]) => {
      calls.push({ method: "select", args });
      return Promise.resolve(finalResult);
    }),
  };
  return { builder, calls };
}

describe("toNotificationsClient", () => {
  it("select không có opts → forward đúng 1 tham số tới supabase.select()", async () => {
    const { builder } = createFakeSelectBuilder({
      data: [],
      count: null,
      error: null,
    });
    const select = vi.fn(() => builder);
    const supabase = { from: vi.fn(() => ({ select, update: vi.fn() })) };

    const client = toNotificationsClient(
      supabase as unknown as Parameters<typeof toNotificationsClient>[0],
    );
    await client.from("notifications").select("id,type");

    expect(select).toHaveBeenCalledWith("id,type");
  });

  it("select có opts (count head) → forward cả 2 tham số", async () => {
    const { builder } = createFakeSelectBuilder({
      data: null,
      count: 3,
      error: null,
    });
    const select = vi.fn(() => builder);
    const supabase = { from: vi.fn(() => ({ select, update: vi.fn() })) };

    const client = toNotificationsClient(
      supabase as unknown as Parameters<typeof toNotificationsClient>[0],
    );
    const result = await client
      .from("notifications")
      .select("id", { count: "exact", head: true });

    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(result).toEqual({ data: null, count: 3, error: null });
  });

  it("chain eq/or/order/limit forward tới builder thật rồi resolve đúng kết quả cuối", async () => {
    const { builder, calls } = createFakeSelectBuilder({
      data: [{ id: "n1" }],
      count: null,
      error: null,
    });
    const select = vi.fn(() => builder);
    const supabase = { from: vi.fn(() => ({ select, update: vi.fn() })) };

    const client = toNotificationsClient(
      supabase as unknown as Parameters<typeof toNotificationsClient>[0],
    );
    const result = await client
      .from("notifications")
      .select("id")
      .eq("user_id", "u1")
      .or("created_at.lt.2026-01-01")
      .order("created_at", { ascending: false })
      .limit(10);

    expect(calls.map((c) => c.method)).toEqual(["eq", "or", "order", "limit"]);
    expect(result).toEqual({ data: [{ id: "n1" }], count: null, error: null });
  });

  it("update(values) forward đúng values tới supabase.update()", async () => {
    const { builder } = createFakeUpdateBuilder({
      data: [{ id: "n1" }],
      error: null,
    });
    const update = vi.fn(() => builder);
    const supabase = { from: vi.fn(() => ({ select: vi.fn(), update })) };

    const client = toNotificationsClient(
      supabase as unknown as Parameters<typeof toNotificationsClient>[0],
    );
    await client.from("notifications").update({ is_read: true }).select("id");

    expect(update).toHaveBeenCalledWith({ is_read: true });
  });

  it("update().eq().select() forward đúng thứ tự và trả kết quả cuối", async () => {
    const { builder, calls } = createFakeUpdateBuilder({
      data: [{ id: "n1" }],
      error: null,
    });
    const update = vi.fn(() => builder);
    const supabase = { from: vi.fn(() => ({ select: vi.fn(), update })) };

    const client = toNotificationsClient(
      supabase as unknown as Parameters<typeof toNotificationsClient>[0],
    );
    const result = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("id", "n1")
      .eq("user_id", "u1")
      .select("id");

    expect(calls.map((c) => c.method)).toEqual(["eq", "eq", "select"]);
    expect(result).toEqual({ data: [{ id: "n1" }], error: null });
  });
});
