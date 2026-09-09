import { describe, expect, it, vi } from "vitest";

import { markAllReadAction, markReadAction } from "./notifications";

import { markAllRead, markRead } from "@/dal/notifications";
import { toNotificationsClient } from "@/dal/notifications-client";
import { createClient } from "@/lib/supabase/server";

/**
 * `markRead`/`markAllRead` (the DAL) are mocked — same precedent as
 * `open-secret-box.test.ts`: this action's own logic is thin (derive the
 * session, delegate, catch), and `notifications.test.ts` already owns the
 * DAL's own boundary checks.
 */
vi.mock("@/dal/notifications", async () => {
  const actual = await vi.importActual<typeof import("@/dal/notifications")>(
    "@/dal/notifications",
  );
  return { ...actual, markRead: vi.fn(), markAllRead: vi.fn() };
});
vi.mock("@/dal/notifications-client", () => ({
  toNotificationsClient: vi.fn(() => ({})),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type FakeSupabase = Awaited<ReturnType<typeof createClient>>;

function stubSession(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValueOnce({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as FakeSupabase);
}

describe("markReadAction", () => {
  it("id rỗng/khoảng trắng → { ok:false } ngay, không chạm session", async () => {
    await expect(markReadAction("")).resolves.toEqual({ ok: false });
    await expect(markReadAction("   ")).resolves.toEqual({ ok: false });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("không có session → { ok:false }", async () => {
    stubSession(null);

    await expect(markReadAction("n1")).resolves.toEqual({ ok: false });
    expect(markRead).not.toHaveBeenCalled();
  });

  it("DAL trả ok:true → action trả { ok:true }", async () => {
    stubSession({ id: "user-1" });
    vi.mocked(markRead).mockResolvedValueOnce({ ok: true });

    await expect(markReadAction("n1")).resolves.toEqual({ ok: true });
    expect(markRead).toHaveBeenCalledWith(expect.anything(), "user-1", "n1");
    expect(toNotificationsClient).toHaveBeenCalled();
  });

  it("DAL trả ok:false (không tồn tại hoặc của người khác) → action trả { ok:false }", async () => {
    stubSession({ id: "user-1" });
    vi.mocked(markRead).mockResolvedValueOnce({ ok: false });

    await expect(markReadAction("n1")).resolves.toEqual({ ok: false });
  });

  it("createClient tự ném lỗi → { ok:false }", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("no cookies"));
    await expect(markReadAction("n1")).resolves.toEqual({ ok: false });
  });

  it("DAL ném exception → { ok:false }", async () => {
    stubSession({ id: "user-1" });
    vi.mocked(markRead).mockRejectedValueOnce(new Error("boom"));

    await expect(markReadAction("n1")).resolves.toEqual({ ok: false });
  });
});

describe("markAllReadAction", () => {
  it("không có session → { ok:false }", async () => {
    stubSession(null);

    await expect(markAllReadAction()).resolves.toEqual({ ok: false });
    expect(markAllRead).not.toHaveBeenCalled();
  });

  it("0 chưa đọc → { ok:true, updated:0 }, không phải lỗi", async () => {
    stubSession({ id: "user-1" });
    vi.mocked(markAllRead).mockResolvedValueOnce({ updated: 0 });

    await expect(markAllReadAction()).resolves.toEqual({
      ok: true,
      updated: 0,
    });
  });

  it("có N chưa đọc → { ok:true, updated:N }", async () => {
    stubSession({ id: "user-1" });
    vi.mocked(markAllRead).mockResolvedValueOnce({ updated: 4 });

    await expect(markAllReadAction()).resolves.toEqual({
      ok: true,
      updated: 4,
    });
    expect(markAllRead).toHaveBeenCalledWith(expect.anything(), "user-1");
  });

  it("createClient tự ném lỗi → { ok:false }", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("no cookies"));
    await expect(markAllReadAction()).resolves.toEqual({ ok: false });
  });

  it("DAL ném exception → { ok:false }", async () => {
    stubSession({ id: "user-1" });
    vi.mocked(markAllRead).mockRejectedValueOnce(new Error("boom"));

    await expect(markAllReadAction()).resolves.toEqual({ ok: false });
  });
});
