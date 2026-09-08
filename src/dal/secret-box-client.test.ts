import { describe, expect, it, vi } from "vitest";

import { toSecretBoxClient } from "./secret-box-client";

describe("toSecretBoxClient", () => {
  it("gọi supabase.rpc với đúng tên hàm, không tham số", async () => {
    const rpc = vi.fn(() =>
      Promise.resolve({
        data: [{ badge_key: "stay-gold", unopened: 0 }],
        error: null,
      }),
    );
    const supabase = { rpc } as unknown as Parameters<
      typeof toSecretBoxClient
    >[0];

    const client = toSecretBoxClient(supabase);
    const result = await client.rpc("open_secret_box");

    expect(rpc).toHaveBeenCalledWith("open_secret_box");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data: [{ badge_key: "stay-gold", unopened: 0 }],
      error: null,
    });
  });
});
