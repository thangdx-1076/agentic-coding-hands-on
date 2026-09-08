import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";

import { openSecretBoxAction } from "./open-secret-box";

import { openSecretBox } from "@/dal/secret-box";
import { createClient } from "@/lib/supabase/server";

/**
 * `openSecretBox` (the DAL) and `createClient` are both mocked — same
 * precedent as `load-more-kudos.test.ts`/`search-sunners.test.ts`. The
 * action's own logic is thin (build a client, delegate, catch), so a real
 * Postgres round trip through the DAL adds nothing here; `secret-box.test.ts`
 * already owns the RPC-shape boundary checks.
 */
vi.mock("@/dal/secret-box", async () => {
  const actual =
    await vi.importActual<typeof import("@/dal/secret-box")>(
      "@/dal/secret-box",
    );
  return { ...actual, openSecretBox: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("openSecretBoxAction", () => {
  it("không nhận tham số nào (kiểm tra bằng arity)", () => {
    expect(openSecretBoxAction.length).toBe(0);
  });

  it("ok-path trả badge + unopened từ DAL", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(openSecretBox).mockResolvedValueOnce({
      ok: true,
      badgeKey: "stay-gold",
      unopened: 2,
    });

    await expect(openSecretBoxAction()).resolves.toEqual({
      ok: true,
      badgeKey: "stay-gold",
      unopened: 2,
    });
  });

  it("no_boxes_left từ DAL → union lỗi tương ứng", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(openSecretBox).mockResolvedValueOnce({
      ok: false,
      reason: "no_boxes_left",
    });

    await expect(openSecretBoxAction()).resolves.toEqual({
      ok: false,
      reason: "no_boxes_left",
    });
  });

  it("unauthenticated từ DAL → union lỗi tương ứng", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(openSecretBox).mockResolvedValueOnce({
      ok: false,
      reason: "unauthenticated",
    });

    await expect(openSecretBoxAction()).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
  });

  it("DAL ném exception (hình dạng lạ, mất kết nối, ...) → { ok:false, reason:'unknown' }", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(openSecretBox).mockRejectedValueOnce(new Error("boom"));

    await expect(openSecretBoxAction()).resolves.toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("createClient tự ném lỗi (không cookie/network) → { ok:false, reason:'unknown' }", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("no cookies"));

    await expect(openSecretBoxAction()).resolves.toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("KHÔNG BAO GIỜ gọi revalidatePath (D-P04 — tránh remount launcher giữa luồng)", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(openSecretBox).mockResolvedValueOnce({
      ok: true,
      badgeKey: "revival",
      unopened: 0,
    });

    await openSecretBoxAction();

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
