import { describe, expect, it } from "vitest";

import { openSecretBox, type SecretBoxClient } from "./secret-box";

/**
 * `openSecretBox` never constructs its own Supabase client — the caller
 * injects one, so every branch here is a plain stub of the single
 * `.rpc("open_secret_box")` call it makes. No network, no `@supabase/ssr`
 * boundary to mock.
 */
function stubClient(
  rpc: () => Promise<{ data: unknown; error: unknown }>,
): SecretBoxClient {
  return { rpc };
}

describe("openSecretBox", () => {
  it("hình dạng ARRAY (thật của .rpc() với RETURNS TABLE) → ok", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [{ badge_key: "stay-gold", unopened: 3 }],
        error: null,
      }),
    );

    await expect(openSecretBox(client)).resolves.toEqual({
      ok: true,
      badgeKey: "stay-gold",
      unopened: 3,
    });
  });

  it("hình dạng OBJECT trần (không phải array) → vẫn ok, không đoán mò", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: { badge_key: "root-further", unopened: 0 },
        error: null,
      }),
    );

    await expect(openSecretBox(client)).resolves.toEqual({
      ok: true,
      badgeKey: "root-further",
      unopened: 0,
    });
  });

  it("array rỗng → throw, không trả badge giả", async () => {
    const client = stubClient(() => Promise.resolve({ data: [], error: null }));

    await expect(openSecretBox(client)).rejects.toThrow();
  });

  it("badge_key không thuộc 6 giá trị → throw", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [{ badge_key: "unknown-badge", unopened: 1 }],
        error: null,
      }),
    );

    await expect(openSecretBox(client)).rejects.toThrow();
  });

  it("unopened là string thay vì number → throw", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [{ badge_key: "stay-gold", unopened: "3" }],
        error: null,
      }),
    );

    await expect(openSecretBox(client)).rejects.toThrow();
  });

  it("unopened âm → throw", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: [{ badge_key: "stay-gold", unopened: -1 }],
        error: null,
      }),
    );

    await expect(openSecretBox(client)).rejects.toThrow();
  });

  it("data null (không có error) → throw", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: null }),
    );

    await expect(openSecretBox(client)).rejects.toThrow();
  });

  it("error.message 'no_boxes_left' → { ok:false, reason:'no_boxes_left' }", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: null,
        error: { message: "no_boxes_left", code: "P0001" },
      }),
    );

    await expect(openSecretBox(client)).resolves.toEqual({
      ok: false,
      reason: "no_boxes_left",
    });
  });

  it("error.message 'unauthenticated' → { ok:false, reason:'unauthenticated' }", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: null,
        error: { message: "unauthenticated", code: "28000" },
      }),
    );

    await expect(openSecretBox(client)).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
  });

  it("error Postgres không xác định (ví dụ mất kết nối) → throw, không nuốt lỗi", async () => {
    const client = stubClient(() =>
      Promise.resolve({
        data: null,
        error: { message: "connection reset", code: "08006" },
      }),
    );

    await expect(openSecretBox(client)).rejects.toThrow();
  });

  it("error là Error instance thật với message không xác định → throw lại đúng Error đó", async () => {
    const original = new Error("boom");
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: original }),
    );

    await expect(openSecretBox(client)).rejects.toBe(original);
  });

  it("error không có field message (hình dạng lạ) → vẫn throw, không đoán mò", async () => {
    const client = stubClient(() =>
      Promise.resolve({ data: null, error: { code: "XX000" } }),
    );

    await expect(openSecretBox(client)).rejects.toThrow();
  });

  it("client.rpc ném exception → throw (fail closed)", async () => {
    const client: SecretBoxClient = {
      rpc: () => {
        throw new Error("network down");
      },
    };

    await expect(openSecretBox(client)).rejects.toThrow();
  });
});
